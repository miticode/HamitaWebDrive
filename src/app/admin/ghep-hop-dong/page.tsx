import Link from "next/link";
import { redirect } from "next/navigation";
import { quyenAlbum } from "@/lib/quyenAlbum";
import { capChuaGhep, CHU_MUC, type MucTinCay } from "@/lib/ghepAlbum";
import { TheGhep } from "./TheGhep";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ muc?: string }> };

const THU_TU: MucTinCay[] = ["chac", "cung-nha", "gan-chac", "chon-tay"];

/**
 * GHÉP ALBUM VỚI HỢP ĐỒNG HÀNG LOẠT — thêm 14/11/2026.
 *
 * Trước trang này, gắn một album phải mở đúng album đó rồi bấm. Đo ngày
 * 14/11: 169 album, gắn được 3 — và trong 123 album tạo sau ngày có tính
 * năng, đúng một cái được gắn. Không phải vì khó, mà vì không ai nhớ.
 *
 * Trang này xếp sẵn từng cặp album ↔ hợp đồng để người chỉ việc duyệt. Máy
 * KHÔNG tự ghép — xem lý do ở `src/lib/ghepAlbum.ts`: một nhà thường có hai
 * hợp đồng (một chụp, một tiệc), đoán bừa là tiến độ nhà này hiện sang nhà kia.
 *
 * Mặc định mở nhóm "Khớp rõ" — 53 album khớp hẳn một hợp đồng, bấm một cái là
 * xong, làm hết nhóm này đã kéo mối nối từ 2% lên khoảng 33%.
 */
export default async function GhepHopDongPage({ searchParams }: Props) {
  if (!(await quyenAlbum())) redirect("/admin");
  const sp = await searchParams;
  const ds = await capChuaGhep();

  const dem = new Map<MucTinCay, number>();
  for (const c of ds) dem.set(c.muc, (dem.get(c.muc) ?? 0) + 1);

  const muc = THU_TU.includes(sp.muc as MucTinCay) ? (sp.muc as MucTinCay) : "chac";
  const hien = ds.filter((c) => c.muc === muc);

  const lopChip = (bat: boolean) =>
    `rounded-full border px-3 py-1 text-xs transition whitespace-nowrap ${
      bat ? "border-accent bg-accent-soft text-accent" : "border-line text-fg-muted hover:border-line-strong"
    }`;

  return (
    <div className="mx-auto max-w-5xl px-5 py-8">
      <Link href="/admin" className="eyebrow transition hover:text-accent">← Quản lý album</Link>
      <h1 className="mt-3 font-display text-3xl font-light">
        Ghép album với hợp đồng <span className="text-fg-faint tabular-nums">{ds.length}</span>
      </h1>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-fg-muted">
        Album gắn được vào hợp đồng thì trang hợp đồng mới thấy khách chọn ảnh tới đâu. Web xếp sẵn
        từng cặp theo mức giống nhau của tên — <b className="text-fg">không tự ghép</b>, vì một nhà
        thường có hai hợp đồng và chọn nhầm là tiến độ nhà này hiện sang nhà kia.
      </p>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        {THU_TU.map((m) => (
          <Link key={m} href={`/admin/ghep-hop-dong?muc=${m}`} className={lopChip(muc === m)}>
            {CHU_MUC[m].ten} <span className="tabular-nums opacity-70">{dem.get(m) ?? 0}</span>
          </Link>
        ))}
      </div>

      <p className="mt-3 text-sm text-fg-muted">{CHU_MUC[muc].giai}</p>

      <div className="mt-5 grid gap-3">
        {hien.map((c) => (
          <TheGhep key={c.galleryId} cap={c} />
        ))}
      </div>

      {hien.length === 0 && (
        <p className="mt-8 rounded-md border border-line bg-bg-raised px-4 py-8 text-center text-sm text-fg-muted">
          {ds.length === 0
            ? "Mọi album đều đã gắn hợp đồng."
            : `Không còn album nào ở nhóm “${CHU_MUC[muc].ten}”.`}
        </p>
      )}
    </div>
  );
}
