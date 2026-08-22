import { OAuth2Client } from "google-auth-library";
import { databaseIsConfigured, getPrisma } from "@/lib/db";
import { siteUrl } from "@/lib/constants";

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
 */
const SCOPE = "https://www.googleapis.com/auth/drive.readonly";

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
    scope: [SCOPE, "https://www.googleapis.com/auth/userinfo.email"],
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

  const data = { email, refreshToken: tokens.refresh_token, connectedAt: new Date() };
  await getPrisma().googleAccount.upsert({
    where: { id: ROW_ID },
    create: { id: ROW_ID, ...data },
    update: data,
  });

  return { email, connectedAt: data.connectedAt };
}

export async function disconnect(): Promise<void> {
  if (!databaseIsConfigured()) return;
  await getPrisma().googleAccount.deleteMany({ where: { id: ROW_ID } });
}

/**
 * Access token cua tai khoan da ket noi, hoac null neu chua ket noi.
 * google-auth-library tu goi Google lay token moi khi cai cu het han.
 */
export async function getUserAccessToken(): Promise<string | null> {
  if (!oauthIsConfigured() || !databaseIsConfigured()) return null;

  const row = await getPrisma().googleAccount.findUnique({ where: { id: ROW_ID } });
  if (!row) return null;

  const client = createClient();
  client.setCredentials({ refresh_token: row.refreshToken });

  const { token } = await client.getAccessToken();
  return token ?? null;
}
