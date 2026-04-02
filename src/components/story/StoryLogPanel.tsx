import { useEffect, useRef, useState } from "react";
import type { StoryLogEntry } from "../../story/storyLog";
import {
  closeButton,
  overlay,
  overlayHeader,
  overlayTitle,
  scrollArea,
  trigger,
} from "./storyLogPanel.css";

type Props = {
  storyLog: StoryLogEntry[];
  isDev: boolean;
  interpolate: (src: string) => string;
};

export const StoryLogPanel = ({ storyLog, isDev, interpolate }: Props) => {
  const [isOpen, setIsOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [isOpen, storyLog.length]);

  useEffect(() => {
    if (!isOpen) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  return (
    <>
      <button type="button" className={trigger} onClick={() => setIsOpen(true)}>
        스토리 로그 보기 ({storyLog.length}줄)
      </button>

      {isOpen && (
        <div className={overlay} onClick={() => setIsOpen(false)}>
          <div className={overlayHeader} onClick={(e) => e.stopPropagation()}>
            <p className={overlayTitle}>스토리 로그</p>
            <button
              type="button"
              className={closeButton}
              onClick={() => setIsOpen(false)}
            >
              ✕
            </button>
          </div>

          <div
            ref={scrollRef}
            role="log"
            aria-label="story-log"
            className={scrollArea}
            onClick={(e) => e.stopPropagation()}
          >
            {storyLog.length === 0 ? (
              <div style={{ opacity: 0.5 }}>아직 기록이 없습니다.</div>
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
                      <div style={{ opacity: 0.6 }}>
                        <strong>씬</strong> · <code>{entry.sceneId}</code>
                      </div>
                    )}
                    {entry.kind === "text" && (
                      <div>
                        <strong>대사</strong> ·{" "}
                        <code style={{ opacity: 0.6 }}>{entry.sceneId}</code>
                        <div style={{ whiteSpace: "pre-wrap", marginTop: 4 }}>
                          {interpolate(entry.content)}
                        </div>
                      </div>
                    )}
                    {entry.kind === "script" && (
                      <div>
                        <strong>스크립트</strong> ·{" "}
                        <code style={{ opacity: 0.6 }}>{entry.sceneId}</code>
                        {isDev ? (
                          <pre
                            style={{
                              margin: "6px 0 0",
                              padding: "8px 10px",
                              background: "rgba(255,255,255,0.08)",
                              borderRadius: 6,
                              fontSize: 12,
                              whiteSpace: "pre-wrap",
                              wordBreak: "break-word",
                            }}
                          >
                            {entry.code}
                          </pre>
                        ) : (
                          <div style={{ marginTop: 4, opacity: 0.6 }}>
                            (스크립트 실행됨)
                          </div>
                        )}
                      </div>
                    )}
                    {entry.kind === "choice" && (
                      <div>
                        <strong>선택</strong> ·{" "}
                        <code style={{ opacity: 0.6 }}>{entry.sceneId}</code>
                        <div style={{ marginTop: 4 }}>「{entry.text}」</div>
                        {isDev && (
                          <pre
                            style={{
                              margin: "6px 0 0",
                              padding: "8px 10px",
                              background: "rgba(255,255,255,0.08)",
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
        </div>
      )}
    </>
  );
};
