"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { KPContact } from "@/data/types";
import { allReviewProjects, getAllBrands, seedDemoSubmissions } from "@/lib/submissionsStore";

interface ContactRow extends KPContact {
  brandName: string;
}

/** One row per KP contact, taken from each brand's latest submission (mirrors the Brand page's contacts table). */
function buildContactRows(): ContactRow[] {
  const projects = allReviewProjects();
  const rows: ContactRow[] = [];

  getAllBrands().forEach((brandName) => {
    const brandProjects = projects.filter((p) => p.brandName === brandName);
    if (brandProjects.length === 0) return;
    const latest = [...brandProjects].sort((a, b) => b.submittedAt.localeCompare(a.submittedAt))[0];
    latest.kpContacts.forEach((c) => rows.push({ ...c, brandName }));
  });

  return rows.sort((a, b) => a.name.localeCompare(b.name));
}

export default function ContactsPage() {
  const [rows, setRows] = useState<ContactRow[] | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    seedDemoSubmissions();
    setRows(buildContactRows());
  }, []);

  const filtered = useMemo(() => {
    if (!rows) return [];
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.brandName.toLowerCase().includes(q) ||
        r.role.toLowerCase().includes(q)
    );
  }, [rows, query]);

  if (rows === null) return <p className="text-sm text-gray-400">Loading contacts…</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Contacts</h1>
      <p className="text-sm text-gray-500 mb-5">
        Every Karmapreneur contact on file, across all Brands.
      </p>

      <div className="relative mb-5 max-w-md">
        <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          className="w-full border border-gray-300 rounded-lg pl-9 pr-3 py-2 text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="Search contacts, brand, or role…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-x-auto">
        <table className="w-full text-sm min-w-[720px]">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50 text-gray-500 text-left text-xs">
              <th className="py-2.5 px-4 font-medium">Name</th>
              <th className="py-2.5 px-4 font-medium">Brand</th>
              <th className="py-2.5 px-4 font-medium">Role</th>
              <th className="py-2.5 px-4 font-medium">WhatsApp</th>
              <th className="py-2.5 px-4 font-medium">Email</th>
              <th className="py-2.5 px-4 font-medium">Key Person</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.map((c) => (
              <tr key={`${c.brandName}-${c.id}`} className="hover:bg-blue-50/40 transition-colors">
                <td className="py-2.5 px-4 font-medium text-gray-900">{c.name}</td>
                <td className="py-2.5 px-4">
                  <Link
                    href={`/kp/${encodeURIComponent(c.brandName)}`}
                    className="text-blue-600 hover:underline underline-offset-2"
                  >
                    {c.brandName}
                  </Link>
                </td>
                <td className="py-2.5 px-4 text-gray-600">{c.role}</td>
                <td className="py-2.5 px-4 text-gray-600">
                  {c.whatsapp || <span className="text-gray-300">—</span>}
                </td>
                <td className="py-2.5 px-4 text-gray-600">
                  {c.email || <span className="text-gray-300">—</span>}
                </td>
                <td className="py-2.5 px-4 text-gray-600">{c.isKeyPerson ? "Yes" : "No"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <p className="text-sm text-gray-400 px-6 py-8 text-center">
            {query ? `No contacts match "${query}".` : "No contacts yet."}
          </p>
        )}
      </div>
    </div>
  );
}
