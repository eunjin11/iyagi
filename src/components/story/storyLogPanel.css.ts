import { style } from "@vanilla-extract/css";
import { vars } from "../../styles/theme.css";

/** 스토리 로그 열기 링크(고정 하단 트리거) — 오버레이는 `overlayModal.css.ts` */
export const trigger = style({
  appearance: "none",
  background: "transparent",
  border: "none",
  color: vars.color.textMuted,
  fontSize: "13px",
  cursor: "pointer",
  padding: `${vars.space.xs} 0`,
  textDecoration: "underline",
  textUnderlineOffset: "3px",
  selectors: {
    "&:hover": { color: vars.color.text },
  },
});
