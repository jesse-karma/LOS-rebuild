"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { LayoutGrid, List, Search } from "lucide-react";
import { Tag, TagVariant } from "@/components/ui/Tag";
import { MARKETING_REFERRAL_SOURCES, REFERRAL_SOURCES } from "@/data/masterData";
import { allReviewProjects, getAllBrands, listSubmissions, seedDemoSubmissions } from "@/lib/submissionsStore";

interface ContactEntry {
  name: string;
  brands: string[];
  whatsapp: string;
  email: string;
  tags: string[];
}

const MARKETING_SOURCES: readonly string[] = MARKETING_REFERRAL_SOURCES;

// Mock data has some inconsistent casing ("2nd+ project" vs "2nd+ Project") — normalize
// against the canonical list before collapsing down to the 4 simplified categories below.
const CANON_SOURCE = new Map(REFERRAL_SOURCES.map((s) => [s.toLowerCase(), s]));
function normalizeTag(raw: string): string {
  return CANON_SOURCE.get(raw.toLowerCase()) ?? raw;
}

// Simplified to 4 categories — KP Contact folds into Karmapreneur (they're the KP's own people);
// Karma Node, Potential Karmapreneur, and 2nd+ Project are dropped entirely (null = no tag).
const TAG_SIMPLIFY: Record<string, string | null> = {
  "KP Contact": "Karmapreneur",
  Karmapreneur: "Karmapreneur",
  "KarmaClub Member": "Karma Club Member",
  "Karma Staff": "Karma Staff",
  "Ex-Karma Staff": "Ex-Staff",
  "Karma Node": null,
  "Potential Karmapreneur": null,
  "2nd+ Project": null,
};
function simplifyTag(raw: string): string | null {
  return raw in TAG_SIMPLIFY ? TAG_SIMPLIFY[raw] : raw;
}

function tagVariant(tag: string): TagVariant {
  const map: Record<string, TagVariant> = {
    Karmapreneur: "purple",
    "Karma Club Member": "pink",
    "Karma Staff": "blue",
    "Ex-Staff": "gray",
  };
  return map[tag] ?? "default";
}

function upsert(
  map: Map<string, ContactEntry>,
  rawName: string,
  opts: { brand?: string | null; whatsapp?: string; email?: string; tag?: string | null }
) {
  const name = rawName.trim();
  if (!name) return;
  const key = name.toLowerCase();
  const entry = map.get(key) ?? { name, brands: [], whatsapp: "", email: "", tags: [] };
  if (opts.brand && !entry.brands.includes(opts.brand)) entry.brands.push(opts.brand);
  if (opts.whatsapp && !entry.whatsapp) entry.whatsapp = opts.whatsapp;
  if (opts.email && !entry.email) entry.email = opts.email;
  const tag = opts.tag ? simplifyTag(opts.tag) : null;
  if (tag && !entry.tags.includes(tag)) entry.tags.push(tag);
  map.set(key, entry);
}

/** Extracts "Name (Brand)" → { name, brand } — the format otherReferees is stored in. */
function parseRefereeEntry(raw: string): { name: string; brand: string | null } {
  const match = raw.match(/^(.*) \(([^)]+)\)$/);
  return match ? { name: match[1], brand: match[2] } : { name: raw, brand: null };
}

/** Every human in the referror ecosystem: KP contacts, plus everyone ever recorded as a referror
 *  (Karma Staff, Ex-Karma Staff, Karmapreneur, Karma Node, KarmaClub Member, etc.) — not just KP-side
 *  contacts. Marketing-only sources (Cold calling, website) have no person behind them and are skipped. */
function buildContactRows(): ContactEntry[] {
  const map = new Map<string, ContactEntry>();
  const projects = allReviewProjects();

  // KP Contacts — latest submission per brand (mirrors the Brand page's contacts table).
  getAllBrands().forEach((brandName) => {
    const brandProjects = projects.filter((p) => p.brandName === brandName);
    if (brandProjects.length === 0) return;
    const latest = [...brandProjects].sort((a, b) => b.submittedAt.localeCompare(a.submittedAt))[0];
    latest.kpContacts.forEach((c) => {
      upsert(map, c.name, { brand: brandName, whatsapp: c.whatsapp, email: c.email, tag: "KP Contact" });
    });
  });

  // Referrors recorded on every submitted/mock project.
  projects.forEach((p) => {
    if (p.specificReferror?.trim() && !MARKETING_SOURCES.includes(p.referralSource)) {
      upsert(map, p.specificReferror, { brand: p.referrorBelongsToKP, tag: normalizeTag(p.referralSource) });
    }
    p.otherReferees.forEach((raw) => {
      const { name, brand } = parseRefereeEntry(raw);
      upsert(map, name, { brand, tag: normalizeTag(p.referralSource) });
    });
  });

  // Referrors recorded on in-progress drafts too — each row carries its own relation type.
  listSubmissions()
    .filter((s) => s.status === "draft")
    .forEach((s) => {
      s.form.referrors.forEach((r) => {
        if (r.name.trim() && !MARKETING_SOURCES.includes(r.relationType)) {
          upsert(map, r.name, { brand: r.belongsToKP, tag: r.relationType ? normalizeTag(r.relationType) : null });
        }
      });
    });

  // Drop anyone left with no tag — their only mention was one of the erased categories.
  return Array.from(map.values())
    .filter((c) => c.tags.length > 0)
    .sort((a, b) => a.name.localeCompare(b.name));
}

function ContactCard({ c }: { c: ContactEntry }) {
  return (
    <article className="bg-white border border-gray-200 rounded-lg shadow-sm p-4">
      <div className="text-sm font-semibold text-gray-900 mb-1.5">{c.name}</div>
      <div className="flex items-center gap-1.5 flex-wrap mb-3">
        {c.tags.map((t) => (
          <Tag key={t} label={t} variant={tagVariant(t)} />
        ))}
      </div>
      {c.brands.length > 0 && (
        <div className="text-xs text-gray-500 mb-2 flex flex-wrap gap-x-1.5">
          {c.brands.map((b, i) => (
            <span key={b}>
              <Link href={`/kp/${encodeURIComponent(b)}`} className="text-blue-600 hover:underline underline-offset-2">
                {b}
              </Link>
              {i < c.brands.length - 1 && ","}
            </span>
          ))}
        </div>
      )}
      <div className="text-xs text-gray-600 space-y-0.5 pt-2 border-t border-gray-100">
        <div>{c.whatsapp || <span className="text-gray-300">No WhatsApp on file</span>}</div>
        <div>{c.email || <span className="text-gray-300">No email on file</span>}</div>
      </div>
    </article>
  );
}

export default function ContactsPage() {
  const [rows, setRows] = useState<ContactEntry[] | null>(null);
  const [query, setQuery] = useState("");
  const [tagFilter, setTagFilter] = useState("all");
  const [view, setView] = useState<"table" | "card">("card");

  useEffect(() => {
    seedDemoSubmissions();
    setRows(buildContactRows());
  }, []);

  const tagOptions = useMemo(
    () => (rows ? [...new Set(rows.flatMap((r) => r.tags))].sort() : []),
    [rows]
  );

  const filtered = useMemo(() => {
    if (!rows) return [];
    const q = query.trim().toLowerCase();
    return rows
      .filter(
        (r) =>
          !q ||
          r.name.toLowerCase().includes(q) ||
          r.brands.some((b) => b.toLowerCase().includes(q))
      )
      .filter((r) => tagFilter === "all" || r.tags.includes(tagFilter));
  }, [rows, query, tagFilter]);

  if (rows === null) return <p className="text-sm text-gray-400">Loading contacts…</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Contacts</h1>
      <p className="text-sm text-gray-500 mb-5">
        Every human in the referror ecosystem — KP contacts, Karma Staff, Ex-Karma Staff,
        Karmapreneurs, Karma Nodes, and more.
      </p>

      <div className="flex gap-2 mb-5 flex-wrap items-center">
        <div className="relative flex-1 min-w-56 max-w-md">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            className="w-full border border-gray-300 rounded-lg pl-9 pr-3 py-2 text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Search contacts or brand…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <select
          value={tagFilter}
          onChange={(e) => setTagFilter(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="all">All Types</option>
          {tagOptions.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        <div className="inline-flex rounded-lg border border-gray-200 bg-white p-0.5 shrink-0">
          <button
            type="button"
            onClick={() => setView("table")}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors ${
              view === "table" ? "bg-gray-900 text-white" : "text-gray-500 hover:text-gray-800"
            }`}
          >
            <List className="w-3.5 h-3.5" />
            Table
          </button>
          <button
            type="button"
            onClick={() => setView("card")}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors ${
              view === "card" ? "bg-gray-900 text-white" : "text-gray-500 hover:text-gray-800"
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            Card
          </button>
        </div>
      </div>

      {view === "card" ? (
        filtered.length === 0 ? (
          <p className="text-sm text-gray-400 px-6 py-8 text-center">
            {query || tagFilter !== "all" ? "No contacts match." : "No contacts yet."}
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((c) => (
              <ContactCard key={c.name} c={c} />
            ))}
          </div>
        )
      ) : (
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50 text-gray-500 text-left text-xs">
              <th className="py-2.5 px-4 font-medium">Name</th>
              <th className="py-2.5 px-4 font-medium">Brand</th>
              <th className="py-2.5 px-4 font-medium whitespace-nowrap">WhatsApp</th>
              <th className="py-2.5 px-4 font-medium">Email</th>
              <th className="py-2.5 px-4 font-medium w-full min-w-56">Type</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.map((c) => (
              <tr key={c.name} className="hover:bg-blue-50/40 transition-colors">
                <td className="py-2.5 px-4 font-medium text-gray-900 whitespace-nowrap">{c.name}</td>
                <td className="py-2.5 px-4">
                  {c.brands.length === 0 ? (
                    <span className="text-gray-300">—</span>
                  ) : (
                    <div className="flex flex-wrap gap-x-1.5">
                      {c.brands.map((b, i) => (
                        <span key={b} className="whitespace-nowrap">
                          <Link
                            href={`/kp/${encodeURIComponent(b)}`}
                            className="text-blue-600 hover:underline underline-offset-2"
                          >
                            {b}
                          </Link>
                          {i < c.brands.length - 1 && ","}
                        </span>
                      ))}
                    </div>
                  )}
                </td>
                <td className="py-2.5 px-4 text-gray-600 whitespace-nowrap">
                  {c.whatsapp || <span className="text-gray-300">—</span>}
                </td>
                <td className="py-2.5 px-4 text-gray-600">
                  {c.email || <span className="text-gray-300">—</span>}
                </td>
                <td className="py-2.5 px-4">
                  <div className="flex flex-wrap gap-1">
                    {c.tags.map((t) => (
                      <Tag key={t} label={t} variant={tagVariant(t)} />
                    ))}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <p className="text-sm text-gray-400 px-6 py-8 text-center">
            {query || tagFilter !== "all" ? "No contacts match." : "No contacts yet."}
          </p>
        )}
      </div>
      )}
    </div>
  );
}
