import { globalStyle, style } from "@vanilla-extract/css";
import { vars } from "../styles/theme.css";

export const page = style({
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  minHeight: "100vh",
  gap: vars.space.xl,
});

export const titleText = style({
  margin: 0,
  fontSize: "clamp(28px, 8vw, 48px)",
  letterSpacing: "0.5px",
  color: vars.color.text,
});

export const storyPicker = style({
  display: "flex",
  flexDirection: "column",
  gap: vars.space.xs,
  color: vars.color.textMuted,
  fontSize: 13,
});

export const storySelect = style({
  width: "min(280px, 100%)",
  minWidth: 0,
  padding: `${vars.space.sm} ${vars.space.md}`,
  border: `1px solid ${vars.color.border}`,
  borderRadius: vars.radius.sm,
  background: vars.color.panelRaised,
  color: vars.color.text,
  fontSize: 14,
  cursor: "pointer",
  selectors: {
    "&:focus-visible": {
      outline: `2px solid ${vars.color.border}`,
      outlineOffset: "2px",
    },
  },
});

export const debugStoryPicker = style({
  display: "flex",
  flexDirection: "column",
  gap: vars.space.xs,
  color: vars.color.overlayText,
  fontSize: 12,
});

export const debugStorySelect = style({
  width: "min(280px, 100%)",
  minWidth: 0,
  maxWidth: "100%",
  boxSizing: "border-box",
  padding: `${vars.space.xs} ${vars.space.sm}`,
  border: `1px solid ${vars.color.overlayBorder}`,
  borderRadius: vars.radius.sm,
  background: vars.color.overlayButtonBg,
  color: vars.color.overlayText,
  fontFamily: vars.font.body,
  fontSize: 12,
  cursor: "pointer",
  selectors: {
    "&:focus-visible": {
      outline: `2px solid ${vars.color.overlayBorderStrong}`,
      outlineOffset: "2px",
    },
  },
});

globalStyle(`${storySelect} option`, {
  background: vars.color.panel,
  color: vars.color.text,
});

globalStyle(`${debugStorySelect} option`, {
  background: vars.color.overlayPanel,
  color: vars.color.overlayText,
});

export const actions = style({
  display: "flex",
  flexDirection: "column",
  gap: vars.space.md,
  alignItems: "center",
  width: "100%",
  maxWidth: "260px",
});

export const primaryButton = style({
  appearance: "none",
  width: "100%",
  padding: `${vars.space.sm} ${vars.space.xl}`,
  background: vars.color.text,
  color: vars.color.bg,
  border: "none",
  borderRadius: vars.radius.sm,
  fontSize: "15px",
  cursor: "pointer",
  transition: "opacity .15s ease",
  selectors: {
    "&:hover": { opacity: 0.8 },
    "&:active": { opacity: 0.6 },
  },
});

export const secondaryButton = style({
  appearance: "none",
  width: "100%",
  padding: `${vars.space.sm} ${vars.space.xl}`,
  background: "transparent",
  color: vars.color.textMuted,
  border: `1px solid ${vars.color.border}`,
  borderRadius: vars.radius.sm,
  fontSize: "15px",
  cursor: "pointer",
  transition: "background .15s ease",
  selectors: {
    "&:hover": { background: vars.color.buttonBg },
    "&:active": { background: vars.color.buttonHover },
  },
});
