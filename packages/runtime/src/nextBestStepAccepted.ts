import type { LatestContinuationState } from "./continuationState.ts";
import type { NextBestStepDecision } from "./nextBestStepModel.ts";
import { recommendation } from "./nextBestStepModel.ts";

export function acceptedStateRecommendation(
  latestContinuationState: LatestContinuationState
): NextBestStepDecision {
  if (latestContinuationState.status === "available") {
    if (latestContinuationState.freshness === "stale") {
      return {
        primary: recommendation(
          "create-handoff",
          "刷新 continuation packet",
          "已经有 packet 了，但它之后又出现了更新的 workflow truth，所以现在最稳妥的动作是刷新 handoff 边界。",
          ["hygiene", "closeout"],
          "最新的 continuation packet 与当前已接受 truth 保持一致。"
        ),
        alternatives: [
          recommendation(
            "open-current-phase",
            "查看已接受的 phase",
            "在重新生成 packet 之前，先检查最新已接受的边界。",
            ["planner"],
            "当前已接受的 slice 已被完整理解。"
          ),
          recommendation(
            "run-hygiene",
            "刷新前先重新锚定",
            "如果你想在替换过期 packet 前先做一次轻量 hygiene，这会很合适。",
            ["hygiene"],
            "当前 truth 已为 packet 刷新重新锚定。"
          )
        ]
      };
    }

    if (latestContinuationState.kind === "handoff") {
      return {
        primary: recommendation(
          "open-current-phase",
          "起草下一刀并准备 phase reset",
          "上一刀已经 accepted，而且最新 handoff packet 已经就绪；最佳下一步不是重复查看，而是基于这份边界收束下一条窄 slice，并准备正式的 phase reset。",
          ["planner", "hygiene"],
          "新的 current phase draft 已准备好，并且可以正式 phase reset。"
        ),
        alternatives: [
          recommendation(
            "run-hygiene",
            "为下一 slice 重新锚定",
            "如果你想在继续使用这个 packet 前再做一次 hygiene，这会很有用。",
            ["hygiene"],
            "当前 truth 已为下一步重新锚定。"
          ),
          recommendation(
            "open-current-phase",
            "查看 accepted handoff 边界",
            "如果你想先重新阅读上一刀的 accepted 边界与 packet 内容，可以先从这里开始。",
            ["planner"],
            "当前已接受的 slice 与 handoff 边界已被完整理解。"
          )
        ]
      };
    }

    return {
      primary: recommendation(
        "create-handoff",
        "打包已接受状态",
        "虽然已经有 hygiene packet，但已接受的 slice 仍然更适合为下一 phase 生成一个专用 handoff packet。",
        ["hygiene", "closeout"],
        "下一 phase 已有可复用的 handoff packet。"
      ),
      alternatives: [
        recommendation(
          "open-current-phase",
          "查看已接受的 phase",
          "在继续前先检查已经完成的 phase contract 和 acceptance 状态。",
          ["planner"],
          "当前已接受的 slice 已被完整理解。"
        ),
        recommendation(
          "run-hygiene",
          "为下一 slice 重新锚定",
          "在起草下一 phase 或切到新的 continuation 之前这样做会更稳。",
          ["hygiene"],
          "当前 truth 已为下一步重新锚定。"
        )
      ]
    };
  }

  return {
    primary: recommendation(
      "create-handoff",
      "打包已接受状态",
      "这个 slice 已被接受，因此最佳下一步是保留一个干净的 continuation 点或 phase handoff。",
      ["hygiene", "closeout"],
      "下一 phase 已有可复用的 continuation packet。"
    ),
    alternatives: [
      recommendation(
        "open-current-phase",
        "查看已接受的 phase",
        "在继续前先检查已经完成的 phase contract 和 acceptance 状态。",
        ["planner"],
        "当前已接受的 slice 已被完整理解。"
      ),
      recommendation(
        "run-hygiene",
        "为下一 slice 重新锚定",
        "在起草下一 phase 或切到新的 continuation 之前这样做会更稳。",
        ["hygiene"],
        "当前 truth 已为下一步重新锚定。"
      )
    ]
  };
}
