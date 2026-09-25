"use client";

import { WatchList } from "@/components/WatchList";
import { cancelWatch } from "@/app/actions/watch";
import type { WatchCard } from "@/lib/watch-card";

/** Server action'ı istemci listesine bağlayan ince katman. */
export function WatchesClient({ watches }: { watches: WatchCard[] }) {
  async function handleCancel(id: string) {
    const result = await cancelWatch(id);
    if (!result.ok) throw new Error(result.error ?? "İptal edilemedi");
  }

  return <WatchList watches={watches} onCancel={handleCancel} />;
}
