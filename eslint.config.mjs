import { fixupConfigRules, fixupPluginRules } from "@eslint/compat";
import typescriptEslint from "@typescript-eslint/eslint-plugin";
import eslintComments from "eslint-plugin-eslint-comments";
import _import from "eslint-plugin-import";
import jest from "eslint-plugin-jest";
import promise from "eslint-plugin-promise";
import unicorn from "eslint-plugin-unicorn";
import globals from "globals";
import tsParser from "@typescript-eslint/parser";
import path from "node:path";
import { fileURLToPath } from "node:url";
import js from "@eslint/js";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
  allConfig: js.configs.all,
});

export default [
  ...fixupConfigRules(
    compat.extends(
      "plugin:@typescript-eslint/recommended",
      "plugin:@typescript-eslint/recommended-requiring-type-checking",
      "plugin:eslint-comments/recommended",
      "plugin:jest/recommended",
      "plugin:promise/recommended",
      "plugin:unicorn/recommended",
      "plugin:react/recommended",
      "plugin:react-hooks/recommended",
      "plugin:react-native-a11y/all",
      "prettier"
    )
  ).map((config) => ({
    ...config,
    files: ["**/*.ts", "**/*.tsx", "**/*.js", "**/*.jsx"],
  })),

  {
    ignores: [
      "node_modules",
      "dist",
      "coverage",
      ".eslintrc.js",
      "babel.config.js",
      "app.config.js",
      "metro.config.js",
      ".expo/**",
      "jest/**",
    ],
  },
  {
    files: ["**/*.ts", "**/*.tsx", "**/*.js", "**/*.jsx"],

    plugins: {
      "@typescript-eslint": fixupPluginRules(typescriptEslint),
      "eslint-comments": fixupPluginRules(eslintComments),
      import: fixupPluginRules(_import),
      jest: fixupPluginRules(jest),
      promise: fixupPluginRules(promise),
      unicorn: fixupPluginRules(unicorn),
    },

    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
      },

      parser: tsParser,
      ecmaVersion: 5,
      sourceType: "commonjs",

      parserOptions: {
        tsconfigRootDir: __dirname,
        project: ["./tsconfig.json"],
      },
    },

    settings: {
      "import/resolver": {
        node: {
          extensions: [".ts", ".tsx", ".js", ".jsx"],
        },
      },

      react: {
        version: "detect",
      },
    },

    rules: {
      "no-prototype-builtins": "off",
      "import/prefer-default-export": "off",
      "import/no-default-export": "error",
      "react/destructuring-assignment": "off",
      "react/jsx-filename-extension": "off",
      "@typescript-eslint/explicit-function-return-type": "off",
      "no-use-before-define": "off",
      "@typescript-eslint/no-unused-vars": "warn",
      "@typescript-eslint/no-unsafe-argument": "warn",
      "@typescript-eslint/no-explicit-any": "warn",

      "@typescript-eslint/no-use-before-define": [
        "error",
        {
          functions: false,
          classes: true,
          variables: true,
          typedefs: true,
        },
      ],

      "unicorn/prevent-abbreviations": "off",
      "unicorn/no-array-for-each": "off",
      "import/no-extraneous-dependencies": "off",

      "unicorn/filename-case": [
        "error",
        {
          cases: {
            camelCase: true,
            pascalCase: true,
          },
        },
      ],

      "jest/no-large-snapshots": "error",

      "no-param-reassign": [
        "error",
        {
          props: true,
          ignorePropertyModificationsFor: ["state"],
        },
      ],

      "@typescript-eslint/ban-ts-comment": [
        "error",
        {
          "ts-expect-error": "allow-with-description",
        },
      ],
    },
  },
];
