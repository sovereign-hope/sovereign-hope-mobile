export default ({ config }) =>
  process.env.EAS_BUILD_PROFILE === "production"
    ? {
        ...config,
        hooks: {
          postPublish: [
            {
              file: "sentry-expo/upload-sourcemaps",
              config: {
                organization: "sovereign-hope-church",
                project: "sovereign-hope-mobile",
                authToken: process.env.SENTRY_TOKEN,
              },
            },
          ],
        },
      }
    : {
        ...config,
        name: "Sov Hope Dev",
      };
