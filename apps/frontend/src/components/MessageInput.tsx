import { FormEvent } from "react";

interface MessageInputProps {
  value: string;
  onChangeValue: (value: string) => void;
  disabled: boolean;
  onSend: () => void;
}

export function MessageInput({
  value,
  onChangeValue,
  disabled,
  onSend,
}: MessageInputProps) {
  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!value.trim()) return;
    onSend();
  }

  return (
    <form className="message-input" onSubmit={handleSubmit}>
      <div className="message-input__field">
        <input
          value={value}
          onChange={(event) => onChangeValue(event.target.value)}
          placeholder="Type a construction update, e.g. Kal 100 cement bags aaye the…"
          disabled={disabled}
          aria-label="Message text"
          maxLength={2000}
        />
        {value.length > 0 && (
          <button
            type="button"
            className="message-input__clear"
            onClick={() => onChangeValue("")}
            aria-label="Clear message"
            title="Clear"
          >
            ×
          </button>
        )}
      </div>
      <button
        type="submit"
        className="message-input__send"
        disabled={disabled || !value.trim()}
      >
        {disabled ? "Sending…" : "Send"}
      </button>
    </form>
  );
}
