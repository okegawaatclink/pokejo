import {
  findTodayCastAcquisitionByStore,
  getCardById,
  getCastByToken,
  getStoreById,
  isCardCollected,
  listCardsByCast,
  todayJst,
} from "@/lib/db";
import { readDeviceId } from "@/lib/device";
import CastGacha from "@/components/CastGacha";

export default function CastPage({
  params,
}: {
  params: { token: string };
}) {
  const cast = getCastByToken(params.token);

  if (!cast) {
    return (
      <div className="text-center py-16">
        <p className="text-lg font-bold mb-2">嬢QRが見つかりませんでした</p>
        <p className="text-sm text-white/50">QRコードが正しいかご確認ください。</p>
      </div>
    );
  }

  const store = getStoreById(cast.storeId);
  const cards = listCardsByCast(cast.id);
  const deviceId = readDeviceId();
  const day = todayJst();
  const cardsWithState = cards.map((card) => ({
    ...card,
    collected: deviceId ? isCardCollected(deviceId, card.id) : false,
  }));
  const drawDone = deviceId
    ? findTodayCastAcquisitionByStore(deviceId, cast.storeId, day)
    : undefined;
  const drawDoneCard = drawDone ? getCardById(drawDone.cardId) ?? null : null;

  return (
    <CastGacha
      castId={cast.id}
      castCode={cast.code}
      castName={cast.name}
      storeCode={store?.code ?? ""}
      storeName={store?.name ?? ""}
      cards={cardsWithState}
      drawDoneCard={drawDoneCard}
    />
  );
}
