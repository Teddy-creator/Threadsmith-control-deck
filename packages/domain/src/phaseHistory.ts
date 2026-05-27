import { z } from "zod";

export const phaseHistoryResultSchema = z.enum([
  "accepted",
  "blocked",
  "needs-recovery",
  "in-progress"
]);

export const phaseHistorySourceSchema = z.object({
  kind: z.enum(["closeout", "phase-run", "manual"]),
  ref: z.string().min(1).nullable()
});

export const phaseHistoryEntrySchema = z.object({
  id: z.string().min(1),
  phaseName: z.string().min(1),
  result: phaseHistoryResultSchema,
  summary: z.string().min(1),
  startedAt: z.string().min(1).nullable(),
  completedAt: z.string().min(1).nullable(),
  deliverables: z.array(z.string().min(1)),
  verification: z.array(z.string().min(1)),
  evidenceRefs: z.array(z.string().min(1)),
  nextPhase: z.string().min(1).nullable(),
  risks: z.array(z.string().min(1)),
  source: phaseHistorySourceSchema,
  createdAt: z.string().min(1)
});

export type PhaseHistoryEntry = z.infer<typeof phaseHistoryEntrySchema>;
export type PhaseHistoryResult = z.infer<typeof phaseHistoryResultSchema>;
