import "./globals.css";
import type { Metadata } from "next";
import { routes } from "@/lib/routes";
import { featureFlags } from "@/lib/feature-flags";

export const metadata: Metadata = {
    title: "Relearn",
    description: "Relearn — read, summarise, and study webpages with AI"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en">
        <body className="min-h-screen text-gray-900">
        <header className="bg-gradient-to-r from-primary to-secondary text-white py-4 shadow">
            <div className="mx-auto max-w-5xl px-4 flex items-center justify-between">
                <h1 className="font-bold text-lg">Relearn</h1>
                <nav className="flex gap-3 text-sm">
                    <a className="hover:underline" href={routes.home}>Home</a>
                    <a className="hover:underline" href={routes.pages}>Pages</a>
                    <a className="hover:underline" href={routes.study}>Study</a>
                    {featureFlags.teachBack && <a className="hover:underline" href={routes.teachback}>Teach-Back</a>}
                    {featureFlags.studyRooms && <a className="hover:underline" href={routes.rooms}>Rooms</a>}
                </nav>
            </div>
        </header>
        <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
        </body>
        </html>
    );
}
