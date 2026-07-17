"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CheckSquare,
  ChevronRight,
  FileText,
  Phone,
  Plus,
  Search,
  Trash2,
  User,
  X,
} from "lucide-react";
import {
  addNote,
  advanceStage,
  createCard,
  deleteCard,
  getCards,
  moveToStage,
  seedExampleCards,
  toggleChecklist,
  BoardAnalyst,
  BoardCard,
  BoardStage,
} from "@/lib/boardStore";
import { APP_USERS } from "@/lib/profileStore";
import { useProfile } from "@/lib/profileStore";
import { ASSET_CLASSES, MasterAssetClass } from "@/data/masterData";
import { Tag, assetClassVariant } from "@/components/ui/Tag";
import { allReviewProjects, getAllBrands } from "@/lib/submissionsStore";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function checklistProgress(card: BoardCard) {
  const done = card.checklist.filter((i) => i.done).length;
  return { done, total: card.checklist.length };
}

const ANALYST_OPTIONS = APP_USERS.filter((u) => u.team === "Investments Team");

// ─── Stage config ─────────────────────────────────────────────────────────────

const STAGES: { key: BoardStage; label: string; description: string }[] = [
  { key: 1, label: "Early Lead", description: "Add the KP and take meeting notes." },
  { key: 2, label: "Funding Lead", description: "Collect required documents and information." },
  { key: 3, label: "Due Diligence", description: "Ready to submit. Open the submission form." },
];

// ─── New Lead/Project modal ───────────────────────────────────────────────────

/** Best contact (Key Person, else first) on file for an existing brand — used to autofill the form. */
function findExistingBrandContact(brandName: string): { name: string; whatsapp: string } | null {
  const trimmed = brandName.trim().toLowerCase();
  if (!trimmed) return null;
  const projects = allReviewProjects().filter((p) => p.brandName.trim().toLowerCase() === trimmed);
  if (projects.length === 0) return null;
  const latest = [...projects].sort((a, b) => b.submittedAt.localeCompare(a.submittedAt))[0];
  const contact = latest.kpContacts.find((c) => c.isKeyPerson) ?? latest.kpContacts[0];
  return contact ? { name: contact.name, whatsapp: contact.whatsapp } : null;
}

function NewLeadModal({
  defaultAnalyst,
  onClose,
  onCreate,
}: {
  defaultAnalyst: BoardAnalyst | null;
  onClose: () => void;
  onCreate: (card: BoardCard) => void;
}) {
  const [kpName, setKpName] = useState("");
  const [projectName, setProjectName] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactWhatsapp, setContactWhatsapp] = useState("");
  const [assetClass, setAssetClass] = useState<MasterAssetClass | "">("");
  const [analystId, setAnalystId] = useState(defaultAnalyst?.id ?? "");
  const inputRef = useRef<HTMLInputElement>(null);
  const existingBrands = useMemo(() => getAllBrands(), []);
  // Tracks what we last auto-filled, so a manual edit "sticks" instead of getting overwritten
  // the next time this effect runs (e.g. typing continues and still matches the same brand).
  const lastAutoFillRef = useRef<{ name: string; whatsapp: string } | null>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Existing brand typed in → autofill its contact, but only into fields the analyst hasn't
  // already touched (blank, or still equal to whatever we last auto-filled).
  useEffect(() => {
    const match = existingBrands.find((b) => b.toLowerCase() === kpName.trim().toLowerCase());
    if (!match) return;
    const contact = findExistingBrandContact(match);
    if (!contact) return;

    setContactName((prev) => {
      const last = lastAutoFillRef.current;
      const untouched = prev === "" || (last !== null && prev === last.name);
      return untouched ? contact.name : prev;
    });
    setContactWhatsapp((prev) => {
      const last = lastAutoFillRef.current;
      const untouched = prev === "" || (last !== null && prev === last.whatsapp);
      return untouched ? contact.whatsapp : prev;
    });
    lastAutoFillRef.current = contact;
  }, [kpName, existingBrands]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!kpName.trim() || !projectName.trim()) return;
    const analyst = ANALYST_OPTIONS.find((u) => u.id === analystId);
    const card = createCard(
      kpName,
      projectName,
      contactName,
      contactWhatsapp,
      assetClass || null,
      analyst ? { id: analyst.id, name: analyst.name } : null
    );
    onCreate(card);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold text-gray-900">New Lead / Project</h2>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-4 h-4" />
          </button>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">KP / Brand name</label>
            <input
              ref={inputRef}
              value={kpName}
              onChange={(e) => setKpName(e.target.value)}
              placeholder="e.g. Ciomy — new or existing"
              list="new-lead-existing-brands"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            />
            <datalist id="new-lead-existing-brands">
              {existingBrands.map((b) => (
                <option key={b} value={b} />
              ))}
            </datalist>
            <p className="text-[11px] text-gray-400 mt-1">
              Matches an existing brand? Contact info below autofills — edit or replace it freely.
            </p>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Project name</label>
            <input
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="e.g. WC Facility — Q3 2026"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Contact name</label>
            <input
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
              placeholder="e.g. Budi Santoso"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Contact WhatsApp</label>
            <input
              value={contactWhatsapp}
              onChange={(e) => setContactWhatsapp(e.target.value)}
              placeholder="e.g. +62 812 3456 7890"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Asset Class (optional)</label>
            <select
              value={assetClass}
              onChange={(e) => setAssetClass(e.target.value as MasterAssetClass | "")}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            >
              <option value="">— Unassigned —</option>
              {ASSET_CLASSES.map((a) => (
                <option key={a} value={a}>Asset {a}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Primary Analyst</label>
            <select
              value={analystId}
              onChange={(e) => setAnalystId(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            >
              <option value="">— Unassigned —</option>
              {ANALYST_OPTIONS.map((u) => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            disabled={!kpName.trim() || !projectName.trim()}
            className="w-full bg-orange-600 text-white text-sm font-medium py-2 rounded-lg hover:bg-orange-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Add Lead / Project
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── Card detail panel ────────────────────────────────────────────────────────

function CardDetail({
  card: initial,
  onClose,
  onChange,
  onDelete,
}: {
  card: BoardCard;
  onClose: () => void;
  onChange: (card: BoardCard) => void;
  onDelete: () => void;
}) {
  const [card, setCard] = useState(initial);
  const [noteText, setNoteText] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const notesEndRef = useRef<HTMLDivElement>(null);

  function handleAddNote(e: React.FormEvent) {
    e.preventDefault();
    if (!noteText.trim()) return;
    const updated = addNote(card.id, noteText);
    if (updated) { setCard(updated); onChange(updated); }
    setNoteText("");
    setTimeout(() => notesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
  }

  function handleToggle(itemId: string) {
    const updated = toggleChecklist(card.id, itemId);
    if (updated) { setCard(updated); onChange(updated); }
  }

  function handleAdvance() {
    const updated = advanceStage(card.id);
    if (updated) { setCard(updated); onChange(updated); }
  }

  function handleDelete() {
    deleteCard(card.id);
    onDelete();
  }

  const { done, total } = checklistProgress(card);
  const pct = total ? Math.round((done / total) * 100) : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-stretch justify-end bg-black/30">
      <div className="flex-1" onClick={onClose} />
      <div className="w-full max-w-md bg-white shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-gray-200">
          <div className="min-w-0">
            <p className="text-xs text-gray-500 mb-0.5">{card.kpName}</p>
            <h2 className="text-sm font-semibold text-gray-900 leading-snug">{card.projectName}</h2>
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-orange-50 text-orange-700 border border-orange-200">
                Stage {card.stage} · {STAGES[card.stage - 1].label}
              </span>
              {card.primaryAnalyst && (
                <span className="text-xs text-gray-500 flex items-center gap-1">
                  <User className="w-3 h-3" />
                  {card.primaryAnalyst.name}
                </span>
              )}
              {card.contactName && (
                <span className="text-xs text-gray-500 flex items-center gap-1">
                  <Phone className="w-3 h-3" />
                  {card.contactName}
                  {card.contactWhatsapp && ` · ${card.contactWhatsapp}`}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {card.stage < 3 && (
              <button
                type="button"
                onClick={handleAdvance}
                title={`Move to ${STAGES[card.stage].label}`}
                className="flex items-center gap-1 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-1.5 rounded-lg hover:bg-blue-100 transition-colors"
              >
                <ChevronRight className="w-3.5 h-3.5" />
                {STAGES[card.stage].label}
              </button>
            )}
            <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">

          {/* Stage 1+ — Notes */}
          <section>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5" /> Meeting Notes
            </h3>
            {card.notes.length === 0 ? (
              <p className="text-xs text-gray-400 italic">No notes yet — add the first one below.</p>
            ) : (
              <div className="space-y-2">
                {card.notes.map((n) => (
                  <div key={n.id} className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                    <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">{n.text}</p>
                    <p className="text-xs text-gray-400 mt-1.5">
                      {fmtDate(n.createdAt)} · {fmtTime(n.createdAt)}
                    </p>
                  </div>
                ))}
                <div ref={notesEndRef} />
              </div>
            )}
            <form onSubmit={handleAddNote} className="mt-3">
              <textarea
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="Add a meeting note…"
                rows={3}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 resize-none"
              />
              <button
                type="submit"
                disabled={!noteText.trim()}
                className="mt-2 text-xs font-medium bg-gray-900 text-white px-3 py-1.5 rounded-lg hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Save note
              </button>
            </form>
          </section>

          {/* Stage 2+ — Checklist */}
          {card.stage >= 2 && (
            <section>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1.5">
                  <CheckSquare className="w-3.5 h-3.5" /> Documents & Data
                </h3>
                <span className="text-xs font-semibold text-gray-700">{done}/{total}</span>
              </div>
              <div className="h-1.5 bg-gray-200 rounded-full mb-3 overflow-hidden">
                <div
                  className="h-full bg-orange-500 rounded-full transition-all duration-300"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <div className="space-y-1.5">
                {card.checklist.map((item) => (
                  <label
                    key={item.id}
                    className="flex items-center gap-3 cursor-pointer py-1 px-2 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={item.done}
                      onChange={() => handleToggle(item.id)}
                      className="w-4 h-4 accent-orange-600 shrink-0"
                    />
                    <span className={`text-sm leading-snug transition-colors ${item.done ? "text-gray-400 line-through" : "text-gray-700"}`}>
                      {item.label}
                    </span>
                  </label>
                ))}
              </div>
            </section>
          )}

          {/* Stage 3 — Submission */}
          {card.stage === 3 && (
            <section className="border border-green-200 bg-green-50 rounded-xl p-4">
              <p className="text-sm font-semibold text-green-800 mb-1">Ready for Due Diligence</p>
              <p className="text-xs text-green-700 mb-3">
                Open the submission form to begin the formal DD process in the LOS.
              </p>
              <Link
                href="/submission/new"
                className="inline-flex items-center gap-2 text-sm font-medium bg-green-700 text-white px-4 py-2 rounded-lg hover:bg-green-800 transition-colors"
              >
                <ArrowRight className="w-4 h-4" />
                Open Submission Form
              </Link>
            </section>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-400">
          <span>Added {fmtDate(card.createdAt)}</span>
          {confirmDelete ? (
            <div className="flex items-center gap-2">
              <span className="text-red-600 font-medium">Delete this lead?</span>
              <button type="button" onClick={handleDelete} className="text-red-600 font-semibold hover:text-red-800">
                Yes, delete
              </button>
              <button type="button" onClick={() => setConfirmDelete(false)} className="hover:text-gray-600">
                Cancel
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="flex items-center gap-1 text-gray-400 hover:text-red-600 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete lead
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Board card ───────────────────────────────────────────────────────────────

function KanbanCard({
  card,
  onClick,
  onDragStart,
}: {
  card: BoardCard;
  onClick: () => void;
  onDragStart: (e: React.DragEvent) => void;
}) {
  const { done, total } = checklistProgress(card);
  const latestNote = card.notes[card.notes.length - 1];

  return (
    <article
      draggable
      onDragStart={onDragStart}
      onClick={onClick}
      className="bg-white border border-gray-200 rounded-lg shadow-sm p-3 cursor-grab active:cursor-grabbing hover:shadow-md hover:border-orange-200 transition-all"
    >
      <p className="text-xs text-gray-500 mb-0.5 truncate">{card.kpName}</p>
      <p className="text-sm font-medium text-gray-900 leading-snug mb-1.5">{card.projectName}</p>
      {card.assetClass && (
        <div className="mb-2">
          <Tag label={`Asset ${card.assetClass}`} variant={assetClassVariant(`Asset ${card.assetClass}`)} />
        </div>
      )}

      {card.stage === 1 && (
        <div className="space-y-1">
          <span className="text-xs text-gray-400">
            {card.notes.length === 0 ? "No notes yet" : `${card.notes.length} note${card.notes.length > 1 ? "s" : ""}`}
          </span>
          {latestNote && (
            <p className="text-xs text-gray-400 line-clamp-2 leading-relaxed">{latestNote.text}</p>
          )}
        </div>
      )}

      {card.stage === 2 && (
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-gray-400">Documents</span>
            <span className="text-xs font-semibold text-gray-600">{done}/{total}</span>
          </div>
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-orange-400 rounded-full transition-all"
              style={{ width: `${total ? Math.round((done / total) * 100) : 0}%` }}
            />
          </div>
        </div>
      )}

      {card.stage === 3 && (
        <Link
          href="/submission/new"
          onClick={(e) => e.stopPropagation()}
          className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded border bg-green-50 text-green-700 border-green-200 hover:bg-green-100 transition-colors"
        >
          Submission Form
          <ArrowRight className="w-3 h-3" />
        </Link>
      )}

      <div className="flex items-center justify-between mt-2">
        <span className="text-xs text-gray-300">{fmtDate(card.createdAt)}</span>
        {card.primaryAnalyst && (
          <span className="text-xs text-gray-400 flex items-center gap-1">
            <User className="w-3 h-3" />
            {card.primaryAnalyst.name.split(" ")[0]}
          </span>
        )}
      </div>
    </article>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function BoardPage() {
  const { user } = useProfile();
  const [cards, setCards] = useState<BoardCard[]>([]);
  const [query, setQuery] = useState("");
  const [myCardsOnly, setMyCardsOnly] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [selected, setSelected] = useState<BoardCard | null>(null);
  const [dragOverStage, setDragOverStage] = useState<BoardStage | null>(null);

  useEffect(() => {
    seedExampleCards();
    setCards(getCards());
  }, []);

  function refresh() {
    setCards(getCards());
  }

  function handleCreate(card: BoardCard) {
    setShowNew(false);
    refresh();
    setSelected(card);
  }

  function handleCardChange(updated: BoardCard) {
    setCards((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
    setSelected(updated);
  }

  function handleCardDelete() {
    setSelected(null);
    refresh();
  }

  function handleDragStart(e: React.DragEvent, card: BoardCard) {
    e.dataTransfer.setData("text/plain", card.id);
    e.dataTransfer.effectAllowed = "move";
  }

  function handleDrop(e: React.DragEvent, targetStage: BoardStage) {
    e.preventDefault();
    setDragOverStage(null);
    const cardId = e.dataTransfer.getData("text/plain");
    const card = cards.find((c) => c.id === cardId);
    if (!card || card.stage === targetStage) return;
    const updated = moveToStage(cardId, targetStage);
    if (updated) setCards((prev) => prev.map((c) => (c.id === cardId ? updated : c)));
  }

  const visibleCards = cards
    .filter((c) => (myCardsOnly ? c.primaryAnalyst?.id === user.id : true))
    .filter((c) => {
      const q = query.trim().toLowerCase();
      if (!q) return true;
      return (
        c.kpName.toLowerCase().includes(q) ||
        c.projectName.toLowerCase().includes(q) ||
        (c.contactName ?? "").toLowerCase().includes(q)
      );
    });

  const columns = STAGES.map((s) => ({
    ...s,
    items: visibleCards.filter((c) => c.stage === s.key),
  }));

  const myCardCount = cards.filter((c) => c.primaryAnalyst?.id === user.id).length;

  return (
    <div className="p-6 max-w-full">
      {/* Page header */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Board</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Pre-submission lead pipeline — lead intake to due diligence.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowNew(true)}
          className="flex items-center gap-2 bg-orange-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-orange-700 transition-colors shadow-sm shrink-0"
        >
          <Plus className="w-4 h-4" />
          New Lead/Project
        </button>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3 mb-5">
        <div className="relative flex-1 min-w-56 max-w-xs">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            className="w-full border border-gray-300 rounded-lg pl-9 pr-3 py-2 text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            placeholder="Search leads, brand, or contact…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <button
          type="button"
          onClick={() => setMyCardsOnly((v) => !v)}
          className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${
            myCardsOnly
              ? "bg-orange-600 text-white border-orange-600"
              : "bg-white text-gray-600 border-gray-300 hover:border-orange-400 hover:text-orange-600"
          }`}
        >
          <User className="w-3.5 h-3.5" />
          My Cards
          {myCardsOnly && myCardCount > 0 && (
            <span className="ml-0.5 bg-white/30 rounded-full px-1.5 py-0.5 text-[10px] leading-none">
              {myCardCount}
            </span>
          )}
        </button>
      </div>

      {/* Board */}
      <div className="flex gap-4 overflow-x-auto pb-4">
        {columns.map((col) => (
          <div key={col.key} className="flex-1 min-w-[280px] max-w-[360px]">
            <div className="flex items-center justify-between mb-2.5 px-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-gray-700">{col.label}</span>
                <span className="text-xs text-gray-400 bg-gray-100 rounded-full px-2 py-0.5">
                  {col.items.length}
                </span>
              </div>
              {col.key === 1 && (
                <button
                  type="button"
                  onClick={() => setShowNew(true)}
                  className="text-gray-400 hover:text-orange-600 transition-colors"
                  title="Add lead/project"
                >
                  <Plus className="w-4 h-4" />
                </button>
              )}
            </div>

            <div
              onDragOver={(e) => { e.preventDefault(); setDragOverStage(col.key); }}
              onDragLeave={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                  setDragOverStage((cur) => (cur === col.key ? null : cur));
                }
              }}
              onDrop={(e) => handleDrop(e, col.key)}
              className={`rounded-xl p-2 space-y-2 min-h-[160px] border transition-colors ${
                dragOverStage === col.key
                  ? "bg-orange-50/60 border-orange-300"
                  : "bg-gray-50 border-gray-200"
              }`}
            >
              {col.items.map((card) => (
                <KanbanCard
                  key={card.id}
                  card={card}
                  onClick={() => setSelected(card)}
                  onDragStart={(e) => handleDragStart(e, card)}
                />
              ))}
              {col.items.length === 0 && (
                <p className="text-xs text-gray-400 text-center py-8">
                  {query
                    ? "No matches here."
                    : myCardsOnly
                    ? "None of your cards here."
                    : col.key === 1
                    ? "Add a lead to get started."
                    : "No leads here yet."}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      {showNew && (
        <NewLeadModal
          defaultAnalyst={{ id: user.id, name: user.name }}
          onClose={() => setShowNew(false)}
          onCreate={handleCreate}
        />
      )}
      {selected && (
        <CardDetail
          card={selected}
          onClose={() => setSelected(null)}
          onChange={handleCardChange}
          onDelete={handleCardDelete}
        />
      )}
    </div>
  );
}
