import { NextRequest, NextResponse } from "next/server";
import {
  getCastById,
  listCardsByCast,
  findTodayCastAcquisitionByStore,
  createAcquisition,
  getCardById,
  todayJst,
} from "@/lib/db";
import { getOrCreateDeviceId } from "@/lib/device";

function pickByOddsWeight<T extends { oddsWeight?: number }>(items: T[]): T {
  const normalized = items.map((item) => {
    const weight = Number(item.oddsWeight ?? 1);
    return Number.isFinite(weight) && weight > 0 ? weight : 1;
  });
  const total = normalized.reduce((sum, weight) => sum + weight, 0);

  if (total <= 0) {
    return items[Math.floor(Math.random() * items.length)];
  }

  let r = Math.random() * total;
  for (let i = 0; i < items.length; i++) {
    r -= normalized[i];
    if (r <= 0) return items[i];
  }
  return items[items.length - 1];
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const castId = body?.castId as string | undefined;
  if (!castId) {
    return NextResponse.json(
      { error: "castId is required" },
      { status: 400 }
    );
  }

  const cast = getCastById(castId);
  if (!cast) {
    return NextResponse.json({ error: "指定された嬢が見つかりません" }, { status: 404 });
  }

  const deviceId = getOrCreateDeviceId();
  const day = todayJst();

  const already = findTodayCastAcquisitionByStore(deviceId, cast.storeId, day);
  if (already) {
    const card = getCardById(already.cardId);
    return NextResponse.json(
      {
        error: "本日はこの店舗の嬢QR抽選をすでに利用済みです。明日また挑戦してください。",
        card,
      },
      { status: 409 }
    );
  }

  const cards = listCardsByCast(castId);
  if (cards.length === 0) {
    return NextResponse.json(
      { error: "この嬢にはまだカードが登録されていません。" },
      { status: 400 }
    );
  }

  const picked = pickByOddsWeight(cards);

  createAcquisition({
    deviceId,
    storeId: cast.storeId,
    castId: cast.id,
    cardId: picked.id,
    type: "cast",
    day,
  });

  return NextResponse.json({ card: picked });
}
