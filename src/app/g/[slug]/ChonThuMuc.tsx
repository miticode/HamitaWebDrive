import Link from "next/link";
import { ROOT_ALBUM } from "@/lib/constants";

/**
 * Hang thu muc nam ngang ngay dau luoi anh — de nhay thang tu thu muc nay
 * sang thu muc khac.
 *
 * Truoc day muon doi thu muc thi phai quay ve trang bia roi chon lai. Voi
 * album 8 thu muc do la ba lan cham va mot lan cho trang tai — moi lan khach
 * to mo "thu muc kia co gi". Do ngay 28/08/2026: trang bia album 8 thu muc
 * dai 3.016px, tuc la ve toi noi con phai cuon tim tiep.
 *
 * Chi hien khi album co TU HAI thu muc tro len: mot thu muc thi khong co cho
 * nao de nhay, hang nay thanh mot dong thua nam giua tieu de va anh.
 *
 * Cuon ngang trong CHINH no (`overflow-x-auto`), khong de tran ra body — album
 * 8 thu muc ten dai thi hang nay rong hon man hinh dien thoai. Body ma cuon
 * ngang duoc thi ca trang xo qua xo lai moi lan khach vuot doc.
 */
export function ChonThuMuc({
  slug,
  dsMuc,
  mucDangMo,
}: {
  slug: string;
  dsMuc: { id: string; ten: string; soAnh: number }[];
  /** Ma thu muc dang mo — de to dam muc do trong hang. */
  mucDangMo: string;
}) {
  if (dsMuc.length < 2) return null;

  return (
    <nav
      aria-label="Các thư mục trong album"
      className="-mx-2 mb-8 overflow-x-auto px-2 sm:mx-0 sm:px-0"
    >
      {/*
        Dien thoai: w-max + cuon ngang. Khong de w-max thi hang co lai vua
        khung, ten thu muc xuong dong va moi the cao gap doi — dung cai ma cuon
        ngang sinh ra de tranh.

        Man hinh lon: cho XUONG DONG thay vi cuon. Do tren 1265px, tam thu muc
        ten dai chiem 1.428px trong khung 1.217px — van phai cuon du man hinh
        con rong, ma cuon ngang bang chuot thi phien hon han vuot bang ngon tay.
      */}
      <div className="flex w-max items-center gap-2 sm:w-full sm:flex-wrap">
        {dsMuc.map((m) => {
          const dangMo = m.id === mucDangMo;
          return (
            <Link
              key={m.id}
              href={`/g/${slug}/${m.id || ROOT_ALBUM}`}
              aria-current={dangMo ? "page" : undefined}
              className={`inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full border px-4 text-sm transition ${
                dangMo
                  ? "border-transparent bg-fg text-bg"
                  : "border-line-strong bg-bg-raised hover:border-accent hover:text-accent"
              }`}
            >
              <span className="max-w-[11rem] truncate">{m.ten}</span>
              <span
                className={`text-xs tabular-nums ${
                  dangMo ? "text-bg/70" : "text-fg-faint"
                }`}
              >
                {m.soAnh}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
