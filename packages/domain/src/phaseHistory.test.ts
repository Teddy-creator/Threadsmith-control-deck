import { describe, expect, it } from "vitest";
import { phaseHistoryEntrySchema } from "./phaseHistory.ts";

describe("phaseHistory", () => {
  it("validates a durable project path entry", () => {
    const entry = phaseHistoryEntrySchema.parse({
      id: "phase-history-1",
      phaseName: "Message Processing Gate v1",
      result: "accepted",
      summary: "消息入队后会先经过只读 gate 判断是否能等待下一次 tick。",
      startedAt: "2026-05-27T00:00:00.000Z",
      completedAt: "2026-05-27T00:30:00.000Z",
      deliverables: ["commit 4097e8a", "GET /runtime/user-message-processing-gate"],
      verification: ["npm run runtime:test"],
      evidenceRefs: [".threadsmith/acceptance-state.json"],
      nextPhase: "Runtime Scheduler / Wake Request v1",
      risks: ["尚未恢复发送即推进"],
      source: {
        kind: "closeout",
        ref: ".threadsmith/acceptance-state.json"
      },
      createdAt: "2026-05-27T00:31:00.000Z"
    });

    expect(entry.result).toBe("accepted");
    expect(entry.nextPhase).toContain("Runtime Scheduler");
  });
});
