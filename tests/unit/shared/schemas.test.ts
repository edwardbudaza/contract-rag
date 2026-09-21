import { CreateContractBody, PaginationQuery, SendMessageBody } from "@contract-rag/shared";

describe("CreateContractBody", () => {
  it("accepts a valid title", () => {
    const result = CreateContractBody.safeParse({ title: "MSA — Acme Corp" });
    expect(result.success).toBe(true);
  });

  it("rejects an empty title", () => {
    const result = CreateContractBody.safeParse({ title: "" });
    expect(result.success).toBe(false);
  });

  it("rejects a missing title", () => {
    const result = CreateContractBody.safeParse({});
    expect(result.success).toBe(false);
  });
});

describe("PaginationQuery", () => {
  it("defaults limit to 20 when omitted", () => {
    const result = PaginationQuery.parse({});
    expect(result.limit).toBe(20);
  });

  it("coerces a string limit from a querystring into a number", () => {
    const result = PaginationQuery.parse({ limit: "50" });
    expect(result.limit).toBe(50);
  });

  it("rejects a limit above the max of 100", () => {
    const result = PaginationQuery.safeParse({ limit: "500" });
    expect(result.success).toBe(false);
  });
});

describe("SendMessageBody", () => {
  it("rejects an empty question", () => {
    const result = SendMessageBody.safeParse({ question: "" });
    expect(result.success).toBe(false);
  });

  it("rejects a question over 4000 characters", () => {
    const result = SendMessageBody.safeParse({ question: "a".repeat(4001) });
    expect(result.success).toBe(false);
  });
});
