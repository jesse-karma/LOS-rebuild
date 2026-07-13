"use client";

import { useState } from "react";
import { SubmissionForm } from "@/components/submission/SubmissionForm";
import { emptySubmissionForm, newSubmissionId, StoredSubmission } from "@/lib/submissionsStore";

export default function NewSubmissionPage() {
  // Create the draft shell once per mount; it is only persisted on Save/Submit.
  const [submission] = useState<StoredSubmission>(() => ({
    id: newSubmissionId(),
    status: "draft",
    createdAt: new Date().toISOString(),
    submittedAt: null,
    form: emptySubmissionForm(),
  }));

  return <SubmissionForm submission={submission} isNew />;
}
