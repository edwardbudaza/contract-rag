/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: "node",
  setupFiles: ["<rootDir>/tests/setup.ts"],
  // Tests import "@contract-rag/x" straight from TS source, not the compiled dist/ output —
  // this decouples "run the tests" from "remember to build first", which matters most for
  // integration tests (Postgres) where the point is testing behavior, not build artifacts.
  moduleNameMapper: {
    "^@contract-rag/(.*)$": "<rootDir>/packages/$1/src",
  },
  testMatch: ["<rootDir>/tests/**/*.test.ts"],
  transform: {
    "^.+\\.ts$": ["ts-jest", { tsconfig: "tsconfig.jest.json" }],
  },
  clearMocks: true,
};
