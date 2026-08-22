import { LOI_CHUC_MAC_DINH } from "@/lib/constants";

/**
 * Lời nhắn hiện ở đầu album.
 *
 * Studio để trống thì khách thấy lời chúc chung. Lời chung phải hợp với mọi
 * kiểu buổi chụp — hình cổng, album, bên nhà gái, bên nhà trai — nên không
 * nhắc đích danh "ngày cưới" hay bất cứ mốc nào cụ thể.
 */
export function LoiChuc({ noiDung }: { noiDung: string | null }) {
  const chu = noiDung?.trim() || LOI_CHUC_MAC_DINH;

  return (
    <div className="mx-auto max-w-2xl px-5 text-center">
      <span aria-hidden className="mx-auto block h-px w-10 bg-line-strong" />
      <div className="mt-6 font-display text-xl leading-[1.75] font-light text-balance sm:text-2xl">
        {/* Studio co the xuong dong trong loi nhan rieng — giu nguyen cach ngat
            dong do thay vi don thanh mot khoi chu lien. */}
        {chu.split(/\n+/).map((dong, i) => (
          <p key={i} className={i > 0 ? "mt-3" : undefined}>
            {dong}
          </p>
        ))}
      </div>
    </div>
  );
}
