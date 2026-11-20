import Link from "next/link";
import { MUI_GIO } from "@/lib/constants";
import { batBuocDangNhap, laQuanTri } from "@/lib/phienNhanVien";
import { tenNV, tenTheoMaNV } from "@/lib/hopDongMayChu";
import { bangCongThang, docCaiDatCham, luotHomNay } from "@/lib/chamCong";
import { chuNoiCham, gioVN } from "@/lib/chamCongChung";
import { BamCham } from "./BamCham";
import { Bang, Hang, O, type CotBang } from "../_ui/Bang";

export const dynamic = "force-dynamic";

/* Bảng công cả tiệm — chỉ quản lý thấy. Chín cột, tám trong đó là con số. */
const COT = {
  nhanVien: { ten: "Nhân viên", chinh: true },
  ngayCong: { ten: "Ngày công", phai: true },
  soGio: { ten: "Số giờ", phai: true },
  soLuot: { ten: "Lượt chấm", phai: true },
  treVao: { ten: "Trễ vào", phai: true },
  veSom: { ten: "Về sớm", phai: true },
  thieuGio: { ten: "Thiếu giờ", phai: true },
  ngoaiTiem: { ten: "Ngoài tiệm", phai: true },
  quenRa: { ten: "Quên bấm ra", phai: true },
} satisfies Record<string, CotBang>;

type Props = { searchParams: Promise<{ thang?: string }> };

function thangNay(): string {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", { timeZone: MUI_GIO, year: "numeric", month: "2-digit" })
      .formatToParts(new Date())
      .map((x) => [x.type, x.value]),
  );
  return `${p.year}-${p.month}`;
}

function doiThang(t: string, buoc: number): string {
  const [y, m] = t.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + buoc, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

/**
 * CHẤM CÔNG — thêm 13/11/2026 (`KE-HOACH-CRM.md` đợt 4).
 *
 * Trang này khác mọi trang khác trong `/quan-ly`: **cả tiệm dùng, mỗi ngày hai
 * lần**, phần lớn bằng điện thoại. Nên khối bấm đặt trên cùng, to, không phải
 * điền gì; bảng công của quản lý nằm dưới.
 *
 * Không chặn theo vị trí — xem chú thích ở model `ChamCong`. Tóm tắt: 39,6%
 * lượt chấm thật bên AppSheet cách tiệm hơn 500m vì đi chụp ngoài, chặn là từ
 * chối 4 trong 10 lần chấm thật.
 */
export default async function ChamCongPage({ searchParams }: Props) {
  const nguoi = await batBuocDangNhap();
  const quanTri = laQuanTri(nguoi);
  const sp = await searchParams;
  const thang = /^\d{4}-\d{2}$/.test(sp.thang ?? "") ? sp.thang! : thangNay();

  const caiDat = await docCaiDatCham();
  const [homNay, bang, bangTen] = await Promise.all([
    nguoi.maNV ? luotHomNay(nguoi.maNV, caiDat) : Promise.resolve(null),
    quanTri ? bangCongThang(thang, caiDat) : Promise.resolve([]),
    quanTri ? tenTheoMaNV() : Promise.resolve(new Map<string, string>()),
  ]);

  const daVao = !!homNay?.gioVao;
  const daRa = !!homNay?.gioRa;
  const [nam, thangSo] = thang.split("-");
  const chuaKhaiToaDo = caiDat.coSo.every((c) => !c.toaDo);

  return (
    <div>
      <p className="eyebrow">Nhân sự</p>
      <h1 className="mt-2 font-display text-3xl font-light">Chấm công</h1>

      {/* ── Khối của chính người đang đăng nhập ──────────────────────── */}
      {!nguoi.maNV ? (
        /*
          HAI trường hợp khác hẳn nhau, trước đây nói chung một câu:

          · `id` null — đang đăng nhập bằng mật khẩu quản lý chung, không phải
            một người cụ thể. Câu "đăng nhập bằng tài khoản của mình" đúng.

          · `id` có nhưng chưa có mã nhân viên — người thật, đã đăng nhập đúng
            tài khoản của mình, chỉ là chưa được cấp mã. Bảo họ "đăng nhập bằng
            tài khoản của mình" là chỉ sai đường: họ đang làm đúng việc đó rồi.
            Người mới vào tiệm nằm cả ở nhánh này.
        */
        <div className="notice mt-5 bg-accent-soft text-fg">
          {nguoi.id ? (
            <>
              Tài khoản của anh/chị <b>chưa có mã nhân viên</b> nên chưa chấm công được. Nhờ quản
              lý thêm mã giúp trong mục <b>Nhân viên</b> — thêm xong là chấm được ngay, không phải
              đăng nhập lại.
            </>
          ) : (
            <>
              Đang đăng nhập bằng mật khẩu quản lý chung, không gắn với một nhân viên cụ thể nên
              không chấm công được. Đăng nhập bằng tài khoản nhân viên của mình để chấm.
            </>
          )}
        </div>
      ) : (
        <div className="mt-5 rounded-md border border-line bg-bg-raised p-5">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <p className="text-sm text-fg-muted">Hôm nay</p>
            {homNay?.trangThaiVao && (
              <span
                className={`text-xs ${homNay.trangThaiVao === "Trễ giờ" ? "font-medium text-amber-800" : "text-emerald-700"}`}
              >
                {homNay.trangThaiVao}
              </span>
            )}
          </div>

          <div className="mt-3 grid grid-cols-3 gap-3">
            <div>
              <p className="text-xs text-fg-muted">Vào ca</p>
              <p className="mt-0.5 font-display text-2xl tabular-nums">
                {gioVN(homNay?.gioVao, MUI_GIO)}
              </p>
            </div>
            <div>
              <p className="text-xs text-fg-muted">Ra ca</p>
              <p className="mt-0.5 font-display text-2xl tabular-nums">
                {gioVN(homNay?.gioRa, MUI_GIO)}
              </p>
            </div>
            <div>
              <p className="text-xs text-fg-muted">
                Số giờ{caiDat.gioChuan != null && <span className="text-fg-faint"> / {caiDat.gioChuan}</span>}
              </p>
              {/*
                Hiện NGAY số giờ so với chuẩn, không bắt ai tự trừ trong đầu.
                Anh chốt 13/11/2026: một ngày phải đủ 8 tiếng — con số 8 đó suy
                từ giờ làm đã khai (18:00 − 08:30 − 1,5 giờ nghỉ), nên đổi giờ
                làm là nó đổi theo.
              */}
              <p
                className={`mt-0.5 font-display text-2xl tabular-nums ${
                  homNay?.conThieu ? "text-amber-800" : ""
                }`}
              >
                {homNay?.soGio != null ? homNay.soGio : "—"}
              </p>
            </div>
          </div>

          {homNay?.gioRa && (
            <p className="mt-3 text-sm">
              {homNay.conThieu > 0 ? (
                <span className="text-amber-800">
                  Còn thiếu {homNay.conThieu} giờ so với một ngày đầy đủ
                  {homNay.trangThaiRa === "Về sớm" && " — ra ca sớm hơn giờ kết thúc"}.
                </span>
              ) : (
                <span className="text-emerald-700">Hôm nay đã đủ giờ.</span>
              )}
            </p>
          )}

          {homNay && (
            <p className="mt-3 text-xs text-fg-faint">{chuNoiCham(homNay.noiCham)}</p>
          )}

          <BamCham daVao={daVao} daRa={daRa} />
        </div>
      )}

      {/*
        Chưa khai toạ độ thì mọi lượt chấm đều bị gọi là "ngoài tiệm". Nói
        thẳng cho quản lý biết chỗ sửa, thay vì để họ nhìn bảng công đầy chữ
        "ngoài tiệm" rồi tưởng cả tiệm đi vắng.
      */}
      {quanTri && chuaKhaiToaDo && (
        <div className="notice mt-5 bg-accent-soft text-fg">
          Chưa khai toạ độ cơ sở nào trong <Link href="/quan-ly/thong-tin" className="underline">Thông tin studio</Link>,
          nên mọi lượt chấm đều hiện là &ldquo;ngoài tiệm&rdquo;.
        </div>
      )}

      {/* ── Bảng công của quản lý ────────────────────────────────────── */}
      {quanTri && (
        <section className="mt-10">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="mr-2 font-display text-xl font-light">Bảng công cả tiệm</h2>
            <Link href={`/quan-ly/cham-cong?thang=${doiThang(thang, -1)}`} className="btn px-3" aria-label="Tháng trước">‹</Link>
            <span className="min-w-32 text-center font-medium tabular-nums">Tháng {thangSo}/{nam}</span>
            <Link href={`/quan-ly/cham-cong?thang=${doiThang(thang, 1)}`} className="btn px-3" aria-label="Tháng sau">›</Link>
          </div>

          <Bang lop="mt-4" cot={Object.values(COT)} trong="Tháng này chưa có lượt chấm công nào.">
            {bang.map((d) => (
              <Hang key={d.maNV} lop="transition hover:bg-bg-soft">
                <O cot={COT.nhanVien}>
                  {tenNV(bangTen, d.maNV) ?? (
                    /* Nửa số dòng mang mã của người đã nghỉ — nói rõ thay vì để trống. */
                    <span className="text-fg-muted">
                      {d.maNV} <span className="text-xs text-fg-faint">(đã nghỉ)</span>
                    </span>
                  )}
                </O>
                <O cot={COT.ngayCong} lop="tabular-nums">
                  {d.soNgayCong}
                </O>
                <O cot={COT.soGio} lop="tabular-nums">
                  {d.soGio}
                </O>
                <O cot={COT.soLuot} lop="tabular-nums text-fg-muted">
                  {d.soLuot}
                </O>
                <O cot={COT.treVao} lop={`tabular-nums ${d.soLanTre ? "text-amber-800" : "text-fg-faint"}`}>
                  {d.soLanTre || "—"}
                </O>
                <O cot={COT.veSom} lop={`tabular-nums ${d.soLanVeSom ? "text-amber-800" : "text-fg-faint"}`}>
                  {d.soLanVeSom || "—"}
                </O>
                <O
                  cot={COT.thieuGio}
                  lop={`tabular-nums ${d.tongThieuGio ? "text-amber-800" : "text-fg-faint"}`}
                >
                  {d.tongThieuGio ? `${d.tongThieuGio} giờ` : "—"}
                </O>
                <O cot={COT.ngoaiTiem} lop="tabular-nums text-fg-muted">
                  {d.soLanNgoaiTiem || "—"}
                  {d.soLanKhongRoViTri > 0 && (
                    <span className="block text-xs text-fg-faint">{d.soLanKhongRoViTri} lượt không rõ</span>
                  )}
                </O>
                <O cot={COT.quenRa} lop={`tabular-nums ${d.thieuGioRa ? "text-amber-800" : "text-fg-faint"}`}>
                  {d.thieuGioRa || "—"}
                </O>
              </Hang>
            ))}
          </Bang>

          <p className="mt-2 text-xs leading-relaxed text-fg-faint">
            Một ngày công đầy đủ là{" "}
            <strong className="text-fg-muted">{caiDat.gioChuan ?? "—"} giờ</strong>{" "}
            ({caiDat.gioBatDau ?? "?"} → {caiDat.gioKetThuc ?? "?"}, trừ{" "}
            {caiDat.gioNghiGiuaBuoi ?? 0} giờ nghỉ giữa buổi) — đổi trong{" "}
            <Link href="/quan-ly/thong-tin" className="underline">Thông tin studio</Link>.
            {" "}&ldquo;Thiếu giờ&rdquo; chỉ cộng những buổi ĐÃ bấm ra ca; buổi quên
            bấm nằm ở cột cuối, không tính thành giờ nợ.
            <br />
            &ldquo;Ngoài tiệm&rdquo; chỉ là ghi nhận, không phải lỗi — phần lớn là
            những buổi chụp ngoài. Toạ độ ở đây để biết người ta ở đâu, không
            dùng để từ chối ai chấm công.
          </p>
        </section>
      )}
    </div>
  );
}
