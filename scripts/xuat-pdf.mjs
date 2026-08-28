/**
 * Xuat docs/huong-dan-admin.html ra PDF.
 *
 *   npm run pdf:huong-dan
 *
 * Dung Chrome co san tren may thay vi cai them thu vien: ban huong dan chi
 * dung lai vai thang mot lan, khong dang keo them mot goi nang vao du an.
 *
 * PHONG: dung "Segoe UI" cua Windows chu khong nhung phong rieng. Chrome
 * headless tung khong nhung duoc phong Bitter khi xuat PDF (xem CLAUDE.md),
 * nen o day chon phong he thong — no co du dau tieng Viet va chac chan nhung
 * duoc.
 *
 * Kiem lai bang: pdftotext -enc UTF-8 <tep>.pdf -
 * Thieu -enc UTF-8 thi chu hien ra mat dau, de tuong nham la PDF hong.
 */
import { execFileSync } from "node:child_process";
import { existsSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const CHROME = [
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
].find((p) => existsSync(p));

if (!CHROME) {
  console.error("Khong tim thay Chrome hay Edge tren may nay.");
  process.exit(1);
}

const nguon = resolve("docs/huong-dan-admin.html");
const dich = resolve("docs/Huong-dan-trang-quan-ly-Hamita.pdf");

if (!existsSync(nguon)) {
  console.error(`Khong thay ${nguon}`);
  process.exit(1);
}

execFileSync(CHROME, [
  "--headless=new",
  "--disable-gpu",
  "--no-pdf-header-footer",
  `--print-to-pdf=${dich}`,
  pathToFileURL(nguon).href,
]);

console.log(`Da xuat: ${dich}`);
console.log(`  ${Math.round(statSync(dich).size / 1024)} kB`);
console.log("\nKiem lai:  pdftotext -enc UTF-8 -layout <tep>.pdf -");
