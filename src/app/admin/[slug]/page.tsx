import Link from "next/link";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { isAdmin } from "@/lib/auth";
import { getGalleryBySlug, getLists, getSelections, type Selection } from "@/lib/store";
import { LoginForm } from "../LoginForm";
import { NutDoiTong } from "../NutDoiTong";
import { ExportButton } from "./ExportButton";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

function gomTheoAlbum(anh: Selection[]) {
  const groups = new Map<string, Selection[]>();
  for (const a of anh) {
    const list = groups.get(a.albumName);
    if (list) list.push(a);
    else groups.set(a.albumName, [a]);
  }
  return [...groups.entries()];
}

/**
 * Bo tien to chu va duoi file, chi giu lai ma so — dung dinh dang doi Media
 * quen dung de do tim anh trong thu muc goc tren may.
 *
 * "HMT06704.jpg" -> "06704", "DD_08601.jpg" -> "08601". Nhung ten khong co
 * tien to chu o dau (vi du "001-002.jpg") giu nguyen — khong doan bua, tranh
 * cat mat mot nua ma so cua file ghep nhieu tam.
 */
function maSoFile(tenFile: string): string {
  const khongDuoi = tenFile.replace(/\.[a-z0-9]+$/i, "");
  return khongDuoi.replace(/^[^\d]+/, "") || khongDuoi;
}

export default async function ResultsPage({ params }: Props) {
  if (!(await isAdmin())) return <LoginForm />;

  const { slug } = await params;
  const gallery = await getGalleryBySlug(slug);
  if (!gallery) notFound();

  const [lists, selections] = await Promise.all([
    getLists(gallery.id),
    getSelections(gallery.id),
  ]);

  // Cung mot cookie voi layout — doc lai de nut hien dung bieu tuong ngay luot dau.
  const tongToi = (await cookies()).get("admin-tong")?.value === "toi";

  return (
    <main className="mx-auto w-full max-w-4xl px-5 py-10 sm:px-6 sm:py-12">
      <div className="flex items-center justify-between gap-4">
        <Link href="/admin" className="eyebrow transition hover:text-accent">
          ← Tất cả album
        </Link>
        <NutDoiTong toiBanDau={tongToi} />
      </div>

      <div className="mt-2 flex flex-wrap items-end justify-between gap-3 border-b border-line pb-6">
        <h1 className="font-display text-2xl font-light sm:text-3xl">
          Ảnh khách chọn — {gallery.clientName ?? gallery.title}
        </h1>
        {selections.length > 0 && (
          <a
            href={`/api/admin/export?slug=${encodeURIComponent(gallery.slug)}`}
            className="btn-primary"
            title="Tải file Excel liệt kê danh sách, thư mục, tên ảnh và ghi chú của mọi ảnh đã chọn"
          >
            Xuất Excel
          </a>
        )}
      </div>

      {selections.length === 0 && (
        <p className="mt-10 text-sm text-fg-muted">Khách chưa chọn ảnh nào.</p>
      )}

      {lists.map((list) => {
        const anh = [...selections]
          .filter((s) => s.listId === list.id)
          .sort((a, b) => a.fileName.localeCompare(b.fileName, "vi"));
        if (anh.length === 0) return null;

        return (
          <section key={list.id} className="mt-12">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="font-display text-2xl font-light">
                <span
                  className={`mr-2 inline-block size-2.5 rounded-full align-middle ${
                    list.icon === "heart" ? "bg-rose-500" : "bg-accent"
                  }`}
                />
                {list.name}
                <span className="ml-2 text-lg text-fg-muted">{anh.length} ảnh</span>
              </h2>
              <ExportButton
                fileName={`${gallery.slug}-${list.name}`}
                lines={gomTheoAlbum(anh).flatMap(([album, rows]) => [
                  `# ${album} (${rows.length} ảnh)`,
                  ...rows.map((r) => r.fileName),
                  "",
                ])}
                maSo={anh.map((r) => maSoFile(r.fileName)).join(" ")}
              />
            </div>

            {gomTheoAlbum(anh).map(([album, rows]) => (
              <div key={album} className="mt-6">
                <h3 className="eyebrow">
                  {album} · {rows.length} ảnh
                </h3>
                <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-6">
                  {rows.map((row) => (
                    <figure
                      key={row.id}
                      className="skeleton overflow-hidden rounded-sm bg-bg-raised"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={`/api/img/${row.driveFileId}?w=320`}
                        alt={row.fileName}
                        loading="lazy"
                        className="aspect-[3/4] w-full object-cover"
                      />
                      <figcaption className="truncate px-1.5 py-1.5 text-[11px] text-fg-faint">
                        {row.fileName}
                      </figcaption>
                    </figure>
                  ))}
                </div>
              </div>
            ))}
          </section>
        );
      })}
    </main>
  );
}
