"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { SubmissionForm } from "@/components/submission/SubmissionForm";
import { getSubmission, StoredSubmission } from "@/lib/submissionsStore";

export default function EditSubmissionPage() {
  const { id } = useParams<{ id: string }>();
  const [submission, setSubmission] = useState<StoredSubmission | null | undefined>(undefined);

  // localStorage is client-only: resolve after mount to avoid hydration mismatch.
  useEffect(() => {
    setSubmission(getSubmission(id) ?? null);
  }, [id]);

  if (submission === undefined) {
    return <p className="text-sm text-gray-400">Loading draft…</p>;
  }

  if (submission === null) {
    return (
      <div className="text-sm text-gray-500">
        Draft not found.{" "}
        <Link href="/" className="text-blue-600 hover:underline">
          Back to submissions
        </Link>
      </div>
    );
  }

  return <SubmissionForm submission={submission} />;
}
