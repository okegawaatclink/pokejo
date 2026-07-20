import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { createCard, getCastById, listCardsByCast } from "@/lib/db";
import { isAdminAuthorized } from "@/lib/adminAuth";

const UPLOAD_DIR = path.join(process.cwd(), "data", "uploads");

export async function GET(req: NextRequest) {
  if (!isAdminAuthorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const castId = req.nextUrl.searchParams.get("castId");
  if (!castId) {
    return NextResponse.json({ error: "castId is required" }, { status: 400 });
  }
  return NextResponse.json({ cards: listCardsByCast(castId) });
}

export async function POST(req: NextRequest) {
  if (!isAdminAuthorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const form = await req.formData();
  const castId = (form.get("castId") as string | null)?.trim();
  const title = (form.get("title") as string | null)?.trim();
  const oddsWeightRaw = form.get("oddsWeight") as string | null;
  const rarity = (form.get("rarity") as string | null) || "N";
  const flavorText = (form.get("flavorText") as string | null) || undefined;
  const file = form.get("image") as File | null;
  const oddsWeight = Number(oddsWeightRaw ?? "1");

  if (!castId || !title) {
    return NextResponse.json(
      { error: "castId と title は必須です" },
      { status: 400 }
    );
  }

  if (!Number.isFinite(oddsWeight) || oddsWeight <= 0) {
    return NextResponse.json(
      { error: "当選確率(重み)は0より大きい数値で入力してください" },
      { status: 400 }
    );
  }

  const cast = getCastById(castId);
  if (!cast) {
    return NextResponse.json({ error: "嬢が見つかりません" }, { status: 404 });
  }

  if (!file || typeof file === "string") {
    return NextResponse.json(
      { error: "画像ファイルを選択してください" },
      { status: 400 }
    );
  }
  if (!file.type.startsWith("image/")) {
    return NextResponse.json(
      { error: "画像ファイルのみアップロードできます" },
      { status: 400 }
    );
  }

  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  }

  const ext = path.extname(file.name) || ".jpg";
  const fileName = `${crypto.randomUUID()}${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  fs.writeFileSync(path.join(UPLOAD_DIR, fileName), buffer);

  const card = createCard({
    castId,
    title,
    imageUrl: `/api/uploads/${fileName}`,
    oddsWeight,
    rarity,
    flavorText,
  });

  return NextResponse.json({ card });
}