import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "sonner";
import SessionProvider from "@/components/providers/SessionProvider";

export const metadata: Metadata = {
  title: "RLAI Tech Evaluation | rightleft.ai",
  description: "Apply for AI and tech roles at RLAI. Showcase your practical skills through our adaptive technical assessment platform.",
  icons: { icon: "/favicon.ico" },
  openGraph: {
    title: "RLAI Tech Evaluation",
    description: "Apply for AI and tech roles at rightleft.ai",
    siteName: "RLAI",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <SessionProvider>
          {children}
          <Toaster
            position="top-right"
            richColors
            expand
            toastOptions={{
              style: { fontFamily: "Inter, sans-serif" },
            }}
          />
        </SessionProvider>
      </body>
    </html>
  );
}
