"use client";

import { useState } from "react";
import Link from "next/link";
import PokeCard, { PokeCardData } from "./PokeCard";
import Sparkles from "./Sparkles";

export default function StoreGacha({
  storeId,
  storeName,
  casts,
  randomDoneCard,
}: {
  storeId: string;
  storeName: string;
  casts: { id: string; name: string; cardCount: number }[];
  randomDoneCard: PokeCardData | null;
}) {
  const [drawnCard, setDrawnCard] = useState<PokeCardData | null>(randomDoneCard);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [resultCard, setResultCard] = useState<PokeCardData | null>(null);

  async function handleRandom() {
    if (drawnCard || loading) return;
    setLoading(true);
    setMessage(null);

    try {
      const res = await fetch("/api/gacha/random", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storeId }),
      });
      const data = await res.json();

      if (!res.ok) {
        setMessage(data.error ?? "入手できませんでした。");
        if (data.card) {
          setDrawnCard(data.card);
        }
        return;
      }

      setDrawnCard(data.card);
      setResultCard(data.card);
    } catch {
      setMessage("通信エラーが発生しました。");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="text-center">
        <p className="text-xs text-white/50">店舗QR</p>
        <h1 className="text-2xl font-display font-extrabold text-gradient-gold">{storeName}</h1>
        <p className="text-sm text-white/60 mt-2">
          この店舗に在籍する嬢の全カードからランダムで1枚当たります。
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3">
        <button
          onClick={handleRandom}
          disabled={!!drawnCard || loading}
          className="btn-primary px-3 py-4 text-sm text-white disabled:bg-white/10 disabled:text-white/40"
        >
          🎲 店舗QRで1枚入手
          {drawnCard && (
            <span className="block text-[10px] font-normal mt-1">
              本日入手済み：{drawnCard.castName} / {drawnCard.title ?? drawnCard.name}
            </span>
          )}
        </button>
      </div>

      {message && <p className="text-center text-sm text-amber-400">{message}</p>}

      <div>
        <p className="text-sm font-bold mb-3">在籍中のポケ嬢</p>
        {casts.length === 0 ? (
          <p className="text-sm text-white/50">まだカードが登録されていません。</p>
        ) : (
          <div className="flex flex-col gap-2">
            {casts.map((cast) => (
              <div
                key={cast.id}
                className="surface-card rounded-xl px-4 py-3"
              >
                <p className="font-bold text-sm">{cast.name}</p>
                <p className="text-xs text-white/50 mt-1">全{cast.cardCount}種のカード</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {resultCard && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-6"
          onClick={() => setResultCard(null)}
        >
          <div
            className="relative flex flex-col items-center gap-4 card-pop"
            onClick={(e) => e.stopPropagation()}
          >
            <Sparkles variant="burst" />
            <p className="relative text-sm text-white/70">カードを入手しました！</p>
            <div className="relative w-56">
              <PokeCard cast={resultCard} />
            </div>
            {resultCard.flavorText && (
              <p className="relative text-xs text-white/60 max-w-xs text-center">
                {resultCard.flavorText}
              </p>
            )}
            <div className="relative flex gap-3">
              <button
                onClick={() => setResultCard(null)}
                className="rounded-lg bg-white/10 px-4 py-2 text-sm"
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