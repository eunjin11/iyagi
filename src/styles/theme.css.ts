import {
  createGlobalTheme,
  globalFontFace,
  globalStyle,
} from "@vanilla-extract/css";

// Chosun Ilbo Myeongjo webfont
globalFontFace("Chosunilbo_myungjo", {
  src: 'url("https://cdn.jsdelivr.net/gh/projectnoonnu/noonfonts_one@1.0/Chosunilbo_myungjo.woff") format("woff")',
  fontWeight: "400",
  fontStyle: "normal",
  fontDisplay: "swap",
});

export const vars = createGlobalTheme(":root", {
  color: {
    bg: "#ffffff",
    panel: "#ffffff",
    text: "#222222",
    textMuted: "#666666",
    accent: "#7aa2ff",
    accent2: "#9b6bff",
    border: "#e5e5ea",
    buttonBg: "#f7f7f9",
    buttonHover: "#efeff2",
    buttonDisabled: "#f2f2f4",
  },
  space: {
    xs: "6px",
    sm: "10px",
    md: "14px",
    lg: "18px",
    xl: "24px",
  },
  radius: {
    sm: "8px",
    md: "12px",
    lg: "16px",
  },
  font: {
    body: `'Chosunilbo_myungjo', serif`,
    mono: `ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, Liberation Mono, monospace`,
  },
  shadow: {
    sm: "0 1px 2px rgba(0,0,0,.1)",
    md: "0 6px 16px rgba(0,0,0,.12)",
    glow: "0 0 0 1px rgba(122,162,255,.18), 0 0 30px rgba(155,107,255,.10)",
  },
  size: {
    maxContent: "720px",
  },
});

// Global reset and base styles (mobile-first)
globalStyle("*, *::before, *::after", {
  boxSizing: "border-box",
});

globalStyle("html, body, #root", {
  height: "100%",
});

globalStyle("html", {
  colorScheme: "light",
});

globalStyle("body", {
  margin: 0,
  background: vars.color.bg,
  color: vars.color.text,
  fontFamily: vars.font.body,
  lineHeight: 1.75,
  WebkitFontSmoothing: "antialiased",
  MozOsxFontSmoothing: "grayscale",
  // 텍스트 드래그·선택 방지 (스토리 탭 플레이 UX)
  userSelect: "none",
  WebkitUserSelect: "none",
  WebkitTouchCallout: "none",
});

globalStyle("button", {
  fontFamily: vars.font.body,
});

// Accessible focus
globalStyle(":focus-visible", {
  outline: `2px solid ${vars.color.accent}`,
  outlineOffset: "2px",
});
