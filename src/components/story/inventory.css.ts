import { style } from "@vanilla-extract/css";
import { vars } from "../../styles/theme.css";

export const inventoryPanel = style({
  width: "100%",
  paddingBottom: vars.space.xl,
});

export const inventoryEmpty = style({
  margin: `0 0 ${vars.space.md}`,
  color: vars.color.overlayMuted,
  fontSize: 13,
});

export const inventoryGrid = style({
  display: "grid",
  gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
  gap: vars.space.sm,
  width: "100%",
  listStyle: "none",
  margin: 0,
  padding: 0,
});

export const inventorySlot = style({
  position: "relative",
  aspectRatio: "1",
  minWidth: 0,
  borderRadius: vars.radius.sm,
  border: `1px solid ${vars.color.overlayBorder}`,
  background: vars.color.overlaySlotBg,
});

export const inventorySlotSelected = style({
  zIndex: 3,
});

export const inventorySlotButton = style({
  appearance: "none",
  width: "100%",
  height: "100%",
  minWidth: 0,
  padding: vars.space.xs,
  border: "1px solid transparent",
  borderRadius: vars.radius.sm,
  background: "transparent",
  color: vars.color.overlayText,
  cursor: "pointer",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: 2,
  position: "relative",
  selectors: {
    "&:hover": { background: vars.color.overlayButtonHover },
    '&[data-selected="true"]': {
      borderColor: vars.color.overlayBorderStrong,
      background: vars.color.overlaySelectedBg,
    },
  },
});

export const inventoryIcon = style({
  fontSize: "clamp(22px, 7vw, 34px)",
  lineHeight: 1,
});

export const inventoryName = style({
  maxWidth: "100%",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  fontSize: 11,
  opacity: 0.9,
});

export const inventoryQuantity = style({
  position: "absolute",
  right: 5,
  bottom: 3,
  fontSize: 11,
  fontFamily: vars.font.mono,
  color: vars.color.overlayText,
});

export const inventoryDetails = style({
  position: "absolute",
  left: "50%",
  bottom: "calc(100% + 8px)",
  transform: "translateX(-50%)",
  zIndex: 4,
  display: "flex",
  flexDirection: "column",
  gap: 2,
  width: "max-content",
  minWidth: 180,
  maxWidth: "min(240px, calc(100vw - 48px))",
  padding: `${vars.space.sm} ${vars.space.md}`,
  borderRadius: vars.radius.sm,
  border: `1px solid ${vars.color.overlayBorderStrong}`,
  background: vars.color.overlayPanel,
  boxShadow: "0 -8px 18px rgba(0, 0, 0, 0.24)",
  color: vars.color.overlayText,
  fontSize: 13,
});

export const inventoryDetailsStart = style({
  left: 0,
  transform: "none",
});

export const inventoryDetailsEnd = style({
  left: "auto",
  right: 0,
  transform: "none",
});

export const inventoryDetailsBelow = style({
  top: "calc(100% + 8px)",
  bottom: "auto",
});

export const inventoryActions = style({
  display: "flex",
  gap: vars.space.sm,
  marginTop: vars.space.xs,
});

export const inventoryActionButton = style({
  appearance: "none",
  padding: `${vars.space.xs} ${vars.space.md}`,
  border: `1px solid ${vars.color.overlayBorder}`,
  borderRadius: vars.radius.sm,
  background: vars.color.overlayButtonBg,
  color: vars.color.overlayText,
  fontFamily: vars.font.body,
  fontSize: 13,
  cursor: "pointer",
  selectors: {
    "&:hover": { background: vars.color.overlayButtonHover },
    "&:active": { transform: "translateY(1px)" },
  },
});
