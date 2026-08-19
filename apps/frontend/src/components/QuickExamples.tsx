import { Icon } from "./Icon";

const EXAMPLES = [
  {
    label: "English",
    text: "Received 50 bags of ACC cement from Raj Traders.",
  },
  {
    label: "Hinglish",
    text: "Kal 100 cement bags aaye the, usme se aaj 35 use hue.",
  },
  { label: "Hindi", text: "Aaj slab casting mein 20 cement bags use hue." },
] as const;

interface QuickExamplesProps {
  disabled: boolean;
  onPick: (text: string) => void;
}

export function QuickExamples({ disabled, onPick }: QuickExamplesProps) {
  return (
    <div className="chip-row">
      <span className="chip-row__label">Try</span>
      {EXAMPLES.map((example) => (
        <button
          key={example.label}
          type="button"
          className="chip"
          disabled={disabled}
          onClick={() => onPick(example.text)}
          title={example.text}
        >
          <Icon name="sparkle" size={12} />
          {example.label}
        </button>
      ))}
    </div>
  );
}
