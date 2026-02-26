import fs from "node:fs";
import path from "node:path";

const readPlistStringValue = (plistContent, key) => {
  const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = plistContent.match(
    new RegExp(`<key>${escapedKey}<\\/key>\\s*<string>([^<]+)<\\/string>`)
  );

  return match?.[1];
};

const getGoogleServiceInfoMetadata = (relativeFilePath) => {
  try {
    const absoluteFilePath = path.join(process.cwd(), relativeFilePath);
    const plistContent = fs.readFileSync(absoluteFilePath, "utf8");

    return {
      clientId: readPlistStringValue(plistContent, "CLIENT_ID"),
      bundleId: readPlistStringValue(plistContent, "BUNDLE_ID"),
      reversedClientId: readPlistStringValue(
        plistContent,
        "REVERSED_CLIENT_ID"
      ),
    };
  } catch {
    return {};
  }
};

const fileExists = (relativeFilePath) =>
  fs.existsSync(path.join(process.cwd(), relativeFilePath));

const getGoogleServicesJsonMetadata = (relativeFilePath, packageName) => {
  try {
    const absoluteFilePath = path.join(process.cwd(), relativeFilePath);
    const googleServicesJson = JSON.parse(
      fs.readFileSync(absoluteFilePath, "utf8")
    );
    const matchingClient =
      googleServicesJson.client?.find(
        (client) =>
          client.client_info?.android_client_info?.package_name === packageName
      ) ?? googleServicesJson.client?.[0];
    const oauthClients = matchingClient?.oauth_client ?? [];
    const androidOAuthClient =
      oauthClients.find(
        (oauthClient) =>
          oauthClient.client_type === 1 &&
          oauthClient.android_info?.package_name === packageName
      ) ?? oauthClients.find((oauthClient) => oauthClient.client_type === 1);
    const webOAuthClient = oauthClients.find(
      (oauthClient) => oauthClient.client_type === 3
    );

    return {
      androidClientId: androidOAuthClient?.client_id,
      webClientId: webOAuthClient?.client_id,
      packageName:
        matchingClient?.client_info?.android_client_info?.package_name ??
        packageName,
    };
  } catch {
    return {};
  }
};

export default ({ config }) => {
  const isProductionBuild = process.env.EAS_BUILD_PROFILE === "production";
  const developmentAndroidPackage = "com.sovereign_hope.sovereign_hope_dev";
  const targetAndroidPackage = isProductionBuild
    ? config.android?.package
    : developmentAndroidPackage;
  const googleServiceInfoFile = isProductionBuild
    ? "google/GoogleService-Info.plist"
    : "google/GoogleService-Info.dev.plist";
  const googleServiceInfo = getGoogleServiceInfoMetadata(googleServiceInfoFile);
  const androidGoogleServicesFile = isProductionBuild
    ? "google/google-services.json"
    : "google/google-services.dev.json";
  const googleServicesJson = targetAndroidPackage
    ? getGoogleServicesJsonMetadata(
        androidGoogleServicesFile,
        targetAndroidPackage
      )
    : {};

  const baseConfig = {
    ...config,
    ios: {
      ...(config.ios ?? {}),
      ...(fileExists(googleServiceInfoFile)
        ? { googleServicesFile: `./${googleServiceInfoFile}` }
        : {}),
    },
    android: {
      ...(config.android ?? {}),
      ...(fileExists(androidGoogleServicesFile)
        ? { googleServicesFile: `./${androidGoogleServicesFile}` }
        : {}),
    },
    extra: {
      ...(config.extra ?? {}),
      googleAuth: {
        ...((config.extra && config.extra.googleAuth) || {}),
        iosClientId: googleServiceInfo.clientId,
        iosBundleId: googleServiceInfo.bundleId,
        iosReversedClientId: googleServiceInfo.reversedClientId,
        androidClientId: googleServicesJson.androidClientId,
        androidPackage: googleServicesJson.packageName,
        webClientId: googleServicesJson.webClientId,
      },
    },
  };

  if (isProductionBuild) {
    return baseConfig;
  }

  return {
    ...baseConfig,
    name: "Sov Hope Dev",
    ios: {
      ...(baseConfig.ios ?? {}),
      bundleIdentifier: "com.sovereign-hope.sovereign-hope-dev",
      infoPlist: {
        ...(baseConfig.ios?.infoPlist ?? {}),
        ITSAppUsesNonExemptEncryption: false,
      },
    },
    android: {
      ...(baseConfig.android ?? {}),
      package: developmentAndroidPackage,
    },
  };
};
