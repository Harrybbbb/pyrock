import type {
  ApiResponse,
  CreateMessageInput,
  CreateSiteInput,
  InventoryItemDto,
  MessageDto,
  SiteDto,
} from "@pyrock/shared";

const BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000/api";

export class ApiError extends Error {
  constructor(
    message: string,
    readonly code: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      ...init,
      headers: { "Content-Type": "application/json", ...init?.headers },
    });
  } catch {
    throw new ApiError(
      "Could not reach the Pyrock backend. Is it running?",
      "NETWORK_ERROR",
    );
  }

  const body = (await response.json()) as ApiResponse<T>;
  if (!body.success) {
    throw new ApiError(body.error.message, body.error.code);
  }
  return body.data;
}

export function submitMessage(input: CreateMessageInput): Promise<MessageDto> {
  return request<MessageDto>("/messages", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function fetchMessages(siteId: string): Promise<MessageDto[]> {
  return request<MessageDto[]>(
    `/messages?siteId=${encodeURIComponent(siteId)}`,
  );
}

export function clarifyMessage(id: string, text: string): Promise<MessageDto> {
  return request<MessageDto>(`/messages/${encodeURIComponent(id)}/clarify`, {
    method: "PATCH",
    body: JSON.stringify({ text }),
  });
}

export function fetchInventory(siteId: string): Promise<InventoryItemDto[]> {
  return request<InventoryItemDto[]>(
    `/sites/${encodeURIComponent(siteId)}/inventory`,
  );
}

export function fetchSites(q?: string): Promise<SiteDto[]> {
  const query = q?.trim() ? `?q=${encodeURIComponent(q.trim())}` : "";
  return request<SiteDto[]>(`/sites${query}`);
}

export function createSite(input: CreateSiteInput): Promise<SiteDto> {
  return request<SiteDto>("/sites", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function deleteSite(siteId: string): Promise<void> {
  return request<void>(`/sites/${encodeURIComponent(siteId)}`, {
    method: "DELETE",
  });
}
