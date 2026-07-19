import { NextRequest, NextResponse } from "next/server";
import { createStore, listStores, updateStoreName } from "@/lib/db";
import { isAdminAuthorized } from "@/lib/adminAuth";

export async function GET(req: NextRequest) {
  if (!isAdminAuthorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  return NextResponse.json({ stores: listStores() });
}

export async function POST(req: NextRequest) {
  if (!isAdminAuthorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const body = await req.json().catch(() => null);
  const name = (body?.name as string | undefined)?.trim();
  if (!name) {
    return NextResponse.json({ error: "店舗名を入力してください" }, { status: 400 });
  }
  const store = createStore(name);
  return NextResponse.json({ store });
}

export async function PATCH(req: NextRequest) {
  if (!isAdminAuthorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const body = await req.json().catch(() => null);
  const id = (body?.id as string | undefined)?.trim();
  const name = (body?.name as string | undefined)?.trim();
  if (!id || !name) {
    return NextResponse.json({ error: "id と name は必須です" }, { status: 400 });
  }
  const store = updateStoreName(id, name);
  if (!store) {
    return NextResponse.json({ error: "店舗が見つかりません" }, { status: 404 });
  }
  return NextResponse.json({ store });
}
