import {
  NotFoundError,
  ValidationError,
  InternalError,
  UpstreamUnavailableError,
} from "@contract-rag/shared";

describe("AppError.toProblem", () => {
  it("produces the RFC 7807 shape with a stable type URI", () => {
    const err = new NotFoundError("Contract");
    const problem = err.toProblem("req-123");

    expect(problem).toEqual({
      type: "https://contract-rag.dev/errors/not-found",
      title: "Contract not found",
      detail: undefined,
      status: 404,
      requestId: "req-123",
    });
  });

  it("carries a caller-supplied detail through for ValidationError", () => {
    const err = new ValidationError("title: Required");
    expect(err.toProblem().detail).toBe("title: Required");
    expect(err.toProblem().status).toBe(400);
  });

  it("never exposes a detail for InternalError, by construction", () => {
    const err = new InternalError();
    const problem = err.toProblem();
    expect(problem.detail).toBeUndefined();
    expect(problem.status).toBe(500);
  });

  it("names the failing upstream service for UpstreamUnavailableError", () => {
    const err = new UpstreamUnavailableError("Gemini");
    expect(err.toProblem().detail).toBe("Gemini is currently unreachable");
    expect(err.toProblem().status).toBe(502);
  });

  it("omits requestId when none is supplied", () => {
    const problem = new NotFoundError().toProblem();
    expect(problem.requestId).toBeUndefined();
  });
});
