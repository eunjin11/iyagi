import { useState } from "react";
import type { SavedSnapshot } from "../../story/snapshots";
import type { InventoryItem } from "../../story/types";
import { OverlayModal } from "../ui/OverlayModal";
import * as css from "./gameMenu.css.ts";
import { InventoryGrid } from "./InventoryGrid";
import { SavedSlotsList } from "./SavedSlotsList";

type Props = {
  onSave: () => void;
  listSaves: () => SavedSnapshot[];
  onLoad: (entry: SavedSnapshot) => void;
  onDeleteSave: (id: string) => void;
  inventory: InventoryItem[];
  onUseItem: (id: string) => void;
  onDropItem: (id: string) => void;
};

export const GameMenu = ({
  onSave,
  listSaves,
  onLoad,
  onDeleteSave,
  inventory,
  onUseItem,
  onDropItem,
}: Props) => {
  const [isOpen, setIsOpen] = useState(false);
  const [panel, setPanel] = useState<"menu" | "load">("menu");

  return (
    <>
      <button
        type="button"
        className={css.menuButton}
        onClick={() => {
          setPanel("menu");
          setIsOpen(true);
        }}
        aria-label="menu"
      >
        ☰
      </button>

      <OverlayModal
        open={isOpen}
        onDismiss={() => {
          setIsOpen(false);
          setPanel("menu");
        }}
        title={panel === "load" ? "불러오기" : "메뉴"}
        variant="panel"
        panelClassName={css.menuDialog}
        ariaLabel={panel === "load" ? "불러오기" : "menu"}
        closeAriaLabel="close-menu"
      >
        {panel === "menu" ? (
          <div className={css.menuPanel}>
            <div className={css.menuRow}>
              <button
                type="button"
                className={css.loadItemButton}
                onClick={onSave}
              >
                저장하기
              </button>
              <button
                type="button"
                className={css.loadItemButton}
                onClick={() => setPanel("load")}
              >
                불러오기
              </button>
            </div>
            <h2 className={css.inventoryHeading}>인벤토리</h2>
            <InventoryGrid
              items={inventory}
              onUse={onUseItem}
              onDrop={onDropItem}
            />
          </div>
        ) : (
          <SavedSlotsList
            active={isOpen}
            listSaves={listSaves}
            onPickSave={(s) => {
              onLoad(s);
              setPanel("menu");
              setIsOpen(false);
            }}
            onDeleteSave={onDeleteSave}
            topSlot={
              <button
                type="button"
                className={css.loadItemButton}
                onClick={() => setPanel("menu")}
                aria-label="back-to-menu"
              >
                ← 메뉴로
              </button>
            }
          />
        )}
      </OverlayModal>
    </>
  );
};
