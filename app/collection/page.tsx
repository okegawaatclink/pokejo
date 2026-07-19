import { listStoreCollectionsForDevice } from "@/lib/db";
import { readDeviceId } from "@/lib/device";
import CollectionGrid from "@/components/CollectionGrid";
import { unstable_noStore as noStore } from "next/cache";

export const dynamic = "force-dynamic";

export default function CollectionPage() {
  noStore();
  const deviceId = readDeviceId();
  const storeCollections = listStoreCollectionsForDevice(deviceId);
  const totalCount = storeCollections.reduce((sum, store) => sum + store.totalCount, 0);
  const collectedCount = storeCollections.reduce(
    (sum, store) => sum + store.collectedCount,
    0
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="text-center">
        <h1 className="text-2xl font-display font-extrabold text-gradient-gold">コレクション</h1>
        <p className="text-xs text-white/50 mt-1">
          全{totalCount}枚中 {collectedCount}枚を入手済み
        </p>
      </div>
      <CollectionGrid stores={storeCollections} />
    </div>
  );
}
