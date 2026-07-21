import {
  getCastByToken,
  getStoreById,
  isCardCollected,
  listCardsByCast,
} from "@/lib/db";
import { readDeviceId } from "@/lib/device";
import CastGacha from "@/components/CastGacha";

export default function PaidCastPage({
  params,
}: {
  params: { token: string };
}) {
  const cast = getCastByToken(params.token);

  if (!cast) {
    return (
      <div className="text-center py-16">
        <p className="text-lg font-bold mb-2">有料QRが見つかりませんでした</p>
        <p className="text-sm text-muted">QRコードが正しいかご確認ください。</p>
      </div>
    );
  }

  const store = getStoreById(cast.storeId);
  const cards = listCardsByCast(cast.id);
  const deviceId = readDeviceId();
  const cardsWithState = cards.map((card) => ({
    ...card,
    collected: deviceId ? isCardCollected(deviceId, card.id) : false,
  }));

  return (
    <CastGacha
      castId={cast.id}
      castCode={cast.code}
      castName={cast.name}
      storeCode={store?.code ?? ""}
      storeName={store?.name ?? ""}
      cards={cardsWithState}
      drawDoneCard={null}
      mode="paid"
    />
  );
}
