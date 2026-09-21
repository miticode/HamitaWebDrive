"use client";

import { useState } from "react";

/**
 * Hai nut chep cua mot album: chep RIENG duong dan, va chep CA TIN NHAN.
 *
 * Vi sao can nut thu hai: truoc day chi co "Chép link", nen moi lan gui album
 * cho khach studio phai lam ba viec — chep link, dan vao Zalo, roi tu go ma
 * va tu go loi huong dan. Web da biet ca ba thu do. Voi vai chuc album mot
 * thang thi day la viec lap nhieu nhat trong ngay.
 *
 * Loi trong tin nhan phai KHOP voi thu khach doc tren web: tim la "in ra"
 * (tick da bo 15/09/2026), va buoc cuoi la bam "Báo cho Hamita". Sua loi o web ma
 * quen sua o day la studio noi mot dang, web noi mot neo.
 */
export function CopyLink({
  path,
  code,
  expiresAt,
  hien = "ca-hai",
  lop,
}: {
  path: string;
  /** Ma chon anh. null = album chua dat ma, luc do bo han dong ma trong tin nhan. */
  code: string | null;
  /** Han giu anh dang ISO. null = khong dat han. */
  expiresAt: string | null;
  /** Hien nut nao — the album chi goi rieng tung nut trong bang "…" cua no. */
  hien?: "tin" | "link" | "ca-hai";
  /**
   * Lop CSS de nut hoa vao cho no dung. Thua ke chu khong doan: cung mot nut
   * nay dung o hang nut binh thuong (.btn) va o mot dong trong bang "…" cua
   * the album (.muc-menu) — hai cho hinh dang khac han nhau.
   */
  lop?: string;
}) {
  const [daChep, setDaChep] = useState<null | "link" | "tin">(null);

  const bao = (cai: "link" | "tin") => {
    setDaChep(cai);
    setTimeout(() => setDaChep(null), 1600);
  };

  const soanTin = () => {
    const link = `${location.origin}${path}`;
    const dong = [
      "Hamita gửi anh chị bộ ảnh của mình ạ.",
      "",
      `Xem ảnh: ${link}`,
    ];

    if (code) dong.push(`Mã chọn ảnh: ${code}`);

    dong.push(
      "",
      "Anh chị bấm trái tim vào tấm nào muốn Hamita in ra nhé.",
      "",
      'Chọn xong anh chị bấm "Báo cho Hamita" giúp em một tiếng là Hamita bắt tay vào làm liền ạ.'
    );

    if (expiresAt) {
      const ngay = new Date(expiresAt).toLocaleDateString("vi-VN");
      dong.push(
        "",
        `Hamita giữ ảnh giúp anh chị tới ngày ${ngay}, anh chị tranh thủ tải về máy trước ngày đó nhé ạ.`
      );
    }

    return dong.join("\n");
  };

  return (
    <>
      {/*
        Nut tin nhan dat TRUOC va noi hon: do la viec studio lam moi lan gui
        album. Chep rieng duong dan la truong hop it hon — dan vao ghi chu,
        gui qua kenh khac — nen de nut thuong phia sau.
      */}
      {hien !== "link" && (
        <button
          type="button"
          onClick={async () => {
            await navigator.clipboard.writeText(soanTin());
            bao("tin");
          }}
          title="Chép sẵn tin nhắn có đủ link, mã và lời hướng dẫn — dán thẳng vào Zalo"
          className={lop ?? "btn-primary px-3.5"}
        >
          {daChep === "tin" ? "Đã chép ✓" : "Chép tin nhắn"}
        </button>
      )}

      {hien !== "tin" && (
        <button
          type="button"
          onClick={async () => {
            await navigator.clipboard.writeText(`${location.origin}${path}`);
            bao("link");
          }}
          title="Chỉ chép riêng đường dẫn"
          className={lop ?? "btn"}
        >
          {daChep === "link" ? "Đã chép ✓" : "Chép link"}
        </button>
      )}
    </>
  );
}
