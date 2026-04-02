import type { VariableBag } from "../../story/types";

type Props = {
	isDev: boolean;
	vars: VariableBag;
};

export const DebugOverlay = ({ isDev, vars }: Props) => {
	if (!isDev) return null;

	return (
		<div
			role="status"
			aria-label="debug-overlay"
			style={{
				position: "fixed",
				right: 12,
				bottom: 12,
				zIndex: 9999,
				backgroundColor: "rgba(0,0,0,0.65)",
				color: "#fff",
				padding: "8px 10px",
				maxWidth: "42vw",
				maxHeight: "40vh",
				overflow: "auto",
				fontSize: 12,
				lineHeight: "1.4",
				pointerEvents: "none",
			}}
		>
			<pre style={{ margin: 0 }}>{JSON.stringify(vars, null, 2)}</pre>
		</div>
	);
};
