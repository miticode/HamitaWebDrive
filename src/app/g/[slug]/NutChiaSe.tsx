"use client";

import { useState } from "react";
import { THAM_SO_CHIA_SE } from "@/lib/constants";

/**
 * Nút để cô dâu chú rể gửi link thư mục này cho người thân.
 *
 * Anh yêu cầu 08/10/2026. Trước đó muốn gửi ảnh cho nhà nội nhà ngoại thì
 * khách phải tự chép địa chỉ trên thanh trình duyệt — mà trên điện thoại, nơi
 * gần như cả tệp khách của studio ngồi, thao tác đó rất lóng ngóng: địa chỉ
 * bị cắt ngắn, chạm vào thì mở bàn phím, chép xong chưa chắc đủ.
 *
 * GỬI LINK CỦA ĐÚNG THƯ MỤC ĐANG MỞ, không phải trang bìa album. Người thân
 * thường chỉ quan tâm một phần — nhà gái gửi "File gốc nhà gái" cho họ hàng
 * bên gái. Gửi link trang bìa thì người nhận mở ra còn phải tự dò xem vào thư
 * mục nào, mà tên thư mục là chữ nội bộ của studio ("file gốc HC").
 *
 * KHÔNG kèm mã chọn ảnh, và cũng không có gì để kèm: mã không nằm trong địa
 * chỉ trang. Người nhận xem được toàn bộ ảnh nhưng KHÔNG thả tim được — đúng
 * nguyên tắc 1 (xem tự do, cần mã mới chọn). Nhờ vậy gửi cho mười người thân
 * cũng không ai lỡ tay thêm một tấm vào đơn in của nhà.
 *
 * ĐIỆN THOẠI MỞ KHAY, MÁY TÍNH CHÉP LINK — và đây CHÍNH LÀ ngoại lệ có chủ ý
 * với nguyên tắc 46 ("khay chia sẻ chỉ dành cho iPhone"). Nguyên tắc đó nói về
 * chia sẻ TỆP ẢNH: ở đó máy tính và Android vốn đã tải xuống ngon lành nên mở
 * khay chỉ chen thêm một câu hỏi, lại dẫn tới chỗ khách bấm nhầm "Discord" rồi
 * mất tấm ảnh. Ở đây thì ngược hẳn — việc khách muốn làm ĐÚNG LÀ gửi đi chỗ
 * khác, nên khay là đường thẳng nhất tới Zalo và Messenger, trên cả Android
 * lẫn iPhone. Riêng máy tính vẫn chép link: Windows mở bảng "Nearby Sharing,
 * Mail, Paint…" — thứ không ai dùng để nhắn cho người thân.
 */
export function NutChiaSe({
  tenKhach,
  tenMuc,
}: {
  /** Tên nhà khách, để người nhận biết ngay đây là ảnh của ai. */
  tenKhach: string;
  /** Tên thư mục đang mở. */
  tenMuc: string;
}) {
  const [xong, setXong] = useState<"chep" | "loi" | null>(null);

  const chiaSe = async () => {
    /*
      Đọc địa chỉ NGAY LÚC BẤM, không dựng sẵn lúc trang vẽ ra: máy chủ không
      có `location`, mà dựng chuỗi từ slug lại phải đoán tên miền — web này
      đang phục vụ cả hamitastudio.com lẫn địa chỉ .vercel.app cũ, đoán sai là
      gửi người thân một link chết.
    */
    /*
      Gan dau hieu "link chia se" vao dia chi gui di.

      Nho no ma trang ben kia bo nut quay lai va hang thu muc, nen nguoi than
      chi thay dung thu muc duoc gui (nguyen tac 63). Dung `URL` chu khong
      noi chuoi "?..." bang tay: dia chi co the da mang san tham so khac va
      noi tay se ra hai dau hoi.
    */
    const dia = new URL(window.location.href);
    dia.searchParams.set(THAM_SO_CHIA_SE, "1");
    const url = dia.toString();
    const loiNhan = `Ảnh cưới của ${tenKhach} — ${tenMuc}`;

    /*
      Điện thoại thì mở khay. Nhận ra điện thoại bằng số điểm chạm chứ không
      bằng chuỗi UserAgent: chuỗi đó mỗi hãng viết một kiểu còn số điểm chạm là
      thứ đo được. Máy tính cảm ứng hiếm khi là nơi khách ngồi nhắn Zalo, mà
      lỡ có thì khay vẫn chạy đúng.
    */
    const dienThoai =
      typeof navigator !== "undefined" &&
      navigator.maxTouchPoints > 1 &&
      typeof navigator.share === "function";

    if (dienThoai) {
      try {
        await navigator.share({ title: loiNhan, text: loiNhan, url });
        /*
          KHÔNG báo "đã gửi xong" sau khi khay đóng. Khay đóng chỉ có nghĩa hệ
          điều hành báo xong — khách bấm gửi thật hay bấm huỷ thì trang web
          không hề biết (cùng luật với nút tải ảnh, nguyên tắc 44). Nói đại là
          "đã gửi" thì khách yên tâm trong khi chưa gửi cho ai.
        */
        return;
      } catch {
        // Khách bấm huỷ, hoặc máy từ chối — rơi xuống chép link bên dưới.
      }
    }

    if (await chepLink(url)) {
      setXong("chep");
      setTimeout(() => setXong(null), 2500);
    } else {
      setXong("loi");
      setTimeout(() => setXong(null), 4000);
    }
  };

  return (
    <div>
      <button
        type="button"
        onClick={chiaSe}
        title="Người nhận xem được ảnh thư mục này, nhưng không thả tim hay đổi lựa chọn của anh chị được."
        className="inline-flex min-h-11 items-center gap-2 rounded-full border border-line-strong bg-bg-raised px-5 text-sm transition hover:border-accent hover:text-accent"
      >
        <svg
          viewBox="0 0 24 24"
          aria-hidden="true"
          className="size-4 shrink-0"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="18" cy="5" r="3" />
          <circle cx="6" cy="12" r="3" />
          <circle cx="18" cy="19" r="3" />
          <path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4" />
        </svg>
        {xong === "chep" ? "Đã chép link" : "Gửi link cho người thân"}
      </button>

      {/*
        Một dòng nói rõ người nhận làm được gì.

        Đây mới là thứ quyết định cô dâu có dám bấm hay không: gửi cả bộ ảnh
        cưới cho họ hàng mà không biết họ có lỡ tay đụng vào lựa chọn của mình
        không thì phần lớn sẽ thôi, không gửi. Câu này trả lời trước khi họ kịp
        lo — và nói đúng sự thật, vì mã chọn ảnh không nằm trong địa chỉ trang.
      */}
      {/*
        CHỈ hiện chữ khi có chuyện phải nói — lúc chép hỏng.

        Bản đầu có một dòng trấn an luôn hiện ("người nhận chỉ xem được…").
        Đo trên màn 375px của album bốn thư mục: nút cộng dòng đó đẩy tấm ảnh
        đầu tiên xuống 874px, rồi gộp nút vào cùng hàng số ảnh vẫn còn 840px —
        cả hai đều quá màn hình 812px và phá mốc của nguyên tắc 30 ("ảnh đầu
        tiên vẫn nằm trong màn hình đầu"). Không có nút thì ảnh ở 767px.

        Câu trấn an đó dời vào chú thích của nút. Mất chỗ đứng trên điện thoại,
        nhưng nó vốn chỉ để yên lòng chứ không cảnh báo điều gì: khay chia sẻ
        mở ra đã mang sẵn dòng "Ảnh cưới của … — tên thư mục", khách nhìn là
        biết mình đang gửi cái gì. Đổi lại giữ được một mốc đã đo và đã chốt.

        Câu BÁO HỎNG thì phải hiện thật, không nuốt: khách bấm mà không có gì
        xảy ra là kiểu hỏng tệ nhất (cùng bài học với nút tải ảnh trên
        Android, nguyên tắc 44).
      */}
      {xong === "loi" && (
        <p className="mt-1.5 text-xs leading-relaxed text-fg-faint">
          Chưa chép được — anh chị chép giúp địa chỉ trên trình duyệt nhé.
        </p>
      )}
    </div>
  );
}

/**
 * Chép link, thử HAI đường — và đường thứ hai không phải để cho đẹp.
 *
 * `navigator.clipboard` là đường chuẩn, nhưng trình duyệt từ chối nó ở khá
 * nhiều chỗ khách thật sự ngồi: trang nhúng trong Zalo/Messenger (nơi khách
 * của studio mở link nhiều nhất, xem `laTrongUngDungKhac`), và bất cứ đâu
 * quyền clipboard bị chặn. Đo ngay khi làm: trong khung xem thử, lời gọi đi
 * đúng địa chỉ trang nhưng trả về `NotAllowedError`.
 *
 * `execCommand("copy")` là cách cũ đã bị khai tử trong tài liệu, nhưng mọi
 * trình duyệt còn chạy nó và nó KHÔNG hỏi quyền — nên đúng là tấm lưới đỡ cho
 * trường hợp trên. Ô nhập phải nằm trong trang thật (không `display:none`)
 * thì lệnh mới có gì để chép, nên đẩy nó ra ngoài khung nhìn bằng toạ độ âm
 * và khai `readOnly` để iPhone không bật bàn phím lên giữa chừng.
 *
 * Thất bại cả hai đường thì nói thật với khách và chỉ đường chép tay — đừng
 * im lặng, mà cũng đừng báo "đã chép" cho xong (cùng luật với nút ghi chú,
 * nguyên tắc 31).
 */
async function chepLink(url: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(url);
    return true;
  } catch {
    // Rơi xuống đường cũ bên dưới.
  }

  try {
    const o = document.createElement("textarea");
    o.value = url;
    o.setAttribute("readonly", "");
    o.style.position = "fixed";
    o.style.top = "-9999px";
    document.body.appendChild(o);
    o.select();
    const duoc = document.execCommand("copy");
    document.body.removeChild(o);
    return duoc;
  } catch {
    return false;
  }
}
