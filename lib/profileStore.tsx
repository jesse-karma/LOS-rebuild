"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { Team } from "@/lib/access";

/**
 * App user profiles — prototype only, no login. Access is governed by the
 * user's team (Role Type), never by the individual: see lib/access.ts.
 * `icPrincipal` is IC voting mechanics (the ≤4B single-approval rule), not
 * an access hierarchy.
 */
export interface AppUser {
  id: string;
  name: string;
  team: Team;
  icPrincipal?: boolean;
}

export const APP_USERS: AppUser[] = [
  // Investments Team — every member works the team's full pipeline (no per-person scoping).
  { id: "priska", name: "Priska Ponggawa", team: "Investments Team" },
  { id: "nila", name: "Nila Layla Melinda", team: "Investments Team" },
  // Investment Committee — votes on submissions.
  { id: "ben", name: "Ben Elberger", team: "Investment Committee", icPrincipal: true },
  { id: "aldi", name: "Aldi Haryopratomo", team: "Investment Committee" },
  { id: "junaidi", name: "Junaidi", team: "Investment Committee" },
  // Legal / Finance — 2 people each; either member covers for the other.
  { id: "laras", name: "Larasati Wibowo", team: "Legal Team" },
  { id: "andre", name: "Andre Sitompul", team: "Legal Team" },
  { id: "maya", name: "Maya Kusuma", team: "Finance Team" },
  { id: "bagus", name: "Bagus Santoso", team: "Finance Team" },
  // System Admin — sees everything; co-owns global config (e.g. concentration limits) with IC.
  { id: "sari", name: "Sari Utami", team: "System Admin" },
];

const STORAGE_KEY = "kc-los-active-profile";

interface ProfileContextValue {
  user: AppUser;
  users: AppUser[];
  setUserId: (id: string) => void;
}

const ProfileContext = createContext<ProfileContextValue>({
  user: APP_USERS[0],
  users: APP_USERS,
  setUserId: () => {},
});

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  // Deterministic first render (default profile); stored choice applied after mount.
  const [user, setUser] = useState<AppUser>(APP_USERS[0]);

  useEffect(() => {
    const storedId = window.localStorage.getItem(STORAGE_KEY);
    const stored = APP_USERS.find((u) => u.id === storedId);
    if (stored) setUser(stored);
  }, []);

  function setUserId(id: string) {
    const next = APP_USERS.find((u) => u.id === id);
    if (!next) return;
    setUser(next);
    window.localStorage.setItem(STORAGE_KEY, next.id);
  }

  return (
    <ProfileContext.Provider value={{ user, users: APP_USERS, setUserId }}>
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile(): ProfileContextValue {
  return useContext(ProfileContext);
}
