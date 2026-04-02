import { type ReactNode, useEffect } from "react";
import * as css from "./overlayModal.css.ts";

type Props = {
  open: boolean;
  onDismiss: () => void;
  title: string;
  /** stack: 헤더와 본문이 오버레이의 형제(스토리 로그). panel: 한 박스 안에 헤더+본문(게임 메뉴) */
  variant: "stack" | "panel";
  /** variant="panel"일 때 내부 래퍼(폭 제한 등) */
  panelClassName?: string;
  children: ReactNode;
  /** dialog 접근성 이름 */
  ariaLabel?: string;
  closeAriaLabel?: string;
};

export const OverlayModal = ({
  open,
  onDismiss,
  title,
  variant,
  panelClassName,
  children,
  ariaLabel,
  closeAriaLabel = "close",
}: Props) => {
  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onDismiss();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onDismiss]);

  if (!open) return null;

  const header = (
    <header className={css.overlayHeader}>
      <p className={css.overlayTitle}>{title}</p>
      <button
        type="button"
        className={css.closeButton}
        onClick={onDismiss}
        aria-label={closeAriaLabel}
      >
        ✕
      </button>
    </header>
  );

  const dialogLabel = ariaLabel ?? title;

  return (
    <div className={css.overlayRoot}>
      <button
        type="button"
        className={css.backdrop}
        onClick={onDismiss}
        aria-label="오버레이 닫기"
      />
      <div className={css.contentLayer}>
        {variant === "panel" ? (
          <div
            className={[panelClassName, css.contentInteractive]
              .filter(Boolean)
              .join(" ")}
            role="dialog"
            aria-label={dialogLabel}
            aria-modal="true"
          >
            {header}
            {children}
          </div>
        ) : (
          <div
            className={css.contentInteractive}
            role="dialog"
            aria-label={dialogLabel}
            aria-modal="true"
          >
            {header}
            {children}
          </div>
        )}
      </div>
    </div>
  );
};
