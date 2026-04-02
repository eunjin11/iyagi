import { style } from "@vanilla-extract/css";
import { vars } from "../../styles/theme.css";

export const overlay = style({
	position: "fixed",
	inset: 0,
	background: "rgba(0,0,0,0.4)",
	display: "flex",
	alignItems: "center",
	justifyContent: "center",
	zIndex: 100,
});

export const card = style({
	background: vars.color.panel,
	borderRadius: vars.radius.lg,
	padding: vars.space.xl,
	width: "min(320px, 90vw)",
	display: "flex",
	flexDirection: "column",
	gap: vars.space.lg,
	boxShadow: vars.shadow.md,
});

export const text = style({
	margin: 0,
	fontSize: "16px",
	textAlign: "center",
	color: vars.color.text,
});

export const buttons = style({
	display: "flex",
	gap: vars.space.sm,
});

export const confirmButton = style({
	appearance: "none",
	flex: 1,
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

export const cancelButton = style({
	appearance: "none",
	flex: 1,
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
