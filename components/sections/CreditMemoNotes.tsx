"use client";

import { useState } from "react";
import { CreditMemoSection, ICProject, NoteEntry } from "@/data/types";
import { SectionCard } from "@/components/ui/SectionCard";
import { ExternalLink, Trash2, Pencil } from "lucide-react";
import { useProfile } from "@/lib/profileStore";
import { ProjectWorkflow } from "@/lib/workflowStore";

interface Props {
  project: ICProject;
  workflow: ProjectWorkflow;
  onWorkflowChange: (wf: ProjectWorkflow) => void;
}

const NOTE_TYPES: NoteEntry["noteType"][] = ["Project Note", "KP Note"];

function MemoBlock({ title, content }: { title: string; content: string }) {
  return (
    <div className="mb-4">
      <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">{title}</div>
      <div className="bg-gray-50 border border-gray-100 rounded-lg p-3 text-sm text-gray-800 whitespace-pre-wrap leading-relaxed max-h-40 overflow-y-auto">
        {content}
      </div>
    </div>
  );
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

/** Structured credit memo (KP or Project) — read-only, question by question, grouped by section. */
function MemoSectionsBlock({ title, sections }: { title: string; sections: CreditMemoSection[] }) {
  return (
    <div className="mb-4 pt-3 border-t-2 border-gray-200 first:pt-0 first:border-t-0">
      <div className="text-sm font-bold text-gray-900 mb-2">{title}</div>
      <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
        {sections.map((section) => (
          <div key={section.id}>
            {section.title && (
              <div className="flex items-center justify-between gap-2 mb-1 flex-wrap">
                <div className="text-xs font-semibold text-gray-700">{section.title}</div>
                {section.lastCheckedDate && (
                  <span className="text-[10px] text-gray-400">Last Checked: {fmtDate(section.lastCheckedDate)}</span>
                )}
              </div>
            )}
            <table className="w-full text-xs border border-gray-100 rounded-lg overflow-hidden">
              <tbody className="divide-y divide-gray-50">
                {section.questions.map((q) => (
                  <tr key={q.id} className="align-top">
                    <td className="py-2 pl-3 pr-2 w-52 text-gray-500 bg-gray-50">{q.label}</td>
                    <td className="py-2 px-2 text-gray-800 whitespace-pre-wrap leading-relaxed">
                      {q.answer.trim() || <span className="text-gray-300">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>
    </div>
  );
}

export function CreditMemoNotes({ project, workflow, onWorkflowChange }: Props) {
  const { user } = useProfile();
  const notes = workflow.notes ?? project.projectNotes;
  const isPlafondView = project.approvalType.includes("Plafond");

  const [filter, setFilter] = useState<"All" | NoteEntry["noteType"]>("All");
  const [adding, setAdding] = useState(false);
  const [draftType, setDraftType] = useState<NoteEntry["noteType"]>("Project Note");
  const [draftContent, setDraftContent] = useState("");
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editContent, setEditContent] = useState("");

  function saveNotes(next: NoteEntry[]) {
    onWorkflowChange({ ...workflow, notes: next });
  }

  function handleAdd() {
    if (!draftContent.trim()) return;
    saveNotes([{ author: user.name, date: new Date().toISOString(), content: draftContent.trim(), noteType: draftType }, ...notes]);
    setDraftContent("");
    setDraftType("Project Note");
    setAdding(false);
  }

  function handleSaveEdit(index: number) {
    if (!editContent.trim()) return;
    saveNotes(notes.map((n, i) => (i === index ? { ...n, content: editContent.trim() } : n)));
    setEditingIndex(null);
  }

  function handleDelete(index: number) {
    if (!window.confirm("Delete this note? This can't be undone.")) return;
    saveNotes(notes.filter((_, i) => i !== index));
  }

  // Project view: Project Notes first, then KP Notes (each newest-first). Plafond view: all newest-first.
  const sorted = isPlafondView
    ? [...notes].sort((a, b) => b.date.localeCompare(a.date))
    : [
        ...notes.filter((n) => n.noteType === "Project Note").sort((a, b) => b.date.localeCompare(a.date)),
        ...notes.filter((n) => n.noteType === "KP Note").sort((a, b) => b.date.localeCompare(a.date)),
      ];
  const visible = filter === "All" ? sorted : sorted.filter((n) => n.noteType === filter);

  return (
    <SectionCard title="Credit Memo & Notes">
      <div className="mt-2 space-y-2">
        {project.kpCreditMemoSections && project.kpCreditMemoSections.length > 0 ? (
          <MemoSectionsBlock title="Company (KP) Credit Memo" sections={project.kpCreditMemoSections} />
        ) : (
          <MemoBlock title="KP Credit Memo" content={project.kpCreditMemo} />
        )}
        {project.projectCreditMemoSections && project.projectCreditMemoSections.length > 0 ? (
          <MemoSectionsBlock title="Project Credit Memo" sections={project.projectCreditMemoSections} />
        ) : (
          <MemoBlock title="Project Credit Memo" content={project.projectCreditMemo} />
        )}

        {project.financialsLink && (
          <div className="mb-3">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Financials</div>
            <a
              href={project.financialsLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:underline"
            >
              Open financial documents <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        )}

        <div>
          <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Notes Feed</div>
            <div className="flex items-center gap-2">
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value as "All" | NoteEntry["noteType"])}
                className="text-xs border border-gray-200 rounded-lg px-2 py-1 text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-300"
                aria-label="Filter by Note Type"
              >
                <option value="All">All notes</option>
                {NOTE_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
              {!adding && (
                <button
                  type="button"
                  onClick={() => setAdding(true)}
                  className="text-xs font-medium text-blue-600 hover:text-blue-800"
                >
                  + New Note
                </button>
              )}
            </div>
          </div>

          {adding && (
            <div className="border border-blue-200 bg-blue-50/40 rounded-lg p-3 mb-3 space-y-2">
              <select
                value={draftType}
                onChange={(e) => setDraftType(e.target.value as NoteEntry["noteType"])}
                className="text-xs border border-gray-200 rounded-lg px-2 py-1 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-300"
              >
                {NOTE_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
              <textarea
                value={draftContent}
                onChange={(e) => setDraftContent(e.target.value)}
                rows={3}
                placeholder="Write a note…"
                className="w-full border border-gray-200 rounded-lg p-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-300 resize-y"
                autoFocus
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleAdd}
                  disabled={!draftContent.trim()}
                  className="text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed px-3 py-1.5 rounded-lg"
                >
                  Save Note
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAdding(false);
                    setDraftContent("");
                  }}
                  className="text-xs text-gray-500 hover:text-gray-700 px-3 py-1.5"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {visible.length > 0 ? (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {visible.map((note) => {
                const index = notes.indexOf(note);
                const isMine = note.author === user.name;
                const isEditing = editingIndex === index;
                return (
                  <div key={index} className="bg-white border border-gray-100 rounded-lg px-3 py-2.5">
                    <div className="flex items-center justify-between mb-1 flex-wrap gap-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-medium text-gray-700">{note.author}</span>
                        <span className="text-[10px] text-gray-400 bg-gray-50 border border-gray-200 rounded px-1.5 py-0.5">
                          {note.noteType}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-400">{fmtDate(note.date)}</span>
                        {isMine && !isEditing && (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingIndex(index);
                                setEditContent(note.content);
                              }}
                              className="text-gray-400 hover:text-blue-600"
                              aria-label="Edit note"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(index)}
                              className="text-gray-400 hover:text-red-600"
                              aria-label="Delete note"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                    {isEditing ? (
                      <div className="space-y-1.5">
                        <textarea
                          value={editContent}
                          onChange={(e) => setEditContent(e.target.value)}
                          rows={3}
                          className="w-full border border-gray-200 rounded-lg p-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-300 resize-y"
                          autoFocus
                        />
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => handleSaveEdit(index)}
                            disabled={!editContent.trim()}
                            className="text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed px-3 py-1 rounded-lg"
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingIndex(null)}
                            className="text-xs text-gray-500 hover:text-gray-700 px-3 py-1"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-800 leading-relaxed">{note.content}</p>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-gray-400 italic">No notes yet.</p>
          )}
        </div>
      </div>
    </SectionCard>
  );
}
