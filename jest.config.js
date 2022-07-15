module.exports = {
    globals: {
        "ts-jest": {
            tsConfig: "tsconfig.json",
        },
    },
    moduleFileExtensions: ["ts", "js"],
    transform: {
        "^.+\\.(ts|tsx)$": ["@swc/jest"],
    },
    testMatch: ["**/test/**/*.test.(ts|js)"],
    testEnvironment: "node",
    setupFilesAfterEnv: ["./jest.setup.ts"],
};
