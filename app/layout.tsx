import type { Metadata } from "next";
import "./globals.css";
import { ProfileProvider } from "@/lib/profileStore";
import { ProfileSwitcher } from "@/components/ui/ProfileSwitcher";
import { Sidebar } from "@/components/ui/Sidebar";

export const metadata: Metadata = {
  title: "LOS — KarmaClub",
  description: "Loan Origination System",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50">
        <ProfileProvider>
          <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
            <div className="px-4 sm:px-6 flex items-center justify-between h-14">
              <div className="flex items-center gap-3">
                <img src="/karma-club-logo.svg" alt="Karma Club" className="h-9 w-auto" />
                <span className="font-semibold text-gray-900">LOS</span>
                <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded font-medium">PROTOTYPE</span>
              </div>
              <div className="flex items-center gap-4 text-xs">
                <span className="text-gray-400 hidden lg:inline">Mocked data · Phase 1 concept</span>
                <ProfileSwitcher />
              </div>
            </div>
          </header>
          <div className="flex">
            <Sidebar />
            <main className="flex-1 min-w-0 px-4 sm:px-6 py-8">
              <div className="max-w-5xl mx-auto">{children}</div>
            </main>
          </div>
        </ProfileProvider>
      </body>
    </html>
  );
}
