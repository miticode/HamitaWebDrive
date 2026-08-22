import type { Metadata } from "next";
import { Be_Vietnam_Pro, Cormorant_Garamond } from "next/font/google";
import { STUDIO_NAME, siteUrl } from "@/lib/constants";
import "./globals.css";

/*
  Cả hai phông đều có bộ ký tự tiếng Việt đầy đủ — nhiều phông serif đẹp trên
  Google Fonts thiếu dấu tiếng Việt nên chữ bị vỡ, hai phông này thì không.
*/
const display = Cormorant_Garamond({
  variable: "--font-display",
  subsets: ["latin", "vietnamese"],
  weight: ["300", "400", "500", "600"],
});

const body = Be_Vietnam_Pro({
  variable: "--font-body",
  subsets: ["latin", "vietnamese"],
  weight: ["300", "400", "500", "600"],
});

export const metadata: Metadata = {
  metadataBase: siteUrl(),
  title: STUDIO_NAME,
  description: "Album ảnh trực tuyến",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="vi"
      className={`${display.variable} ${body.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
