import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { quyenAlbumNguyHiem } from "@/lib/quyenAlbum";
import { consentUrl, oauthIsConfigured } from "@/lib/googleAuth";

export const runtime = "nodejs";

export async function GET() {
  if (!(await quyenAlbumNguyHiem())) {
    return Response.json({ error: "Chưa đăng nhập quản trị." }, { status: 403 });
  }
  if (!oauthIsConfigured()) {
    return Response.json(
      { error: "Chưa khai báo GOOGLE_OAUTH_CLIENT_ID / GOOGLE_OAUTH_CLIENT_SECRET." },
      { status: 500 }
    );
  }

  // Chuoi ngau nhien de luc Google tra ve, minh biet chac la dung yeu cau minh gui di.
  const state = randomBytes(16).toString("hex");
  (await cookies()).set("google_oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 600,
    path: "/",
  });

  return Response.redirect(consentUrl(state), 302);
}
