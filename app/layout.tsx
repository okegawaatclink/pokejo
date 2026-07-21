import type { Metadata } from "next";
import Link from "next/link";
import { M_PLUS_Rounded_1c } from "next/font/google";
import "./globals.css";

const displayFont = M_PLUS_Rounded_1c({
  subsets: ["latin"],
  weight: ["700", "800"],
  variable: "--font-display",
  display: "swap",
});

export const metadata: Metadata = {
  title: "ポケ嬢 | デジタルカードコレクション",
  description:
    "お店に来店してQRコードを読み取り、ポケ嬢デジタルカードを集めよう。",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja" className={displayFont.variable}>
      <body className="min-h-screen flex flex-col">
        <header className="border-b border-champagne/20 bg-white/85 backdrop-blur sticky top-0 z-20">
          <div className="max-w-4xl mx-auto px-5 sm:px-8 py-4 flex items-center">
            <Link
              href="/"
              className="text-lg font-display font-extrabold tracking-wide text-gradient-gold"
            >
              ポケ嬢
            </Link>
          </div>
        </header>
        <main className="flex-1 max-w-4xl w-full mx-auto px-5 sm:px-8 py-10 sm:py-14">
          {children}
        </main>
        <footer className="text-center text-xs text-muted py-8">
          ポケ嬢 - プロトタイプ版
        </footer>
      </body>
    </html>
  );
}
