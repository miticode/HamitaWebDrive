"use client";

import { useState, useTransition, type ReactNode } from "react";
import { CHUC_VU_GOI_Y } from "@/lib/nhanVienChung";
import { useRouter } from "next/navigation";
import {
  capMatKhauAction,
  suaNhanVienAction,
  themNhanVienAction,
  type DuLieuNhanVien,
} from "../../actions";
import { O } from "../_ui/Bang";
import { COT_NV } from "./cot";

type NhanVienHang = DuLieuNhanVien & {
  id: string;
  coMatKhau: boolean;
  doiMatKhau: boolean;
};

/**
 * Bốn ô cuối của một hàng nhân viên — chỉ quản lý thấy: tên đăng nhập, tình
 * trạng tài khoản, lần vào gần nhất, và các nút cấp mật khẩu / cho nghỉ / sửa.
 */
export function HangNhanVien({
  nv,
  vaoGanNhat,
  dsPhong,
  dsChucVu,
  laChinhMinh,
  truocNutSua,
}: {
  nv: NhanVienHang;
  vaoGanNhat: string | null;
  dsPhong: string[];
  dsChucVu: string[];
  laChinhMinh: boolean;
  /** Công tắc "hiện trên trang giới thiệu" — trang cha dựng, hàng chỉ đặt chỗ. */
  truocNutSua?: ReactNode;
}) {
  const router = useRouter();
  const [dangCap, startCap] = useTransition();
  const [matKhauTam, setMatKhauTam] = useState<string | null>(null);
  const [loi, setLoi] = useState<string | null>(null);
  const [dangSua, setDangSua] = useState(false);
  const [daChep, setDaChep] = useState(false);
  const [dangDoiLam, startDoiLam] = useTransition();

  const cap = () => {
    const cauHoi = nv.coMatKhau
      ? `Cấp mật khẩu mới cho ${nv.ten}? Mật khẩu đang dùng sẽ hết hiệu lực và mọi máy của ${nv.ten} bị đăng xuất.`
      : `Cấp mật khẩu cho ${nv.ten}?`;
    if (!window.confirm(cauHoi)) return;
    startCap(async () => {
      const kq = await capMatKhauAction(nv.id);
      if (kq.loi) setLoi(kq.loi);
      else if (kq.matKhau) {
        setLoi(null);
        setDaChep(false);
        setMatKhauTam(kq.matKhau);
      }
      router.refresh();
    });
  };

  /*
    Ba trạng thái tài khoản, tô khác nhau vì đòi ba việc khác nhau: chưa có thì
    quản lý phải cấp; chờ đổi thì nhắc nhân viên đăng nhập; đang dùng thì thôi.
  */
  const trangThai = !nv.dangLam
    ? { chu: "Đã nghỉ", lop: "border-line text-fg-faint" }
    : !nv.coMatKhau
      ? { chu: "Chưa có mật khẩu", lop: "border-amber-300 bg-amber-50 text-amber-900" }
      : nv.doiMatKhau
        ? { chu: "Chờ tự đổi mật khẩu", lop: "border-line text-fg-muted" }
        : { chu: "Đang dùng", lop: "border-emerald-300 bg-emerald-50 text-emerald-800" };

  return (
    <>
      <O cot={COT_NV.tenDangNhap} lop="whitespace-nowrap text-fg-muted">
        {nv.tenDangNhap}
      </O>
      <O cot={COT_NV.taiKhoan} lop="whitespace-nowrap">
        <span className={`rounded-full border px-2 py-0.5 text-[11px] ${trangThai.lop}`}>
          {trangThai.chu}
        </span>
      </O>
      <O cot={COT_NV.vaoGanNhat} lop="whitespace-nowrap text-fg-muted tabular-nums">
        {vaoGanNhat ?? "—"}
      </O>
      <O cot={COT_NV.trangGioiThieu} lop="whitespace-nowrap">
        {truocNutSua}
      </O>
      <O cot={COT_NV.viec} lop="whitespace-nowrap">
        <div className="flex justify-end gap-3 text-xs">
          {nv.dangLam && (
            <button
              type="button"
              onClick={cap}
              disabled={dangCap}
              className="text-accent underline underline-offset-2 hover:opacity-80"
            >
              {dangCap ? "Đang cấp…" : nv.coMatKhau ? "Cấp lại mật khẩu" : "Cấp mật khẩu"}
            </button>
          )}
          {/*
            CHO NGHỈ / NHẬN LẠI ngay tại hàng — anh báo 14/11/2026: "không có
            phần chuyển trạng thái sang đã nghỉ".

            Việc này VẪN LÀM ĐƯỢC từ trước, nhưng nằm ở ô tích cuối form Sửa
            mang tên "Đang làm ở tiệm" — ai đi tìm chữ "nghỉ việc" thì không
            thấy, mà cột Tài khoản hiện sẵn chữ "Đã nghỉ" lại không bấm được.
            Chức năng có mà không ai tìm ra thì coi như không có.

            Dùng lại đúng `suaNhanVienAction`, không mở đường mới vào database:
            nhật ký, việc văng khỏi mọi máy, và phép chặn tự cho mình nghỉ đều
            giữ nguyên.
          */}
          {!laChinhMinh && (
            <button
              type="button"
              disabled={dangDoiLam}
              onClick={() =>
                startDoiLam(async () => {
                  setLoi(null);
                  const hoi = nv.dangLam
                    ? `Cho ${nv.ten} nghỉ việc?

Tài khoản sẽ không đăng nhập được nữa và văng khỏi mọi máy ngay. Hợp đồng, chấm công, lương cũ vẫn giữ nguyên — nhận lại lúc nào cũng được.`
                    : `Nhận ${nv.ten} làm lại?

Tài khoản đăng nhập lại được ngay.`;
                  if (!confirm(hoi)) return;
                  const kq = await suaNhanVienAction(nv.id, { ...nv, dangLam: !nv.dangLam });
                  if (kq.loi) setLoi(kq.loi);
                  else router.refresh();
                })
              }
              className="text-fg-muted underline underline-offset-2 hover:text-accent disabled:opacity-50"
            >
              {dangDoiLam ? "Đang lưu…" : nv.dangLam ? "Cho nghỉ" : "Nhận lại"}
            </button>
          )}
          <button
            type="button"
            onClick={() => setDangSua(true)}
            className="text-fg-muted underline underline-offset-2 hover:text-accent"
          >
            Sửa
          </button>
        </div>
        {loi && <p className="mt-1 text-left text-xs whitespace-normal text-red-700">{loi}</p>}

        {matKhauTam && (
          <HopNoi onDong={() => setMatKhauTam(null)} tieuDe={`Mật khẩu tạm của ${nv.ten}`}>
            {/*
              Hiện ĐÚNG MỘT LẦN rồi thôi — máy chủ không giữ bản đọc được, đóng
              hộp này là không xem lại được nữa. Nói rõ điều đó ngay trong hộp
              để quản lý chép trước khi đóng.
            */}
            <p className="text-sm leading-relaxed text-fg-muted">
              Gửi cho {nv.ten} qua Zalo. Đăng nhập bằng tên <b className="text-fg">{nv.tenDangNhap}</b> và
              mật khẩu dưới đây, rồi sẽ được yêu cầu đặt mật khẩu riêng ngay.
            </p>
            <p className="mt-4 rounded-md border border-line-strong bg-bg-soft px-4 py-3 text-center font-mono text-2xl tracking-widest select-all">
              {matKhauTam}
            </p>
            <p className="mt-3 text-xs text-fg-faint">
              Mật khẩu này chỉ hiện một lần. Đóng hộp mà chưa chép thì bấm cấp lại.
            </p>
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                className="btn-primary"
                onClick={async () => {
                  const tin = `Tài khoản Quản lý studio Hamita\nTên đăng nhập: ${nv.tenDangNhap}\nMật khẩu tạm: ${matKhauTam}\nĐăng nhập xong nhớ đặt mật khẩu riêng nhé.`;
                  await navigator.clipboard.writeText(tin).catch(() => {});
                  setDaChep(true);
                }}
              >
                {daChep ? "Đã chép tin nhắn" : "Chép tin nhắn gửi Zalo"}
              </button>
              <button type="button" className="btn" onClick={() => setMatKhauTam(null)}>
                Đóng
              </button>
            </div>
          </HopNoi>
        )}

        {dangSua && (
          <HopNoi onDong={() => setDangSua(false)} tieuDe={`Sửa — ${nv.ten}`}>
            <FormNhanVien
              banDau={nv}
              dsPhong={dsPhong}
              dsChucVu={dsChucVu}
              laChinhMinh={laChinhMinh}
              onLuu={(du) => suaNhanVienAction(nv.id, du)}
              onXong={() => {
                setDangSua(false);
                router.refresh();
              }}
            />
          </HopNoi>
        )}
      </O>
    </>
  );
}

/** Nút "Thêm nhân viên" ở đầu trang — cho người mới vào làm sau khi đã rời AppSheet. */
export function ThemNhanVien({ dsPhong, dsChucVu }: { dsPhong: string[]; dsChucVu: string[] }) {
  const router = useRouter();
  const [mo, setMo] = useState(false);
  return (
    <>
      <button type="button" className="btn-primary" onClick={() => setMo(true)}>
        Thêm nhân viên
      </button>
      {mo && (
        <HopNoi onDong={() => setMo(false)} tieuDe="Thêm nhân viên">
          <FormNhanVien
            banDau={{
              ten: "",
              /* Học viên mới vào chưa có mã — để trống, cấp sau khi nhận chính thức. */
              maNV: "",
              tenDangNhap: "",
              soDienThoai: "",
              phongBan: "",
              chucVu: "NHÂN VIÊN",
              loaiNV: "Nhân viên",
              vaiTro: "nhan-vien",
              dangLam: true,
            }}
            dsPhong={dsPhong}
            dsChucVu={dsChucVu}
            laChinhMinh={false}
            onLuu={themNhanVienAction}
            onXong={() => {
              setMo(false);
              router.refresh();
            }}
          />
        </HopNoi>
      )}
    </>
  );
}

function FormNhanVien({
  banDau,
  dsPhong,
  dsChucVu,
  laChinhMinh,
  onLuu,
  onXong,
}: {
  banDau: DuLieuNhanVien;
  dsPhong: string[];
  dsChucVu: string[];
  laChinhMinh: boolean;
  onLuu: (du: DuLieuNhanVien) => Promise<{ loi?: string }>;
  onXong: () => void;
}) {
  const [du, setDu] = useState<DuLieuNhanVien>(banDau);
  const [loi, setLoi] = useState<string | null>(null);
  const [dangLuu, start] = useTransition();
  const doi = <K extends keyof DuLieuNhanVien>(k: K, v: DuLieuNhanVien[K]) =>
    setDu((c) => ({ ...c, [k]: v }));

  /*
    Người mới: gõ số điện thoại xong mà ô tên đăng nhập còn trống thì tự điền
    luôn số đó — đúng quy ước "tên đăng nhập là số điện thoại", đỡ gõ hai lần.
  */
  const doiSo = (so: string) => {
    setDu((c) => ({
      ...c,
      soDienThoai: so,
      tenDangNhap: c.tenDangNhap === "" || c.tenDangNhap === c.soDienThoai.replace(/\D/g, "")
        ? so.replace(/\D/g, "")
        : c.tenDangNhap,
    }));
  };

  const luu = () =>
    start(async () => {
      const kq = await onLuu(du);
      if (kq.loi) setLoi(kq.loi);
      else onXong();
    });

  const o = "grid gap-1 text-xs text-fg-muted";

  return (
    <div className="grid gap-3 text-left">
      <label className={o}>
        Tên
        <input id="nv-ten" className="input" value={du.ten} onChange={(e) => doi("ten", e.target.value)} />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className={o}>
          Số điện thoại
          <input id="nv-sdt" className="input" inputMode="tel" value={du.soDienThoai} onChange={(e) => doiSo(e.target.value)} />
        </label>
        <label className={o}>
          Tên đăng nhập
          <input
            id="nv-ten-dang-nhap"
            className="input"
            autoCapitalize="none"
            value={du.tenDangNhap}
            onChange={(e) => doi("tenDangNhap", e.target.value)}
          />
        </label>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <label className={o}>
          Phòng ban
          <input
            id="nv-phong"
            className="input"
            list="ds-phong-ban"
            value={du.phongBan}
            onChange={(e) => doi("phongBan", e.target.value)}
          />
          <datalist id="ds-phong-ban">
            {dsPhong.map((p) => <option key={p} value={p} />)}
          </datalist>
        </label>
        <label className={o}>
          Chức vụ
          {/* Gợi ý sẵn nhưng vẫn gõ tay được — cùng nếp ô Phòng ban ngay bên cạnh. */}
          <input
            id="nv-chuc-vu"
            className="input"
            list="ds-chuc-vu"
            value={du.chucVu}
            onChange={(e) => doi("chucVu", e.target.value)}
          />
          <datalist id="ds-chuc-vu">
            {[...new Set([...dsChucVu, ...CHUC_VU_GOI_Y])].map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </label>
        <label className={o}>
          Mã nhân viên
          {/*
            Để trống được: học viên chưa có mã (anh chốt 14/11). Cấp mã chính là
            việc "cho lên nhân viên" — lúc đó mọi đầu việc đang ghi tên đăng
            nhập của họ tự chuyển sang mã mới, xem `suaNhanVienAction`.
          */}
          <input
            id="nv-ma"
            className="input"
            value={du.maNV}
            placeholder="để trống nếu đang học việc"
            onChange={(e) => doi("maNV", e.target.value)}
          />
        </label>
        <p className="col-span-2 -mt-1 text-xs text-fg-faint">
          Mã nhân viên là khoá ghép với bảng công, bảng lương và đầu việc. Cấp rồi thì đừng đổi.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <label className={o}>
          Loại
          <select id="nv-loai" className="input" value={du.loaiNV} onChange={(e) => doi("loaiNV", e.target.value)}>
            <option value="Nhân viên">Nhân viên</option>
            <option value="Cộng tác viên">Cộng tác viên</option>
          </select>
        </label>
        <label className={o}>
          Vai trò
          <select
            id="nv-vai-tro"
            className="input"
            value={du.vaiTro}
            disabled={laChinhMinh}
            onChange={(e) => doi("vaiTro", e.target.value)}
          >
            <option value="nhan-vien">Nhân viên — xem lương của mình</option>
            <option value="sale">Sale — thêm quyền sửa hợp đồng</option>
            <option value="quan-tri">Quản lý — duyệt thu chi, xem lương mọi người</option>
          </select>
        </label>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input
          id="nv-dang-lam"
          type="checkbox"
          checked={du.dangLam}
          disabled={laChinhMinh}
          onChange={(e) => doi("dangLam", e.target.checked)}
        />
        Đang làm ở tiệm
        <span className="text-xs text-fg-faint">— bỏ tích là không đăng nhập được nữa</span>
      </label>

      {loi && <p className="text-sm text-red-700">{loi}</p>}

      <div className="mt-1 flex gap-2">
        <button type="button" className="btn-primary" disabled={dangLuu} onClick={luu}>
          {dangLuu ? "Đang lưu…" : "Lưu"}
        </button>
        <button type="button" className="btn" onClick={onXong}>Huỷ</button>
      </div>
    </div>
  );
}

/** Hộp nổi giữa màn hình. Bấm nền tối hoặc phím Esc để đóng. */
function HopNoi({
  tieuDe,
  onDong,
  children,
}: {
  tieuDe: string;
  onDong: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={tieuDe}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 text-left whitespace-normal sm:items-center sm:p-6"
      onClick={onDong}
      onKeyDown={(e) => e.key === "Escape" && onDong()}
    >
      <div
        className="w-full max-w-md rounded-t-lg bg-bg p-6 text-fg shadow-[var(--shadow-lift)] sm:rounded-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="font-display text-2xl font-light">{tieuDe}</h2>
        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}
