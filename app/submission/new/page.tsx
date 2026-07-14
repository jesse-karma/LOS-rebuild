"use client";

import { useState } from "react";
import Link from "next/link";
import { SubmissionForm } from "@/components/submission/SubmissionForm";
import { emptySubmissionForm, newSubmissionId, StoredSubmission } from "@/lib/submissionsStore";
import { useProfile } from "@/lib/profileStore";
import { canCreateSubmission } from "@/lib/access";

export default function NewSubmissionPage() {
  const { user } = useProfile();
  // Create the draft shell once per mount; it is only persisted on Save/Submit.
  const [submission] = useState<StoredSubmission>(() => ({
    id: newSubmissionId(),
    status: "draft",
    createdAt: new Date().toISOString(),
    submittedAt: null,
    form: emptySubmissionForm(),
  }));

  if (!canCreateSubmission(user.team)) {
    return (
      <div className="text-sm text-gray-500">
        New submissions are created by the <strong>Investments Team</strong> (you are on the {user.team}).{" "}
        <Link href="/" className="text-blue-600 hover:underline">
          Back to submissions
        </Link>
      </div>
    );
  }

  return <SubmissionForm submission={submission} isNew />;
}
