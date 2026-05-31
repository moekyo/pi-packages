import { getNonEmptyString, toRecord } from "./common";
import {
  formatEditInputForPrompt,
  formatReadInputForPrompt,
  formatWriteInputForPrompt,
  getPromptPath,
  serializeToolInputPreview,
  truncateInlineText,
} from "./tool-input-preview";
import type { PermissionCheckResult } from "./types";

export interface ToolPreviewFormatterOptions {
  toolInputPreviewMaxLength: number;
  toolTextSummaryMaxLength: number;
  toolInputLogPreviewMaxLength: number;
}

/**
 * Formats tool inputs for permission prompts and review logs.
 *
 * Accepts configurable limits in its constructor — the single injection
 * point for preview-length configuration (#266).
 */
export class ToolPreviewFormatter {
  constructor(private readonly options: ToolPreviewFormatterOptions) {}

  // ── Prompt formatting ───────────────────────────────────────────────────

  /**
   * Collapse whitespace, trim, and truncate a string to fit inline.
   * An explicit `maxLength` overrides the constructor default.
   */
  sanitizeInlineText(value: string, maxLength?: number): string {
    const limit = maxLength ?? this.options.toolTextSummaryMaxLength;
    const normalized = value.replace(/\s+/g, " ").trim();
    return normalized ? truncateInlineText(normalized, limit) : "empty text";
  }

  /** Serialize `input` to inline JSON and truncate at `toolInputPreviewMaxLength`. */
  formatJsonInputForPrompt(input: unknown): string {
    const inline = serializeToolInputPreview(input);
    return inline
      ? `with input ${truncateInlineText(inline, this.options.toolInputPreviewMaxLength)}`
      : "";
  }

  /** Format search-tool (grep/find/ls) input for a permission prompt. */
  formatSearchInputForPrompt(
    toolName: string,
    input: Record<string, unknown>,
  ): string {
    const parts: string[] = [];
    const path = getPromptPath(input);
    const pattern = getNonEmptyString(input.pattern);
    const glob = getNonEmptyString(input.glob);

    if (pattern) {
      parts.push(`pattern '${this.sanitizeInlineText(pattern)}'`);
    }
    if (glob) {
      parts.push(`glob '${this.sanitizeInlineText(glob)}'`);
    }
    if (path) {
      parts.push(`path '${path}'`);
    } else if (
      toolName === "find" ||
      toolName === "grep" ||
      toolName === "ls"
    ) {
      parts.push("current working directory");
    }

    return parts.length > 0 ? `for ${parts.join(", ")}` : "";
  }

  /**
   * Format any tool input for display in a permission ask-prompt.
   *
   * Dispatches to the appropriate pure formatter for known tools
   * and falls back to inline JSON for everything else.
   */
  formatToolInputForPrompt(toolName: string, input: unknown): string {
    const inputRecord = toRecord(input);

    switch (toolName) {
      case "edit":
        return formatEditInputForPrompt(inputRecord);
      case "write":
        return formatWriteInputForPrompt(inputRecord);
      case "read":
        return formatReadInputForPrompt(inputRecord);
      case "find":
      case "grep":
      case "ls":
        return this.formatSearchInputForPrompt(toolName, inputRecord);
      default:
        return this.formatJsonInputForPrompt(input);
    }
  }

  // ── Log formatting ──────────────────────────────────────────────────────

  /** Serialize `input` to inline JSON and truncate at `toolInputLogPreviewMaxLength`. */
  formatGenericToolInputForLog(input: unknown): string | undefined {
    const inline = serializeToolInputPreview(input);
    return inline
      ? `input ${truncateInlineText(inline, this.options.toolInputLogPreviewMaxLength)}`
      : undefined;
  }

  /** Derive a loggable input preview string for the review log. */
  getToolInputPreviewForLog(
    result: PermissionCheckResult,
    input: unknown,
    pathBearingTools: ReadonlySet<string>,
  ): string | undefined {
    if (
      result.toolName === "bash" ||
      result.toolName === "mcp" ||
      result.source === "mcp"
    ) {
      return undefined;
    }

    if (pathBearingTools.has(result.toolName)) {
      const inputPreview = this.formatToolInputForPrompt(
        result.toolName,
        input,
      );
      return inputPreview
        ? truncateInlineText(
            inputPreview,
            this.options.toolInputLogPreviewMaxLength,
          )
        : undefined;
    }

    return this.formatGenericToolInputForLog(input);
  }

  /** Build the structured log context object for a permission review log entry. */
  getPermissionLogContext(
    result: PermissionCheckResult,
    input: unknown,
    pathBearingTools: ReadonlySet<string>,
  ): {
    command?: string;
    target?: string;
    toolInputPreview?: string;
    origin?: string;
  } {
    return {
      command: result.command,
      target: result.target,
      toolInputPreview: this.getToolInputPreviewForLog(
        result,
        input,
        pathBearingTools,
      ),
      origin: result.origin,
    };
  }
}
