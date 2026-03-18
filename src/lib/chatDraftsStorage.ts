const KEY_PREFIX = "xerro-chat-draft-";

export function getDraft(sessionId: string): string {
  try {
    return localStorage.getItem(KEY_PREFIX + sessionId) ?? "";
  } catch {
    return "";
  }
}

export function saveDraft(sessionId: string, draft: string): void {
  try {
    if (draft) {
      localStorage.setItem(KEY_PREFIX + sessionId, draft);
    } else {
      clearDraft(sessionId);
    }
  } catch {
    // ignore storage errors
  }
}

export function clearDraft(sessionId: string): void {
  try {
    localStorage.removeItem(KEY_PREFIX + sessionId);
  } catch {
    // ignore storage errors
  }
}
