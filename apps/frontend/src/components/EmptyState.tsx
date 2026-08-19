import { FormEvent, useState } from "react";
import { SITE_ID_PATTERN } from "@pyrock/shared";
import { useCreateSite } from "../hooks/useCreateSite";
import { Icon, Logo } from "./Icon";

interface EmptyStateProps {
  onSiteCreated: (siteId: string) => void;
}

const SUGGESTIONS = ["site-1", "warehouse-a", "tower-b"];

export function EmptyState({ onSiteCreated }: EmptyStateProps) {
  const [draft, setDraft] = useState("");
  const { isCreating, error, create } = useCreateSite();

  const trimmed = draft.trim();
  const isValid = SITE_ID_PATTERN.test(trimmed);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!isValid || isCreating) return;
    const created = await create(trimmed);
    if (created) onSiteCreated(created.siteId);
  }

  return (
    <div className="empty-state">
      <div className="empty-state__card">
        <span className="empty-state__icon">
          <Logo size={30} />
        </span>

        <h2>
          Site chatter in.
          <em>A clean ledger out.</em>
        </h2>
        <p>
          Add your first site and start logging updates the way your team
          already writes them — Pyrock turns them into tracked material
          movements.
        </p>

        <form className="empty-state__form" onSubmit={handleSubmit}>
          <input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="e.g. site-42"
            aria-label="New site id"
            autoFocus
          />
          <button type="submit" className="btn-primary" disabled={!isValid || isCreating}>
            {isCreating ? "Adding…" : "Add site"}
            {!isCreating && <Icon name="plus" size={15} strokeWidth={2.2} />}
          </button>
        </form>

        {draft.length > 0 && !isValid && (
          <p className="empty-state__hint">
            Site id may only contain letters, numbers, - and _
          </p>
        )}
        {error && (
          <p className="empty-state__error" role="alert">
            <Icon name="alert" size={14} />
            {error}
          </p>
        )}

        <div className="chip-row">
          <span className="chip-row__label">Try</span>
          {SUGGESTIONS.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              className="chip"
              onClick={() => setDraft(suggestion)}
            >
              {suggestion}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
