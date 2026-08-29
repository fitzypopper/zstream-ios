/**
 * Filesystem adapter wrapping @dr.pogodin/react-native-fs.
 *
 * Centralized so download/subtitle caching can read/write the app's
 * Documents directory consistently and can be swapped/tested easily.
 */

import * as RNFS from '@dr.pogodin/react-native-fs';

export const APP_DIRECTORY = 'zstream';

export interface DownloadCallbacks {
  begin?: (totalBytes: number) => void;
  progress?: (receivedBytes: number, totalBytes: number) => void;
  onError?: (error: Error) => void;
}

export interface FileDownloadJob {
  promise: Promise<string>;
  cancel: () => void;
  pause?: () => void;
  resume?: () => void;
}

/**
 * Root data directory for app downloads/subtitles.
 */
export function getAppDirectory(): string {
  return `${RNFS.DocumentDirectoryPath}/${APP_DIRECTORY}`;
}

/**
 * Create a directory (recursively) if it does not exist.
 */
export async function ensureDir(path: string): Promise<string> {
  if (await RNFS.exists(path)) {
    return path;
  }
  await RNFS.mkdir(path);
  return path;
}

/**
 * Write a text/binary file.
 */
export async function writeFile(
  path: string,
  content: string,
  encoding: 'utf8' | 'base64' = 'utf8',
): Promise<void> {
  await RNFS.writeFile(path, content, encoding);
}

/**
 * Read a text file as a string.
 */
export async function readFile(
  path: string,
  encoding: 'utf8' | 'base64' = 'utf8',
): Promise<string> {
  return RNFS.readFile(path, { encoding });
}

/**
 * List directory entry names.
 */
export async function listDir(path: string): Promise<string[]> {
  if (!(await RNFS.exists(path))) {
    return [];
  }
  return RNFS.readdir(path);
}

/**
 * Move/rename a file.
 */
export async function moveFile(fromPath: string, toPath: string): Promise<void> {
  await RNFS.moveFile(fromPath, toPath);
}

/**
 * Check whether the given path exists.
 */
export async function exists(path: string): Promise<boolean> {
  return RNFS.exists(path);
}

/**
 * Stat the given path.
 */
export async function stat(path: string): Promise<{ isDirectory: () => boolean; size: number } | null> {
  if (!(await RNFS.exists(path))) {
    return null;
  }
  const info = await RNFS.stat(path);
  return {
    isDirectory: () => false,
    size: info.size ?? 0,
  };
}

/**
 * Delete a file or directory recursively.
 */
export async function unlink(path: string): Promise<void> {
  if (await RNFS.exists(path)) {
    await RNFS.unlink(path);
  }
}

/**
 * Download a URL to a local file with HTTP headers.
 * Returns a job handle that resolves to the local path on success.
 */
export function downloadToFile(
  fromUrl: string,
  toFile: string,
  headers: Record<string, string> = {},
  callbacks: DownloadCallbacks = {},
): FileDownloadJob {
  const job = RNFS.downloadFile({
    fromUrl,
    toFile,
    headers,
    begin: (res) => callbacks.begin?.(res.contentLength ?? 0),
    progress: (res) => callbacks.progress?.(res.bytesWritten ?? 0, res.contentLength ?? 0),
  });

  const promise = job.promise.then((result) => {
    if (result.statusCode !== 200 && result.statusCode !== 206) {
      throw new Error(`Download failed: HTTP ${result.statusCode}`);
    }
    return toFile;
  });

  promise.catch((error) => callbacks.onError?.(error));

  return {
    promise,
    cancel: () => RNFS.stopDownload(job.jobId),
    pause: () => RNFS.stopDownload(job.jobId),
    resume: () => RNFS.resumeDownload(job.jobId),
  };
}

export default {
  getAppDirectory,
  ensureDir,
  writeFile,
  readFile,
  listDir,
  exists,
  stat,
  unlink,
  moveFile,
  downloadToFile,
};