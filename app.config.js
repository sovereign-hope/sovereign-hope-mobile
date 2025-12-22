export default ({ config }) =>
  process.env.EAS_BUILD_PROFILE === "production"
    ? config
    : {
        ...config,
        name: "Sov Hope Dev",
        ios: {
          ...(config.ios ?? {}),
          bundleIdentifier: "com.sovereign-hope.sovereign-hope-dev",
          infoPlist: {
            ...(config.ios?.infoPlist ?? {}),
            ITSAppUsesNonExemptEncryption: false,
          },
        },
        android: {
          ...(config.android ?? {}),
          package: "com.sovereign_hope.sovereign_hope_dev",
        },
      };
