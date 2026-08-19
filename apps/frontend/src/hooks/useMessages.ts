import { useCallback, useEffect, useState } from "react";
import type { CreateMessageInput, MessageDto } from "@pyrock/shared";
import { ApiError, clarifyMessage, fetchMessages, submitMessage } from "../api/client";

interface UseMessagesResult {
  messages: MessageDto[];
  isLoading: boolean;
  isSending: boolean;
  error: string | null;
  send: (input: Omit<CreateMessageInput, "siteId">) => Promise<void>;
  clarify: (id: string, text: string) => Promise<void>;
}

export function useMessages(siteId: string | null): UseMessagesResult {
  const [messages, setMessages] = useState<MessageDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!siteId) {
      setMessages([]);
      setIsLoading(false);
      setError(null);
      return;
    }
    setIsLoading(true);
    try {
      const data = await fetchMessages(siteId);
      setMessages(data);
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load messages");
    } finally {
      setIsLoading(false);
    }
  }, [siteId]);

  useEffect(() => {
    load();
  }, [load]);

  const send = useCallback(
    async (input: Omit<CreateMessageInput, "siteId">) => {
      if (!siteId) return;
      setIsSending(true);
      setError(null);
      try {
        const created = await submitMessage({ ...input, siteId });
        setMessages((prev) => [created, ...prev]);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "Failed to send message");
        throw err;
      } finally {
        setIsSending(false);
      }
    },
    [siteId],
  );

  // Resolves an existing message in place — no new chat turn, the bubble itself updates.
  const clarify = useCallback(async (id: string, text: string) => {
    setIsSending(true);
    setError(null);
    try {
      const updated = await clarifyMessage(id, text);
      setMessages((prev) => prev.map((message) => (message.id === updated.id ? updated : message)));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to send clarification");
      throw err;
    } finally {
      setIsSending(false);
    }
  }, []);

  return { messages, isLoading, isSending, error, send, clarify };
}
