import { NextRequest } from "next/server";

// 簡易的な管理画面パスコード認証。
// 本格運用する場合はより堅牢な認証方式に置き換えてください。
export function isAdminAuthorized(req: NextRequest): boolean {
  const passcode = req.headers.get("x-admin-passcode");
  const expected = process.env.ADMIN_PASSCODE || "pokejou-admin";
  return !!passcode && passcode === expected;
}
