import type { NextConfig } from "next";

/*
  Header bao mat cho moi trang.

  Truoc day web chi co mot header duy nhat do Vercel tu them (HSTS), nghia la
  bat ky ai cung nhung nguyen trang album cua khach vao web cua ho duoc, va moi
  lan khach bam mot lien ket ra ngoai thi dia chi album rieng tu di theo trong
  header Referer sang ben do.
*/
const HEADERS = [
  /*
    Khong cho web khac nhung trang nay vao khung iframe cua ho.
    SAMEORIGIN chu khong phai DENY: de sau nay chinh minh muon nhung mot trang
    cua minh vao trang khac cua minh thi khong phai sua lai.
  */
  { key: "X-Frame-Options", value: "SAMEORIGIN" },

  /*
    Cam trinh duyet tu doan lai kieu tep. Khong co dong nay, mot tep khach tai
    ve co the bi doan thanh HTML roi chay nhu mot trang web.
  */
  { key: "X-Content-Type-Options", value: "nosniff" },

  /*
    Quan trong voi web nay hon binh thuong: link album la rieng tu. Khi khach
    bam tu trang album sang Facebook/Zalo cua studio, mac dinh trinh duyet gui
    ca dia chi album day du sang ben do. Dat muc nay thi ra ngoai chi con ten
    mien, khong kem slug cua khach.

    Van giu duoc viec chan nhung anh: request cung nguon van gui dia chi day du,
    con request tu web khac van lo ra ten mien khac — du de /api/img nhan biet.
  */
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },

  /*
    Web nay khong dung camera, micro hay vi tri. Tat san de mot doan ma la lot
    vao trang cung khong xin duoc nhung quyen do.
  */
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
];

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/:path*", headers: HEADERS }];
  },

  /*
    Nhung thu CHI DUNG LUC LAP TRINH, dung goi vao ban chay that.

    Next lan theo cac loi nhap de biet tep nao can mang theo, va no lan hoi
    rong tay: do 30/09/2026 khi dung ban cho Cloudflare, no keo theo
    wrangler.exe 92 MB, Prisma engine 20 MB, Prisma Studio 28 MB va pglite
    16 MB — goi ma phinh tu 4,2 MB len 20,1 MB nen, vuot gioi han 10 MB cua
    Cloudflare Workers.

    Khong cai nao trong so do duoc dung luc chay: wrangler la cong cu dua len
    mang, Prisma engine chi dung cho lenh migrate, Studio la giao dien xem
    database, pglite la Postgres chay trong bo nho de thu.

    Tren Vercel dong nay vo hai, chi lam ban dung nhe bot.
  */
  outputFileTracingExcludes: {
    "*": [
      "node_modules/@cloudflare/workerd-*/**",
      "node_modules/wrangler/**",
      "node_modules/miniflare/**",
      "node_modules/@prisma/engines/**",
      "node_modules/@prisma/studio-core/**",
      "node_modules/@prisma/dev/**",
      "node_modules/@electric-sql/**",
      "node_modules/@img/**",
      "node_modules/sharp/**",
      // Prisma CLI (lenh migrate, generate) va ban workerd dung de chay thu.
      "node_modules/prisma/**",
      "node_modules/workerd/**",
      /*
        Prisma nhung bo bien dich cho MOI loai database — SQL Server,
        CockroachDB, MySQL, SQLite — moi cai 4,7 MB, du du an chi dung
        PostgreSQL. Bo het tru postgresql.
      */
      "node_modules/@prisma/client/runtime/*sqlserver*",
      "node_modules/@prisma/client/runtime/*cockroachdb*",
      "node_modules/@prisma/client/runtime/*mysql*",
      "node_modules/@prisma/client/runtime/*sqlite*",
    ],
  },
};

export default nextConfig;
