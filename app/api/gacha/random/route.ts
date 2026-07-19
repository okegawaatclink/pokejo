import { NextRequest, NextResponse } from "next/server";
import {
  getStoreById,
  listCardsByStore,
  findTodayStoreAcquisition,
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
  const storeId = body?.storeId as string | undefined;
  if (!storeId) {
    return NextResponse.json({ error: "storeId is required" }, { status: 400 });
  }

  const store = getStoreById(storeId);
  if (!store) {
    return NextResponse.json({ error: "店舗が見つかりません" }, { status: 404 });
  }

  const deviceId = getOrCreateDeviceId();
  const day = todayJst();

  const already = findTodayStoreAcquisition(deviceId, storeId, day);
  if (already) {
    const card = getCardById(already.cardId);
    return NextResponse.json(
      {
        error: "本日はすでにランダムガチャを利用済みです。明日また挑戦してください。",
        card,
      },
      { status: 409 }
    );
  }

  const cards = listCardsByStore(storeId);
  if (cards.length === 0) {
    return NextResponse.json(
      { error: "この店舗にはまだカードが登録されていません。" },
      { status: 400 }
    );
  }

  const picked = pickByOddsWeight(cards);
  createAcquisition({
    deviceId,
    storeId,
    castId: picked.castId,
    cardId: picked.id,
    type: "store",
    day,
  });

  return NextResponse.json({ card: picked });
}
