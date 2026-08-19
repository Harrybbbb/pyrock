import { useEffect, useState } from "react";
import { ChatWindow } from "./components/ChatWindow";
import { Logo } from "./components/Icon";
import { EmptyState } from "./components/EmptyState";
import { InventoryPanel } from "./components/InventoryPanel";
import { SiteSelector } from "./components/SiteSelector";
import { useInventory } from "./hooks/useInventory";
import { useMessages } from "./hooks/useMessages";
import { useSites } from "./hooks/useSites";

const LAST_SITE_STORAGE_KEY = "pyrock:lastSiteId";

export function App() {
  const { sites, isLoading: sitesLoading, error: sitesError, search: refreshSites } = useSites();
  const [siteId, setSiteId] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);

  // Resolves the starting site once the directory has loaded: prefer whatever
  // was last used (if it's still a real site), otherwise the first known
  // site, otherwise none — a fresh database has no sites, and defaulting to
  // a hardcoded id would silently point at a site that doesn't exist.
  useEffect(() => {
    if (initialized || sitesLoading) return;
    const stored = window.localStorage.getItem(LAST_SITE_STORAGE_KEY);
    const storedIsValid = !!stored && sites.some((site) => site.siteId === stored);
    setSiteId(storedIsValid ? stored : (sites[0]?.siteId ?? null));
    setInitialized(true);
  }, [initialized, sitesLoading, sites]);

  // If the active site gets deleted, fall back to whatever site is next in
  // the (now refreshed) directory rather than dropping straight to the empty
  // state while other sites still exist.
  useEffect(() => {
    if (!initialized || siteId || sites.length === 0) return;
    handleSiteChange(sites[0].siteId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialized, siteId, sites]);

  function handleSiteChange(id: string) {
    setSiteId(id);
    window.localStorage.setItem(LAST_SITE_STORAGE_KEY, id);
  }

  async function handleSiteDeleted(deletedId: string) {
    await refreshSites("");
    if (deletedId !== siteId) return;
    setSiteId(null);
    window.localStorage.removeItem(LAST_SITE_STORAGE_KEY);
  }

  const { messages, isLoading: messagesLoading, isSending, error: messagesError, send, clarify } =
    useMessages(siteId);
  const { inventory, isLoading: inventoryLoading, error: inventoryError, refresh: refreshInventory } =
    useInventory(siteId);

  async function handleSend(input: { messageId: string; text: string }) {
    await send(input);
    await refreshInventory();
  }

  async function handleClarify(id: string, text: string) {
    await clarify(id, text);
    await refreshInventory();
  }

  return (
    <div className="app">
      <header className="app__topbar">
        <div className="app__brand">
          <span className="app__logo">
            <Logo />
          </span>
          <div className="app__wordmark">
            <h1>
              Pyrock <em>AI</em>
            </h1>
            <p className="app__tagline">Construction Intelligence</p>
          </div>
        </div>

        <div className="app__topbar-right">
          <span className="app__pulse">
            <span className="app__pulse-dot" aria-hidden="true" />
            Extraction live
          </span>
          <SiteSelector
            siteId={siteId}
            onChange={handleSiteChange}
            onDelete={handleSiteDeleted}
          />
        </div>
      </header>

      <main className="app__main">
        {!initialized ? (
          <div className="app__state">Preparing your workspace…</div>
        ) : sitesError && !siteId ? (
          <div className="app__state app__state--error">{sitesError}</div>
        ) : siteId ? (
          <>
            <ChatWindow
              siteId={siteId}
              messages={messages}
              isLoading={messagesLoading}
              isSending={isSending}
              error={messagesError}
              onSend={handleSend}
              onClarify={handleClarify}
            />
            <InventoryPanel
              inventory={inventory}
              isLoading={inventoryLoading}
              error={inventoryError}
              onRefresh={refreshInventory}
            />
          </>
        ) : (
          <EmptyState onSiteCreated={handleSiteChange} />
        )}
      </main>
    </div>
  );
}
