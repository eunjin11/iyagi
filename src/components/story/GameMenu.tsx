import { useState } from "react";
import type { SavedSnapshot } from "../../story/snapshots";
import { OverlayModal } from "../ui/OverlayModal";
import * as css from "./gameMenu.css.ts";
import { SavedSlotsList } from "./SavedSlotsList";

type Props = {
  onSave: () => void;
  listSaves: () => SavedSnapshot[];
  onLoad: (entry: SavedSnapshot) => void;
  onDeleteSave: (id: string) => void;
};

export const GameMenu = ({
  onSave,
  listSaves,
  onLoad,
  onDeleteSave,
}: Props) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoadOpen, setIsLoadOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        className={css.menuButton}
        onClick={() => setIsOpen(true)}
        aria-label="menu"
      >
        ☰
      </button>

      <OverlayModal
        open={isOpen}
        onDismiss={() => {
          setIsOpen(false);
          setIsLoadOpen(false);
        }}
        title={isLoadOpen ? "불러오기" : "메뉴"}
        variant="panel"
        panelClassName={css.menuDialog}
        ariaLabel={isLoadOpen ? "불러오기" : "menu"}
        closeAriaLabel="close-menu"
      >
        {!isLoadOpen ? (
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
                onClick={() => setIsLoadOpen(true)}
              >
                불러오기
              </button>
            </div>
          </div>
        ) : (
          <SavedSlotsList
            active={isLoadOpen}
            listSaves={listSaves}
            onPickSave={(s) => {
              onLoad(s);
              setIsLoadOpen(false);
              setIsOpen(false);
            }}
            onDeleteSave={onDeleteSave}
            topSlot={
              <button
                type="button"
                className={css.loadItemButton}
                onClick={() => setIsLoadOpen(false)}
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
