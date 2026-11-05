import { getPrisma } from "@/lib/db";

/**
 * Nhung viec STUDIO phai tu lam, gom vao mot cho tren trang quan ly.
 *
 * Ranh gioi voi trang thong ke, dung nham thi hai cho se lap nhau:
 *
 * - `/admin/thong-ke` lo viec NHAC KHACH — nha nao chua mo link, chua chon tam
 *   nao, chon do roi dung. Do la nhung cu dien thoai studio nen goi.
 * - Khung nay lo viec CUA CHINH STUDIO — khach da bao chon xong, chua dat goi
 *   anh, khach chon them sau khi da bao xong, album khong con ma bao ve. Khong
 *   ai goi dien duoc cho nhung viec nay ca, phai tu mo ra lam.
 *
 * Doc thang bang getPrisma() nhu thongKe.ts, va cung chi chay khi co database.
 *
 * KHONG GOI DRIVE (nguyen tac 9). Vi vay khung nay khong the biet media vua do
 * them anh vao mot thu muc cu hay chua — do la thu chi lo ra khi doc lai Drive.
 * Dung them mot phep kiem kieu do vao day; no se lam trang quan ly cham han.
 */

export type MucDo = "gap" | "nen";

export type ThongBao = {
  /** Khoa de React phan biet cac dong. */
  id: string;
  mucDo: MucDo;
  /** Viec can lam, viet ngan gon. */
  tieuDe: string;
  /** Vi sao dang de y — noi ro HAU QUA, dung chi mo ta hien trang. */
  chiTiet: string;
  /** Album lien quan, de bam thang toi do. */
  slug?: string;
  tenAlbum?: string;
};

/** Nang truoc, trong cung mot muc thi giu thu tu tu nhien. */
const THU_TU: Record<MucDo, number> = { gap: 0, nen: 1 };

/**
 * Tien to khoa luu "studio da doc thong bao nay".
 *
 * Muon bang `Moc` thay vi dung bang moi: `Moc` von de ghi "lan cuoi lam viec
 * X" — o day viec X la "da xem thong bao id nay", dung hinh dang do, ma khoi
 * phai doi schema cho mot cot chi chua dau tich.
 */
const TIEN_TO_DA_DOC = "da-doc-tb:";

export function khoaDaDoc(id: string): string {
  return TIEN_TO_DA_DOC + id;
}

export async function docThongBao(): Promise<ThongBao[]> {
  const prisma = getPrisma();

  const [galleries, lists, selections, mucXong, daDoc] = await Promise.all([
    prisma.gallery.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.selectionList.findMany(),
    prisma.selection.findMany({
      /*
        `albumName` là TÊN THƯ MỤC chứa tấm ảnh — cần nó để biết tấm vừa chọn
        nằm trong thư mục khách đã báo xong hay thư mục khách đang còn chọn
        (xem mục 3 bên dưới).
      */
      select: { listId: true, driveFileId: true, createdAt: true, albumName: true },
    }),
    prisma.mucXong.findMany(),
    /*
      Doc mot luot moi dau tich da doc roi loc trong bo nho, khong hoi tung
      thong bao mot: nam thong bao la nam luot hoi database cho mot phep kiem
      co/khong.

      Nuot loi: bang Moc them sau nen mot ban deploy cu co the chua co — luc do
      coi nhu chua doc cai nao, van hon la ca khung thong bao chet.
    */
    prisma.moc
      .findMany({
        where: { ten: { startsWith: TIEN_TO_DA_DOC } },
        select: { ten: true },
      })
      .catch(() => [] as { ten: string }[]),
  ]);

  const daDocSet = new Set(
    daDoc.map((m) => m.ten.slice(TIEN_TO_DA_DOC.length)),
  );

  const galleryCuaList = new Map(lists.map((l) => [l.id, l.galleryId]));
  const listTim = new Set(
    lists.filter((l) => l.icon === "heart").map((l) => l.id),
  );

  const ra: ThongBao[] = [];

  for (const g of galleries) {
    const ten = g.clientName ?? g.title;
    // Chi luot tim — tick da bo 15/09/2026, dong tick cu khong con tinh.
    const cuaNo = selections.filter(
      (s) => galleryCuaList.get(s.listId) === g.id && listTim.has(s.listId),
    );
    const soTim = new Set(
      cuaNo.filter((s) => listTim.has(s.listId)).map((s) => s.driveFileId),
    ).size;

    /*
      1. Chua dat goi anh.

      Hai muc do khac han nhau nen tach ra, khong gop mot dong chung:

      - Da co khach tha tim: don giao in KHONG TINH DUOC TIEN. Thieu con so nay
        thi den luc giao anh moi phat hien, luc do doi tien thi ngai ma khong
        doi thi studio chiu. Day la viec gap.
      - Chua ai tha tim: moi la loi nhac. Khach mo album ra khong thay khoi goi
        anh, nhung sua truoc khi ho chon thi khong mat gi.
    */
    if (g.soAnhTrongGoi === null) {
      ra.push(
        soTim > 0
          ? {
              id: `goi-${g.id}`,
              mucDo: "gap",
              tieuDe: "Chưa đặt gói ảnh",
              chiTiet: `Khách đã thả tim ${soTim} tấm mà album chưa có gói — đơn giao in không tính được tiền.`,
              slug: g.slug,
              tenAlbum: ten,
            }
          : {
              id: `goi-${g.id}`,
              mucDo: "nen",
              tieuDe: "Chưa đặt gói ảnh",
              chiTiet:
                "Khách mở album sẽ không thấy phần gói ảnh. Nên đặt trước khi gửi link.",
              slug: g.slug,
              tenAlbum: ten,
            },
      );
    }

    const moiBao = mucXong.filter((m) => m.galleryId === g.id);

    /*
      TACH HAI LOAI BAO (anh yeu cau 08/10/2026).

      Tu khi thu muc anh da chinh co them nut "Can chinh lai", bang MucXong
      chua hai thu khac han nhau: "xong" la viec da xong, "can-sua" la viec
      VUA CHUYEN SANG TAY MEDIA. Gop chung thi thong bao se bao "khach da chon
      xong" cho mot nha dang cho sua lai — studio doc xong dem di in.
    */
    const canSua = moiBao.filter((m) => m.loai === "can-sua");
    const xongCuaNo = moiBao.filter((m) => m.loai !== "can-sua");

    if (canSua.length > 0) {
      /*
        2a. Khach nho chinh lai — viec cua MEDIA.

        Day la ly do ca muc nay ra doi: truoc 08/10/2026 khach khong co duong
        nao bao "em muon sua", nen Media khong biet luc nao bat tay vao lam,
        con khach thi tuong da bao roi. Hai ben cung doi nhau.

        Luon la muc GAP: co nguoi dang doi, va cho cang lau thi cang ky.

        TEN THU MUC nam trong chi tiet chu khong chi dem so: Media mo Drive
        phai biet vao thu muc nao, ma mot nha co the co "file hoan thien HC"
        lan "file hoan thien AB".
      */
      ra.push({
        /*
          SO THU MUC trong id, cung le voi hai muc duoi: khach nho sua them
          mot thu muc nua thi id doi, dau tich "da doc" cu khong con khop va
          thong bao hien lai.
        */
        id: `sua-${g.id}-${canSua.length}`,
        mucDo: "gap",
        tieuDe:
          canSua.length > 1
            ? `Khách nhờ chỉnh lại ${canSua.length} thư mục`
            : "Khách nhờ chỉnh lại",
        chiTiet: `${canSua
          .map((m) => `“${m.tenMuc}”`)
          .join(", ")} — mở album đọc lời dặn của khách rồi giao Media sửa. Sửa xong nhớ bấm “Đã sửa xong” để gỡ nhãn này.`,
        slug: g.slug,
        tenAlbum: ten,
      });
    }

    if (xongCuaNo.length > 0) {
      /*
        2. Khach da bao chon xong — toi luot studio lam.

        Day la tin hieu chuyen viec tu khach sang studio, nen phai la viec GAP:
        khach da lam xong phan cua ho va dang doi. Truoc day chi co the noi o
        goc man hinh (`TheoDoiKhach`) hien luc khach vua bam, ma no thoang qua
        roi mat — mo trang quan ly sau do thi khong con dau vet nao.

        XONG HET hay moi mot phan deu bao, chi khac loi:
        - Xong het (du so thu muc con) thi studio bat tay lam duoc ngay.
        - Moi xong mot phan van dang biet: album nam thu muc ma khach xong thu
          muc dau thi studio in truoc thu muc do duoc, khong phai doi ca bo.

        SO THU MUC XONG nam trong id: khach bao xong them mot thu muc nua thi
        id doi, dau tich "da doc" cu khong con khop va thong bao hien lai.
      */
      const xongHet = g.albumCount > 0 && xongCuaNo.length >= g.albumCount;
      const conMuc = xongHet
        ? ""
        : ` Còn ${g.albumCount - xongCuaNo.length} thư mục chưa báo.`;

      ra.push({
        id: `xong-${g.id}-${xongCuaNo.length}`,
        mucDo: "gap",
        tieuDe: xongHet
          ? "Khách đã chọn xong"
          : `Khách xong ${xongCuaNo.length}/${g.albumCount} thư mục`,
        /*
          KHONG thả tim tấm nào thì đừng mời studio đi làm đơn giao in — đơn đó
          sẽ trống trơn. Chuyện này có thật: nhà "baby- Châu" báo xong mà chỉ
          tick giữ riêng 7 tấm (hồi còn nút tick), không thả tim tấm nào. Có thể họ hiểu nhầm hai
          nút, mà cũng có thể họ chỉ muốn giữ file — đằng nào studio cũng nên
          hỏi lại một câu trước khi kết sổ, nên nói thẳng ra như vậy.
        */
        chiTiet:
          soTim === 0
            ? `Khách báo xong mà chưa thả tim tấm nào — nên hỏi lại xem có tấm nào cần in không.${conMuc}`
            : `Đã chọn ${soTim} tấm in. Mở ra làm đơn giao in được rồi.${conMuc}`,
        slug: g.slug,
        tenAlbum: ten,
      });

      /*
        3. Khach chon them SAU khi da bam "Báo cho Hamita".

        Chuyen nay da xay ra that va la kieu loi im lang nhat: studio thay bao
        xong thi dem danh sach di in, ma khach van con them may tam nua sau do.
        Toi ngay giao moi biet thieu, khong ai lan ra vi sao.

        Dung chung dieu kien voi muc 2 nen gop mot khoi: khong co moc bao xong
        thi khong the co "chon them sau khi bao xong".

        SO THEO TUNG THU MUC, khong so voi moc som nhat cua ca album.

        Ban dau doan nay lay moc bao xong SOM NHAT roi dem moi tam chon sau do,
        ke ca tam o thu muc khac. Anh bat loi 23/09/2026 tren nha "Nhã Linh &
        Văn Chiêu": khach xong "File gốc nhà gái" luc 10:36 roi sang "File gốc
        nhà trai" chon tiep 58 tam — chuyen hoan toan binh thuong, nhung web la
        lang bao "khách chọn thêm sau khi báo xong" nhu the co gi do sai. Do
        lai bang script: cach cu dem 58, cach dung dem 0.
      */
      const mocXongCuaMuc = new Map<string, number>();
      for (const m of xongCuaNo) {
        // Bao xong nhieu lan cho cung mot thu muc thi lay lan GAN NHAT.
        const cu = mocXongCuaMuc.get(m.tenMuc);
        const nay = m.xongLuc.getTime();
        if (cu === undefined || nay > cu) mocXongCuaMuc.set(m.tenMuc, nay);
      }
      const themSau = cuaNo.filter((s) => {
        const moc = mocXongCuaMuc.get(s.albumName);
        // Thu muc chua bao xong thi khach chon bao nhieu cung la dang lam do.
        return moc !== undefined && s.createdAt.getTime() > moc;
      }).length;
      if (themSau > 0) {
        ra.push({
          /*
            SO TAM nam trong id.

            Studio danh dau da doc la tat thong bao nay di — nhung neu khach
            chon THEM nua sau do thi phai bao lai, khong thi lai giao in thieu
            ma khong ai biet. So tam doi thi id doi, dau tich cu khong con khop
            va thong bao hien tro lai — cung cach voi muc 2 ngay tren.
          */
          id: `them-${g.id}-${themSau}`,
          mucDo: "gap",
          tieuDe: "Khách chọn thêm sau khi báo xong",
          chiTiet: `${themSau} tấm được chọn thêm trong thư mục khách đã báo xong. Mở lại đơn giao in đối chiếu trước khi in.`,
          slug: g.slug,
          tenAlbum: ten,
        });
      }
    }

    /*
      4. Album mat lop bao ve.

      `daMoKhoa()` trong access.ts tra ve true khi album khong co ma — nghia la
      ai cam link cung tha tim, ghi chu, bao xong duoc. Trang quan ly khong cho
      dat ma duoi 4 ky tu nen chuyen nay khong xay ra tu giao dien, nhung neu
      no xay ra bang duong khac thi phai thay ngay chu khong de am tham.
    */
    const ma = g.accessCode?.trim() ?? "";
    if (ma.length < 4) {
      ra.push({
        id: `ma-${g.id}`,
        mucDo: "gap",
        tieuDe: "Album không có mã bảo vệ",
        chiTiet:
          "Ai cầm link cũng chọn ảnh và ghi chú được. Đặt lại mã cho album này.",
        slug: g.slug,
        tenAlbum: ten,
      });
    }
  }

  /*
    Bo nhung cai studio da danh dau da doc.

    Loc o BUOC CUOI chu khong bo qua tu dau vong lap: cach nay giu nguyen phan
    tinh toan, nen them mot loai thong bao moi cung tu dong duoc loc theo, khong
    phai nho cai gi.
  */
  return ra
    .filter((t) => !daDocSet.has(t.id))
    .sort((a, b) => THU_TU[a.mucDo] - THU_TU[b.mucDo]);
}
