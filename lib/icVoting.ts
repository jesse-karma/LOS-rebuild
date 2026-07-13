import { ICProject } from "@/data/types";

/**
 * IC voting tiers (verified onboarding reference):
 * ≤ Rp 4B → IC Principal single approval; > 4–6B → ≥2 IC votes; > 6B → ≥3 votes.
 * Threshold basis = highest amount on the submission (icVoteBasisAmount when set).
 */
export function requiredVotes(project: ICProject): number {
  const amount = project.icVoteBasisAmount ?? project.trancheTargetAmount ?? project.requestedAmount;
  if (amount > 6_000_000_000) return 3;
  if (amount > 4_000_000_000) return 2;
  return 1;
}

export function votesCast(project: ICProject): number {
  return project.icVotes.filter((v) => v.vote !== null).length;
}

export function votesRemaining(project: ICProject): number {
  return Math.max(0, requiredVotes(project) - votesCast(project));
}

/** True when this IC member has not voted on the project yet. */
export function needsVoteFrom(project: ICProject, memberName: string): boolean {
  return project.icVotes.some((v) => v.memberName === memberName && v.vote === null);
}

export function daysWaiting(submittedAtIso: string): number {
  return Math.max(0, Math.floor((Date.now() - new Date(submittedAtIso).getTime()) / (1000 * 60 * 60 * 24)));
}
