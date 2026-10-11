import { style } from "@vanilla-extract/css";
import { vars } from "../../styles/theme.css";

export const menuButton = style({
  appearance: "none",
  background: "transparent",
  border: "none",
  color: vars.color.textMuted,
  cursor: "pointer",
  fontSize: 36,
  lineHeight: 1,
  padding: vars.space.sm,
  borderRadius: vars.radius.sm,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  minWidth: 44,
  minHeight: 44,
  boxSizing: "border-box",
  selectors: {
    "&:hover": { color: vars.color.text, background: vars.color.buttonBg },
  },
});

export const menuDialog = style({
  width: "100%",
  maxWidth: vars.size.maxContent,
});

export const menuPanel = style({
  display: "flex",
  flexDirection: "column",
  minHeight: 0,
  overflowY: "auto",
  width: "100%",
  boxSizing: "border-box",
  padding: `0 ${vars.space.xl} ${vars.space.xl}`,
});

export const menuRow = style({
  display: "flex",
  gap: vars.space.sm,
  flexWrap: "wrap",
});

export const inventoryHeading = style({
  margin: `${vars.space.xl} 0 ${vars.space.sm}`,
  color: vars.color.overlayText,
  fontSize: 15,
  fontWeight: 600,
});

export const loadItemButton = style({
  appearance: "none",
  background: vars.color.overlayButtonBg,
  border: `1px solid ${vars.color.overlayBorder}`,
  color: vars.color.overlayText,
  cursor: "pointer",
  padding: `${vars.space.sm} ${vars.space.md}`,
  borderRadius: vars.radius.sm,
  fontSize: 14,
  textAlign: "left",
  display: "flex",
  flexDirection: "column",
  gap: 4,
  selectors: {
    "&:hover": { background: vars.color.overlayButtonHover },
    "&:active": { transform: "translateY(1px)" },
  },
});

export const saveMeta = style({
  fontSize: 12,
  opacity: 0.75,
});

export const saveRow = style({
  marginBottom: vars.space.sm,
});

/** 불러오기 행 카드: 테두리·배경은 여기만. 안에 불러오기 탭 + 삭제(✕) */
export const saveRowLoad = style({
  display: "flex",
  flexDirection: "row",
  alignItems: "stretch",
  minWidth: 0,
  background: vars.color.overlayButtonBg,
  border: `1px solid ${vars.color.overlayBorder}`,
  borderRadius: vars.radius.sm,
  overflow: "hidden",
  selectors: {
    "&:hover": { background: vars.color.overlayButtonHover },
  },
});

/** 카드 안 불러오기 영역 (배경/테두리 없음) */
export const saveRowLoadButton = style({
  flex: 1,
  minWidth: 0,
  appearance: "none",
  background: "transparent",
  border: "none",
  color: vars.color.overlayText,
  cursor: "pointer",
  padding: `${vars.space.sm} ${vars.space.md}`,
  fontSize: 14,
  textAlign: "left",
  display: "flex",
  flexDirection: "column",
  gap: 4,
  selectors: {
    "&:active": { transform: "translateY(1px)" },
  },
});

/** 카드 오른쪽 삭제: 배경·테두리 없음(행 카드만 시각 유지) */
export const deleteSaveButton = style({
  appearance: "none",
  flexShrink: 0,
  alignSelf: "stretch",
  margin: 0,
  padding: `${vars.space.sm} ${vars.space.md}`,
  background: "transparent",
  border: "none",
  color: vars.color.overlayMuted,
  cursor: "pointer",
  fontSize: 16,
  lineHeight: 1,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  selectors: {
    "&:hover": { color: vars.color.overlayDanger },
  },
});
