import type { Choice } from "../../story/types";

type Props = {
  choices: Choice[];
  canChoose: (choice: Choice) => boolean;
  onChoose: (choice: Choice) => void;
  className: string;
  buttonClassName: string;
};

export const ChoiceList = ({
  choices,
  canChoose,
  onChoose,
  className,
  buttonClassName,
}: Props) => {
  if (choices.length === 0) return null;

  return (
    <nav className={className} aria-label="actions">
      {choices.map((c) => {
        const enabled = canChoose(c);
        const choiceKey = `${c.text}|${c.enabledWhen ?? ""}`;
        return (
          <button
            key={choiceKey}
            type="button"
            className={buttonClassName}
            disabled={!enabled}
            title={
              !enabled && c.enabledWhen
                ? `조건 불충족: ${c.enabledWhen}`
                : undefined
            }
            aria-disabled={!enabled}
            onClick={() => {
              if (!enabled) return;
              onChoose(c);
            }}
            style={
              !enabled ? { opacity: 0.45, cursor: "not-allowed" } : undefined
            }
          >
            {c.text}
          </button>
        );
      })}
    </nav>
  );
};
