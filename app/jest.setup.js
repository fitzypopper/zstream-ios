/* eslint-env jest */
// Mock react-native-safe-area-context
jest.mock('react-native-safe-area-context', () => {
  const inset = { top: 0, right: 0, bottom: 0, left: 0 };
  return {
    SafeAreaProvider: jest.fn(({ children }) => children),
    SafeAreaConsumer: jest.fn(({ children }) => children(inset)),
    SafeAreaView: jest.fn(({ children }) => children),
    useSafeAreaInsets: jest.fn(() => inset),
    useSafeAreaFrame: jest.fn(() => ({ x: 0, y: 0, width: 390, height: 844 })),
  };
});

// Mock React Navigation
jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    NavigationContainer: ({ children }) => children,
    useNavigation: () => ({
      navigate: jest.fn(),
      goBack: jest.fn(),
      setOptions: jest.fn(),
    }),
    useRoute: () => ({
      params: {},
    }),
    useIsFocused: () => true,
  };
});

jest.mock('@react-navigation/bottom-tabs', () => ({
  createBottomTabNavigator: () => ({
    Navigator: ({ children }) => children,
    Screen: ({ children }) => children,
  }),
}));

jest.mock('@react-navigation/native-stack', () => ({
  createNativeStackNavigator: () => ({
    Navigator: ({ children }) => children,
    Screen: ({ children }) => children,
  }),
}));

// Mock AsyncStorage to avoid native module errors in Jest
jest.mock(
  '@react-native-async-storage/async-storage',
  () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

// Mock MMKV (not available in Jest)
jest.mock('react-native-mmkv', () => {
  const mockInstance = {
    getString: jest.fn(),
    set: jest.fn(),
    delete: jest.fn(),
  };
  return {
    MMKV: jest.fn(() => mockInstance),
  };
});

// Mock @dr.pogodin/react-native-fs with an in-memory filesystem so tests can
// exercise the download/subtitle caching layers without native modules.
jest.mock('@dr.pogodin/react-native-fs', () => {
  const memoryFs = new Map(); // path -> { content, dir }

  const isDir = (path) => {
    const entry = memoryFs.get(path);
    return !!(entry && entry.dir);
  };

  const has = (path) => memoryFs.has(path);

  return {
    DocumentDirectoryPath: '/Documents',
    exists: jest.fn(async (path) => has(path)),
    mkdir: jest.fn(async (path) => {
      memoryFs.set(path, { dir: true });
    }),
    readdir: jest.fn(async (path) => {
      if (!has(path)) throw new Error(`ENOENT: ${path}`);
      const prefix = `${path}/`;
      return [...memoryFs.keys()]
        .filter((p) => p.startsWith(prefix))
        .map((p) => p.slice(prefix.length));
    }),
    writeFile: jest.fn(async (path, content) => {
      memoryFs.set(path, { content: String(content) });
    }),
    readFile: jest.fn(async (path, opts) => {
      const entry = memoryFs.get(path);
      if (!entry || entry.dir) throw new Error(`ENOENT: ${path}`);
      return String(entry.content);
    }),
    moveFile: jest.fn(async (fromPath, toPath) => {
      const entry = memoryFs.get(fromPath);
      if (!entry) throw new Error(`ENOENT: ${fromPath}`);
      memoryFs.delete(fromPath);
      memoryFs.set(toPath, entry);
    }),
    unlink: jest.fn(async (path) => {
      if (isDir(path)) {
        const prefix = `${path}/`;
        for (const key of [...memoryFs.keys()]) {
          if (key === path || key.startsWith(prefix)) memoryFs.delete(key);
        }
      } else {
        memoryFs.delete(path);
      }
    }),
    stat: jest.fn(async (path) => {
      const entry = memoryFs.get(path);
      if (!entry) throw new Error(`ENOENT: ${path}`);
      return { size: entry.dir ? 0 : String(entry.content).length, isFile: () => !entry.dir };
    }),
    downloadFile: jest.fn(() => {
      const jobId = Date.now().toString(36);
      return {
        jobId,
        promise: Promise.resolve({ statusCode: 200, bytesWritten: 0 }),
      };
    }),
    stopDownload: jest.fn(),
    resumeDownload: jest.fn(),
  };
});

