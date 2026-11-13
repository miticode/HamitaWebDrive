import { OAuth2Client } from "google-auth-library";
import { databaseIsConfigured, getPrisma } from "@/lib/db";
import { siteUrl } from "@/lib/constants";
import { coKhoaMaHoa, daMaHoa, giaiMa, maHoa } from "@/lib/maHoa";

/**
 * Ket noi Google Drive bang chinh tai khoan chu studio.
 *
 * Muc dich: bo han buoc "share folder cho email service account". Khi da ket noi,
 * web doc Drive duoi danh nghia chu tai khoan, ma chu tai khoan thi da so huu
 * moi folder san roi.
 *
 * Pham vi quyen la drive.readonly — Google xep vao nhom "han che". Khong dung
 * duoc drive.file vi Google noi ro: chon mot thu muc KHONG cap quyen doc noi dung
 * ben trong, ma ca web nay song nho viec doc anh ben trong folder.
 *
 * Tu 15/09/2026 xin THEM drive.file, ben canh (khong thay the) drive.readonly:
 * chi de ghi ban sao luu tu dong moi dem (src/lib/saoLuuDrive.ts). drive.file
 * chi cho sua dung nhung tep do chinh web tao ra. Nguoi dung bo tich o nay
 * luc dong y thi album van chay binh thuong — chi rieng sao luu bao loi va
 * xin ket noi lai.
 */
const SCOPE = "https://www.googleapis.com/auth/drive.readonly";
/** Chi de ghi tep sao luu vao Drive — xem chu thich dau tep. */
const QUYEN_GHI_SAO_LUU = "https://www.googleapis.com/auth/drive.file";

/**
 * HAI ket noi Google, khong phai mot (them 13/11/2026).
 *
 *   "default"  hamita.studio@gmail.com — doc anh cuoi tren Drive, doc file
 *              AppSheet, ghi ban sao luu dem. Ket noi goc, khong dong vao.
 *
 *   "kho"      hamitaweddinghouse@gmail.com (o 5 TB) — CHI de chua tep CRM do
 *              chinh web sinh ra: anh cham cong, chung tu thu chi.
 *
 * Vi sao phai la HAI TAI KHOAN chu khong phai mot thu muc chia se: tren Google
 * Drive, TEP THUOC VE NGUOI TAI LEN chu khong thuoc ve chu thu muc. Chia se mot
 * thu muc cua o 5 TB roi ghi vao do thi dung luong van tru vao o cua tai khoan
 * dang ghi — ma hamita.studio da dung 1.880/2.048 GB (do 13/11/2026), chi con
 * 167 GB. Chi "Shared Drive" moi tinh nguoc lai, nhung cai do phai mua Google
 * Workspace, Gmail thuong khong co.
 *
 * Quyen xin cung khac nhau, co y:
 *   default  drive.readonly + drive.file  — phai doc duoc anh cuoi
 *   kho      CHI drive.file               — chi ghi duoc, va chi dung nhung tep
 *                                           do chinh web tao ra. Ket noi nay
 *                                           khong he nhin thay phan con lai cua
 *                                           Drive do.
 */
export type KetNoi = "default" | "kho";

/** Nhan tieng Viet, dung o trang quan tri va trong loi bao loi. */
export const TEN_KET_NOI: Record<KetNoi, string> = {
  default: "Drive ảnh cưới",
  kho: "Kho ảnh CRM",
};

export function oauthIsConfigured(): boolean {
  return Boolean(
    process.env.GOOGLE_OAUTH_CLIENT_ID?.trim() &&
      process.env.GOOGLE_OAUTH_CLIENT_SECRET?.trim()
  );
}

export function redirectUri(): string {
  return new URL("/api/google/callback", siteUrl()).toString();
}

function createClient(): OAuth2Client {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) {
    throw new Error(
      "Thiếu GOOGLE_OAUTH_CLIENT_ID hoặc GOOGLE_OAUTH_CLIENT_SECRET."
    );
  }
  return new OAuth2Client({ clientId, clientSecret, redirectUri: redirectUri() });
}

const QUYEN_EMAIL = "https://www.googleapis.com/auth/userinfo.email";

/** Quyen xin cho tung ket noi — xem chu thich o `KetNoi` vi sao khac nhau. */
function quyenCua(ket: KetNoi): string[] {
  return ket === "kho"
    ? [QUYEN_GHI_SAO_LUU, QUYEN_EMAIL]
    : [SCOPE, QUYEN_GHI_SAO_LUU, QUYEN_EMAIL];
}

/** Địa chỉ đưa người dùng sang Google để bấm đồng ý. */
export function consentUrl(state: string, ket: KetNoi = "default"): string {
  return createClient().generateAuthUrl({
    access_type: "offline",
    scope: quyenCua(ket),
    // Bắt Google phát lại refresh token; nếu không, lần đồng ý thứ hai trở đi
    // Google chỉ trả access token và mình không có gì để lưu.
    prompt: "consent",
    include_granted_scopes: true,
    state,
  });
}

export type ConnectedAccount = { email: string; connectedAt: Date };

export async function getConnectedAccount(
  ket: KetNoi = "default",
): Promise<ConnectedAccount | null> {
  if (!databaseIsConfigured()) return null;
  const row = await getPrisma().googleAccount.findUnique({ where: { id: ket } });
  return row ? { email: row.email, connectedAt: row.connectedAt } : null;
}

/** Đổi mã Google trả về lấy refresh token rồi lưu lại. */
export async function saveConnection(
  code: string,
  ket: KetNoi = "default",
): Promise<ConnectedAccount> {
  const client = createClient();
  const { tokens } = await client.getToken(code);

  if (!tokens.refresh_token) {
    throw new Error(
      "Google không trả về refresh token. Vào https://myaccount.google.com/permissions gỡ quyền của ứng dụng rồi kết nối lại."
    );
  }

  /*
    Kiem tra ngay tai day thay vi de den luc doc anh moi bao loi.
    Google co the tra ve phieu hop le nhung thieu quyen doc Drive — khi scope
    chua duoc khai bao o Data Access, hoac nguoi dung khong tich o cho phep.
    Luu mot ket noi nhu vay vao database se lam hong ca nhung album dang chay.
  */
  const quyenBatBuoc = ket === "kho" ? QUYEN_GHI_SAO_LUU : SCOPE;
  if (!tokens.scope?.includes(quyenBatBuoc)) {
    throw new Error(
      ket === "kho"
        ? "Kết nối chưa có quyền tạo tệp nên chưa được lưu. Trong màn hình đồng ý của Google, nhớ tích ô cho phép tạo và sửa tệp rồi bấm Tiếp tục."
        : "Kết nối chưa có quyền đọc Drive nên chưa được lưu. Trong màn hình đồng ý của Google, nhớ tích ô “Xem và tải xuống tất cả tệp Google Drive của bạn” rồi bấm Tiếp tục."
    );
  }

  client.setCredentials(tokens);
  const info = await client.request<{ email?: string }>({
    url: "https://www.googleapis.com/oauth2/v2/userinfo",
  });
  const email = info.data.email ?? "không rõ";

  /*
    Ma hoa truoc khi ghi: phieu nay khong het han va mo duoc TOAN BO Drive cua
    studio, nen khong de nguyen van trong database. Xem src/lib/maHoa.ts.
  */
  const data = {
    email,
    refreshToken: maHoa(tokens.refresh_token),
    connectedAt: new Date(),
  };
  await getPrisma().googleAccount.upsert({
    where: { id: ket },
    create: { id: ket, ...data },
    update: data,
  });
  // Ket noi moi thi phieu cu trong bo nho khong con dung nua.
  xoaTokenTrongBoNho(ket);

  return { email, connectedAt: data.connectedAt };
}

export async function disconnect(ket: KetNoi = "default"): Promise<void> {
  if (!databaseIsConfigured()) return;
  xoaTokenTrongBoNho(ket);
  await getPrisma().googleAccount.deleteMany({ where: { id: ket } });
}

/**
 * Access token gan nhat, giu trong bo nho cua CHINH may dang chay ham.
 *
 * Vi sao phai giu (them 21/09/2026, sau khi Neon het han muc va ca web sap):
 * moi tam anh khach xem deu goi /api/img, ma ham do phai co token Drive — tuc
 * la MOI LUOT TAI ANH truoc day deu doc mot dong trong database. Do tren nhat
 * ky web that: 91 luot /api/img trong 3 phut, tuc 91 lan danh thuc database,
 * trong khi Neon tinh tien theo thoi gian database THUC.
 *
 * Kem theo, moi luot con hoi Google cap access token moi vi lan nao cung dung
 * mot client moi tinh — vua cham vua lam phien Google vo co.
 *
 * Google cap token song mot tieng; giu 50 phut de con bien an toan. Het han
 * thi doc lai database dung MOT lan. Bam "Ket noi lai" hay "Ngat ket noi" thi
 * xoa ngay o may nhan cu bam; may khac cung lam nhieu la 50 phut roi cung doc
 * lai — va trong khoang do neu phieu da chet thi Drive tra loi, code tu quay
 * ve service account nhu cu.
 */
const tokenCache = new Map<KetNoi, { token: string; hetHan: number }>();
const HAN_TOKEN = 50 * 60_000;

/** Khong truyen gi = xoa ca hai ket noi. */
function xoaTokenTrongBoNho(ket?: KetNoi) {
  if (ket) tokenCache.delete(ket);
  else tokenCache.clear();
}

/**
 * Access token cua tai khoan da ket noi, hoac null neu chua ket noi.
 * google-auth-library tu goi Google lay token moi khi cai cu het han.
 */
export async function getUserAccessToken(ket: KetNoi = "default"): Promise<string | null> {
  if (!oauthIsConfigured() || !databaseIsConfigured()) return null;

  const sanCo = tokenCache.get(ket);
  if (sanCo && sanCo.hetHan > Date.now()) return sanCo.token;

  const row = await getPrisma().googleAccount.findUnique({ where: { id: ket } });
  if (!row) return null;

  const refreshToken = giaiMa(row.refreshToken);

  /*
    Nang cap am tham ban cu.

    Phieu luu truoc khi co lop ma hoa nam nguyen van trong database. Lan dau
    chay lai sau khi anh khai bao TOKEN_KEY, ghi de bang ban da ma hoa — chi mot
    lan, va khong bat anh phai ket noi lai Google.

    Chay ngam: co hong thi cung khong duoc lam gay viec doc anh dang can.
  */
  if (!daMaHoa(row.refreshToken) && coKhoaMaHoa()) {
    getPrisma()
      .googleAccount.update({
        where: { id: ket },
        data: { refreshToken: maHoa(refreshToken) },
      })
      .catch(() => {});
  }

  const client = createClient();
  client.setCredentials({ refresh_token: refreshToken });

  const { token } = await client.getAccessToken();
  if (token) tokenCache.set(ket, { token, hetHan: Date.now() + HAN_TOKEN });
  return token ?? null;
}
