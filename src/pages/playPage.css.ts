import { style } from "@vanilla-extract/css";
import { vars } from "../styles/theme.css";

export const header = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  marginBottom: vars.space.lg,
  marginTop: vars.space.lg,
  width: "100%",
  maxWidth: vars.size.maxContent,
  marginInline: "auto",
  paddingInline: vars.space.xl,
});

export const title = style({
  margin: 0,
  fontSize: "clamp(20px, 5vw, 28px)",
  letterSpacing: "0.2px",
  WebkitBackgroundClip: "text",
  color: "black",
});

export const content = style({
  display: "grid",
  gap: "0",
  justifyItems: "center",
  // 하단 고정 ‘스토리 로그 보기’ 줄 높이만큼 비워 두어 본문이 가려지지 않게 함
  paddingBottom: "calc(52px + env(safe-area-inset-bottom, 0px))",
});

export const card = style({
  width: "100%",
  maxWidth: vars.size.maxContent,
  background: vars.color.panel,
  padding: vars.space.xl,
  fontSize: "15px",
  height: "65vh",
  overflowY: "auto",
});

export const actionRow = style({
  width: "100%",
  maxWidth: vars.size.maxContent,
  display: "flex",
  flexDirection: "column",
  gap: vars.space.xs,
  justifyItems: "start",
});

/** 선택지를 스토리 패널 쪽으로 살짝 올려 붙임 (로그 줄은 별도 고정) */
export const choiceSlot = style({
  position: "relative",
  zIndex: 1,
  width: "100%",
  maxWidth: vars.size.maxContent,
  marginTop: `calc(-1 * ${vars.space.lg})`,
  boxSizing: "border-box",
  display: "flex",
  flexDirection: "column",
  justifyContent: "flex-start",
  alignItems: "stretch",
  flexShrink: 0,
});

export const logTriggerRow = style({
  position: "fixed",
  bottom: 0,
  left: "50%",
  transform: "translateX(-50%)",
  width: "100%",
  maxWidth: vars.size.maxContent,
  paddingTop: vars.space.xs,
  paddingLeft: vars.space.xl,
  paddingRight: vars.space.xl,
  paddingBottom: `calc(${vars.space.xs} + env(safe-area-inset-bottom, 0px))`,
  background: vars.color.bg,
  boxSizing: "border-box",
  zIndex: 20,
});

export const actionButton = style({
  appearance: "none",
  background: "transparent",
  color: vars.color.text,
  padding: vars.space.xs,
  border: "1px solid transparent",
  borderRadius: vars.radius.sm,
  cursor: "pointer",
  transition: "transform .05s ease, background .15s ease",
  selectors: {
    "&:hover": {
      background: vars.color.buttonBg,
    },
    "&:active": {
      transform: "translateY(1px)",
      background: vars.color.buttonHover,
    },
    '&[aria-disabled="true"]': {
      opacity: 0.6,
      background: "transparent",
      cursor: "not-allowed",
    },
  },
});
