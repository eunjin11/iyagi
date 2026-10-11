import type { ReactNode } from "react";
import type { VariableBag } from "../../story/types";
import { vars as themeVars } from "../../styles/theme.css";

type Props = {
  isDev: boolean;
  vars?: VariableBag;
  children?: ReactNode;
};

export const DebugOverlay = ({ isDev, vars, children }: Props) => {
  if (!isDev) return null;

  return (
    <section
      aria-label="debug-overlay"
      style={{
        position: "fixed",
        right: 12,
        bottom: 12,
        zIndex: 9999,
        backgroundColor: themeVars.color.overlayBackdrop,
        color: themeVars.color.overlayText,
        border: `1px solid ${themeVars.color.overlayBorder}`,
        padding: "8px 10px",
        maxWidth: "42vw",
        maxHeight: "40vh",
        overflow: "auto",
        fontSize: 12,
        lineHeight: "1.4",
        pointerEvents: children ? "auto" : "none",
      }}
    >
      {children}
      {vars && (
        <pre style={{ margin: children ? "8px 0 0" : 0 }}>
          {JSON.stringify(vars, null, 2)}
        </pre>
      )}
    </section>
  );
};
