"use client";

import { createContext, useContext, useEffect, useState } from "react";

/**
 * App user profiles — prototype only, no login. Analyst roles come from Jesse's
 * team model (a principal sees the whole team's projects); IC roles come from
 * the Karma Team Role master data (§14: IC Principal, IC Member).
 */
export type AppRole = "Analyst" | "Analyst Principal" | "IC Principal" | "IC Member";

export interface AppUser {
  id: string;
  name: string;
  role: AppRole;
}

export const APP_USERS: AppUser[] = [
  { id: "priska", name: "Priska Ponggawa", role: "Analyst Principal" },
  { id: "nila", name: "Nila Layla Melinda", role: "Analyst" },
  { id: "ben", name: "Ben Elberger", role: "IC Principal" },
];

export function isAnalystRole(role: AppRole): boolean {
  return role === "Analyst" || role === "Analyst Principal";
}

export function isICRole(role: AppRole): boolean {
  return role === "IC Principal" || role === "IC Member";
}

/** Analysts (and principals) see drafts; only a plain Analyst is limited to own projects. */
export function seesAllProjects(user: AppUser): boolean {
  return user.role !== "Analyst";
}

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
