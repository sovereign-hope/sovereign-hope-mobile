/** @type {import('jest').Config} */
// eslint-disable-next-line unicorn/prefer-module
module.exports = {
  preset: "jest-expo",
  setupFilesAfterEnv: [
    "@testing-library/jest-native/extend-expect",
    "<rootDir>/jest/setup.js",
  ],
  transformIgnorePatterns: [
    "node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|native-base|react-native-svg|@sentry/.*|react-redux|@reduxjs/toolkit|firebase|@firebase/.*)",
  ],
  moduleNameMapper: {
    "^src/(.*)$": "<rootDir>/src/$1",
    "^assets/(.*)$": "<rootDir>/assets/$1",
  },
  moduleFileExtensions: ["ts", "tsx", "js", "json"],
  collectCoverageFrom: ["src/app/utils.ts", "src/redux/*.ts", "!src/**/*.d.ts"],
};
