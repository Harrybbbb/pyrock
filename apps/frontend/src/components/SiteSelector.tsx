import { useEffect, useRef, useState } from "react";
import { SITE_ID_PATTERN } from "@pyrock/shared";
import { useCreateSite } from "../hooks/useCreateSite";
import { Icon } from "./Icon";
import { useDeleteSite } from "../hooks/useDeleteSite";
import { useSites } from "../hooks/useSites";

interface SiteSelectorProps {
  siteId: string | null;
  onChange: (siteId: string) => void;
  onDelete: (siteId: string) => void;
}

export function SiteSelector({ siteId, onChange, onDelete }: SiteSelectorProps) {
  const { sites, isLoading, error, search } = useSites();
  const { isCreating, error: createError, create } = useCreateSite();
  const { isDeleting, error: deleteError, remove } = useDeleteSite();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<number | undefined>(undefined);

  // Click-outside / Escape to close — this is the "close" affordance for the
  // search panel in addition to the explicit × button and picking a site.
  useEffect(() => {
    if (!isOpen) return;

    function handlePointerDown(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setIsOpen(false);
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  useEffect(() => {
    setQuery("");
    setPendingDeleteId(null);
    search("");
    if (isOpen) {
      requestAnimationFrame(() => inputRef.current?.focus());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  function handleQueryChange(value: string) {
    setQuery(value);
    window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => search(value), 250);
  }

  function selectSite(id: string) {
    onChange(id);
    setIsOpen(false);
  }

  const trimmedQuery = query.trim();
  const hasExactMatch = sites.some(
    (site) => site.siteId.toLowerCase() === trimmedQuery.toLowerCase(),
  );
  const isValidNewId = SITE_ID_PATTERN.test(trimmedQuery);
  const canOfferCreate = trimmedQuery.length > 0 && !hasExactMatch;

  async function handleCreate() {
    if (!canOfferCreate || !isValidNewId || isCreating) return;
    const created = await create(trimmedQuery);
    if (created) selectSite(created.siteId);
  }

  async function handleDeleteConfirm(id: string) {
    const ok = await remove(id);
    if (!ok) return;
    setPendingDeleteId(null);
    onDelete(id);
    search(query);
  }

  return (
    <div className="site-selector" ref={containerRef}>
      <button
        type="button"
        className="site-selector__trigger"
        onClick={() => setIsOpen((value) => !value)}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <span className="site-selector__trigger-icon">
          <Icon name="site" size={15} />
        </span>
        <span className="site-selector__trigger-label">
          {siteId ?? "Choose site"}
        </span>
        <span className="site-selector__chevron">
          <Icon name="chevron" size={14} strokeWidth={2.2} />
        </span>
      </button>

      {isOpen && (
        <div
          className="site-selector__panel"
          role="dialog"
          aria-label="Choose site"
        >
          <div className="site-selector__search">
            <span className="site-selector__search-icon">
              <Icon name="search" size={15} />
            </span>
            <input
              ref={inputRef}
              value={query}
              onChange={(event) => handleQueryChange(event.target.value)}
              placeholder="Search or add a site…"
              aria-label="Search sites"
            />
            <button
              type="button"
              className="site-selector__close"
              onClick={() => setIsOpen(false)}
              aria-label="Close site picker"
              title="Close"
            >
              <Icon name="close" size={13} strokeWidth={2.2} />
            </button>
          </div>

          <div className="site-selector__list" role="listbox">
            {isLoading && <p className="site-selector__hint">Loading sites…</p>}
            {!isLoading && error && (
              <p className="site-selector__error">
                <Icon name="alert" size={14} />
                {error}
              </p>
            )}
            {!isLoading && !error && sites.length === 0 && (
              <p className="site-selector__hint">No matching sites yet.</p>
            )}
            {!isLoading &&
              sites.map((site) =>
                pendingDeleteId === site.siteId ? (
                  <div key={site.id} className="site-selector__confirm">
                    <span className="site-selector__confirm-text">
                      Delete <strong>{site.siteId}</strong>? This also removes
                      its messages and inventory.
                    </span>
                    <div className="site-selector__confirm-actions">
                      <button
                        type="button"
                        className="site-selector__confirm-cancel"
                        onClick={() => setPendingDeleteId(null)}
                        disabled={isDeleting}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        className="site-selector__confirm-delete"
                        onClick={() => handleDeleteConfirm(site.siteId)}
                        disabled={isDeleting}
                      >
                        {isDeleting ? "Deleting…" : "Delete"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div key={site.id} className="site-selector__row">
                    <button
                      type="button"
                      role="option"
                      aria-selected={site.siteId === siteId}
                      className={`site-selector__option ${
                        site.siteId === siteId
                          ? "site-selector__option--active"
                          : ""
                      }`}
                      onClick={() => selectSite(site.siteId)}
                    >
                      <span className="site-selector__option-icon">
                        <Icon name="site" size={15} />
                      </span>
                      <span className="site-selector__option-text">
                        <span className="site-selector__option-id">
                          {site.siteId}
                        </span>
                        {site.name && (
                          <span className="site-selector__option-name">
                            {site.name}
                          </span>
                        )}
                      </span>
                    </button>
                    <button
                      type="button"
                      className="site-selector__delete"
                      onClick={(event) => {
                        event.stopPropagation();
                        setPendingDeleteId(site.siteId);
                      }}
                      aria-label={`Delete ${site.siteId}`}
                      title="Delete site"
                    >
                      <Icon name="trash" size={15} />
                    </button>
                  </div>
                ),
              )}
          </div>
          {deleteError && (
            <p className="site-selector__error">
              <Icon name="alert" size={14} />
              {deleteError}
            </p>
          )}

          {canOfferCreate && (
            <button
              type="button"
              className="site-selector__create"
              onClick={handleCreate}
              disabled={!isValidNewId || isCreating}
              title={
                !isValidNewId
                  ? "Site id may only contain letters, numbers, - and _"
                  : undefined
              }
            >
              <Icon name="plus" size={14} strokeWidth={2.2} />
              <span>
                {isCreating ? "Adding…" : `Add "${trimmedQuery}" as a new site`}
              </span>
            </button>
          )}
          {createError && (
            <p className="site-selector__error">
              <Icon name="alert" size={14} />
              {createError}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
