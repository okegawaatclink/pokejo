"use client";

import { useEffect, useState } from "react";
import PokeCard from "@/components/PokeCard";
import { BASE_PATH } from "@/lib/basePath";

type Store = {
  id: string;
  name: string;
  qrToken: string;
  castCount: number;
  cardCount: number;
};

type Cast = {
  id: string;
  storeId: string;
  name: string;
  qrToken: string;
  cardCount: number;
};

type Card = {
  id: string;
  castId: string;
  title: string;
  castName?: string;
  imageUrl: string;
  oddsWeight: number;
  rarity: string;
  flavorText: string | null;
};

type CardEditForm = {
  title: string;
  oddsWeight: string;
  rarity: string;
  flavorText: string;
};

const RARITIES = ["N", "R", "SR", "UR"];

export default function AdminPage() {
  const [passcode, setPasscode] = useState("");
  const [authorized, setAuthorized] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const [stores, setStores] = useState<Store[]>([]);
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null);
  const [casts, setCasts] = useState<Cast[]>([]);
  const [selectedCastId, setSelectedCastId] = useState<string | null>(null);
  const [cards, setCards] = useState<Card[]>([]);
  const [storeQrUrl, setStoreQrUrl] = useState<string | null>(null);
  const [castQrUrl, setCastQrUrl] = useState<string | null>(null);

  const [newStoreName, setNewStoreName] = useState("");
  const [newCastName, setNewCastName] = useState("");
  const [editStoreName, setEditStoreName] = useState("");
  const [editCastName, setEditCastName] = useState("");
  const [cardForm, setCardForm] = useState({
    title: "",
    oddsWeight: "1",
    rarity: "N",
    flavorText: "",
  });
  const [cardEditForms, setCardEditForms] = useState<Record<string, CardEditForm>>({});
  const [cardFile, setCardFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    const saved =
      typeof window !== "undefined"
        ? localStorage.getItem("pokejou_admin_passcode")
        : null;
    if (saved) {
      setPasscode(saved);
      verify(saved);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setOrigin(window.location.origin);
    }
  }, []);

  async function verify(code: string) {
    const res = await fetch(`${BASE_PATH}/api/admin/login`, {
      method: "POST",
      headers: { "x-admin-passcode": code },
    });
    if (res.ok) {
      setAuthorized(true);
      setAuthError(null);
      localStorage.setItem("pokejou_admin_passcode", code);
      loadStores(code);
    } else {
      setAuthorized(false);
      setAuthError("パスコードが違います");
    }
  }

  async function loadStores(code = passcode) {
    const res = await fetch(`${BASE_PATH}/api/admin/stores`, {
      headers: { "x-admin-passcode": code },
    });
    if (res.ok) {
      const data = await res.json();
      setStores(data.stores);
    }
  }

  async function loadCasts(storeId: string, code = passcode) {
    const res = await fetch(`${BASE_PATH}/api/admin/casts?storeId=${storeId}`, {
      headers: { "x-admin-passcode": code },
    });
    if (res.ok) {
      const data = await res.json();
      setCasts(data.casts);
    }
  }

  async function loadCards(castId: string, code = passcode) {
    const res = await fetch(`${BASE_PATH}/api/admin/cards?castId=${castId}`, {
      headers: { "x-admin-passcode": code },
    });
    if (res.ok) {
      const data = await res.json();
      setCards(data.cards);
      setCardEditForms(
        Object.fromEntries(
          (data.cards as Card[]).map((card) => [
            card.id,
            {
              title: card.title,
              oddsWeight: String(card.oddsWeight),
              rarity: card.rarity,
              flavorText: card.flavorText ?? "",
            },
          ])
        )
      );
    }
  }

  async function loadQr(token: string, target: "store" | "cast", code = passcode) {
    const currentOrigin = origin || (typeof window !== "undefined" ? window.location.origin : "");
    if (!currentOrigin) return;
    const endpoint = `${currentOrigin}${BASE_PATH}/${target}/${token}`;
    const res = await fetch(
      `${BASE_PATH}/api/admin/qrcode?url=${encodeURIComponent(endpoint)}`,
      {
      headers: { "x-admin-passcode": code },
      }
    );
    if (res.ok) {
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      if (target === "store") {
        setStoreQrUrl(objectUrl);
      } else {
        setCastQrUrl(objectUrl);
      }
    }
  }

  function selectStore(store: Store) {
    setSelectedStoreId(store.id);
    setEditStoreName(store.name);
    setSelectedCastId(null);
    setEditCastName("");
    setCards([]);
    setCardEditForms({});
    setStoreQrUrl(null);
    setCastQrUrl(null);
    loadCasts(store.id);
    loadQr(store.qrToken, "store");
  }

  function selectCast(cast: Cast) {
    setSelectedCastId(cast.id);
    setEditCastName(cast.name);
    setCards([]);
    setCardEditForms({});
    setCastQrUrl(null);
    loadCards(cast.id);
    loadQr(cast.qrToken, "cast");
  }

  function updateCardEditForm(cardId: string, patch: Partial<CardEditForm>) {
    setCardEditForms((forms) => ({
      ...forms,
      [cardId]: {
        ...(forms[cardId] ?? {
          title: "",
          oddsWeight: "1",
          rarity: "N",
          flavorText: "",
        }),
        ...patch,
      },
    }));
  }

  async function handleRenameStore(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedStoreId || !editStoreName.trim()) return;
    setBusy(true);
    setNotice(null);
    try {
      const res = await fetch(`${BASE_PATH}/api/admin/stores`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-admin-passcode": passcode,
        },
        body: JSON.stringify({ id: selectedStoreId, name: editStoreName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setNotice(data.error ?? "店舗名の変更に失敗しました");
        return;
      }
      await loadStores();
      setNotice("店舗名を変更しました");
    } finally {
      setBusy(false);
    }
  }

  async function handleRenameCast(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedCastId || !selectedStoreId || !editCastName.trim()) return;
    setBusy(true);
    setNotice(null);
    try {
      const res = await fetch(`${BASE_PATH}/api/admin/casts`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-admin-passcode": passcode,
        },
        body: JSON.stringify({ id: selectedCastId, name: editCastName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setNotice(data.error ?? "嬢名の変更に失敗しました");
        return;
      }
      await loadCasts(selectedStoreId);
      await loadCards(selectedCastId);
      await loadStores();
      setNotice("嬢名を変更しました");
    } finally {
      setBusy(false);
    }
  }

  async function handleCreateStore(e: React.FormEvent) {
    e.preventDefault();
    if (!newStoreName.trim()) return;
    setBusy(true);
    setNotice(null);
    try {
      const res = await fetch(`${BASE_PATH}/api/admin/stores`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-passcode": passcode,
        },
        body: JSON.stringify({ name: newStoreName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setNotice(data.error ?? "作成に失敗しました");
        return;
      }
      setNewStoreName("");
      await loadStores();
      selectStore(data.store);
    } finally {
      setBusy(false);
    }
  }

  async function handleCreateCast(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedStoreId) return;
    if (!newCastName.trim()) {
      setNotice("嬢の名前は必須です");
      return;
    }
    setBusy(true);
    setNotice(null);
    try {
      const res = await fetch(`${BASE_PATH}/api/admin/casts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-passcode": passcode,
        },
        body: JSON.stringify({ storeId: selectedStoreId, name: newCastName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setNotice(data.error ?? "登録に失敗しました");
        return;
      }
      setNewCastName("");
      await loadCasts(selectedStoreId);
      await loadStores();
      selectCast(data.cast);
      setNotice("嬢を登録しました");
    } finally {
      setBusy(false);
    }
  }

  async function handleCreateCard(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedCastId || !selectedStoreId) return;
    if (!cardForm.title.trim() || !cardFile) {
      setNotice("カード種類名と画像は必須です");
      return;
    }
    const oddsWeight = Number(cardForm.oddsWeight);
    if (!Number.isFinite(oddsWeight) || oddsWeight <= 0) {
      setNotice("当選確率(重み)は0より大きい数値で入力してください");
      return;
    }
    setBusy(true);
    setNotice(null);
    try {
      const fd = new FormData();
      fd.append("castId", selectedCastId);
      fd.append("title", cardForm.title.trim());
      fd.append("oddsWeight", String(oddsWeight));
      fd.append("rarity", cardForm.rarity);
      fd.append("flavorText", cardForm.flavorText);
      fd.append("image", cardFile);

      const res = await fetch(`${BASE_PATH}/api/admin/cards`, {
        method: "POST",
        headers: { "x-admin-passcode": passcode },
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) {
        setNotice(data.error ?? "登録に失敗しました");
        return;
      }
      setCardForm({ title: "", oddsWeight: "1", rarity: "N", flavorText: "" });
      setCardFile(null);
      await loadCards(selectedCastId);
      await loadCasts(selectedStoreId);
      await loadStores();
      setNotice("カードを登録しました");
    } finally {
      setBusy(false);
    }
  }

  async function handleUpdateCard(e: React.FormEvent, cardId: string) {
    e.preventDefault();
    if (!selectedCastId || !selectedStoreId) return;
    const form = cardEditForms[cardId];
    if (!form || !form.title.trim()) {
      setNotice("カード種類名は必須です");
      return;
    }
    const oddsWeight = Number(form.oddsWeight);
    if (!Number.isFinite(oddsWeight) || oddsWeight <= 0) {
      setNotice("当選確率(重み)は0より大きい数値で入力してください");
      return;
    }

    setBusy(true);
    setNotice(null);
    try {
      const res = await fetch(`${BASE_PATH}/api/admin/cards`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-admin-passcode": passcode,
        },
        body: JSON.stringify({
          id: cardId,
          title: form.title.trim(),
          oddsWeight,
          rarity: form.rarity,
          flavorText: form.flavorText,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setNotice(data.error ?? "カードの更新に失敗しました");
        return;
      }
      await loadCards(selectedCastId);
      await loadCasts(selectedStoreId);
      await loadStores();
      setNotice("カードを更新しました");
    } finally {
      setBusy(false);
    }
  }

  if (!authorized) {
    return (
      <div className="max-w-sm mx-auto flex flex-col gap-4 py-10">
        <h1 className="text-xl font-bold text-center">管理画面ログイン</h1>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            verify(passcode);
          }}
          className="flex flex-col gap-3"
        >
          <input
            type="password"
            value={passcode}
            onChange={(e) => setPasscode(e.target.value)}
            placeholder="パスコード"
            className="rounded-lg bg-white/10 border border-white/10 px-3 py-2 text-sm outline-none focus:border-pikablue"
          />
          <button className="rounded-lg bg-pikablue px-4 py-2 text-sm font-bold">
            ログイン
          </button>
        </form>
        {authError && (
          <p className="text-center text-sm text-amber-400">{authError}</p>
        )}
      </div>
    );
  }

  const selectedStore = stores.find((store) => store.id === selectedStoreId) ?? null;
  const selectedCast = casts.find((cast) => cast.id === selectedCastId) ?? null;

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-xl font-bold text-center">管理画面</h1>

      <section>
        <h2 className="font-bold text-sm mb-2">店舗一覧</h2>
        <div className="flex flex-col gap-2 mb-3">
          {stores.map((store) => (
            <button
              key={store.id}
              onClick={() => selectStore(store)}
              className={`text-left rounded-lg px-3 py-2 text-sm border ${
                selectedStoreId === store.id
                  ? "border-pikablue bg-pikablue/10"
                  : "border-white/10 bg-white/5"
              }`}
            >
              {store.name}{" "}
              <span className="text-white/40 text-xs">
                （嬢 {store.castCount} 人 / カード {store.cardCount} 枚）
              </span>
            </button>
          ))}
          {stores.length === 0 && (
            <p className="text-xs text-white/40">まだ店舗が登録されていません。</p>
          )}
        </div>
        <form onSubmit={handleCreateStore} className="flex gap-2">
          <input
            value={newStoreName}
            onChange={(e) => setNewStoreName(e.target.value)}
            placeholder="新しい店舗名"
            className="flex-1 rounded-lg bg-white/10 border border-white/10 px-3 py-2 text-sm outline-none focus:border-pikablue"
          />
          <button
            disabled={busy}
            className="rounded-lg bg-pikablue px-4 py-2 text-sm font-bold disabled:opacity-50"
          >
            追加
          </button>
        </form>
      </section>

      {selectedStore && (
        <section className="flex flex-col gap-4 border-t border-white/10 pt-6">
          <h2 className="font-bold text-sm">{selectedStore.name} の店舗QR</h2>
          {storeQrUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={storeQrUrl}
              alt="店舗QRコード"
              className="w-48 h-48 bg-white rounded-lg p-2"
            />
          ) : (
            <p className="text-xs text-white/40">読み込み中...</p>
          )}
          <p className="text-[11px] text-white/40 break-all">
            エンドポイントURL: {origin ? `${origin}${BASE_PATH}/store/${selectedStore.qrToken}` : "取得中..."}
          </p>

          <h2 className="font-bold text-sm mt-2">店舗名を変更</h2>
          <form onSubmit={handleRenameStore} className="flex gap-2">
            <input
              value={editStoreName}
              onChange={(e) => setEditStoreName(e.target.value)}
              placeholder="店舗名"
              className="flex-1 rounded-lg bg-white/10 border border-white/10 px-3 py-2 text-sm outline-none focus:border-pikablue"
            />
            <button
              disabled={busy}
              className="rounded-lg bg-white/20 px-4 py-2 text-sm font-bold disabled:opacity-50"
            >
              変更
            </button>
          </form>

          <h2 className="font-bold text-sm mt-4">在籍する嬢を登録</h2>
          <form onSubmit={handleCreateCast} className="flex flex-col gap-3">
            <input
              value={newCastName}
              onChange={(e) => setNewCastName(e.target.value)}
              placeholder="嬢の名前"
              className="rounded-lg bg-white/10 border border-white/10 px-3 py-2 text-sm outline-none focus:border-pikablue"
            />
            <button
              disabled={busy}
              className="rounded-lg bg-pokegold text-black px-4 py-2 text-sm font-bold disabled:opacity-50"
            >
              嬢を追加する
            </button>
          </form>

          {notice && <p className="text-sm text-amber-400 text-center">{notice}</p>}

          <h2 className="font-bold text-sm mt-4">在籍中の嬢</h2>
          <div className="flex flex-col gap-2">
            {casts.map((cast) => (
              <button
                key={cast.id}
                onClick={() => selectCast(cast)}
                className={`text-left rounded-lg px-3 py-2 text-sm border ${
                  selectedCastId === cast.id
                    ? "border-pokegold bg-pokegold/10"
                    : "border-white/10 bg-white/5"
                }`}
              >
                {cast.name}
                <span className="text-white/40 text-xs ml-2">
                  （カード {cast.cardCount} 枚）
                </span>
              </button>
            ))}
            {casts.length === 0 && (
              <p className="text-xs text-white/40">まだ嬢が登録されていません。</p>
            )}
          </div>

          {selectedCast && (
            <div className="flex flex-col gap-4 border-t border-white/10 pt-6">
              <h2 className="font-bold text-sm">{selectedCast.name} の嬢QR</h2>
              {castQrUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={castQrUrl}
                  alt="嬢QRコード"
                  className="w-48 h-48 bg-white rounded-lg p-2"
                />
              ) : (
                <p className="text-xs text-white/40">読み込み中...</p>
              )}
              <p className="text-[11px] text-white/40 break-all">
                エンドポイントURL: {origin ? `${origin}${BASE_PATH}/cast/${selectedCast.qrToken}` : "取得中..."}
              </p>

              <h2 className="font-bold text-sm mt-2">嬢名を変更</h2>
              <form onSubmit={handleRenameCast} className="flex gap-2">
                <input
                  value={editCastName}
                  onChange={(e) => setEditCastName(e.target.value)}
                  placeholder="嬢の名前"
                  className="flex-1 rounded-lg bg-white/10 border border-white/10 px-3 py-2 text-sm outline-none focus:border-pikablue"
                />
                <button
                  disabled={busy}
                  className="rounded-lg bg-white/20 px-4 py-2 text-sm font-bold disabled:opacity-50"
                >
                  変更
                </button>
              </form>

              <h2 className="font-bold text-sm mt-4">カード種類を登録</h2>
              <form onSubmit={handleCreateCard} className="flex flex-col gap-3">
                <input
                  value={cardForm.title}
                  onChange={(e) =>
                    setCardForm((form) => ({ ...form, title: e.target.value }))
                  }
                  placeholder="カード種類名"
                  className="rounded-lg bg-white/10 border border-white/10 px-3 py-2 text-sm outline-none focus:border-pikablue"
                />
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={cardForm.oddsWeight}
                  onChange={(e) =>
                    setCardForm((form) => ({ ...form, oddsWeight: e.target.value }))
                  }
                  placeholder="当選確率(重み) 例: 1"
                  className="rounded-lg bg-white/10 border border-white/10 px-3 py-2 text-sm outline-none focus:border-pikablue"
                />
                <select
                  value={cardForm.rarity}
                  onChange={(e) =>
                    setCardForm((form) => ({ ...form, rarity: e.target.value }))
                  }
                  className="rounded-lg bg-white/10 border border-white/10 px-3 py-2 text-sm outline-none"
                >
                  {RARITIES.map((rarity) => (
                    <option key={rarity} value={rarity} className="text-black">
                      {rarity}
                    </option>
                  ))}
                </select>
                <textarea
                  value={cardForm.flavorText}
                  onChange={(e) =>
                    setCardForm((form) => ({ ...form, flavorText: e.target.value }))
                  }
                  placeholder="フレーバーテキスト（任意）"
                  rows={2}
                  className="rounded-lg bg-white/10 border border-white/10 px-3 py-2 text-sm outline-none focus:border-pikablue"
                />
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setCardFile(e.target.files?.[0] ?? null)}
                  className="text-sm"
                />
                <button
                  disabled={busy}
                  className="rounded-lg bg-pokegold text-black px-4 py-2 text-sm font-bold disabled:opacity-50"
                >
                  カードを登録する
                </button>
              </form>

              <h2 className="font-bold text-sm mt-4">登録済みカード</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {cards.map((card) => {
                  const editForm = cardEditForms[card.id] ?? {
                    title: card.title,
                    oddsWeight: String(card.oddsWeight),
                    rarity: card.rarity,
                    flavorText: card.flavorText ?? "",
                  };

                  return (
                    <div key={card.id} className="flex flex-col gap-2">
                      <PokeCard cast={card} />
                      <form
                        onSubmit={(e) => handleUpdateCard(e, card.id)}
                        className="flex flex-col gap-2 rounded-lg border border-white/10 bg-white/5 p-2"
                      >
                        <input
                          value={editForm.title}
                          onChange={(e) =>
                            updateCardEditForm(card.id, { title: e.target.value })
                          }
                          placeholder="カード種類名"
                          className="rounded bg-white/10 border border-white/10 px-2 py-1 text-xs outline-none focus:border-pikablue"
                        />
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="number"
                            min="0.01"
                            step="0.01"
                            value={editForm.oddsWeight}
                            onChange={(e) =>
                              updateCardEditForm(card.id, {
                                oddsWeight: e.target.value,
                              })
                            }
                            placeholder="当選重み"
                            className="rounded bg-white/10 border border-white/10 px-2 py-1 text-xs outline-none focus:border-pikablue"
                          />
                          <select
                            value={editForm.rarity}
                            onChange={(e) =>
                              updateCardEditForm(card.id, { rarity: e.target.value })
                            }
                            className="rounded bg-white/10 border border-white/10 px-2 py-1 text-xs outline-none"
                          >
                            {RARITIES.map((rarity) => (
                              <option key={rarity} value={rarity} className="text-black">
                                {rarity}
                              </option>
                            ))}
                          </select>
                        </div>
                        <textarea
                          value={editForm.flavorText}
                          onChange={(e) =>
                            updateCardEditForm(card.id, {
                              flavorText: e.target.value,
                            })
                          }
                          placeholder="フレーバーテキスト（任意）"
                          rows={2}
                          className="rounded bg-white/10 border border-white/10 px-2 py-1 text-xs outline-none focus:border-pikablue"
                        />
                        <button
                          disabled={busy}
                          className="rounded bg-white/20 px-3 py-1.5 text-xs font-bold disabled:opacity-50"
                        >
                          更新
                        </button>
                      </form>
                    </div>
                  );
                })}
                {cards.length === 0 && (
                  <p className="text-xs text-white/40 col-span-full">
                    まだカードがありません。
                  </p>
                )}
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
