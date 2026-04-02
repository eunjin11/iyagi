import { style } from "@vanilla-extract/css";
import { vars } from "../../styles/theme.css";

/** 스토리 로그 열기 링크 — 트리거 줄은 `playPage.css.ts`의 `logTriggerBar` */
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
