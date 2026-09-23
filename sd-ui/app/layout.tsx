import type { Metadata, Viewport } from "next";
import "katex/dist/katex.min.css";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { AuthProvider } from "@/components/auth-provider";

export const metadata: Metadata = {
  title: "SD Study Bot",
  description: "System Design Interview Prep — Alex Xu + GitHub knowledge base",
  applicationName: "archprep",
};

// Colours the phone's status bar / task switcher to match the (default) dark theme.
export const viewport: Viewport = {
  themeColor: "#090e1b",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
          <AuthProvider>{children}</AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
