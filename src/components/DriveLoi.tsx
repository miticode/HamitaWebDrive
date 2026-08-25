import Link from "next/link";
import { Logo } from "@/components/Logo";
import { STUDIO } from "@/lib/studio";

/**
 * Man hinh thay the khi khong doc duoc anh tu Google Drive.
 *
 * Vi sao can rieng mot man hinh: danh sach anh doc thang tu Drive moi lan khach
 * mo trang (khong chup vao database — do la thu lam nen "link song"). Doi lai,
 * Drive tro chung mot nhip la ca trang album nem loi, va khach dang cho xem anh
 * cuoi cua minh lai roi vao trang bao loi do trong tron.
 *
 * O day van giu ten khach, logo va so dien thoai studio, noi ro day chi la truc
 * trac tam thoi va anh KHONG mat — de khach khong hieu nham la studio da xoa
 * anh cua ho.
 */
export function DriveLoi({
  tenKhach,
  thuLaiHref,
}: {
  tenKhach: string;
  /** Chinh dia chi trang nay — bam la tai lai, vi loi Drive thuong chi thoang qua. */
  thuLaiHref: string;
}) {
  return (
    <main className="flex min-h-full flex-1 flex-col items-center justify-center px-6 py-24 text-center">
      <Logo size="md" className="mx-auto" />

      <p className="eyebrow mt-8">{tenKhach}</p>
      <h1 className="rule mt-4 font-display text-3xl leading-tight font-light sm:text-4xl">
        Ảnh đang tạm thời chưa tải được
      </h1>
      <p className="mx-auto mt-6 max-w-md text-sm leading-relaxed text-fg-muted">
        Kho ảnh của studio đang trục trặc một chút nên trang chưa lấy được ảnh
        về. <b className="font-medium text-fg">Ảnh của anh chị vẫn còn nguyên</b> —
        anh chị thử tải lại sau vài phút giúp em nhé.
      </p>

      <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
        <Link href={thuLaiHref} className="btn-primary">
          Thử lại
        </Link>
        <a href={`tel:${STUDIO.dienThoaiSo}`} className="btn">
          Gọi studio · {STUDIO.dienThoai}
        </a>
      </div>
    </main>
  );
}
