const { getSentryExpoConfig } = require("@sentry/react-native/metro");

const config = getSentryExpoConfig(__dirname);

config.resolver.assetExts.push("cjs");
if (config.watcher && "unstable_workerThreads" in config.watcher) {
  delete config.watcher.unstable_workerThreads;
}

module.exports = config;
