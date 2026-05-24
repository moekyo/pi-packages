/**
 * content-items.ts — Shared parsing utilities for Pi SDK message content items.
 *
 * Provides type-safe extraction of text parts and tool-call names from
 * assistant message content arrays. Pure functions — no SDK imports, no IO.
 */

// ── Types ─────────────────────────────────────────────────────────────────────

/** Tool-call content item — SDK exposes this at runtime but doesn't export the narrow type. */
export interface ToolCallContent {
  type: "toolCall";
  name?: string;
  toolName?: string;
}

/** Extracted text parts and tool names from assistant message content. */
export interface AssistantContentParts {
  textParts: string[];
  toolNames: string[];
}

// ── Functions ─────────────────────────────────────────────────────────────────

/** Extracts the display name from a tool-call content item, falling back to 'unknown'. */
export function getToolCallName(c: { type: string }): string {
  if (c.type !== "toolCall") return "unknown";
  const tc = c as ToolCallContent;
  return tc.name ?? tc.toolName ?? "unknown";
}

/**
 * Extract text parts and tool-call names from assistant message content items.
 *
 * Pure data extraction — consumers apply their own presentation formatting.
 * Skips items of unknown types (e.g. images) and text items with falsy text.
 */
export function extractAssistantContent(
  content: { type: string; [key: string]: unknown }[],
): AssistantContentParts {
  const textParts: string[] = [];
  const toolNames: string[] = [];
  for (const c of content) {
    if (c.type === "text" && c.text) textParts.push(c.text as string);
    else if (c.type === "toolCall") toolNames.push(getToolCallName(c));
  }
  return { textParts, toolNames };
}
