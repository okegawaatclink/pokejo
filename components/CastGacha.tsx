"use client";

import { useState } from "react";
import Link from "next/link";
import PokeCard, { PokeCardData } from "./PokeCard";
import Sparkles from "./Sparkles";
import { BASE_PATH } from "@/lib/basePath";

type CardState = PokeCardData & { collected: boolean };

export default function CastGacha({
  castId,
  castCode,
  castName,
  storeCode,
  storeName,
  cards,
  drawDoneCard,
  mode = "daily",
}: {
  castId: string;
  castCode: string;
  castName: string;
  storeCode: string;
  storeName: string;
  cards: CardState[];
  drawDoneCard: PokeCardData | null;
  mode?: "daily" | "paid";
}) {
  const [cardList, setCardList] = useState(cards);
  const [drawnCard, setDrawnCard] = useState<PokeCardData | null>(drawDoneCard);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [resultCard, setResultCard] = useState<PokeCardData | null>(null);

  function markCollected(cardId: string) {
    setCardList((list) =>
      list.map((card) => (card.id === cardId ? { ...card, collected: true } : card))
    );
  }

  async function handleDraw() {
    if (drawnCard || loading) return;
    setLoading(true);
    setMessage(null);

    try {
      const endpoint =
        mode === "paid"
          ? `${BASE_PATH}/api/gacha/paid`
          : `${BASE_PATH}/api/gacha/targeted`;
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ castId }),
      });
      const data = await res.json();

      if (!res.ok) {
        setMessage(data.error ?? "入手できませんでした。");
        if (data.card) {
          setDrawnCard(data.card);
          markCollected(data.card.id);
        }
        return;
      }

      setDrawnCard(data.card);
      markCollected(data.card.id);
      setResultCard(data.card);
    } catch {
      setMessage("通信エラーが発生しました。");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="text-center py-4">
        <p className="text-xs font-bold tracking-[0.16em] text-champagne">
          {mode === "paid" ? "有料QR" : "嬢QR"}
        </p>
        <h1 className="text-2xl font-display font-extrabold text-gradient-gold">
          #{castCode} {castName}
        </h1>
        <p className="text-sm text-muted mt-2">
          {storeCode ? `#${storeCode} ` : ""}
          {storeName}
        </p>
        <p className="text-sm text-muted mt-3 leading-6">
          {mode === "paid"
            ? "レジ購入用の特別QRです。通常の1日1回制限とは別に抽選できます。"
            : "この嬢の全カードからランダムで1枚当たります。"}
        </p>
      </div>

      <button
        onClick={handleDraw}
        disabled={!!drawnCard || loading}
        className="btn-gold px-3 py-4 text-sm text-black disabled:bg-stone-200 disabled:text-muted"
      >
        {mode === "paid" ? "有料QRで1枚入手" : "嬢QRで1枚入手"}
        {drawnCard && (
          <span className="block text-[10px] font-normal mt-1">
            {mode === "paid" ? "このQRで入手済み" : "本日入手済み"}：
            {drawnCard.title ?? drawnCard.name}
          </span>
        )}
      </button>

      {message && <p className="text-center text-sm text-amber-700">{message}</p>}

      <div>
        <p className="text-sm font-bold mb-4 text-ink">
          #{castCode} {castName} のカード一覧
        </p>
        {cardList.length === 0 ? (
          <p className="text-sm text-muted">まだカードが登録されていません。</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {cardList.map((card) => (
              <div key={card.id} className="relative">
                <PokeCard cast={card} locked={!card.collected} />
                {card.collected && (
                  <span className="absolute top-1 left-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500 text-black">
                    GET
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {resultCard && (
        <div
          className="fixed inset-0 z-50 bg-stone-950/72 flex items-center justify-center p-6"
          onClick={() => setResultCard(null)}
        >
          <div
            className="relative flex flex-col items-center gap-4 card-pop"
            onClick={(e) => e.stopPropagation()}
          >
            <Sparkles variant="burst" />
            <p className="relative text-sm text-white">カードを入手しました！</p>
            <div className="relative w-56">
              <PokeCard cast={resultCard} />
            </div>
            {resultCard.flavorText && (
              <p className="relative text-xs text-white/80 max-w-xs text-center">
                {resultCard.flavorText}
              </p>
            )}
            <div className="relative flex gap-3">
              <button
                onClick={() => setResultCard(null)}
                className="rounded-lg bg-white px-4 py-2 text-sm text-ink"
              >
                閉じる
              </button>
              <Link
                href="/collection"
                className="btn-primary px-4 py-2 text-sm text-white"
              >
                コレクションを見る
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
