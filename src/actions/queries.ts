import type { InventoryItem } from "../story/types";

/** Read-only helpers shared by scripts and conditions. Add queries here once. */
export function createQueries(getInventory: () => readonly InventoryItem[]) {
  return {
    hasItem: (id: string): boolean =>
      getInventory().some((item) => item.id === id && item.quantity > 0),
  };
}
