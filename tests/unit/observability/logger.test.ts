import { Writable } from "node:stream";
import { logger as loggerModule } from "@contract-rag/observability";

const createLogger = loggerModule.createLogger;

// Captures everything written to the logger into an array of parsed JSON lines, so
// assertions can check the actual serialized output — not just that redact() was called,
// but that a real Pino instance with our config genuinely never writes the secret.
function captureLogger(serviceName = "test") {
  const lines: Record<string, unknown>[] = [];
  const stream = new Writable({
    write(chunk, _enc, callback) {
      lines.push(JSON.parse(chunk.toString()));
      callback();
    },
  });
  return { logger: createLogger(serviceName, stream), lines };
}

describe("createLogger redaction", () => {
  it("redacts a top-level password field", () => {
    const { logger, lines } = captureLogger();
    logger.info({ password: "hunter2", username: "alice" }, "login attempt");
    expect(lines[0]!.password).toBe("[REDACTED]");
    expect(lines[0]!.username).toBe("alice");
  });

  it("redacts a nested authorization header", () => {
    const { logger, lines } = captureLogger();
    logger.info({ req: { headers: { authorization: "Bearer secret-token" } } }, "request");
    const req = lines[0]!.req as { headers: { authorization: string } };
    expect(req.headers.authorization).toBe("[REDACTED]");
  });

  it("redacts token/apiKey/secret wherever they appear via the wildcard paths", () => {
    const { logger, lines } = captureLogger();
    logger.info(
      { context: { token: "abc", apiKey: "def", secret: "ghi" } },
      "some event",
    );
    const context = lines[0]!.context as Record<string, string>;
    expect(context.token).toBe("[REDACTED]");
    expect(context.apiKey).toBe("[REDACTED]");
    expect(context.secret).toBe("[REDACTED]");
  });

  it("leaves non-sensitive fields untouched", () => {
    const { logger, lines } = captureLogger();
    logger.info({ event: "contract.uploaded", contractId: "abc-123" }, "uploaded");
    expect(lines[0]!.event).toBe("contract.uploaded");
    expect(lines[0]!.contractId).toBe("abc-123");
  });

  it("tags every log line with the service name", () => {
    const { logger, lines } = captureLogger("contract-rag-worker");
    logger.info({}, "hello");
    expect(lines[0]!.service).toBe("contract-rag-worker");
  });
});
