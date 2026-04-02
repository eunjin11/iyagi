import { style } from "@vanilla-extract/css";
import { vars } from "../../styles/theme.css";

export const overlayRoot = style({
  position: "fixed",
  inset: 0,
  zIndex: 50,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  color: "#ffffff",
});

/** 전체 화면 딤 — 닫기용 네이티브 버튼 */
export const backdrop = style({
  position: "absolute",
  inset: 0,
  zIndex: 0,
  margin: 0,
  padding: 0,
  border: "none",
  display: "block",
  width: "100%",
  height: "100%",
  cursor: "pointer",
  background: "rgba(0, 0, 0, 0.78)",
  backdropFilter: "blur(6px)",
  WebkitBackdropFilter: "blur(6px)",
});

/** 딤 위 레이어: 빈 영역 클릭은 배경 버튼까지 전달되도록 */
export const contentLayer = style({
  position: "relative",
  zIndex: 1,
  flex: 1,
  minHeight: 0,
  width: "100%",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  pointerEvents: "none",
});

/** 실제 패널·헤더·스크롤 — 상호작용 허용 */
export const contentInteractive = style({
  pointerEvents: "auto",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  width: "100%",
  flex: 1,
  minHeight: 0,
});

export const overlayHeader = style({
  width: "100%",
  maxWidth: vars.size.maxContent,
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: `${vars.space.lg} ${vars.space.xl}`,
  flexShrink: 0,
});

export const overlayTitle = style({
  margin: 0,
  fontSize: "15px",
  fontWeight: "bold",
  opacity: 0.9,
});

export const closeButton = style({
  appearance: "none",
  background: "transparent",
  border: "none",
  color: "#ffffff",
  fontSize: "20px",
  cursor: "pointer",
  opacity: 0.7,
  lineHeight: 1,
  padding: vars.space.xs,
  selectors: {
    "&:hover": { opacity: 1 },
  },
});

export const scrollArea = style({
  width: "100%",
  maxWidth: vars.size.maxContent,
  flex: 1,
  overflowY: "auto",
  padding: `0 ${vars.space.xl} ${vars.space.xl}`,
  fontSize: "13px",
  lineHeight: 1.55,
});
