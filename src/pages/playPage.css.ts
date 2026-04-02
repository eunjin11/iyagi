import { style } from "@vanilla-extract/css";
import { vars } from "../styles/theme.css";

export const header = style({
	display: "flex",
	alignItems: "center",
	justifyContent: "center",
	marginBottom: vars.space.lg,
	marginTop: vars.space.lg,
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
