import { type ReactNode, useEffect, useState } from "react";
import type { SavedSnapshot } from "../../story/snapshots";
import * as modal from "../ui/overlayModal.css.ts";
import * as css from "./gameMenu.css.ts";

type Props = {
  /** true일 때 목록을 다시 읽는다 (모달이 열릴 때). */
  active: boolean;
  listSaves: () => SavedSnapshot[];
  onPickSave: (entry: SavedSnapshot) => void;
  onDeleteSave: (id: string) => void;
  topSlot?: ReactNode;
};

function formatSavedAt(ts: number): string {
  const d = new Date(ts);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${mm}/${dd} ${hh}:${mi}`;
}

export function SavedSlotsList({
  active,
  listSaves,
  onPickSave,
  onDeleteSave,
  topSlot,
}: Props) {
  const [saves, setSaves] = useState<SavedSnapshot[]>([]);

  useEffect(() => {
    if (!active) return;
    setSaves(listSaves());
  }, [active, listSaves]);

  return (
    <section className={modal.scrollArea} aria-label="불러오기">
      {topSlot ? <div style={{ marginBottom: 10 }}>{topSlot}</div> : null}
      {saves.length === 0 ? (
        <div style={{ opacity: 0.6 }}>저장된 상태가 없습니다.</div>
      ) : (
        saves.map((s) => (
          <div key={s.id} className={css.saveRow}>
            <div className={css.saveRowLoad}>
              <button
                type="button"
                className={css.saveRowLoadButton}
                onClick={() => onPickSave(s)}
                aria-label={s.label}
              >
                <div>{s.label}</div>
                <div className={css.saveMeta}>{formatSavedAt(s.createdAt)}</div>
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
  );
}
