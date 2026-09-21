import { parseEnv } from "@contract-rag/config";

const VALID_ENV = {
  NODE_ENV: "test",
  PORT: "3000",
  DATABASE_URL: "postgresql://postgres:postgres@localhost:5432/contract_rag_test",
  REDIS_URL: "redis://localhost:6379",
  QDRANT_URL: "http://localhost:6333",
  QDRANT_API_KEY: "key",
  R2_ENDPOINT: "https://example.r2.cloudflarestorage.com",
  R2_ACCESS_KEY_ID: "id",
  R2_SECRET_ACCESS_KEY: "secret",
  R2_BUCKET: "bucket",
  GEMINI_API_KEY: "key",
  JWT_SECRET: "a".repeat(32),
};

describe("parseEnv", () => {
  it("accepts a fully-populated valid environment", () => {
    const result = parseEnv(VALID_ENV);
    expect(result.success).toBe(true);
  });

  it("defaults NODE_ENV to development and PORT to 3000 when omitted", () => {
    const { NODE_ENV: _NODE_ENV, PORT: _PORT, ...rest } = VALID_ENV;
    const result = parseEnv(rest);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.NODE_ENV).toBe("development");
      expect(result.data.PORT).toBe(3000);
    }
  });

  it("rejects a JWT_SECRET shorter than 32 characters", () => {
    const result = parseEnv({ ...VALID_ENV, JWT_SECRET: "too-short" });
    expect(result.success).toBe(false);
  });

  it("rejects a non-URL DATABASE_URL", () => {
    const result = parseEnv({ ...VALID_ENV, DATABASE_URL: "not-a-url" });
    expect(result.success).toBe(false);
  });

  it("rejects a missing required key entirely", () => {
    const { GEMINI_API_KEY: _GEMINI_API_KEY, ...rest } = VALID_ENV;
    const result = parseEnv(rest);
    expect(result.success).toBe(false);
  });

  it("treats SENTRY_DSN as optional", () => {
    const result = parseEnv(VALID_ENV);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.SENTRY_DSN).toBeUndefined();
    }
  });
});
