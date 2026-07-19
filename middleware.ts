import { NextRequest, NextResponse } from "next/server";

// 全リクエストで端末Cookie(deviceId)の有無を確認し、
// 無ければ発行する。これを「認証代わり」の端末識別として利用する。
export function middleware(req: NextRequest) {
  const existing = req.cookies.get("deviceId")?.value;
  if (existing) {
    return NextResponse.next();
  }

  const deviceId = crypto.randomUUID();
  const res = NextResponse.next();
  res.cookies.set("deviceId", deviceId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 365 * 5, // 5年
    path: "/",
  });
  return res;
}

export const config = {
  matcher: [
    /*
     * 静的ファイル(_next/static, _next/image, favicon等)以外の
     * 全パスにマッチさせる
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
