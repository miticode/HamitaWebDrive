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

/** Chi giu mot ket noi duy nhat — day la tai khoan cua studio, khong phai cua khach. */
const ROW_ID = "default";

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

/** Địa chỉ đưa người dùng sang Google để bấm đồng ý. */
export function consentUrl(state: string): string {
  return createClient().generateAuthUrl({
    access_type: "offline",
    scope: [SCOPE, QUYEN_GHI_SAO_LUU, "https://www.googleapis.com/auth/userinfo.email"],
    // Bắt Google phát lại refresh token; nếu không, lần đồng ý thứ hai trở đi
    // Google chỉ trả access token và mình không có gì để lưu.
    prompt: "consent",
    include_granted_scopes: true,
    state,
  });
}

export type ConnectedAccount = { email: string; connectedAt: Date };

export async function getConnectedAccount(): Promise<ConnectedAccount | null> {
  if (!databaseIsConfigured()) return null;
  const row = await getPrisma().googleAccount.findUnique({ where: { id: ROW_ID } });
  return row ? { email: row.email, connectedAt: row.connectedAt } : null;
}

/** Đổi mã Google trả về lấy refresh token rồi lưu lại. */
export async function saveConnection(code: string): Promise<ConnectedAccount> {
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
  if (!tokens.scope?.includes(SCOPE)) {
    throw new Error(
      "Kết nối chưa có quyền đọc Drive nên chưa được lưu. Trong màn hình đồng ý của Google, nhớ tích ô “Xem và tải xuống tất cả tệp Google Drive của bạn” rồi bấm Tiếp tục."
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
    where: { id: ROW_ID },
    create: { id: ROW_ID, ...data },
    update: data,
  });
  // Ket noi moi thi phieu cu trong bo nho khong con dung nua.
  xoaTokenTrongBoNho();

  return { email, connectedAt: data.connectedAt };
}

export async function disconnect(): Promise<void> {
  if (!databaseIsConfigured()) return;
  xoaTokenTrongBoNho();
  await getPrisma().googleAccount.deleteMany({ where: { id: ROW_ID } });
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
let tokenCache: { token: string; hetHan: number } | null = null;
const HAN_TOKEN = 50 * 60_000;

function xoaTokenTrongBoNho() {
  tokenCache = null;
}

/**
 * Access token cua tai khoan da ket noi, hoac null neu chua ket noi.
 * google-auth-library tu goi Google lay token moi khi cai cu het han.
 */
export async function getUserAccessToken(): Promise<string | null> {
  if (!oauthIsConfigured() || !databaseIsConfigured()) return null;

  if (tokenCache && tokenCache.hetHan > Date.now()) return tokenCache.token;

  const row = await getPrisma().googleAccount.findUnique({ where: { id: ROW_ID } });
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
        where: { id: ROW_ID },
        data: { refreshToken: maHoa(refreshToken) },
      })
      .catch(() => {});
  }

  const client = createClient();
  client.setCredentials({ refresh_token: refreshToken });

  const { token } = await client.getAccessToken();
  if (token) tokenCache = { token, hetHan: Date.now() + HAN_TOKEN };
  return token ?? null;
}
