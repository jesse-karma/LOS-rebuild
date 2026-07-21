import { Check, X } from "lucide-react";
import { Stage, STAGE_LABELS, STAGE_ORDER } from "@/lib/access";

interface Props {
  stage: Stage;
  /** IC rejected — the IC Review step renders red and the flow stops there. */
  rejected?: boolean;
  /** KP wants different terms — the KP Confirmation step renders amber (not red — IC approved it). */
  kpNegotiating?: boolean;
}

/** Horizontal lifecycle stepper: Funding Lead → IC Review → KP Confirmation → Legal → Finance → Onboarded. */
export function StageStepper({ stage, rejected = false, kpNegotiating = false }: Props) {
  const currentIndex = STAGE_ORDER.indexOf(stage);

  return (
    <div className="flex items-center gap-1 overflow-x-auto py-1" aria-label="Project stage">
      {STAGE_ORDER.map((s, i) => {
        const isCurrent = i === currentIndex;
        const isDone = i < currentIndex || (stage === "onboarded" && isCurrent);
        const isRejectedStep = rejected && s === "ic_review";
        const isNegotiatingStep = kpNegotiating && s === "kp_confirmation";
        return (
          <div key={s} className="flex items-center gap-1 shrink-0">
            {i > 0 && <div className={`w-6 h-px ${i <= currentIndex ? "bg-blue-300" : "bg-gray-200"}`} />}
            <div
              className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border whitespace-nowrap ${
                isRejectedStep
                  ? "bg-red-50 text-red-700 border-red-200"
                  : isNegotiatingStep
                  ? "bg-amber-50 text-amber-700 border-amber-200"
                  : isDone
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : isCurrent
                  ? "bg-blue-50 text-blue-700 border-blue-300"
                  : "bg-gray-50 text-gray-400 border-gray-200"
              }`}
            >
              {isRejectedStep ? (
                <X className="w-3 h-3" />
              ) : isNegotiatingStep ? (
                <X className="w-3 h-3" />
              ) : isDone ? (
                <Check className="w-3 h-3" />
              ) : null}
              {STAGE_LABELS[s]}
              {isRejectedStep && <span className="font-semibold">· Rejected</span>}
              {isNegotiatingStep && <span className="font-semibold">· Negotiating</span>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
