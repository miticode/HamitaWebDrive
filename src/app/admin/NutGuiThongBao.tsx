"use client";

import { useState, useTransition } from "react";
import { guiThongBaoAction } from "./actions";

/**
 * Nút gửi tin "có ảnh mới" cho khách của một album.
 *
 * Đứng RIÊNG khỏi nút "Làm mới" (yêu cầu 04/09/2026). Trước đây hai việc gộp
 * làm một: bấm "Làm mới" là vừa đọc lại Drive vừa nhắn cho khách. Nhân viên bấm
 * để xem ảnh đã lên chưa mà không ngờ mỗi cú bấm là một lần điện thoại khách
 * rung. Hai việc khác hẳn nhau về hậu quả — một cái chỉ đụng số liệu trong nhà,
 * một cái chạm tới khách — nên phải là hai nút.
 *
 * Có bước HỎI LẠI trước khi gửi. Đây là thao tác không rút lại được: tin đã tới
 * điện thoại khách thì không thu hồi. Hộp hỏi lại nói rõ sẽ gửi tới mấy máy, để
 * bấm nhầm cũng còn một nhịp dừng.
 *
 * Album chưa ai đăng ký thì nút vẫn HIỆN nhưng mờ và nói rõ lý do, thay vì giấu
 * đi. Giấu thì studio tưởng tính năng hỏng; nói ra thì họ biết là chưa khách
 * nào bật thông báo trong app.
 */
export function NutGuiThongBao({
  galleryId,
  soMay,
}: {
  galleryId: string;
  /** Số máy khách đang chờ nhận tin của album này. */
  soMay: number;
}) {
  const [hoi, setHoi] = useState(false);
  const [ketQua, setKetQua] = useState<string | null>(null);
  const [dangGui, start] = useTransition();

  /*
    Chưa ai đăng ký vẫn ghi "· 0 máy", CÙNG MỘT DẠNG với lúc có máy.

    Bản đầu viết hẳn "· chưa ai đăng ký" cho rõ nghĩa, nhưng đo trong thẻ album
    thật (325px) thì nút phình lên 236px và hàng nút vỡ thành ba dòng — mà
    13/22 album đang ở trạng thái này, tức là đa số thẻ sẽ rối. Dạng "· N máy"
    giữ nút ở 172–181px và hàng nút gọn hai dòng.

    Nhất quán còn quan trọng hơn: mắt đọc cùng một chỗ, cùng một dạng, chỉ đổi
    con số. Nút mờ đi đã nói rõ là bấm không được, còn lý do đầy đủ nằm trong
    chú thích khi rê chuột.
  */
  if (soMay === 0) {
    return (
      <span
        className="btn cursor-not-allowed opacity-45"
        title="Chưa ai đăng ký. Khách phải cài album ra màn hình chính rồi bấm “Nhận thông báo khi có ảnh mới” thì mới nhận được tin."
      >
        Gửi tin
        <span className="ml-1.5 whitespace-nowrap">· 0 máy</span>
      </span>
    );
  }

  const gui = () =>
    start(async () => {
      const kq = await guiThongBaoAction(galleryId);
      setHoi(false);
      setKetQua(
        kq.error
          ? kq.error
          : kq.daGui
            ? `Đã gửi tới ${kq.daGui} máy`
            : "Không máy nào nhận được — có thể khách đã gỡ app",
      );
    });

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setKetQua(null);
          setHoi(true);
        }}
        className="btn"
        title={`Nhắn cho ${soMay} máy khách đang chờ rằng album có ảnh mới`}
      >
        {/*
          Ghi rõ "· N máy", không để con số trần.

          Bản đầu chỉ in số ("Gửi thông báo 3") và studio phải hỏi nó là gì —
          số ảnh mới? số lần đã gửi? Một con số đứng một mình cạnh chữ thì đọc
          kiểu nào cũng được. Thêm đúng một chữ là hết đoán.
        */}
        {/*
          "Gửi tin" chu khong "Gửi thông báo" (21/09/2026): hang nut ngoai mat
          the album nay co bon nut, de nguyen chu thi vo hai dong va the cao
          them 52px — sau album dau khong con lot mot man hinh (nguyen tac 45).
          Chu thich khi re chuot van ghi day du "Nhắn cho N máy khách…", va hop
          hoi lai truoc khi gui thi khong dong nao doi ca.
        */}
        Gửi tin
        <span className="ml-1.5 whitespace-nowrap opacity-60">
          · {soMay} máy
        </span>
      </button>

      {/*
        Báo kết quả ngay cạnh nút, không dùng cửa sổ bật của trình duyệt: gửi
        xong mà im lặng thì lần sau không ai dám bấm nữa.
      */}
      {ketQua && (
        <span className="self-center text-xs text-fg-muted">{ketQua}</span>
      )}

      {hoi && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4"
          onClick={() => setHoi(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-md bg-bg p-6 shadow-[var(--shadow-lift)]"
          >
            <h2 className="font-display text-xl font-light">Nhắn cho khách?</h2>
            <p className="mt-3 text-sm leading-relaxed text-fg-muted">
              Điện thoại của <b className="text-fg">{soMay} máy</b> đang chờ sẽ
              hiện thông báo và một số đỏ trên biểu tượng app.
            </p>
            {/*
              Cho xem trước đúng câu khách sẽ đọc. Studio nhắn cho khách của
              mình thì phải biết mình đang nói gì, không thể bấm một cái nút rồi
              đoán.
            */}
            <p className="mt-3 rounded-md border border-line bg-bg-soft px-3.5 py-3 text-sm leading-relaxed">
              <b>Hamita Studio vừa thêm ảnh mới</b>
              <br />
              Anh chị vào xem ảnh mới nhé ạ.
            </p>
            <p className="mt-3 text-xs leading-relaxed text-fg-faint">
              Gửi rồi thì không thu hồi được.
            </p>

            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={gui}
                disabled={dangGui}
                className="btn-primary"
              >
                {dangGui ? "Đang gửi…" : "Gửi ngay"}
              </button>
              <button
                type="button"
                onClick={() => setHoi(false)}
                className="btn"
              >
                Thôi
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
