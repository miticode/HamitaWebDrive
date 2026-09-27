import { MUI_GIO, tien } from "./constants";
import { HAMI_BABY, STUDIO } from "./studio";

/*
  Bộ câu hỏi thường gặp hiện ở khung trò chuyện trên trang album của khách.

  KHÔNG DÙNG AI, và đó là lựa chọn chứ không phải bước đệm. Ba lý do:

  - Mọi con số ở đây đều dính tới TIỀN và NGÀY THÁNG của khách. Câu trả lời
    dựng thẳng từ dữ liệu album nên không có đường nào bịa ra một con số khác.
  - Khách của studio ít đọc chữ. Bấm một câu hỏi có sẵn dễ hơn hẳn gõ một câu
    hỏi vào ô trống — cái làm nên khác biệt là NÚT BẤM, không phải AI.
  - Không gọi mạng lần nào: không tốn tiền, không chậm, không hỏng khi mạng
    trục trặc.

  MỌI CÂU CHỮ KHÁCH ĐỌC ĐỀU NẰM Ở ĐÂY, không viết thẳng vào JSX — sửa giọng
  văn thì không phải mở file giao diện (cùng lý do với `studio.ts`, nguyên
  tắc 25).

  Câu trả lời phải KHỚP với thứ đang hiện trên trang. Ví dụ đoạn thả tim dưới
  đây là lời studio đã nói với khách ở bước 01 phần hướng dẫn (nguyên tắc 28);
  viết khác đi ở đây là nói hai kiểu về cùng một việc.
*/

export type CauHoi = {
  /** Chữ trên nút bấm — phải ngắn, đọc lướt là hiểu. */
  hoi: string;
  /** Câu trả lời. Xuống dòng bằng "\n", giao diện giữ nguyên. */
  dap: string;
};

/**
 * "05/12/2026" theo GIỜ STUDIO, không theo giờ máy đang mở trang (nguyên tắc 35).
 *
 * Cùng cách viết với thanh đếm ngược hạn giữ ảnh ở đầu trang — hai chỗ nói về
 * cùng một ngày mà viết hai kiểu thì khách tưởng là hai mốc khác nhau.
 */
export function ngayGon(iso: string | null): string | null {
  if (!iso) return null;
  return new Intl.DateTimeFormat("vi-VN", {
    timeZone: MUI_GIO,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(iso));
}

/**
 * Dựng bộ câu hỏi cho ĐÚNG album đang mở.
 *
 * Nhận số liệu đã tính sẵn ở máy chủ chứ không tự đọc database: file này chạy
 * cả ở máy khách, nhập một thứ có dính Prisma vào đây là vỡ build (nguyên tắc
 * 43).
 *
 * MÃ CHỌN ẢNH KHÔNG BAO GIỜ ĐƯỢC TRUYỀN VÀO ĐÂY. Ai cầm link cũng mở được
 * khung này; đưa mã vào là bất kỳ ai cũng hỏi ra được, vô hiệu hoá đúng lớp
 * bảo vệ mà nguyên tắc 1 và 14 dựng lên. Khách quên mã thì hướng họ nhắn Zalo.
 */
export function danhSachHoiDap(album: {
  /** null = không tính theo gói · 0 = gói chỉ lấy file · N = gói có N tấm in. */
  soAnhTrongGoi: number | null;
  giaAnhThem: number;
  choTaiAnh: boolean;
  /** Ngày studio dự định dọn ảnh, đã định dạng sẵn ("5/12/2026"). null = không đặt hạn. */
  hanGiuAnh: string | null;
  /**
   * Các thư mục có gói riêng, kèm số tấm — chỉ truyền ở TRANG BÌA.
   *
   * Trang bìa trải trên mọi thư mục, mà từ 10/09/2026 mỗi thư mục có thể mang
   * một gói khác nhau (nhà chụp nhiều đợt). Lúc đó một con số duy nhất là nói
   * sai với khách, nên câu trả lời liệt kê ra từng thư mục.
   *
   * Trong một thư mục thì KHÔNG truyền: ở đó đã biết chắc gói nào đang áp
   * dụng, liệt kê cả nhà chỉ làm khách phải tự dò lại xem mình đang ở đâu.
   */
  goiTungMuc?: { tenMuc: string; soAnh: number }[];
}): CauHoi[] {
  const ds: CauHoi[] = [];

  ds.push({
    hoi: "Thả tim để làm gì ạ?",
    dap:
      "Trái tim là những tấm anh chị muốn Hamita IN RA.\n\n" +
      "Đơn in của bên em chỉ tính những tấm thả tim thôi ạ, nên tấm nào muốn cầm về trên giấy thì anh chị nhớ bấm trái tim giúp em nhé.",
  });

  /*
    Ba trạng thái của gói ảnh, không phải hai (nguyên tắc 38). Số 0 là một gói
    THẬT — gói chỉ lấy file — chứ không phải "chưa đặt gói", nên phải so với
    `null` chứ không viết `soAnhTrongGoi ? …`.
  */
  const goiTungMuc = album.goiTungMuc ?? [];

  if (goiTungMuc.length > 0) {
    /*
      Nhiều gói thì LIỆT KÊ THẲNG RA, không gộp thành một con số.

      Gộp lại (cộng dồn chẳng hạn) là kiểu sai nguy hiểm nhất: khách đọc ra một
      con số tròn trịa rồi thả tim theo nó, tới lúc nhận đơn in mới biết mình
      vượt gói ở thư mục này mà còn thiếu ở thư mục kia.
    */
    ds.push({
      hoi: "Anh chị được chọn bao nhiêu tấm ạ?",
      dap:
        "Nhà mình chụp nhiều đợt nên mỗi thư mục có một gói riêng ạ:\n\n" +
        goiTungMuc
          .map((g) =>
            g.soAnh === 0
              ? `• ${g.tenMuc}: gói chỉ lấy file, không kèm ảnh in`
              : `• ${g.tenMuc}: cần thả tim ${g.soAnh} tấm`,
          )
          .join("\n") +
        "\n\nAnh chị mở thư mục nào thì ngay đầu thư mục đó có ghi rõ gói của đợt ấy ạ.\n\n" +
        `Lỡ thương thêm tấm nào ngoài gói thì cứ chọn thoải mái — chi phí phát sinh thêm trên mỗi tấm ảnh là ${tien(album.giaAnhThem)}đ ạ.`,
    });
  } else if (album.soAnhTrongGoi === null) {
    ds.push({
      hoi: "Anh chị được chọn bao nhiêu tấm ạ?",
      dap: "Album này Hamita không tính theo gói, anh chị cứ thả tim thoải mái những tấm mình thương ạ. Cần rõ hơn về số lượng thì nhắn Zalo cho bên em nhé.",
    });
  } else if (album.soAnhTrongGoi === 0) {
    ds.push({
      hoi: "Anh chị được chọn bao nhiêu tấm ạ?",
      dap:
        "Gói của anh chị là gói chỉ lấy file ảnh, không kèm ảnh in — nên anh chị cứ xem và tải hết về máy thoải mái ạ.\n\n" +
        `Tấm nào anh chị muốn Hamita in ra thì mỗi tấm ${tien(album.giaAnhThem)}đ ạ. Anh chị thả tim tấm đó là bên em biết.`,
    });
  } else {
    ds.push({
      hoi: "Anh chị được chọn bao nhiêu tấm ạ?",
      dap:
        `Gói của anh chị cần thả tim ${album.soAnhTrongGoi} tấm ạ.\n\n` +
        `Lỡ thương thêm tấm nào ngoài gói thì cứ chọn thoải mái — chi phí phát sinh thêm trên mỗi tấm ảnh là ${tien(album.giaAnhThem)}đ ạ.`,
    });
  }

  ds.push({
    hoi: "Anh chị muốn dặn Hamita chỉnh sửa thì ghi ở đâu?",
    dap:
      "Anh chị bấm vào tấm ảnh cho nó hiện to lên. Ngay dưới ảnh có ô để ghi — ví dụ “ảnh cổng”, “ảnh bìa”, “in cỡ 40x60”, hay “sáng hơn chút giúp em”.\n\n" +
      "Gõ xong bấm nút Lưu bên cạnh ô là Hamita nhận được ạ. Ô ghi chú chỉ hiện ra khi tấm đó đã được thả tim.",
  });

  ds.push({
    hoi: "Anh chị chọn xong rồi thì làm gì tiếp ạ?",
    dap:
      "Anh chị kéo xuống cuối thư mục rồi bấm nút “Báo cho Hamita” là bên em nhận được ngay và bắt tay vào làm liền ạ.\n\n" +
      "Album có nhiều thư mục thì mỗi thư mục báo riêng một lần. Lỡ quên tấm nào hay đổi ý sau đó, anh chị vẫn chọn lại được bình thường nhé.",
  });

  /*
    Câu này chắc chắn có người hỏi, và là chỗ NGUY HIỂM NHẤT của cả khung.
    Tuyệt đối không đọc mã ra. Chỉ chỉ đường tới đúng nút và tới Zalo studio.
  */
  ds.push({
    hoi: "Anh chị bấm trái tim mà không được ạ?",
    dap:
      "Phải nhập mã của album thì mới thả tim được ạ — mã đó để không ai ngoài nhà mình chọn nhầm vào bộ ảnh của anh chị.\n\n" +
      "Anh chị bấm nút “Nhập mã” ở thanh trên cùng rồi gõ mã studio đã gửi kèm link. Không tìm thấy mã thì nhắn Zalo cho Hamita, bên em gửi lại ngay ạ.",
  });

  ds.push({
    hoi: "Cả nhà cùng chọn trên nhiều máy được không ạ?",
    dap:
      "Được ạ. Cả nhà dùng chung một mã nên ai chọn cũng vào chung một danh sách — vợ chọn trên điện thoại, chồng mở máy tính vẫn thấy đúng những tấm đó.\n\n" +
      "Hai người cùng thả tim một tấm thì cũng chỉ tính là một tấm thôi, không sợ trùng ạ.",
  });

  ds.push(
    album.choTaiAnh
      ? {
          hoi: "Anh chị tải ảnh về máy thế nào ạ?",
          dap:
            "Mỗi thư mục có nút “Tải tất cả”, bấm vào là được ạ.\n\n" +
            "Trên điện thoại, máy sẽ lưu lần lượt từng tấm vào ảnh của anh chị — iPhone thì bấm thêm “Lưu ảnh” khi máy hỏi.\n\n" +
            "Trên máy tính thì ảnh về thành một tệp nén, mở ra là có đủ thư mục. Bộ nào nặng thì tải bằng máy tính sẽ nhanh và chắc hơn ạ.\n\n" +
            "Muốn lấy lẻ một tấm thì bấm vào ảnh cho hiện to, rồi bấm mũi tên tải ở dưới.",
        }
      : {
          hoi: "Anh chị tải ảnh về máy thế nào ạ?",
          dap: "Album này Hamita chưa mở phần tải ảnh. Anh chị cần file gốc thì nhắn Zalo cho bên em nhé, Hamita gửi ngay ạ.",
        },
  );

  if (album.hanGiuAnh) {
    ds.push({
      hoi: "Hamita giữ ảnh tới khi nào ạ?",
      dap:
        `Hamita giữ bộ ảnh này trên hệ thống tới ngày ${album.hanGiuAnh} ạ.\n\n` +
        "Quá ngày đó link vẫn mở được bình thường, nhưng anh chị tranh thủ tải hết về máy trước cho chắc nhé — để dành xem lâu dài ạ.",
    });
  }

  ds.push({
    hoi: "Làm sao mở lại album cho nhanh?",
    dap:
      "Anh chị bấm nút “Lưu bộ ảnh ra màn hình chính” ở đầu trang. Album sẽ nằm ngoài màn hình điện thoại như một app, lần sau mở một chạm là vào ạ.\n\n" +
      "Bật thêm nhận thông báo thì Hamita đổ ảnh mới lên là điện thoại anh chị báo liền, khỏi phải vào xem chừng.",
  });

  ds.push({
    hoi: "Hamita ở đâu, liên hệ thế nào ạ?",
    dap:
      /*
        Hai co so, noi du ca hai: khach album be hoi cau nay cung nhieu nhu
        khach cuoi, ma chi dua mot dia chi thi mot nua se di nham noi.
      */
      `${STUDIO.ten} có hai cơ sở ạ:\n\n` +
      `• Cưới hỏi — Hamita Wedding House\n${STUDIO.diaChi}\nĐiện thoại ${STUDIO.dienThoai}\n\n` +
      `• Chụp bé và gia đình — ${HAMI_BABY.ten}\n${HAMI_BABY.diaChi}\nĐiện thoại ${HAMI_BABY.dienThoai}\n\n` +
      `${STUDIO.gioMoCua}. Anh chị gọi hoặc nhắn Zalo đều được ạ.`,
  });

  return ds;
}
