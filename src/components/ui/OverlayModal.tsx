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
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open) return null;

  const header = (
    // biome-ignore lint/a11y/noStaticElementInteractions: 헤더 줄 클릭이 배경 닫힘으로 전파되지 않게 함
    // biome-ignore lint/a11y/useKeyWithClickEvents: 키보드는 닫기 버튼·Esc로 처리
    <div className={css.overlayHeader} onClick={(e) => e.stopPropagation()}>
      <p className={css.overlayTitle}>{title}</p>
      <button
        type="button"
        className={css.closeButton}
        onClick={onDismiss}
        aria-label={closeAriaLabel}
      >
        ✕
      </button>
    </div>
  );

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: 전체 화면 딤 영역 탭으로 닫기
    <div
      className={css.overlay}
      onClick={onDismiss}
      onKeyDown={(e) => {
        if (e.key === "Escape") onDismiss();
      }}
      role="presentation"
    >
      {variant === "panel" ? (
        <div
          className={panelClassName}
          role="dialog"
          aria-label={ariaLabel ?? title}
          aria-modal="true"
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => {
            if (e.key === "Escape") onDismiss();
          }}
        >
          {header}
          {children}
        </div>
      ) : (
        <>
          {header}
          {children}
        </>
      )}
    </div>
  );
};
