module.exports = {
    parser: "@typescript-eslint/parser",
    parserOptions: {
        project: "tsconfig.json",
        sourceType: "module",
    },
    plugins: ["@typescript-eslint/eslint-plugin", "jest", "unicorn"],
    extends: ["plugin:@typescript-eslint/recommended", "prettier", "plugin:prettier/recommended", "plugin:jest/recommended"],
    root: true,
    env: {
        node: true,
        jest: true,
    },
    rules: {
        "@typescript-eslint/interface-name-prefix": "off",
        "@typescript-eslint/explicit-function-return-type": "off",
        "@typescript-eslint/explicit-module-boundary-types": "off",
        "@typescript-eslint/no-explicit-any": "off",
        "@typescript-eslint/ban-ts-comment": "off",
        "@typescript-eslint/no-empty-interface": [
            "error",
            {
                allowSingleExtends: true,
            },
        ],
        "no-var": "error",
        "no-console": [
            2,
            {
                allow: ["warn", "error"],
            },
        ],
        "@typescript-eslint/await-thenable": "error",
        "@typescript-eslint/no-floating-promises": "error",
        "unicorn/better-regex": "error",
        "unicorn/no-instanceof-array": "error",
        "unicorn/no-unsafe-regex": "warn",
        "unicorn/prefer-array-find": "error",
        "unicorn/prefer-array-index-of": "error",
        "unicorn/prefer-array-some": "error",
        "unicorn/prefer-includes": "error",
        "unicorn/prefer-node-protocol": "warn",
    },
    overrides: [
        {
            // enable the rule specifically for TypeScript files
            files: ["*.controller.ts"],
            rules: {
                "@typescript-eslint/explicit-function-return-type": "error",
            },
        },
    ],
};
