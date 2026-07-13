"use client";

import { useProfile } from "@/lib/profileStore";

function initials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

/** Header profile picker — prototype stand-in for login. */
export function ProfileSwitcher() {
  const { user, users, setUserId } = useProfile();

  return (
    <div className="flex items-center gap-2">
      <div className="w-7 h-7 rounded-full bg-emerald-600 flex items-center justify-center shrink-0">
        <span className="text-white text-[10px] font-bold">{initials(user.name)}</span>
      </div>
      <div className="flex flex-col">
        <select
          className="text-xs font-semibold text-gray-900 bg-transparent border-0 focus:outline-none focus:ring-0 cursor-pointer -ml-1"
          value={user.id}
          onChange={(e) => setUserId(e.target.value)}
          aria-label="Active profile"
        >
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </select>
        <span className="text-[10px] text-gray-400 leading-none">{user.role}</span>
      </div>
    </div>
  );
}
