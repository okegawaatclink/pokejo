"use client";

import { useState } from "react";
import PokeCard, { PokeCardData } from "./PokeCard";
import Sparkles from "./Sparkles";
import { StoreCollection } from "@/lib/db";

export type CollectedCardData = PokeCardData & {
  type: string;
  acquiredOn: string;
};

function acquisitionLabel(type: string | null) {
  if (!type) return "-";
  if (type === "store") return "店舗QR";
  if (type === "cast") return "嬢QR";
  if (type === "random") return "ランダム入手";
  if (type === "targeted") return "指名入手";
  return type;
}

export default function CollectionGrid({
  stores,
}: {
  stores: StoreCollection[];
}) {
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(
    stores[0]?.storeId ?? null
  );
  const [selected, setSelected] = useState<CollectedCardData | null>(null);

  if (stores.length === 0) {
    return (
      <p className="text-sm text-white/50 text-center py-10">
        まだ店舗やカードが登録されていません。
      </p>
    );
  }

  const selectedStore =
    stores.find((store) => store.storeId === selectedStoreId) ?? stores[0];
  const cards = selectedStore.cards;

  const selectedCard = selected?.id
    ? cards.find((card) => card.id === selected.id && card.collected)
    : null;

  return (
    <>
      <div className="flex flex-col gap-2">
        <p className="text-sm font-bold">お店を選択</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {stores.map((store) => (
            <button
              key={store.storeId}
              type="button"
              onClick={() => {
                setSelectedStoreId(store.storeId);
                setSelected(null);
              }}
              className={`rounded-2xl border p-3 text-left min-h-[96px] flex flex-col justify-between transition-colors ${
                selectedStore.storeId === store.storeId
                  ? "border-pokepink bg-pokepink/15"
                  : "border-white/15 bg-white/5 hover:bg-white/10"
              }`}
            >
              <p className="text-sm font-bold truncate">{store.storeName}</p>
              <span className="text-xs text-white/50">
                {store.collectedCount}/{store.totalCount}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="text-sm text-white/70">
        {selectedStore.storeName} のカード一覧（{selectedStore.collectedCount}/{selectedStore.totalCount}）
      </div>

      {cards.length === 0 ? (
        <p className="text-sm text-white/50 text-center py-8">
          この店舗にはまだカードが登録されていません。
        </p>
      ) : (
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {cards.map((c) => (
          <PokeCard
            key={c.id}
            cast={c}
            locked={!c.collected}
            onClick={c.collected ? () => setSelected(c as CollectedCardData) : undefined}
          />
        ))}
      </div>
      )}

      {selectedCard && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setSelected(null)}
        >
          <div
            className="relative flex flex-col items-center gap-3 card-pop w-full h-full justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <Sparkles variant="burst" />
            <div className="relative w-full max-w-md">
              <PokeCard cast={selectedCard} />
            </div>
            {selectedCard.flavorText && (
              <p className="relative text-xs text-white/60 max-w-xs text-center">
                {selectedCard.flavorText}
              </p>
            )}
            <p className="relative text-[11px] text-white/40">
              入手日: {selectedCard.acquiredOn} / {acquisitionLabel(selectedCard.type)}
            </p>
            <button
              onClick={() => setSelected(null)}
              className="relative rounded-lg bg-white/10 px-4 py-2 text-sm"
            >
              閉じる
            </button>
          </div>
        </div>
      )}
    </>
  );
}
