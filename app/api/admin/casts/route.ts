import { NextRequest, NextResponse } from "next/server";
import { createCast, listCastsByStore, updateCast } from "@/lib/db";
import { isAdminAuthorized } from "@/lib/adminAuth";

export async function GET(req: NextRequest) {
  if (!isAdminAuthorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const storeId = req.nextUrl.searchParams.get("storeId");
  if (!storeId) {
    return NextResponse.json({ error: "storeId is required" }, { status: 400 });
  }
  return NextResponse.json({ casts: listCastsByStore(storeId) });
}

export async function POST(req: NextRequest) {
  if (!isAdminAuthorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const storeId = (body?.storeId as string | undefined)?.trim();
  const code = (body?.code as string | undefined)?.trim();
  const name = (body?.name as string | undefined)?.trim();

  if (!storeId || !name) {
    return NextResponse.json(
      { error: "storeId と name は必須です" },
      { status: 400 }
    );
  }

  const cast = createCast({ storeId, code, name });

  return NextResponse.json({ cast });
}

export async function PATCH(req: NextRequest) {
  if (!isAdminAuthorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const id = (body?.id as string | undefined)?.trim();
  const code = (body?.code as string | undefined)?.trim();
  const name = (body?.name as string | undefined)?.trim();

  if (!id || !code || !name) {
    return NextResponse.json({ error: "id と code と name は必須です" }, { status: 400 });
  }

  const cast = updateCast({ id, code, name });
  if (!cast) {
    return NextResponse.json({ error: "嬢が見つかりません" }, { status: 404 });
  }

  return NextResponse.json({ cast });
}
