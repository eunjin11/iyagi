import { useEffect, useRef, useState } from "react";
import type { InventoryItem } from "../../story/types";
import * as css from "./inventory.css.ts";

const MIN_SLOTS = 16;

type Props = {
  items: InventoryItem[];
  onUse?: (id: string) => void;
  onDrop?: (id: string) => void;
};

export function InventoryGrid({ items, onUse, onDrop }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const inventoryRef = useRef<HTMLDivElement>(null);
  const detailsRef = useRef<HTMLDivElement>(null);
  const slotCount = Math.max(MIN_SLOTS, items.length);
  const slotKeys = Array.from(
    { length: slotCount },
    (_, index) => `empty-${index}`,
  );

  useEffect(() => {
    if (!selectedId) return;

    const closeOnOutsidePointer = (event: PointerEvent) => {
      const target = event.target;
      if (target instanceof Node && !inventoryRef.current?.contains(target)) {
        setSelectedId(null);
      }
    };

    document.addEventListener("pointerdown", closeOnOutsidePointer);
    return () =>
      document.removeEventListener("pointerdown", closeOnOutsidePointer);
  }, [selectedId]);

  useEffect(() => {
    if (selectedId && !items.some((item) => item.id === selectedId)) {
      setSelectedId(null);
    }
  }, [items, selectedId]);

  useEffect(() => {
    if (selectedId) detailsRef.current?.focus();
  }, [selectedId]);

  return (
    <div ref={inventoryRef} className={css.inventoryPanel}>
      {items.length === 0 && (
        <p className={css.inventoryEmpty}>아직 아이템이 없습니다.</p>
      )}

      <ul className={css.inventoryGrid} aria-label="인벤토리 아이템">
        {Array.from({ length: slotCount }, (_, index) => {
          const item = items[index];
          if (!item) {
            return <li key={slotKeys[index]} className={css.inventorySlot} />;
          }
          const isSelected = item.id === selectedId;
          const horizontalPlacement =
            index % 4 === 0
              ? css.inventoryDetailsStart
              : index % 4 === 3
                ? css.inventoryDetailsEnd
                : "";
          const verticalPlacement = index < 4 ? css.inventoryDetailsBelow : "";
          const detailsId = `inventory-details-${index}`;
          return (
            <li
              key={item.id}
              className={`${css.inventorySlot}${isSelected ? ` ${css.inventorySlotSelected}` : ""}`}
            >
              <button
                type="button"
                className={css.inventorySlotButton}
                data-selected={isSelected || undefined}
                aria-label={`${item.name}${item.quantity > 1 ? ` ${item.quantity}개` : ""}`}
                aria-pressed={isSelected}
                aria-expanded={isSelected}
                aria-controls={isSelected ? detailsId : undefined}
                onClick={() => setSelectedId(isSelected ? null : item.id)}
                onKeyDown={(event) => {
                  if (event.key === "Escape" && isSelected) {
                    event.stopPropagation();
                    setSelectedId(null);
                  }
                }}
              >
                <span className={css.inventoryIcon} aria-hidden="true">
                  {item.icon ?? "📦"}
                </span>
                <span className={css.inventoryName}>{item.name}</span>
                {item.quantity > 1 && (
                  <span className={css.inventoryQuantity}>
                    ×{item.quantity}
                  </span>
                )}
              </button>
              {isSelected && (
                <section
                  className={`${css.inventoryDetails} ${horizontalPlacement} ${verticalPlacement}`}
                  id={detailsId}
                  ref={detailsRef}
                  aria-labelledby={`${detailsId}-title`}
                  tabIndex={-1}
                  aria-live="polite"
                  onKeyDown={(event) => {
                    if (event.key === "Escape") {
                      event.stopPropagation();
                      setSelectedId(null);
                    }
                  }}
                >
                  <strong id={`${detailsId}-title`}>{item.name}</strong>
                  {item.description && <span>{item.description}</span>}
                  <div className={css.inventoryActions}>
                    {item.useCode?.trim() && onUse && (
                      <button
                        type="button"
                        className={css.inventoryActionButton}
                        onClick={() => onUse(item.id)}
                      >
                        사용
                      </button>
                    )}
                    {onDrop && (
                      <button
                        type="button"
                        className={css.inventoryActionButton}
                        onClick={() => onDrop(item.id)}
                      >
                        버리기
                      </button>
                    )}
                  </div>
                </section>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
