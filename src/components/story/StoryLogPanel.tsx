import { useEffect, useRef } from "react";
import type { StoryLogEntry } from "../../story/storyLog";

type Props = {
	storyLog: StoryLogEntry[];
	isDev: boolean;
	interpolate: (src: string) => string;
	className: string;
};

export const StoryLogPanel = ({
	storyLog,
	isDev,
	interpolate,
	className,
}: Props) => {
	const logScrollRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (storyLog.length === 0) return;
		const el = logScrollRef.current;
		if (!el) return;
		el.scrollTop = el.scrollHeight;
	}, [storyLog.length]);

	return (
		<details className={className} style={{ marginTop: "1rem" }}>
			<summary style={{ cursor: "pointer", userSelect: "none" }}>
				스토리 로그 ({storyLog.length}줄)
			</summary>
			<div
				ref={logScrollRef}
				role="log"
				aria-label="story-log"
				style={{
					marginTop: "0.75rem",
					maxHeight: "min(36vh, 280px)",
					overflow: "auto",
					fontSize: 13,
					lineHeight: 1.45,
					borderTop: "1px solid rgba(0,0,0,0.08)",
					paddingTop: "0.75rem",
				}}
			>
				{storyLog.length === 0 ? (
					<div style={{ opacity: 0.55 }}>아직 기록이 없습니다.</div>
				) : (
					storyLog.map((entry) => {
						const entryKey =
							entry.kind === "enterScene"
								? `enterScene|${entry.sceneId}`
								: entry.kind === "text"
									? `text|${entry.sceneId}|${entry.content}`
									: entry.kind === "script"
										? `script|${entry.sceneId}|${entry.code}`
										: `choice|${entry.sceneId}|${entry.text}|${entry.script}`;
						return (
							<div key={entryKey} style={{ marginBottom: "0.65em" }}>
								{entry.kind === "enterScene" && (
									<div style={{ opacity: 0.7 }}>
										<strong>씬</strong> · <code>{entry.sceneId}</code>
									</div>
								)}
								{entry.kind === "text" && (
									<div>
										<strong>대사</strong> ·{" "}
										<code style={{ opacity: 0.65 }}>{entry.sceneId}</code>
										<div style={{ whiteSpace: "pre-wrap", marginTop: 4 }}>
											{interpolate(entry.content)}
										</div>
									</div>
								)}
								{entry.kind === "script" && (
									<div>
										<strong>스크립트</strong> ·{" "}
										<code style={{ opacity: 0.65 }}>{entry.sceneId}</code>
										{isDev ? (
											<pre
												style={{
													margin: "6px 0 0",
													padding: "8px 10px",
													background: "rgba(0,0,0, 0.06)",
													borderRadius: 6,
													fontSize: 12,
													whiteSpace: "pre-wrap",
													wordBreak: "break-word",
												}}
											>
												{entry.code}
											</pre>
										) : (
											<div style={{ marginTop: 4, opacity: 0.65 }}>
												(스크립트 실행됨)
											</div>
										)}
									</div>
								)}
								{entry.kind === "choice" && (
									<div>
										<strong>선택</strong> ·{" "}
										<code style={{ opacity: 0.65 }}>{entry.sceneId}</code>
										<div style={{ marginTop: 4 }}>「{entry.text}」</div>
										{isDev && (
											<pre
												style={{
													margin: "6px 0 0",
													padding: "8px 10px",
													background: "rgba(0,0,0, 0.06)",
													borderRadius: 6,
													fontSize: 12,
													whiteSpace: "pre-wrap",
													wordBreak: "break-word",
												}}
											>
												{entry.script}
											</pre>
										)}
									</div>
								)}
							</div>
						);
					})
				)}
			</div>
		</details>
	);
};
