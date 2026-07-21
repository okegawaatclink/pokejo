import {
  getCastByToken,
  getStoreByToken,
  listCastsByStore,
  findTodayStoreAcquisition,
  getCardById,
  todayJst,
} from "@/lib/db";
import { readDeviceId } from "@/lib/device";
import StoreGacha from "@/components/StoreGacha";
import { redirect } from "next/navigation";

export default function StorePage({
  params,
}: {
  params: { token: string };
}) {
  const store = getStoreByToken(params.token);

  if (!store) {
    const cast = getCastByToken(params.token);
    if (cast) {
      redirect(`/cast/${params.token}`);
    }

    return (
      <div className="text-center py-16">
        <p className="text-lg font-bold mb-2">店舗が見つかりませんでした</p>
        <p className="text-sm text-muted">
          QRコードが正しいかご確認ください。
        </p>
      </div>
    );
  }

  const casts = listCastsByStore(store.id);
  const deviceId = readDeviceId();
  const day = todayJst();
  const randomDone = deviceId ? findTodayStoreAcquisition(deviceId, store.id, day) : undefined;
  const randomDoneCard = randomDone ? getCardById(randomDone.cardId) ?? null : null;

  return (
    <StoreGacha
      storeId={store.id}
      storeCode={store.code}
      storeName={store.name}
      casts={casts}
      randomDoneCard={randomDoneCard}
    />
  );
}
