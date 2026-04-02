import type { SavedSnapshot } from "../../story/snapshots";
import { OverlayModal } from "../ui/OverlayModal";
import * as css from "./gameMenu.css.ts";
import { SavedSlotsList } from "./SavedSlotsList";

type Props = {
  open: boolean;
  onDismiss: () => void;
  title?: string;
  listSaves: () => SavedSnapshot[];
  onPickSave: (entry: SavedSnapshot) => void;
  onDeleteSave: (id: string) => void;
  /** 접근성: dialog 이름 (기본은 title과 동일) */
  ariaLabel?: string;
  closeAriaLabel?: string;
};

export function LoadSavedOverlay({
  open,
  onDismiss,
  title = "이어하기",
  listSaves,
  onPickSave,
  onDeleteSave,
  ariaLabel,
  closeAriaLabel = "close-continue",
}: Props) {
  return (
    <OverlayModal
      open={open}
      onDismiss={onDismiss}
      title={title}
      variant="panel"
      panelClassName={css.menuDialog}
      ariaLabel={ariaLabel ?? title}
      closeAriaLabel={closeAriaLabel}
    >
      <SavedSlotsList
        active={open}
        listSaves={listSaves}
        onPickSave={(entry) => {
          onPickSave(entry);
          onDismiss();
        }}
        onDeleteSave={onDeleteSave}
      />
    </OverlayModal>
  );
}
