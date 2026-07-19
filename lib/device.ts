import { cookies } from "next/headers";
import { ensureDevice } from "./db";

const COOKIE_NAME = "deviceId";
const MAX_AGE = 60 * 60 * 24 * 365 * 5; // 5年

// Route Handler / Server Action 専用。
// Cookieが無ければ新規発行してDBにも登録する。
export function getOrCreateDeviceId(): string {
  const store = cookies();
  let deviceId = store.get(COOKIE_NAME)?.value;
  if (!deviceId) {
    deviceId = crypto.randomUUID();
    store.set(COOKIE_NAME, deviceId, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: MAX_AGE,
      path: "/",
    });
  }
  ensureDevice(deviceId);
  return deviceId;
}

// Server Component(ページ)からの読み取り専用アクセス。
// Cookie発行自体はmiddlewareが担当するため、ここではsetしない。
export function readDeviceId(): string | undefined {
  return cookies().get(COOKIE_NAME)?.value;
}
