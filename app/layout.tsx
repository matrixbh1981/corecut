import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "CoreCut — AI Video Editor",
  description: "AI-powered video editing by MatrixLand",
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
