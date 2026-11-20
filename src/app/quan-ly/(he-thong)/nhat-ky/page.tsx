import { notFound } from "next/navigation";
import { getPrisma } from "@/lib/db";
import { MUI_GIO } from "@/lib/constants";
import { batBuocDangNhap, laQuanTri } from "@/lib/phienNhanVien";
import { CHU_HANH_DONG, type HanhDong } from "@/lib/nhatKy";
import { Bang, Hang, O, type CotBang } from "../_ui/Bang";

export const dynamic = "force-dynamic";

/*
  "Việc" là `chinh` chứ không phải "Lúc": bảng này đọc để tìm xem AI LÀM GÌ,
  nên trên thẻ điện thoại tên việc ("Sửa hợp đồng") phải đứng đầu, thời điểm
  xuống thành một dòng nhãn.
*/
const COT = {
  luc: { ten: "Lúc" },
  nguoi: { ten: "Người" },
  viec: { ten: "Việc", chinh: true },
  chiTiet: { ten: "Chi tiết" },
} satisfies Record<string, CotBang>;

const NGAY_GIO = new Intl.DateTimeFormat("vi-VN", {
  timeZone: MUI_GIO,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

/** Hiện một giá trị cũ/mới cho người đọc: rỗng thì gạch ngang, đúng/sai thì có/không. */
function giaTri(v: unknown): string {
  if (v === null || v === undefined || v === "") return "—";
  if (typeof v === "boolean") return v ? "có" : "không";
  if (v === "quan-tri") return "quản lý";
  if (v === "nhan-vien") return "nhân viên";
  return String(v);
}

/** Một dòng tóm tắt cho cột "Chi tiết" — đủ để biết đổi gì mà không phải mở ra. */
function tomTat(chiTiet: unknown): string {
  if (!chiTiet || typeof chiTiet !== "object") return "";
  const c = chiTiet as { ten?: string; doi?: Record<string, { truoc: unknown; sau: unknown }>; so?: Record<string, number> };
  const phan: string[] = [];
  if (c.ten) phan.push(c.ten);
  if (c.doi) {
    for (const [cot, { truoc, sau }] of Object.entries(c.doi)) {
      phan.push(`${cot}: ${giaTri(truoc)} → ${giaTri(sau)}`);
    }
  }
  if (c.so) phan.push(Object.entries(c.so).map(([k, v]) => `${k} ${v}`).join(", "));
  return phan.join(" · ");
}

/**
 * Nhật ký thao tác — chỉ quản lý xem được.
 *
 * Hiện 300 dòng mới nhất. Chưa làm phân trang: lúc này bảng mới chỉ ghi đăng
 * nhập và việc quản lý nhân viên, 300 dòng là vài tuần. Khi hợp đồng và tiền
 * chuyển sang (đợt 2) thì làm lọc theo người, theo ngày.
 */
export default async function NhatKyPage() {
  const nguoi = await batBuocDangNhap();
  if (!laQuanTri(nguoi)) notFound();

  const ds = await getPrisma().nhatKy.findMany({ orderBy: { luc: "desc" }, take: 300 });

  return (
    <div>
      <p className="eyebrow">Hệ thống</p>
      <h1 className="mt-2 font-display text-3xl font-light">Nhật ký thao tác</h1>
      <p className="mt-2 max-w-2xl text-sm text-fg-muted">
        Ai làm gì, lúc nào. Mật khẩu không bao giờ được ghi vào đây.
      </p>

      <Bang lop="mt-6" cot={Object.values(COT)} trong="Chưa có thao tác nào.">
        {ds.map((d) => (
          <Hang key={d.id}>
            <O cot={COT.luc} lop="whitespace-nowrap text-fg-muted tabular-nums">
              {NGAY_GIO.format(d.luc)}
            </O>
            <O cot={COT.nguoi} lop="whitespace-nowrap">
              {d.nguoiTen}
            </O>
            <O
              cot={COT.viec}
              lop={`whitespace-nowrap ${d.hanhDong === "dang-nhap-sai" ? "text-red-700" : ""}`}
            >
              {CHU_HANH_DONG[d.hanhDong as HanhDong] ?? d.hanhDong}
            </O>
            <O cot={COT.chiTiet} lop="text-fg-muted">
              {tomTat(d.chiTiet)}
            </O>
          </Hang>
        ))}
      </Bang>
    </div>
  );
}
