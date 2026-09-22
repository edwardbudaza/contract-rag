import { sentry } from "@contract-rag/observability";

// _scrubForTesting is exported specifically so this can be tested directly, without an
// actual SENTRY_DSN configured or any network call — see packages/observability/src/
// sentry/index.ts for why it's named that way rather than just `scrub`.
const scrub = sentry._scrubForTesting;

describe("Sentry event scrubbing", () => {
  it("redacts a top-level password key", () => {
    const result = scrub({ password: "hunter2", email: "a@b.com" }) as Record<
      string,
      unknown
    >;
    expect(result.password).toBe("[REDACTED]");
    expect(result.email).toBe("a@b.com");
  });

  it("redacts sensitive keys at any nesting depth", () => {
    const result = scrub({
      request: { headers: { authorization: "Bearer xyz" }, cookies: { session: "abc" } },
    }) as Record<string, unknown>;
    const request = result.request as { headers: { authorization: string } };
    expect(request.headers.authorization).toBe("[REDACTED]");
  });

  it("matches keys case-insensitively and as substrings (apiKey, api_key, ApiKey)", () => {
    const result = scrub({ apiKey: "1", api_key: "2", ApiKeyValue: "3" }) as Record<
      string,
      unknown
    >;
    expect(result.apiKey).toBe("[REDACTED]");
    expect(result.api_key).toBe("[REDACTED]");
    expect(result.ApiKeyValue).toBe("[REDACTED]");
  });

  it("leaves arrays and non-sensitive nested data intact", () => {
    const result = scrub({
      tags: ["contract", "urgent"],
      user: { id: "123", plan: "pro" },
    }) as Record<string, unknown>;
    expect(result.tags).toEqual(["contract", "urgent"]);
    expect(result.user).toEqual({ id: "123", plan: "pro" });
  });

  it("passes primitives through unchanged", () => {
    expect(scrub("a string")).toBe("a string");
    expect(scrub(42)).toBe(42);
    expect(scrub(null)).toBe(null);
  });
});
