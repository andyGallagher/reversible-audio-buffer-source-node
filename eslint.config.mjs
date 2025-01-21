// @ts-check

import noRelativeImportPaths from "eslint-plugin-no-relative-import-paths";
import tseslint from "typescript-eslint";

// Restricted imports enforced in every package.
const noRestrictedImportsPaths = [
    {
        name: "console",
        importNames: ["assert"],
        message: "Always import assert from 'shared/helpers'.",
    },
];

export default tseslint.config(
    // NOTE: These configurations appear to extend one another in a top-down fashion.
    // Global ignores.  This must come first before any other configs.
    {
        ignores: [
            "**/node_modules/",
            "**/coverage/",
            "**/dist/",
            "**/*.js",
            "**/*.mjs",
            "**/*.cjs",
            "**/*.config.ts",
            "**/*.config.mts",
        ],
    },

    // Sets up TS parser and whatnot.
    tseslint.configs.base,

    {
        name: "reversible-audio-buffer-source-node/base",

        files: ["**/*.ts", "**/*.tsx", "**/*.mts", "**/*.cts"],

        // TypeScript ESLint setup.
        languageOptions: {
            parserOptions: {
                // Keep up, typescript-eslint, keep up.
                warnOnUnsupportedTypeScriptVersion: false,

                projectService: true,

                tsconfigRootDir: import.meta.dirname,
            },
        },

        plugins: {
            "no-relative-import-paths": noRelativeImportPaths,
        },

        rules: {
            "no-compare-neg-zero": "error",
            "no-cond-assign": ["error", "always"],
            "no-constant-condition": ["error", { checkLoops: true }],
            "no-control-regex": "error",
            "no-debugger": "error",
            "no-dupe-else-if": "error",
            "no-duplicate-case": "error",
            "no-empty-character-class": "error",
            "no-empty-pattern": "error",
            "no-inner-declarations": "error",
            "no-invalid-regexp": "error",
            "no-misleading-character-class": "error",
            "no-sparse-arrays": "error",
            "no-unsafe-finally": "error",
            "no-unsafe-negation": "error",
            "no-useless-backreference": "error",
            "use-isnan": "error",
            "@typescript-eslint/ban-ts-comment": "error",
            "@typescript-eslint/no-non-null-asserted-optional-chain": "error",
            "@typescript-eslint/no-loss-of-precision": "error",

            "@typescript-eslint/no-misused-promises": [
                "error",
                {
                    // `() => Promise<void>` should be assignable to `() => void`.
                    checksVoidReturn: false,
                },
            ],
            "@typescript-eslint/no-floating-promises": "error",
            "@typescript-eslint/switch-exhaustiveness-check": "error",
            "@typescript-eslint/only-throw-error": ["error"],

            // Ban certain imports.
            "no-restricted-imports": [
                "error",
                {
                    paths: noRestrictedImportsPaths,
                },
            ],

            eqeqeq: "error",

            "no-unused-expressions": ["error", { enforceForJSX: true }],

            "no-console": ["error", { allow: ["warn", "error", "info"] }],
            "no-relative-import-paths/no-relative-import-paths": [
                "error",
                { allowSameFolder: true },
            ],
        },
    },
);
