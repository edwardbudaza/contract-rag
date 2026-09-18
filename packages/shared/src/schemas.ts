// Shared Zod schemas for request/response validation.
// Mirrors docs/api/openapi.yaml — keep both in sync when either changes.

import { z } from "zod";

// ── Auth ─────────────────────────────────────────────────────────────────
export const RegisterBody = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});
export type RegisterBody = z.infer<typeof RegisterBody>;

export const LoginBody = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});
export type LoginBody = z.infer<typeof LoginBody>;

// ── Contracts ────────────────────────────────────────────────────────────
export const ContractStatus = z.enum([
  "UPLOADING",
  "PROCESSING",
  "ANALYZING",
  "READY",
  "FAILED",
  "DELETED",
]);

export const CreateContractBody = z.object({
  title: z.string().min(1).max(200),
});
export type CreateContractBody = z.infer<typeof CreateContractBody>;

export const PaginationQuery = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
export type PaginationQuery = z.infer<typeof PaginationQuery>;

// ── Documents ────────────────────────────────────────────────────────────
export const CreateDocumentBody = z.object({
  fileName: z.string().min(1),
  fileType: z.enum(["application/pdf", "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"]),
  fileSize: z.number().int().positive().max(50 * 1024 * 1024), // 50MB cap
});
export type CreateDocumentBody = z.infer<typeof CreateDocumentBody>;

// ── Analysis ─────────────────────────────────────────────────────────────
export const TriggerAnalysisBody = z.object({
  versionId: z.string().uuid().optional(),
});
export type TriggerAnalysisBody = z.infer<typeof TriggerAnalysisBody>;

export const RiskyClause = z.object({
  severity: z.enum(["low", "medium", "high"]),
  concern: z.string(),
  evidence: z.object({
    page: z.number().int().optional(),
    section: z.string().optional(),
    chunkId: z.string(),
  }),
});

export const AnalysisResult = z.object({
  summary: z.string(),
  parties: z.array(z.string()),
  obligations: z.array(z.string()),
  paymentTerms: z.string(),
  importantDates: z.array(z.string()),
  termination: z.string(),
  governingLaw: z.string(),
  riskyClauses: z.array(RiskyClause),
  missingProtections: z.array(z.string()),
  evidence: z.array(z.object({
    page: z.number().int().optional(),
    section: z.string().optional(),
    chunkId: z.string(),
  })),
});
export type AnalysisResult = z.infer<typeof AnalysisResult>;

// ── Chat ─────────────────────────────────────────────────────────────────
export const SendMessageBody = z.object({
  question: z.string().min(1).max(4000),
});
export type SendMessageBody = z.infer<typeof SendMessageBody>;

export const ChatSource = z.object({
  page: z.number().int().optional(),
  section: z.string().optional(),
  chunkId: z.string(),
  snippet: z.string(),
});

export const ChatAnswer = z.object({
  answer: z.string(),
  sources: z.array(ChatSource),
});
export type ChatAnswer = z.infer<typeof ChatAnswer>;

// ── Errors (RFC 7807) ───────────────────────────────────────────────────
export const Problem = z.object({
  type: z.string(),
  title: z.string(),
  detail: z.string().optional(),
  status: z.number().int(),
  requestId: z.string().optional(),
});
export type Problem = z.infer<typeof Problem>;
