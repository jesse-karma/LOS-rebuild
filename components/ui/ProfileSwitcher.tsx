"use client";

import { useProfile } from "@/lib/profileStore";
import { TEAMS } from "@/lib/access";

function initials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

/** Header profile picker — prototype stand-in for login, grouped by team. */
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
          {TEAMS.map((team) => (
            <optgroup key={team} label={team}>
              {users
                .filter((u) => u.team === team)
                .map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
            </optgroup>
          ))}
        </select>
        <span className="text-[10px] text-gray-400 leading-none">
          {user.team}
          {user.icPrincipal ? " · Principal" : ""}
        </span>
      </div>
    </div>
  );
}
