import { style } from "@vanilla-extract/css";
import { vars } from "../../styles/theme.css";

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

export const overlay = style({
  position: "fixed",
  inset: 0,
  zIndex: 50,
  background: "rgba(0, 0, 0, 0.78)",
  backdropFilter: "blur(6px)",
  WebkitBackdropFilter: "blur(6px)",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  color: "#ffffff",
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
