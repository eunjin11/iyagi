import {
  buttons,
  cancelButton,
  card,
  confirmButton,
  overlay,
  text,
} from "./quitModal.css";

type Props = {
  onConfirm: () => void;
  onCancel: () => void;
};

const QuitModal = ({ onConfirm, onCancel }: Props) => (
  <div className={overlay} role="dialog" aria-modal="true">
    <div className={card}>
      <p className={text}>게임을 종료하시겠습니까?</p>
      <div className={buttons}>
        <button type="button" className={confirmButton} onClick={onConfirm}>
          종료
        </button>
        <button type="button" className={cancelButton} onClick={onCancel}>
          계속하기
        </button>
      </div>
    </div>
  </div>
);

export default QuitModal;
