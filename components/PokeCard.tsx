"use client";

import Image from "next/image";
import { BASE_PATH } from "@/lib/basePath";

export type PokeCardData = {
  id: string;
  code?: string;
  title?: string;
  name?: string;
  castName?: string;
  castCode?: string;
  imageUrl: string;
  rarity: string;
  flavorText?: string | null;
  storeName?: string;
  storeCode?: string;
};

const RARITY_LABEL: Record<string, string> = {
  N: "ノーマル",
  R: "レア",
  SR: "スーパーレア",
  UR: "ウルトラレア",
};

export default function PokeCard({
  cast,
  locked = false,
  onClick,
  size = "md",
}: {
  cast: PokeCardData;
  locked?: boolean;
  onClick?: () => void;
  size?: "sm" | "md" | "lg";
}) {
  const sizeClass =
    size === "sm" ? "w-full" : size === "lg" ? "w-full max-w-xs" : "w-full";
  const title = cast.title ?? cast.name ?? "カード";
  const subtitle = cast.castName
    ? `${cast.castCode ? `#${cast.castCode} ` : ""}${cast.castName}`
    : null;
  const storeLabel = cast.storeName
    ? `${cast.storeCode ? `#${cast.storeCode} ` : ""}${cast.storeName}`
    : null;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className={`poke-card rarity-${cast.rarity} ${
        locked ? "locked" : ""
      } ${sizeClass} rounded-2xl p-2 flex flex-col text-left transition-transform ${
        onClick ? "hover:-translate-y-1 active:translate-y-0 cursor-pointer" : "cursor-default"
      }`}
    >
      <div className="relative aspect-[3/4] w-full overflow-hidden rounded-xl bg-black/40">
        {locked ? (
          <div className="w-full h-full flex items-center justify-center text-3xl">
            ❔
          </div>
        ) : (
          <Image
            src={
              cast.imageUrl.startsWith("/") && !cast.imageUrl.startsWith(BASE_PATH)
                ? `${BASE_PATH}${cast.imageUrl}`
                : cast.imageUrl
            }
            alt={title}
            fill
            sizes="(max-width: 768px) 45vw, 220px"
            className="object-cover"
          />
        )}
        <span
          className={`absolute top-1 right-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full border border-white/20 ${
            cast.rarity === "UR"
              ? "bg-gold-shine text-black shadow-glow"
              : cast.rarity === "SR"
              ? "bg-pink-gold text-black"
              : "bg-black/60 text-white"
          }`}
        >
          {RARITY_LABEL[cast.rarity] ?? cast.rarity}
        </span>
      </div>
      <div className="mt-2 px-1">
        <p className="font-display font-bold text-sm truncate">
          {locked ? "？？？" : `${cast.code ? `#${cast.code} ` : ""}${title}`}
        </p>
        {subtitle && (
          <p className="text-[11px] text-white/60 truncate">{subtitle}</p>
        )}
        {storeLabel && (
          <p className="text-[11px] text-white/40 truncate">{storeLabel}</p>
        )}
      </div>
    </button>
  );
}
