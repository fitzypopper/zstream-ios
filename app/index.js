/**
 * ZStream app entry point.
 *
 * Boot-order safety: a static `import App from './App'` means any module-level
 * throw in the App graph aborts this file before the component is registered,
 * which in a Release build leaves a permanent black screen (no redbox, no
 * console on a physical device). Load App defensively and render any captured
 * startup error on-screen instead so sideloaded builds can report the cause.
 *
 * @format
 */

import { AppRegistry } from 'react-native';

let bootError = null;

function capture(error) {
  const msg = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack : undefined;
  bootError = { message: msg, stack };
  try {
    globalThis.__zstreamBootError = { message: msg, stack };
  } catch {}
}

// Keep RN's usual unhandled-error side effects (Dev logging) without letting
// the default handler swallow our captured state.
try {
  var ErrorUtils = globalThis.ErrorUtils;
  if (ErrorUtils && typeof ErrorUtils.setGlobalHandler === 'function') {
    var originalHandler = ErrorUtils.getGlobalHandler
      ? ErrorUtils.getGlobalHandler()
      : null;
    ErrorUtils.setGlobalHandler(function (e, isFatal) {
      capture(e);
      if (typeof originalHandler === 'function') {
        originalHandler(e, isFatal);
      }
    });
  }
} catch {}

import React from 'react';
import { SafeAreaView, Text, View, ScrollView } from 'react-native';
import { probeNativeAuth } from './native/nativeAuth';

function CrashScreen({ error }) {
  return React.createElement(
    SafeAreaView,
    { style: { flex: 1, backgroundColor: '#1C1C1E' } },
    React.createElement(
      ScrollView,
      { style: { flex: 1, paddingHorizontal: 20, paddingTop: 60 } },
      React.createElement(
        Text,
        { style: { color: '#FF453A', fontSize: 20, fontWeight: '800' } },
        'ZStream failed to start',
      ),
      React.createElement(
        Text,
        { style: { color: '#FFFFFF', fontSize: 15, marginTop: 20, fontWeight: '600' } },
        error.message,
      ),
      React.createElement(
        Text,
        { style: { color: '#8E8E93', fontSize: 12, marginTop: 16, lineHeight: 18 } },
        error.stack || '',
      ),
    ),
  );
}

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return {
      error: {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      },
    };
  }

  componentDidCatch(error) {
    capture(error);
  }

  render() {
    if (this.state.error) {
      return React.createElement(CrashScreen, { error: this.state.error });
    }
    return this.props.children;
  }
}

let AppComponent = null;
try {
  // Same graph as the RN template, but require()d so a throw is catchable.
  AppComponent = require('./App').default;
} catch (err) {
  capture(err);
}

// Fire the one-shot native bridge health check now so any honest hang is
// detected once (300ms) and the bridge is disabled for the rest of the boot.
try {
  probeNativeAuth();
} catch {}

function RootComponent() {
  if (bootError) {
    return React.createElement(CrashScreen, { error: bootError });
  }
  if (!AppComponent) {
    return React.createElement(CrashScreen, {
      error: {
        message: 'App module did not load (no error was captured).',
        stack: undefined,
      },
    });
  }
  return React.createElement(
    ErrorBoundary,
    null,
    React.createElement(AppComponent),
  );
}

AppRegistry.registerComponent('zstream', () => RootComponent);