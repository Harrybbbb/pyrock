import { useEffect, useState } from "react";
import { ChatWindow } from "./components/ChatWindow";
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
      <header className="app__header">
        <div className="app__brand">
          <span className="app__logo" aria-hidden="true">
            🏗️
          </span>
          <div>
            <h1>Pyrock AI</h1>
            <p className="app__tagline">Construction Assistant</p>
          </div>
        </div>
        <SiteSelector
          siteId={siteId}
          onChange={handleSiteChange}
          onDelete={handleSiteDeleted}
        />
      </header>

      <main className="app__main">
        {!initialized ? (
          <div className="app__loading">Loading…</div>
        ) : sitesError && !siteId ? (
          <div className="app__loading app__loading--error">{sitesError}</div>
        ) : siteId ? (
          <>
            <ChatWindow
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
