import type { ExecutionResult } from "@threadsmith/domain";
import type { readAgentRunPacket } from "./agentRuns.ts";

export function providerLabel(provider: ExecutionResult["provider"]) {
  switch (provider) {
    case "codex":
      return "Codex";
    case "claude":
      return "Claude";
    default:
      return provider;
  }
}

export function automationFailureGap(result: ExecutionResult) {
  return result.blocker?.trim() || result.summary.trim();
}

function isReportingFailureAfterSuccessfulTask(result: ExecutionResult) {
  return (
    result.outcome === "failed" &&
    result.taskOutcome === "succeeded" &&
    result.failureStage === "result-reporting"
  );
}

export function executorFailureTaskSummary(result: ExecutionResult) {
  if (isReportingFailureAfterSuccessfulTask(result)) {
    return "任务主体已完成，但结果上报失败，等待修复 bridge / CLI 回流";
  }

  return "自动执行失败，等待修复后重试";
}

export function failedRunEventTitle(result: ExecutionResult) {
  if (isReportingFailureAfterSuccessfulTask(result)) {
    return `${providerLabel(result.provider)} 的 ${result.role} 在结果上报阶段失败`;
  }

  return `${providerLabel(result.provider)} 的 ${result.role} 执行失败`;
}

export function failedRunEventDetail(
  result: ExecutionResult,
  artifactPath?: string
) {
  if (isReportingFailureAfterSuccessfulTask(result)) {
    return `任务主体已完成，但结果上报失败：${automationFailureGap(result)}${artifactPath ? ` Artifact：${artifactPath}` : ""}`;
  }

  return `失败原因：${automationFailureGap(result)}${artifactPath ? ` Artifact：${artifactPath}` : ""}`;
}

export function runArtifactPath(
  summaryPath: string | null,
  resultPath: string | null
) {
  return summaryPath ?? resultPath ?? undefined;
}

export function isArtifactOnlyRun(
  packet: Awaited<ReturnType<typeof readAgentRunPacket>>
) {
  return packet.workflowEffect === "artifact-only";
}
