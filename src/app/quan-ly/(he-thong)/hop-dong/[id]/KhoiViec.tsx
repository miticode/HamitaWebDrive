import { tien } from "@/lib/constants";
import { ngayVN } from "@/lib/hopDongChung";
import { NutViec, type NhanVienGon } from "../../cong-viec/NutViec";

/*
  ĐẦU VIỆC CỦA MỘT HỢP ĐỒNG — anh yêu cầu 20/11/2026.

  "Trong phần chi tiết hợp đồng cũng hãy hiển thị đầu việc và người được chia
  việc, nhận việc."

  Trước đó muốn biết nhà này ai chụp phải sang trang Đầu việc rồi lọc lại theo
  tên khách — mà trang đó xếp theo thời hạn, nên việc của cùng một nhà nằm rải
  khắp bảng.

  GOM THEO BUỔI, dùng `CongViec.lichChupId` (có từ 20/11). Hợp đồng hai ngày
  thì nhà gái một khối, nhà trai một khối, hậu kỳ một khối — đúng cách quản lý
  chia người: xong một buổi rồi mới tính buổi sau.

  Việc chép từ AppSheet không có `lichChupId` nên rơi cả vào khối cuối. Đó là
  giới hạn của dữ liệu cũ, không chữa được ở đây; khối ấy nói rõ "chưa gắn
  buổi" thay vì giả vờ chúng là việc hậu kỳ.

  Dùng lại `NutViec` của trang Đầu việc, không dựng ô chọn thứ hai: hai chỗ
  cùng gọi `giaoViecAction` vốn đã kiểm quyền và ghi nhật ký. Bản thứ hai là
  sớm muộn một bên quên mất một phép kiểm.
*/

export type ViecHopDong = {
  id: string;
  loai: string | null;
  lichChupId: string | null;
  /** null = người đang xem không được biết (chỉ quản lý thấy tiền công). */
  tienCong: number | null;
  nguoiPhuTrachMaNV: string | null;
  tenNguoiLam: string | null;
  trangThai: string | null;
  ngayHoanThanh: string | null;
};

export type BuoiGon = {
  id: string;
  ngay: string | null;
  gio: string | null;
  loai: string | null;
};

export function KhoiViec({
  buoi,
  viec,
  nhanVien,
  quanTri,
  maToi,
}: {
  buoi: BuoiGon[];
  viec: ViecHopDong[];
  nhanVien: NhanVienGon[];
  quanTri: boolean;
  maToi: string | null;
}) {
  /* Việc của từng buổi, đúng thứ tự buổi trong lịch; còn lại dồn vào cuối. */
  const theoBuoi = buoi.map((b) => ({
    buoi: b,
    ds: viec.filter((v) => v.lichChupId === b.id),
  }));
  const coBuoi = new Set(buoi.map((b) => b.id));
  const conLai = viec.filter((v) => !v.lichChupId || !coBuoi.has(v.lichChupId));

  const chuaGiao = viec.filter((v) => !v.nguoiPhuTrachMaNV).length;

  return (
    <div className="mt-3 grid gap-3">
      {chuaGiao > 0 && (
        /*
          Câu quản lý mở hợp đồng ra để hỏi là "nhà này đủ người chưa", không
          phải đọc từng dòng — nên con số đứng trên đầu, trước mọi khối.
        */
        <p className="text-sm text-amber-800">
          <span className="font-medium tabular-nums">{chuaGiao}</span> việc chưa có người.
        </p>
      )}

      {theoBuoi.map(({ buoi: b, ds }) => (
        <Khoi
          key={b.id}
          nhan={[
            b.loai ?? "Buổi chụp",
            b.ngay ? ngayVN(b.ngay) : "chưa có ngày",
            b.gio ?? null,
          ]
            .filter(Boolean)
            .join(" · ")}
          ds={ds}
          nhanVien={nhanVien}
          quanTri={quanTri}
          maToi={maToi}
          trong="Buổi này chưa có đầu việc nào."
        />
      ))}

      {conLai.length > 0 && (
        <Khoi
          nhan={
            buoi.length > 0
              ? "Không thuộc buổi nào · hậu kỳ, hoặc chưa gắn buổi"
              : "Đầu việc của hợp đồng"
          }
          ds={conLai}
          nhanVien={nhanVien}
          quanTri={quanTri}
          maToi={maToi}
        />
      )}
    </div>
  );
}

function Khoi({
  nhan,
  ds,
  nhanVien,
  quanTri,
  maToi,
  trong,
}: {
  nhan: string;
  ds: ViecHopDong[];
  nhanVien: NhanVienGon[];
  quanTri: boolean;
  maToi: string | null;
  /** Câu hiện khi khối rỗng. Không truyền thì khối rỗng không vẽ ra. */
  trong?: string;
}) {
  if (ds.length === 0 && !trong) return null;
  return (
    <div className="overflow-hidden rounded-md border border-line bg-bg-raised">
      <p className="border-b border-line bg-bg-soft px-4 py-2 text-[11px] tracking-wide text-fg-muted uppercase">
        {nhan}
        {ds.length > 0 && <span className="ml-2 tabular-nums opacity-70">{ds.length} việc</span>}
      </p>
      {ds.length === 0 ? (
        <p className="px-4 py-4 text-center text-sm text-fg-faint">{trong}</p>
      ) : (
        <div className="divide-y divide-line">
          {ds.map((v) => (
            <div key={v.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-2.5">
              <span className="min-w-28 text-sm font-medium">{v.loai ?? "—"}</span>
              {v.tienCong !== null && (
                <span className="text-xs text-fg-muted tabular-nums">{tien(v.tienCong)}đ</span>
              )}
              <span className="ml-auto flex flex-wrap items-center gap-2">
                {v.trangThai === "Đã làm" && v.ngayHoanThanh && (
                  <span className="text-xs text-fg-faint">xong {ngayVN(v.ngayHoanThanh)}</span>
                )}
                <NutViec
                  id={v.id}
                  nguoiPhuTrachMaNV={v.nguoiPhuTrachMaNV}
                  tenNguoiLam={v.tenNguoiLam}
                  trangThai={v.trangThai}
                  nhanVien={nhanVien}
                  quanTri={quanTri}
                  maToi={maToi}
                />
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
