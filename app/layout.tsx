import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";

import { AppShell } from "@/components/app-shell";
import { CareDataProvider } from "@/components/care-data-provider";
import "./globals.css";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-plus-jakarta",
  display: "swap",
});

export const metadata: Metadata = {
  title: "WeCare",
  description: "A calm caregiver app for Margaret’s care.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={plusJakartaSans.variable}>
        <CareDataProvider>
          <AppShell>{children}</AppShell>
        </CareDataProvider>
      </body>
    </html>
  );
}
