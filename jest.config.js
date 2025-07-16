module.exports = {
  projects: [
    {
      displayName: "React Components",
      testEnvironment: "jsdom",
      testMatch: [
        "<rootDir>/src/**/*.test.{js,jsx,ts,tsx}", // This will find diaryoperations.test.js
        "<rootDir>/src/components/**/*.test.{js,jsx,ts,tsx}",
        "<rootDir>/src/context/**/*.test.{js,jsx,ts,tsx}", // For theme tests
        "<rootDir>/src/integration/**/*.test.{js,jsx,ts,tsx}", // Real integration tests
      ],
      setupFilesAfterEnv: ["<rootDir>/src/setupTests.js"],
      moduleNameMapper: {
        "\\.(css|less|scss|sass)$": "identity-obj-proxy",
        "^@/(.*)$": "<rootDir>/src/$1",
      },
      transform: {
        "^.+\\.(ts|tsx|js|jsx)$": "babel-jest",
      },
    },
    {
      displayName: "Database Operations",
      testEnvironment: "node",
      testMatch: [
        "<rootDir>/src/diaryoperations.test.js",
        "<rootDir>/src/utils/**/*.test.{js,ts}",
      ],
      setupFilesAfterEnv: ["<rootDir>/src/setupDatabaseTests.js"],
    },
  ],
  verbose: true,
  testTimeout: 10000,
};
