"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { tien } from "@/lib/constants";
import { docTien } from "@/lib/studioNoiBo";
import { LOAI_DICH_VU, TEN_LOAI, laLoaiDichVu } from "@/lib/dichVuChung";
import { loaiBuoiGoiY, soBuoiCuaGoi } from "@/lib/goiNhieuNgay";
import { MA_ALBUM, ganNhieuMa, type MaAlbum } from "@/lib/maAlbum";
import {
  BUOC_MOI_LAP,
  CAC_BUOC,
  HINH_THUC_THU,
  LOAI_DV_HD,
  LOAI_LICH,
  NOI_DUNG_THU,
  ngayVN,
  type DongDichVuMoi,
  type DongLichMoi,
  type DongThuMoi,
} from "@/lib/hopDongChung";
import { lapHopDongAction, timKhachAction, type KhachTim } from "../../../actionsHopDong";
import { ChonDichVu, Hang, Khung, O, type DichVuGon, type GiaGon } from "../ChonDichVu";

/**
 * Form lập hợp đồng — một trang đi từ khách tới đầu việc, đúng thứ tự nhân
 * viên vẫn làm bên AppSheet: chọn khách → loại hợp đồng → các dòng dịch vụ →
 * cọc → lịch chụp → đầu việc.
 *
 * Tiền hiện ở đây chỉ để NGƯỜI LẬP nhìn. Con số ghi vào database do máy chủ
 * cộng lại trong `kiemHopDongMoi` — hai bên dùng chung một hàm nên không lệch,
 * mà máy chủ vẫn không phải tin con số trình duyệt gửi lên.
 */
export function FormHopDongMoi({
  dichVu,
  giaHangMuc,
  luotDung,
  homNay,
  laQuanLy,
  tenNguoiLap,
  cacBuoc = CAC_BUOC,
  loaiBuoi,
  danhMuc,
  boMa = MA_ALBUM,
  onThoi,
  onXong,
}: {
  dichVu: DichVuGon[];
  giaHangMuc: GiaGon[];
  /** maDV → số lần đã dùng trong hợp đồng; để danh sách bày sẵn xếp hay-dùng-trước. */
  luotDung?: Record<string, number>;
  homNay: string;
  /**
   * Mười tám bước, đọc từ bảng `BuocHopDong` (đợt 6). Mặc định là bảng cứng
   * `CAC_BUOC` — ô chọn không được phép rỗng dù bảng kia chưa chép.
   */
  cacBuoc?: readonly string[];
  /**
   * Loại buổi chụp, đọc từ bảng `LoaiBuoi` (anh yêu cầu 18/11/2026).
   *
   * Thiếu thì dùng bảng cứng `LOAI_LICH` — y như `cacBuoc`. Ô chọn không bao
   * giờ được phép rỗng, kể cả khi chưa ai nhập gì vào bảng mới.
   */
  loaiBuoi?: readonly { ten: string; maAlbum: string | null }[];
  /**
   * Ba danh mục nhỏ đọc từ bảng `DanhMuc` (anh yêu cầu 18/11/2026).
   * Thiếu thì dùng bảng cứng — ô chọn không bao giờ được phép rỗng.
   */
  danhMuc?: { loaiHopDong: string[]; hinhThucThu: string[]; noiDungThu: string[] };
  /**
   * Bộ mã album, đọc từ bảng `MaAlbum` (anh yêu cầu 19/11/2026).
   * Thiếu thì dùng bộ cứng — ô chọn không bao giờ được phép rỗng.
   */
  boMa?: readonly MaAlbum[];
  /** Quản lý lập phiếu thu thì ghi thẳng "đã thu"; sale thì phiếu nằm chờ duyệt. */
  laQuanLy: boolean;
  tenNguoiLap: string;
  /**
   * Bấm "Thôi" thì làm gì. Để trống = quay về danh sách hợp đồng (trang riêng);
   * trong cửa sổ bật lên thì truyền hàm đóng cửa sổ vào đây.
   */
  onThoi?: () => void;
  /**
   * Lưu xong thì làm gì. Để trống = đi thẳng sang trang hợp đồng vừa lập;
   * trong cửa sổ bật lên thì đóng cửa sổ trước rồi mới đi.
   */
  onXong?: (id: string) => void;
}) {
  const router = useRouter();
  const [dangLuu, start] = useTransition();
  const [loi, setLoi] = useState<string | null>(null);

  // ── Khách ───────────────────────────────────────────────────────────────
  const [khachCu, setKhachCu] = useState<KhachTim | null>(null);
  const [tuKhoa, setTuKhoa] = useState("");
  const [ketQua, setKetQua] = useState<KhachTim[] | null>(null);
  const [dangTim, batDauTim] = useTransition();
  const [khachMoi, setKhachMoi] = useState({ ten: "", soDienThoai: "", tinh: "", ghiChu: "" });

  // ── Hợp đồng ────────────────────────────────────────────────────────────
  const [tenKhach, setTenKhach] = useState("");
  /*
    TÊN HỢP ĐỒNG CHÉP Y CHANG TÊN KHÁCH — anh chốt 15/11/2026.

    Cờ này nhớ "người dùng đã tự gõ vào ô tên hợp đồng chưa". Chưa gõ thì ô
    tên hợp đồng bám theo ô tên khách từng ký tự; gõ rồi thì thôi bám, vì
    hợp đồng cưới hay ghi "Minh Trí & Thuỳ Dung" trong khi ô khách chỉ có
    một người đứng tên.

    Bẫy của bản cũ (`if (!tenKhach.trim())`): nó chép đúng MỘT lần. Gõ "M"
    thì chép được "M", tới ký tự thứ hai `tenKhach` đã có chữ nên điều kiện
    tắt — tên hợp đồng kẹt ở một chữ cái. Phải nhớ Ý ĐỊNH của người dùng,
    không suy ra từ ô có rỗng hay không.

    Xoá trắng ô tên hợp đồng là quay về bám tiếp — đó là cách rút lại ý định
    mà không cần thêm nút nào.
  */
  const [tenTuGo, setTenTuGo] = useState(false);
  const [loaiDV, setLoaiDV] = useState<string>(LOAI_DV_HD[1]);
  /*
    Ngày lập = hôm nay, KHÔNG sửa được (anh chốt 14/11/2026).

    Đây là dấu thời gian của tờ hợp đồng, không phải ô để điền. Máy chủ chốt
    lại lần nữa lúc lưu (`lapHopDongAction`), nên giá trị ở đây chỉ để nhìn và
    để làm ngày mặc định cho phiếu thu đầu tiên.
  */
  const ngayDat = homNay;
  const [diaChi, setDiaChi] = useState("");
  const [ghiChu, setGhiChu] = useState("");
  const [khuyenMai, setKhuyenMai] = useState(0);
  /** null = chưa ai đụng vào ô trạng thái, để web tự đoán theo ngày chụp. */
  const [ttTuChon, setTtTuChon] = useState<string | null>(null);
  const [moHetBuoc, setMoHetBuoc] = useState(false);

  /*
    BA BƯỚC — anh yêu cầu 18/11/2026 ("form lập dài quá, gom lại thành các
    bước đi").

    Chia theo đúng mạch người lập vẫn làm: ai là khách → mua gì, trả bao
    nhiêu → chụp khi nào, album tên gì. Mỗi bước vừa một màn hình, không phải
    cuộn qua tám khối mới tới nút Lưu.

    KHÔNG ÉP THỨ TỰ. Bấm số nào cũng nhảy thẳng tới bước đó, và nút "Lập hợp
    đồng" nằm ở thanh dưới nên bấm được từ bất cứ bước nào. Hợp đồng khách lẻ
    chỉ có một dòng dịch vụ thì không việc gì bắt đi hết ba bước. Bước ở đây
    là cách CHIA MÀN HÌNH, không phải cái khoá.
  */
  const [buoc, setBuoc] = useState(1);

  // ── Các dòng ────────────────────────────────────────────────────────────
  const [dong, setDong] = useState<DongDichVuMoi[]>([]);
  const [thu, setThu] = useState<DongThuMoi[]>([
    { soTien: 0, hinhThuc: HINH_THUC_THU[0], noiDung: NOI_DUNG_THU[0], ngayThu: homNay, ghiChu: "" },
  ]);
  const [lich, setLich] = useState<DongLichMoi[]>([]);
  /** Đầu việc người lập bỏ tick — lưu theo khoá dòng|tên việc. */
  const [boViec, setBoViec] = useState<Set<string>>(new Set());

  const giaTheoDV = useMemo(() => {
    const m = new Map<string, GiaGon[]>();
    for (const g of giaHangMuc) m.set(g.dichVuId, [...(m.get(g.dichVuId) ?? []), g]);
    return m;
  }, [giaHangMuc]);

  /*
    Đầu việc gợi ý theo BẢNG GIÁ HẠNG MỤC của từng dịch vụ — đúng cách AppSheet
    sinh việc khi lập hợp đồng. Chỉ 96/1.018 dịch vụ có bảng giá này, nên dòng
    nào không có thì đơn giản là không sinh việc, không phải lỗi.

    Tên việc lấy thẳng tên hạng mục ("PHOTO", "Makeup", "Photoshop"…). Bên
    AppSheet tên việc đôi khi khác tên hạng mục ("CHỤP TIỆC" cho hạng mục
    "PHOTO") — quy tắc đổi tên đó không đoán ra được từ dữ liệu (đo 21/09: chỉ
    121/380 việc trùng tên hạng mục), nên web ghi tên hạng mục và để người lập
    sửa nếu muốn.
  */
  /*
    MÃ ALBUM — anh chốt 18/11/2026.

    Web tự suy từ hai nguồn: mã gắn trên dịch vụ, và loại buổi trong lịch
    (nhà gái ra HER, Đính Hôn ra ĐH…). Nhưng đo 325 dòng dùng mấy gói "NGÀY
    CƯỚI/HỎI 1 NGÀY" thì chỉ 215 ca suy ra được — 34% còn lại lịch chỉ ghi
    "Ngày chụp" chung chung, mà chính gói đó dùng cho cả cưới lẫn đám hỏi.

    Nên gợi ý sẵn, rồi để người lập sửa. Họ đang ngồi với khách, họ biết.

    `maTuGo === null` nghĩa là CHƯA AI ĐỤNG VÀO, cứ theo gợi ý. Khác hẳn
    mảng rỗng — mảng rỗng là cố ý không gắn mã nào. Gộp hai cái đó lại thì
    người cố tình bỏ hết mã sẽ thấy nó tự mọc lại.
  */
  /* Danh sách cho ô chọn, và bảng tra mã — cùng một nguồn. */
  const dsLoai = useMemo(
    () => (loaiBuoi && loaiBuoi.length > 0 ? loaiBuoi : LOAI_LICH.map((ten) => ({ ten, maAlbum: null }))),
    [loaiBuoi],
  );
  const loaiDau = dsLoai[0]?.ten ?? LOAI_LICH[0];
  const dsLoaiHD = danhMuc?.loaiHopDong?.length ? danhMuc.loaiHopDong : [...LOAI_DV_HD];
  const dsHinhThuc = danhMuc?.hinhThucThu?.length ? danhMuc.hinhThucThu : [...HINH_THUC_THU];
  const dsNoiDung = danhMuc?.noiDungThu?.length ? danhMuc.noiDungThu : [...NOI_DUNG_THU];
  const maTheoLoai = useMemo(() => {
    const m = new Map<string, string>();
    for (const l of dsLoai) if (l.maAlbum) m.set(l.ten.trim().toLowerCase(), l.maAlbum);
    return m;
  }, [dsLoai]);

  const maGoiY = useMemo(() => {
    const tu = [
      ...dong.map((d) => dichVu.find((x) => x.id === d.dichVuId)?.maAlbum ?? null),
      ...lich.map((l) => maTheoLoai.get((l.loai ?? "").trim().toLowerCase()) ?? null),
    ].filter((m): m is string => !!m);
    return [...new Set(tu)];
  }, [dong, lich, dichVu, maTheoLoai]);
  const [maTuGo, setMaTuGo] = useState<string[] | null>(null);
  const maAlbum = maTuGo ?? maGoiY;
  const tenAlbumXem = maAlbum.length > 0 ? ganNhieuMa(tenKhach || "tên khách", maAlbum, boMa) : tenKhach || "tên khách";

  const doiMa = (m: string) =>
    setMaTuGo(maAlbum.includes(m) ? maAlbum.filter((x) => x !== m) : [...maAlbum, m]);

  const viecGoiY = useMemo(
    () =>
      dong.flatMap((d, i) =>
        (d.dichVuId ? (giaTheoDV.get(d.dichVuId) ?? []) : []).map((g) => ({
          khoa: `${i}|${g.hangMuc ?? ""}|${g.donGia}`,
          dong: i,
          loai: g.hangMuc?.trim() || "Việc",
          donGia: g.donGia,
          soLuong: d.soLuong,
          thoiHan: d.ngayChup,
          tenDV: d.tenDV,
        })),
      ),
    [dong, giaTheoDV],
  );

  /*
    Trạng thái tự nhảy theo việc ĐÃ CÓ NGÀY CHỤP hay chưa — đúng hai bước hợp
    đồng mới lập hay đứng bên AppSheet. Người lập chọn tay một lần thì từ đó
    web thôi đoán, không giật lại lựa chọn của họ mỗi lần thêm dòng.
  */
  /* Có ngày chụp chưa — tính cả lịch, vì gói nhiều ngày để ngày ở bên lịch. */
  const coNgayChup = dong.some((d) => d.ngayChup) || lich.some((l) => l.ngay);
  const trangThai = ttTuChon ?? (coNgayChup ? BUOC_MOI_LAP[1] : BUOC_MOI_LAP[0]);

  const thanhTien = dong.reduce((s, d) => s + Math.round(d.donGia * d.soLuong), 0);
  const tongTien = Math.max(0, thanhTien - khuyenMai);
  const daThu = thu.reduce((s, t) => s + (t.soTien || 0), 0);

  const ngayChupChuaCoLich = useMemo(() => {
    const daCo = new Set(lich.map((l) => l.ngay));
    return [...new Set(dong.map((d) => d.ngayChup).filter((n) => n && !daCo.has(n)))].sort();
  }, [dong, lich]);

  const timKhach = () =>
    batDauTim(async () => {
      setKetQua(await timKhachAction(tuKhoa));
    });

  const chonKhach = (k: KhachTim) => {
    setKhachCu(k);
    setKetQua(null);
    setTuKhoa("");
    if (!tenTuGo) setTenKhach(k.ten);
  };

  const doiDong = (i: number, sua: Partial<DongDichVuMoi>) =>
    setDong((ds) => ds.map((d, j) => (i === j ? { ...d, ...sua } : d)));

  /**
   * Đặt ngày cho buổi thứ `k` của gói nhiều ngày — gọi từ ô "Ngày chụp k"
   * trên dòng dịch vụ.
   *
   * Ghi thẳng vào dòng lịch thứ `k`, vì mấy ô trên kia chính là cửa sổ nhìn
   * vào lịch chứ không phải một bản sao. Thiếu dòng thì thêm cho đủ: người
   * lập có thể đã bấm Bỏ một dòng rồi mới quay lên điền ngày.
   */
  const datNgayBuoi = (k: number, ngay: string) =>
    setLich((ds) => {
      const moi = [...ds];
      while (moi.length <= k) moi.push({ ngay: "", gio: "", loai: loaiDau, ghiChu: "", hienThi: "" });
      moi[k] = { ...moi[k], ngay };
      return moi;
    });

  /*
    Dòng gửi lên máy chủ: gói nhiều ngày lấy NGÀY ĐẦU trong lịch làm `ngayChup`.

    Cột `ngayChup` của dòng chi tiết chỉ chứa được một ngày, mà gói hai ngày có
    hai buổi — buổi thứ hai sống ở bảng Lịch chụp, nơi vốn dành cho từng buổi.
    Tính ở đây thay vì giữ thêm một state nữa: hai state cùng nói về một ngày
    là sớm muộn cũng lệch nhau.
  */
  const dongDeLuu = () =>
    dong.map((d, i) =>
      soBuoiCuaDong(d) > 0 ? { ...d, ngayChup: lich[viTriLich(i)]?.ngay ?? d.ngayChup } : d,
    );

  /*
    MỘT DÒNG DỊCH VỤ CHIẾM MẤY DÒNG LỊCH, VÀ TỪ ĐÂU — anh chỉ ra 18/11/2026
    ("ở trên a đã chọn ngày chụp mà ở dưới lịch chụp k tự lấy theo").

    Lỗ của bản trước: ô ngày trên dòng dịch vụ chỉ nối thẳng vào lịch khi gói
    có TỪ HAI BUỔI trở lên. Gói một buổi — kể cả gói đã gắn sẵn buổi chụp như
    "GÓI ẢNH CỔNG BASIC1" — vẫn dùng ô ngày riêng, không dính gì tới dòng lịch
    bên dưới. Người lập điền ngày ở trên rồi phải bấm thêm một nút nữa mới
    thấy nó xuống lịch.

    Giờ: dịch vụ nào CÓ BUỔI GẮN SẴN thì ô ngày của nó chính là ô ngày của
    dòng lịch tương ứng, dù chỉ một buổi. Dịch vụ không gắn gì và tên cũng
    không nói nhiều ngày thì giữ ô ngày riêng như cũ — trang phục, sản phẩm
    không sinh buổi chụp nào.
  */
  /*
    Nhãn ô ngày của buổi đơn: nói rõ nó là buổi nào.

    Loại nào đã bắt đầu bằng "Ngày" thì dùng thẳng, không thì thêm chữ "Ngày"
    phía trước — nếu không sẽ ra "NGÀY NGÀY CHỤP", đúng thứ hiện lên lúc thử
    18/11.
  */
  const nhanNgay = (loai: string | undefined): string => {
    const t = (loai ?? "").trim();
    if (!t) return "Ngày chụp";
    return /^ngày\s/i.test(t) ? t : `Ngày ${t}`;
  };

  const soBuoiCuaDong = (d: DongDichVuMoi): number => {
    const gan = dichVu.find((x) => x.id === d.dichVuId)?.buoi?.length ?? 0;
    return gan > 0 ? gan : soBuoiCuaGoi(d.tenDV) >= 2 ? soBuoiCuaGoi(d.tenDV) : 0;
  };
  /** Dòng lịch đầu tiên thuộc về dòng dịch vụ thứ `i`. */
  const viTriLich = (i: number): number =>
    dong.slice(0, i).reduce((s, d) => s + soBuoiCuaDong(d), 0);

  /*
    CUỘN TỚI DÒNG VỪA THÊM — anh chỉ ra 14/11/2026 ("kéo xuống dưới mới thấy
    cái đã chọn").

    Cửa sổ chọn đóng lại đã giải quyết phần lớn, nhưng hợp đồng cưới hay có
    năm bảy dòng; dòng mới luôn nằm cuối, nên vẫn khuất dưới màn hình. Đây là
    lần DUY NHẤT web tự cuộn giùm — và chỉ khi số dòng TĂNG, để bỏ một dòng
    không giật người ta đi đâu cả.
  */
  const soDongCu = useRef(0);
  const dongCuoi = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (dong.length > soDongCu.current) {
      dongCuoi.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
    soDongCu.current = dong.length;
  }, [dong.length]);

  /*
    GÓI NHIỀU NGÀY TỰ SINH ĐỦ DÒNG LỊCH — anh yêu cầu 15/11/2026.

    "Gói tiệc cưới 2 ngày" là hai buổi: nhà gái một buổi, nhà trai một buổi.
    Trước đây người lập phải tự bấm "Thêm dòng lịch" hai lần rồi tự chọn loại;
    quên thì hợp đồng chỉ có một buổi, và album trên Drive cũng chỉ ra một cái
    thay vì HER và HIS.

    KHÔNG BAO GIỜ ĐỘNG VÀO DÒNG NGƯỜI TA ĐÃ ĐIỀN. Chỉ hai việc:
      · dòng nào còn trắng tinh thì điền giúp loại buổi,
      · thiếu bao nhiêu dòng thì thêm bấy nhiêu.
    Dòng đã có ngày, có ghi chú thì giữ nguyên — kể cả khi loại của nó khác
    gợi ý, vì người lập biết nhà đó chụp gì hơn bảng giá.
  */
  const sinhLichChoGoi = (dv: DichVuGon) => {
    /*
      BUỔI GẮN SẴN TRÊN DỊCH VỤ ĐI TRƯỚC — anh yêu cầu 18/11/2026.

      Người bán đã nói thẳng gói này gồm những buổi nào thì không việc gì phải
      đoán nữa. Phép đoán cũ (số buổi đọc từ tên "2 ngày", loại buổi dò regex
      trong phần chi tiết) chỉ giữ cho những dịch vụ CHƯA gắn — đo 18/11: nó
      đoán ra 7/95 gói, đúng với GTC2DAY nhưng chịu thua mọi gói khác.
    */
    if (dv.buoi && dv.buoi.length > 0) {
      setLich((ds) => {
        const moi = [...ds];
        const con = [...dv.buoi!];
        /* Rót vào dòng còn trắng tinh trước, rồi mới thêm dòng mới. */
        for (let i = 0; i < moi.length && con.length > 0; i++) {
          const l = moi[i];
          if (!l.ngay && !l.gio && !l.ghiChu && l.loai === loaiDau) {
            moi[i] = { ...l, loai: con.shift()! };
          }
        }
        for (const ten of con) {
          moi.push({ ngay: "", gio: "", loai: ten, ghiChu: "", hienThi: "" });
        }
        return moi;
      });
      return;
    }

    const soBuoi = soBuoiCuaGoi(dv.ten);
    if (soBuoi < 2) return;
    const goiY = loaiBuoiGoiY(dv.chiTiet, soBuoi).filter(Boolean);
    setLich((ds) => {
      /*
        Rót theo LOẠI CÒN THIẾU, không theo thứ tự dòng.

        Nếu rót theo thứ tự thì gặp cảnh này: người lập tự thêm hai dòng trước,
        điền ngày cho dòng đầu rồi mới chọn gói — dòng đầu giữ nguyên (đúng),
        nhưng dòng hai nhận "nhà trai" vì nó đứng thứ hai, thành ra hợp đồng có
        nhà trai mà không có nhà gái. Nhìn vào không hiểu vì sao.
      */
      const daDung = new Set(ds.map((l) => l.loai));
      const con = goiY.filter((g) => !daDung.has(g));
      const moi = [...ds];
      for (let i = 0; i < moi.length && con.length > 0; i++) {
        const l = moi[i];
        const trangTinh = !l.ngay && !l.gio && !l.ghiChu && l.loai === loaiDau;
        if (trangTinh) moi[i] = { ...l, loai: con.shift()! };
      }
      while (moi.length < soBuoi) {
        moi.push({ ngay: "", gio: "", loai: con.shift() ?? loaiDau, ghiChu: "", hienThi: "" });
      }
      return moi;
    });
  };

  const themDong = (dv: DichVuGon | null) => {
    if (dv) sinhLichChoGoi(dv);
    setDong((ds) => [
      ...ds,
      {
        dichVuId: dv?.id ?? null,
        maDV: dv?.maDV ?? "",
        tenDV: dv?.ten ?? "",
        loai: dv && laLoaiDichVu(dv.loai) ? dv.loai : "",
        donGia: dv?.donGia ?? 0,
        soLuong: 1,
        ngayChup: "",
        /*
          CHI TIẾT CHẢY SẴN TỪ BẢNG — anh yêu cầu 14/11/2026.

          Mô tả gói ("2 máy chụp · 1 photobook 30 trang · 50 ảnh in lụa…") là
          thứ khách đọc để biết mình mua gì, và nó đã nằm sẵn trong bảng Dịch
          vụ. Trước đây ô này để trắng, nên người lập phải mở trang Dịch vụ,
          chép tay sang. Đo 7.251 dòng chi tiết cũ: 7.244 dòng CÓ chi tiết —
          tiệm vốn luôn ghi, chỉ là web bắt gõ lại.

          Vẫn sửa được sau khi điền: mỗi hợp đồng có thể bớt hoặc thêm một
          dòng so với gói chuẩn, và bản ghi của hợp đồng phải là thứ đã thoả
          thuận với nhà đó, không phải bản sao vĩnh viễn của bảng.
        */
        chiTiet: dv?.chiTiet ?? "",
        ghiChu: "",
      },
    ]);
  };

  const luu = () =>
    start(async () => {
      setLoi(null);
      const kq = await lapHopDongAction({
        khachHangId: khachCu?.id ?? null,
        khachMoi: khachCu ? null : khachMoi,
        tenKhach,
        loaiDV,
        ngayDat,
        diaChi,
        ghiChu,
        khuyenMai,
        trangThai,
        dong: dongDeLuu(),
        thu,
        lich,
        viec: viecGoiY
          .filter((v) => !boViec.has(v.khoa))
          .map((v) => ({ dong: v.dong, loai: v.loai, donGia: v.donGia, soLuong: v.soLuong, thoiHan: v.thoiHan })),
      }, maAlbum);
      if ("loi" in kq) {
        setLoi(kq.loi);
        return;
      }
      if (onXong) onXong(kq.id);
      else router.push(`/quan-ly/hop-dong/${kq.id}`);
    });

  return (
    <form
      className="mt-5 grid gap-5"
      onSubmit={(e) => {
        e.preventDefault();
        luu();
      }}
    >
      <ThanhBuoc
        buoc={buoc}
        onChon={setBuoc}
        xong={{
          1: Boolean((khachCu || khachMoi.ten.trim()) && tenKhach.trim()),
          2: dong.length > 0,
          3: lich.some((l) => l.ngay),
        }}
      />

      {/* ── Bước 1: khách và thông tin hợp đồng ───────────────────────── */}
      <div className={buoc === 1 ? "grid gap-5" : "hidden"}>
      <Khung ten="Khách hàng">
        {khachCu ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-md bg-bg-soft px-3.5 py-3 text-sm">
            <span>
              <b>{khachCu.ten}</b>
              {khachCu.soDienThoai && <span className="ml-2 tabular-nums text-fg-muted">{khachCu.soDienThoai}</span>}
              {khachCu.soHopDong > 0 && (
                <span className="ml-2 text-fg-faint">· đã có {khachCu.soHopDong} hợp đồng</span>
              )}
            </span>
            <button type="button" className="btn" onClick={() => setKhachCu(null)}>
              Chọn khách khác
            </button>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap gap-2">
              <input
                value={tuKhoa}
                onChange={(e) => setTuKhoa(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    timKhach();
                  }
                }}
                placeholder="Tìm khách cũ theo tên hoặc số điện thoại"
                aria-label="Tìm khách cũ"
                className="input flex-1"
              />
              <button type="button" className="btn" onClick={timKhach} disabled={dangTim || tuKhoa.trim().length < 3}>
                {dangTim ? "Đang tìm…" : "Tìm"}
              </button>
            </div>

            {ketQua && (
              <div className="mt-2 grid gap-1.5">
                {ketQua.length === 0 ? (
                  <p className="text-sm text-fg-muted">
                    Không thấy nhà nào. Nhà mới thì điền thẳng bên dưới — mã khách chính là số điện thoại.
                  </p>
                ) : (
                  ketQua.map((k) => (
                    <button
                      key={k.id}
                      type="button"
                      onClick={() => chonKhach(k)}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-line px-3 py-2 text-left text-sm transition hover:border-accent"
                    >
                      <span>
                        {k.ten}
                        {k.tinh && <span className="ml-2 text-fg-faint">{k.tinh}</span>}
                      </span>
                      <span className="tabular-nums text-fg-muted">{k.soDienThoai ?? "—"}</span>
                    </button>
                  ))
                )}
              </div>
            )}

            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <O nhan="Tên khách (nhà mới)">
                <input
                  value={khachMoi.ten}
                  onChange={(e) => {
                    setKhachMoi((k) => ({ ...k, ten: e.target.value }));
                    if (!tenTuGo) setTenKhach(e.target.value);
                  }}
                  className="input"
                />
              </O>
              <O nhan="Số điện thoại" chu="Mã khách chính là số này, đúng như bên AppSheet.">
                <input
                  value={khachMoi.soDienThoai}
                  onChange={(e) => setKhachMoi((k) => ({ ...k, soDienThoai: e.target.value }))}
                  inputMode="tel"
                  className="input tabular-nums"
                />
              </O>
              <O nhan="Tỉnh">
                <input
                  value={khachMoi.tinh}
                  onChange={(e) => setKhachMoi((k) => ({ ...k, tinh: e.target.value }))}
                  className="input"
                />
              </O>
              <O nhan="Ghi chú về khách">
                <input
                  value={khachMoi.ghiChu}
                  onChange={(e) => setKhachMoi((k) => ({ ...k, ghiChu: e.target.value }))}
                  className="input"
                />
              </O>
            </div>
          </>
        )}
      </Khung>

      {/* ── Hợp đồng ──────────────────────────────────────────────────── */}
      <Khung ten="Hợp đồng">
        <div className="grid gap-3 sm:grid-cols-2">
          <O
            nhan="Tên ghi trên hợp đồng"
            chu={
              tenTuGo
                ? "Đang ghi riêng. Xoá trắng ô này để lấy lại tên khách."
                : "Tự lấy theo tên khách. Sửa ở đây nếu muốn ghi khác."
            }
          >
            <input
              value={tenKhach}
              onChange={(e) => {
                setTenKhach(e.target.value);
                setTenTuGo(e.target.value.trim() !== "");
              }}
              className="input"
            />
          </O>
          <O nhan="Loại hợp đồng">
            <select value={loaiDV} onChange={(e) => setLoaiDV(e.target.value)} className="input">
              {dsLoaiHD.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
          </O>
          <O nhan="Ngày lập hợp đồng">
            <p className="input flex items-center bg-bg-sunken text-fg-muted tabular-nums">
              {ngayVN(ngayDat)}
            </p>
            <p className="mt-1 text-xs text-fg-faint">Tự ghi theo hôm nay, không sửa được.</p>
          </O>
          <O nhan="Trạng thái">
            <select value={trangThai} onChange={(e) => setTtTuChon(e.target.value)} className="input">
              {(moHetBuoc ? cacBuoc : BUOC_MOI_LAP).map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
            {!moHetBuoc && (
              <button
                type="button"
                onClick={() => setMoHetBuoc(true)}
                className="mt-1 text-xs text-fg-faint underline underline-offset-2 hover:text-accent"
              >
                hiện đủ 18 bước
              </button>
            )}
          </O>
          <O nhan="Địa chỉ">
            <input value={diaChi} onChange={(e) => setDiaChi(e.target.value)} className="input" />
          </O>
          <O nhan="Ghi chú">
            <input value={ghiChu} onChange={(e) => setGhiChu(e.target.value)} className="input" />
          </O>
        </div>
      </Khung>

      {/* ── Dịch vụ ───────────────────────────────────────────────────── */}
      </div>

      {/* ── Bước 2: dịch vụ và tiền ───────────────────────────────────── */}
      <div className={buoc === 2 ? "grid gap-5" : "hidden"}>
      <Khung ten="Dịch vụ, trang phục, sản phẩm">
        <ChonDichVu dichVu={dichVu} luotDung={luotDung} onChon={themDong} />

        {dong.length === 0 ? (
          <p className="mt-3 text-sm text-fg-muted">
            Chưa có dòng nào. Bấm <b className="text-fg">Chọn dịch vụ, trang phục, sản phẩm</b> ở trên.
          </p>
        ) : (
          <div className="mt-3 grid gap-3">
            {dong.map((d, i) => (
              <div
                key={i}
                ref={i === dong.length - 1 ? dongCuoi : null}
                className="rounded-md border border-line p-3"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  {/*
                    TÊN DÒNG phải SỬA ĐƯỢC — thử trên giao diện 14/11/2026 mới lộ.

                    Trước đó tên chỉ là một dòng chữ tĩnh, trong khi máy chủ bắt
                    buộc mỗi dòng phải có tên (`kiemHopDongMoi`). Nghĩa là nút
                    "Thêm một dòng trống để gõ tay" tạo ra một dòng KHÔNG BAO
                    GIỜ lưu được: bấm Lập hợp đồng là báo "Dòng 1 chưa có tên
                    dịch vụ", mà không có chỗ nào gõ tên vào.

                    Form SỬA hợp đồng vốn đã có ô này; chỉ form lập mới thiếu —
                    hai form lệch nhau, và cái hỏng lại là cái dùng nhiều hơn.
                  */}
                  <div className="min-w-0">
                    <input
                      value={d.tenDV}
                      onChange={(e) => doiDong(i, { tenDV: e.target.value })}
                      aria-label={`Tên dòng ${i + 1}`}
                      placeholder="Tên dịch vụ, trang phục hoặc sản phẩm…"
                      className="input font-medium"
                    />
                    {/*
                      LOẠI DÒNG — đối chiếu form AppSheet 14/11/2026.

                      Bên đó mỗi dòng chi tiết bắt buộc chọn một trong ba:
                      Dịch vụ · Sản phẩm · Trang phục. Web lấy tự động theo mục
                      được chọn, nên chỉ dòng GÕ TAY là không có loại nào — đo
                      được 3 dòng thật đang để trống. Loại quyết định cả nhãn ô
                      ngày ngay bên dưới, nên để trống là mất nghĩa.

                      Nhưng chip chỉ bấm được với DÒNG GÕ TAY (anh chỉ ra cùng
                      ngày). Dòng chọn từ bảng thì loại đã do bảng Dịch vụ &
                      trang phục quyết định: "giày nam" là trang phục, bấm đổi
                      thành dịch vụ ở đây chỉ làm dòng hợp đồng nói khác bảng,
                      và kéo theo nhãn ô ngày đổi từ "Ngày thuê" sang "Ngày
                      chụp" — sai cả nghĩa. Muốn đổi thật thì sửa ở trang Dịch
                      vụ & trang phục, chỗ duy nhất giữ sự thật đó.
                    */}
                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                      {d.dichVuId && laLoaiDichVu(d.loai) ? (
                        <span className="rounded-full border border-line px-2 py-0.5 text-[11px] text-fg-muted">
                          {TEN_LOAI[d.loai]}
                        </span>
                      ) : (
                        LOAI_DICH_VU.map((l) => (
                          <button
                            key={l}
                            type="button"
                            onClick={() => doiDong(i, { loai: l })}
                            className={`rounded-full border px-2 py-0.5 text-[11px] transition ${
                              d.loai === l
                                ? "border-accent bg-accent-soft text-accent"
                                : "border-line text-fg-muted hover:border-line-strong"
                            }`}
                          >
                            {TEN_LOAI[l]}
                          </button>
                        ))
                      )}
                      <span className="text-xs text-fg-faint">{d.maDV || "gõ tay"}</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn btn-danger"
                    onClick={() => setDong((ds) => ds.filter((_, j) => j !== i))}
                  >
                    Bỏ dòng
                  </button>
                </div>

                <div className="mt-3 grid gap-3 sm:grid-cols-4">
                  <O nhan="Đơn giá">
                    <input
                      value={d.donGia ? d.donGia.toLocaleString("vi-VN") : ""}
                      onChange={(e) => doiDong(i, { donGia: docTien(e.target.value) ?? 0 })}
                      inputMode="numeric"
                      className="input tabular-nums"
                    />
                  </O>
                  <O nhan="Số lượng">
                    <input
                      value={String(d.soLuong)}
                      onChange={(e) => doiDong(i, { soLuong: Number(e.target.value.replace(",", ".")) || 0 })}
                      inputMode="decimal"
                      className="input tabular-nums"
                    />
                  </O>
                  {/*
                    Nhãn ô ngày ĐỔI THEO LOẠI, giống AppSheet: dịch vụ thì
                    "Ngày chụp", trang phục thì "Ngày thuê", còn sản phẩm bên
                    đó KHÔNG có ô ngày (đo dữ liệu thật: 6% dòng sản phẩm có
                    ngày, so với 88% ở hai loại kia). Vẫn CÙNG MỘT CỘT
                    `ngayChup` trong database — chỉ đổi chữ, không đổi dữ liệu.
                  */}
                  {/*
                    GÓI NHIỀU NGÀY: MỘT Ô NGÀY CHO MỖI BUỔI — anh yêu cầu
                    15/11/2026 ("gói 2 ngày thì phải hiện ngày chụp 1 và ngày
                    chụp 2 để ở dưới tự lấy ngày như ở trên").

                    Mấy ô này KHÔNG giữ dữ liệu riêng: chúng đọc và ghi thẳng
                    vào đúng dòng lịch bên dưới. Nhờ vậy sửa ở trên hay ở dưới
                    đều là sửa một chỗ, không bao giờ có chuyện hai nơi ghi hai
                    ngày khác nhau rồi phải chọn tin bên nào.

                    `ngayChup` của dòng này gán lúc lưu, lấy ngày đầu — xem
                    `dongDeLuu`.
                  */}
                  {soBuoiCuaDong(d) > 0 ? (
                    Array.from({ length: soBuoiCuaDong(d) }).map((_, k) => {
                      /* Dòng lịch thật của buổi này, tính cả những dòng dịch vụ đứng trước. */
                      const j = viTriLich(i) + k;
                      return (
                        <O
                          key={k}
                          nhan={
                            soBuoiCuaDong(d) > 1 ? `Ngày chụp ${k + 1}` : nhanNgay(lich[j]?.loai)
                          }
                        >
                          <input
                            type="date"
                            value={lich[j]?.ngay ?? ""}
                            onChange={(e) => datNgayBuoi(j, e.target.value)}
                            className="input"
                          />
                        </O>
                      );
                    })
                  ) : (
                    <O nhan={d.loai === "trang-phuc" ? "Ngày thuê" : d.loai === "san-pham" ? "Ngày giao" : "Ngày chụp"}>
                      <input
                        type="date"
                        value={d.ngayChup}
                        onChange={(e) => doiDong(i, { ngayChup: e.target.value })}
                        className="input"
                      />
                    </O>
                  )}
                  <O nhan="Thành tiền">
                    <p className="input flex items-center tabular-nums">{tien(Math.round(d.donGia * d.soLuong))}</p>
                  </O>
                </div>

                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {/*
                    Ô NHIỀU DÒNG, không phải một dòng: mô tả gói dài nhất trong
                    bảng là 478 ký tự và xuống dòng theo từng gạch đầu dòng.
                    Nhét vào ô một dòng thì người ta chỉ thấy được bảy tám chữ.
                  */}
                  <O nhan="Chi tiết">
                    <textarea
                      value={d.chiTiet}
                      onChange={(e) => doiDong(i, { chiTiet: e.target.value })}
                      rows={d.chiTiet.includes("\n") ? 5 : 2}
                      className="input resize-y leading-relaxed"
                    />
                  </O>
                  <O nhan="Ghi chú dòng">
                    <input value={d.ghiChu} onChange={(e) => doiDong(i, { ghiChu: e.target.value })} className="input" />
                  </O>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-4 grid gap-2 border-t border-line pt-3 text-sm sm:max-w-sm">
          <Hang ten="Tiền hàng" gia={thanhTien} />
          <div className="flex items-center justify-between gap-3">
            <span className="text-fg-muted">Khuyến mãi</span>
            <input
              value={khuyenMai ? khuyenMai.toLocaleString("vi-VN") : ""}
              onChange={(e) => setKhuyenMai(docTien(e.target.value) ?? 0)}
              inputMode="numeric"
              aria-label="Khuyến mãi"
              className="input w-40 text-right tabular-nums"
            />
          </div>
          <Hang ten="Tổng tiền" gia={tongTien} dam />
          <Hang ten="Đã thu" gia={daThu} />
          <Hang ten="Còn lại" gia={tongTien - daThu} dam />
        </div>
      </Khung>

      {/* ── Cọc ───────────────────────────────────────────────────────── */}
      <Khung
        ten="Tiền cọc"
        chu={
          laQuanLy
            ? "Anh chị là quản lý nên phiếu ghi thẳng là đã thu."
            : "Phiếu sẽ nằm ở trạng thái “Chờ duyệt” cho tới khi quản lý duyệt, đúng như bên AppSheet."
        }
      >
        <div className="grid gap-3">
          {thu.map((t, i) => (
            <div key={i} className="grid gap-3 sm:grid-cols-5">
              <O nhan="Số tiền">
                <input
                  value={t.soTien ? t.soTien.toLocaleString("vi-VN") : ""}
                  onChange={(e) =>
                    setThu((ds) => ds.map((x, j) => (i === j ? { ...x, soTien: docTien(e.target.value) ?? 0 } : x)))
                  }
                  inputMode="numeric"
                  className="input tabular-nums"
                />
              </O>
              <O nhan="Hình thức">
                <select
                  value={t.hinhThuc}
                  onChange={(e) => setThu((ds) => ds.map((x, j) => (i === j ? { ...x, hinhThuc: e.target.value } : x)))}
                  className="input"
                >
                  {dsHinhThuc.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </O>
              <O nhan="Nội dung">
                <select
                  value={t.noiDung}
                  onChange={(e) => setThu((ds) => ds.map((x, j) => (i === j ? { ...x, noiDung: e.target.value } : x)))}
                  className="input"
                >
                  {dsNoiDung.map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </O>
              <O nhan="Ngày thu">
                <input
                  type="date"
                  value={t.ngayThu}
                  onChange={(e) => setThu((ds) => ds.map((x, j) => (i === j ? { ...x, ngayThu: e.target.value } : x)))}
                  className="input"
                />
              </O>
              <O nhan="Ghi chú">
                <input
                  value={t.ghiChu}
                  onChange={(e) => setThu((ds) => ds.map((x, j) => (i === j ? { ...x, ghiChu: e.target.value } : x)))}
                  className="input"
                />
              </O>
            </div>
          ))}
        </div>
        <button
          type="button"
          className="btn mt-3"
          onClick={() =>
            setThu((ds) => [
              ...ds,
              { soTien: 0, hinhThuc: HINH_THUC_THU[0], noiDung: NOI_DUNG_THU[1], ngayThu: ngayDat, ghiChu: "" },
            ])
          }
        >
          Thêm phiếu thu
        </button>
        <p className="mt-2 text-xs text-fg-faint">Để trống số tiền thì không tạo phiếu nào.</p>
      </Khung>

      {/* ── Lịch ──────────────────────────────────────────────────────── */}
      </div>

      {/* ── Bước 3: lịch chụp, mã album, đầu việc ─────────────────────── */}
      <div className={buoc === 3 ? "grid gap-5" : "hidden"}>
      <Khung ten="Lịch chụp" chu="Mỗi ngày quay/chụp một dòng — đúng như bảng Lịch bên AppSheet.">
        {ngayChupChuaCoLich.length > 0 && (
          <button
            type="button"
            className="btn mb-3"
            onClick={() =>
              setLich((ds) => [
                ...ds,
                ...ngayChupChuaCoLich.map((ngay) => ({ ngay, gio: "", loai: loaiDau, ghiChu: "", hienThi: "" })),
              ])
            }
          >
            Lấy {ngayChupChuaCoLich.length} ngày chụp ở trên vào lịch
          </button>
        )}

        <div className="grid gap-3">
          {lich.map((l, i) => (
            <div key={i} className="grid gap-3 sm:grid-cols-[9rem_6rem_11rem_1fr_auto]">
              <O nhan="Ngày">
                <input
                  type="date"
                  value={l.ngay}
                  onChange={(e) => setLich((ds) => ds.map((x, j) => (i === j ? { ...x, ngay: e.target.value } : x)))}
                  className="input"
                />
              </O>
              <O nhan="Giờ">
                <input
                  type="time"
                  value={l.gio}
                  onChange={(e) => setLich((ds) => ds.map((x, j) => (i === j ? { ...x, gio: e.target.value } : x)))}
                  className="input tabular-nums"
                />
              </O>
              <O nhan="Loại">
                <select
                  value={l.loai}
                  onChange={(e) => setLich((ds) => ds.map((x, j) => (i === j ? { ...x, loai: e.target.value } : x)))}
                  className="input"
                >
                  {dsLoai.map(({ ten: x }) => (
                    <option key={x} value={x}>
                      {x}
                    </option>
                  ))}
                </select>
              </O>
              <O nhan="Ghi chú">
                <input
                  value={l.ghiChu}
                  onChange={(e) => setLich((ds) => ds.map((x, j) => (i === j ? { ...x, ghiChu: e.target.value } : x)))}
                  className="input"
                />
              </O>
              <div className="flex items-end">
                <button type="button" className="btn btn-danger" onClick={() => setLich((ds) => ds.filter((_, j) => j !== i))}>
                  Bỏ
                </button>
              </div>
            </div>
          ))}
        </div>

        <button
          type="button"
          className="btn mt-3"
          onClick={() => setLich((ds) => [...ds, { ngay: "", gio: "", loai: loaiDau, ghiChu: "", hienThi: "" }])}
        >
          Thêm dòng lịch
        </button>
      </Khung>

      {/* ── Mã album ──────────────────────────────────────────────────── */}
      <Khung
        ten="Mã album"
        chu="Album trên web sẽ mang mã này ở đầu tên. Thư mục trên Drive thì không — mã chỉ để lọc ở trang quản lý album."
      >
        <div className="flex flex-wrap gap-1.5">
          {boMa.map((m) => {
            const chon = maAlbum.includes(m.ma);
            return (
              <button
                key={m.ma}
                type="button"
                onClick={() => doiMa(m.ma)}
                title={m.nghia ? `${m.ma} — ${m.nghia}` : m.ma}
                aria-pressed={chon}
                className={`min-h-8 rounded-full border px-2.5 text-xs tracking-wide transition ${
                  chon
                    ? "border-transparent bg-fg text-bg"
                    : "border-line-strong bg-bg-raised text-fg-muted hover:border-accent hover:text-fg"
                }`}
              >
                {m.ma}
              </button>
            );
          })}
        </div>
        {/*
          Hiện luôn TÊN SẼ RA. Người lập không phải dịch "HIS + HER" trong
          đầu thành cái tên thật, và nhìn một cái là biết mình bấm đúng chưa.
        */}
        <p className="mt-2 text-xs text-fg-muted">
          Album sẽ tên: <b className="text-fg">{tenAlbumXem}</b>
          {maTuGo === null && maGoiY.length > 0 && <span className="text-fg-faint"> · web tự đoán theo dịch vụ và lịch</span>}
          {maTuGo !== null && (
            <>
              {" · "}
              <button type="button" onClick={() => setMaTuGo(null)} className="underline underline-offset-2 hover:text-accent">
                về như web đoán
              </button>
            </>
          )}
        </p>
      </Khung>

      {/* ── Đầu việc ──────────────────────────────────────────────────── */}
      <Khung
        ten="Đầu việc tự sinh"
        chu="Theo bảng giá hạng mục của từng dịch vụ. Bỏ tick dòng nào thì dòng đó không được tạo."
      >
        {viecGoiY.length === 0 ? (
          <p className="text-sm text-fg-muted">
            Những dịch vụ đã chọn chưa có bảng giá hạng mục nên chưa sinh đầu việc nào. Thêm hạng mục ở
            trang Dịch vụ thì lần sau tự có.
          </p>
        ) : (
          <div className="grid gap-1.5">
            {viecGoiY.map((v) => {
              const bo = boViec.has(v.khoa);
              return (
                <label
                  key={v.khoa}
                  className={`flex flex-wrap items-center gap-3 rounded-md border border-line px-3 py-2 text-sm ${bo ? "opacity-50" : ""}`}
                >
                  <input
                    type="checkbox"
                    checked={!bo}
                    onChange={() =>
                      setBoViec((cu) => {
                        const m = new Set(cu);
                        if (m.has(v.khoa)) m.delete(v.khoa);
                        else m.add(v.khoa);
                        return m;
                      })
                    }
                    className="size-4"
                  />
                  <span className="font-medium">{v.loai}</span>
                  <span className="text-fg-faint">{v.tenDV}</span>
                  <span className="ml-auto tabular-nums text-fg-muted">
                    {tien(Math.round(v.donGia * v.soLuong))}
                    {v.thoiHan && <span className="ml-2 text-fg-faint">hạn {ngayVN(v.thoiHan)}</span>}
                  </span>
                </label>
              );
            })}
          </div>
        )}
      </Khung>

      </div>

      {loi && <p className="rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">{loi}</p>}

      {/*
        THANH DƯỚI DÍNH ĐÁY — anh yêu cầu 18/11/2026.

        Ba thứ phải luôn thấy dù đang ở bước nào: tổng tiền (người lập vừa gõ
        giá xong là muốn biết ngay), nút sang bước sau, và nút Lập hợp đồng.

        Nút Lập nằm ở đây chứ không nằm cuối bước 3, vì bước không phải cái
        khoá — hợp đồng một dòng dịch vụ thì lập xong ngay từ bước 2.
      */}
      <div className="sticky bottom-0 -mx-1 border-t border-line bg-bg/95 px-1 py-3 backdrop-blur">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          {/*
            Một dòng duy nhất: thanh này dính đáy, cao thêm một dòng là che
            mất phần cuối của khối đang điền. "Người lập" nép vào đây vì nó
            chỉ để đối chiếu, không ai đọc nó mỗi lần nhìn xuống.
          */}
          <span className="text-sm">
            <span className="text-fg-muted">Tổng tiền </span>
            <b className="tabular-nums">{tien(tongTien)}đ</b>
            {daThu > 0 && (
              <span className="text-fg-muted">
                {" · còn lại "}
                <b className="tabular-nums text-fg">{tien(tongTien - daThu)}đ</b>
              </span>
            )}
            <span className="ml-2 hidden text-xs text-fg-faint lg:inline">· {tenNguoiLap} lập</span>
          </span>

          <span className="ml-auto flex flex-wrap items-center gap-2">
            {buoc > 1 && (
              <button type="button" className="btn" onClick={() => setBuoc(buoc - 1)} disabled={dangLuu}>
                ← Quay lại
              </button>
            )}
            {buoc < 3 && (
              <button type="button" className="btn" onClick={() => setBuoc(buoc + 1)} disabled={dangLuu}>
                {TEN_BUOC[buoc]} →
              </button>
            )}
            <button type="submit" className="btn-primary" disabled={dangLuu}>
              {dangLuu ? "Đang lưu…" : "Lập hợp đồng"}
            </button>
            <button
              type="button"
              className="btn"
              onClick={() => (onThoi ? onThoi() : router.push("/quan-ly/hop-dong"))}
              disabled={dangLuu}
            >
              Thôi
            </button>
          </span>
        </div>
      </div>
    </form>
  );
}

/** Tên bước sau, hiện trên nút "… →" ở thanh dưới. */
const TEN_BUOC: Record<number, string> = { 1: "Dịch vụ", 2: "Lịch chụp" };

const BUOC = [
  { so: 1, ten: "Khách", chu: "Khách hàng & thông tin hợp đồng" },
  { so: 2, ten: "Dịch vụ", chu: "Dịch vụ, trang phục & tiền cọc" },
  { so: 3, ten: "Lịch chụp", chu: "Lịch chụp, mã album & đầu việc" },
] as const;

/**
 * Thanh ba bước ở đầu form.
 *
 * Bấm được vào bất cứ bước nào — xem chú thích ở `buoc` trong form. Dấu tích
 * chỉ để BÁO ĐÃ ĐIỀN, không phải điều kiện để đi tiếp: người lập nhìn một
 * cái là biết còn thiếu chỗ nào, mà vẫn tự quyết lập hợp đồng lúc nào.
 */
function ThanhBuoc({
  buoc,
  onChon,
  xong,
}: {
  buoc: number;
  onChon: (b: number) => void;
  xong: Record<number, boolean>;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {BUOC.map((b) => {
        const dangMo = b.so === buoc;
        return (
          <button
            key={b.so}
            type="button"
            onClick={() => onChon(b.so)}
            aria-current={dangMo ? "step" : undefined}
            title={b.chu}
            className={`flex min-w-0 flex-1 items-center gap-2.5 rounded-md border px-3 py-2.5 text-left transition ${
              dangMo
                ? "border-accent bg-accent-soft"
                : "border-line bg-bg-raised hover:border-line-strong"
            }`}
          >
            <span
              className={`flex size-6 shrink-0 items-center justify-center rounded-full text-xs tabular-nums ${
                dangMo
                  ? "bg-accent font-medium text-white"
                  : xong[b.so]
                    ? "bg-accent-soft text-accent"
                    : "bg-bg-soft text-fg-faint"
              }`}
            >
              {/* Đã điền thì thay số bằng dấu tích — trừ bước đang mở, ở đó số giữ chỗ cho mắt. */}
              {xong[b.so] && !dangMo ? "✓" : b.so}
            </span>
            <span className="min-w-0">
              <span className={`block text-sm whitespace-nowrap ${dangMo ? "font-medium text-accent" : ""}`}>
                {b.ten}
              </span>
              <span className="hidden truncate text-xs text-fg-faint sm:block">{b.chu}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
