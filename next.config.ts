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
};

export default nextConfig;
