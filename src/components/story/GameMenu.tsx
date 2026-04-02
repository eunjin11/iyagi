import { useEffect, useState } from "react";
import type { SavedSnapshot } from "../../story/snapshots";
import { OverlayModal } from "../ui/OverlayModal";
import * as modal from "../ui/overlayModal.css.ts";
import * as css from "./gameMenu.css.ts";

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
  const [saves, setSaves] = useState<SavedSnapshot[]>([]);

  useEffect(() => {
    if (!isLoadOpen) return;
    setSaves(listSaves());
  }, [isLoadOpen, listSaves]);

  const formatSavedAt = (ts: number) => {
    const d = new Date(ts);
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    const hh = String(d.getHours()).padStart(2, "0");
    const mi = String(d.getMinutes()).padStart(2, "0");
    return `${mm}/${dd} ${hh}:${mi}`;
  };

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
        onDismiss={() => setIsOpen(false)}
        title={isLoadOpen ? "불러오기" : "메뉴"}
        variant="panel"
        panelClassName={css.menuDialog}
        ariaLabel="menu"
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
          <section className={modal.scrollArea} aria-label="불러오기">
            <div style={{ marginBottom: 10 }}>
              <button
                type="button"
                className={css.loadItemButton}
                onClick={() => setIsLoadOpen(false)}
                aria-label="back-to-menu"
              >
                ← 메뉴로
              </button>
            </div>
            {saves.length === 0 ? (
              <div style={{ opacity: 0.6 }}>저장된 상태가 없습니다.</div>
            ) : (
              saves.map((s) => (
                <div key={s.id} className={css.saveRow}>
                  <div className={css.saveRowLoad}>
                    <button
                      type="button"
                      className={css.saveRowLoadButton}
                      onClick={() => {
                        onLoad(s);
                        setIsLoadOpen(false);
                        setIsOpen(false);
                      }}
                      aria-label={s.label}
                    >
                      <div>{s.label}</div>
                      <div className={css.saveMeta}>
                        {formatSavedAt(s.createdAt)}
                      </div>
                    </button>
                    <button
                      type="button"
                      className={css.deleteSaveButton}
                      onClick={() => {
                        onDeleteSave(s.id);
                        setSaves(listSaves());
                      }}
                      aria-label={`저장 삭제: ${s.label}`}
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))
            )}
          </section>
        )}
      </OverlayModal>
    </>
  );
};
