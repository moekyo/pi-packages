import type {
  ToolAccessExtractor,
  ToolAccessExtractorLookup,
} from "./access-intent";

export type { ToolAccessExtractor, ToolAccessExtractorLookup };

/**
 * Registration side of the access extractor registry (ISP — exposes only the
 * write surface, mirroring the read-only {@link ToolAccessExtractorLookup}).
 */
export interface ToolAccessExtractorRegistrar {
  register(toolName: string, extractor: ToolAccessExtractor): () => void;
}

/**
 * Persistent registry mapping tool names to custom access-intent extractors.
 *
 * Owned by the extension factory so sibling extensions can explicitly describe
 * filesystem access for tools whose input shape is not the built-in `path`
 * convention.
 */
export class ToolAccessExtractorRegistry
  implements ToolAccessExtractorLookup, ToolAccessExtractorRegistrar
{
  private readonly extractors = new Map<string, ToolAccessExtractor>();

  register(toolName: string, extractor: ToolAccessExtractor): () => void {
    if (this.extractors.has(toolName)) {
      throw new Error(
        `A tool access extractor is already registered for '${toolName}'.`,
      );
    }
    this.extractors.set(toolName, extractor);
    return () => {
      if (this.extractors.get(toolName) === extractor) {
        this.extractors.delete(toolName);
      }
    };
  }

  get(toolName: string): ToolAccessExtractor | undefined {
    return this.extractors.get(toolName);
  }
}
