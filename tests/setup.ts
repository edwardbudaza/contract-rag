// Runs once per test file, before any test code (including imports of @contract-rag/config)
// executes. packages/config validates and fails fast on missing env vars — these are
// throwaway values that satisfy that validation for unit/integration tests; nothing here
// talks to a real Gemini/R2/Qdrant account. DATABASE_URL is the one value integration tests
// (tests/integration/) actually connect with — override it via a real env var if your local
// Postgres isn't on the default docker-compose port/credentials.

process.env.NODE_ENV = process.env.NODE_ENV ?? "test";
process.env.PORT = process.env.PORT ?? "3000";
process.env.DATABASE_URL =
  process.env.DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5432/contract_rag_test";
process.env.REDIS_URL = process.env.REDIS_URL ?? "redis://localhost:6379";
process.env.QDRANT_URL = process.env.QDRANT_URL ?? "http://localhost:6333";
process.env.QDRANT_API_KEY = process.env.QDRANT_API_KEY ?? "test-key";
process.env.R2_ENDPOINT = process.env.R2_ENDPOINT ?? "https://example.r2.cloudflarestorage.com";
process.env.R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID ?? "test-access-key";
process.env.R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY ?? "test-secret-key";
process.env.R2_BUCKET = process.env.R2_BUCKET ?? "test-bucket";
process.env.GEMINI_API_KEY = process.env.GEMINI_API_KEY ?? "test-gemini-key";
process.env.JWT_SECRET =
  process.env.JWT_SECRET ?? "test-jwt-secret-at-least-32-characters-long";
