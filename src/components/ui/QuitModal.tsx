import * as css from "./quitModal.css.ts";

type Props = {
  onConfirm: () => void;
  onCancel: () => void;
};

const QuitModal = ({ onConfirm, onCancel }: Props) => (
  <div className={css.overlay} role="dialog" aria-modal="true">
    <div className={css.card}>
      <p className={css.text}>게임을 종료하시겠습니까?</p>
      <div className={css.buttons}>
        <button type="button" className={css.confirmButton} onClick={onConfirm}>
          종료
        </button>
        <button type="button" className={css.cancelButton} onClick={onCancel}>
          계속하기
        </button>
      </div>
    </div>
  </div>
);

export default QuitModal;
