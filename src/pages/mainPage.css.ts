import { style } from "@vanilla-extract/css";
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
