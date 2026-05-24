import { describe, expect, it } from "vitest";
import { extractAssistantContent, getToolCallName } from "#src/session/content-items";

describe("getToolCallName", () => {
  it("returns name when present", () => {
    expect(getToolCallName({ type: "toolCall", name: "Bash" })).toBe("Bash");
  });

  it("returns toolName when name is absent", () => {
    expect(getToolCallName({ type: "toolCall", toolName: "Read" })).toBe("Read");
  });

  it("prefers name over toolName when both are present", () => {
    expect(
      getToolCallName({ type: "toolCall", name: "Bash", toolName: "OtherName" }),
    ).toBe("Bash");
  });

  it("returns 'unknown' when neither name nor toolName is present", () => {
    expect(getToolCallName({ type: "toolCall" })).toBe("unknown");
  });

  it("returns 'unknown' for non-toolCall type", () => {
    expect(getToolCallName({ type: "text" })).toBe("unknown");
  });
});

describe("extractAssistantContent", () => {
  it("returns empty arrays for empty content", () => {
    expect(extractAssistantContent([])).toEqual({ textParts: [], toolNames: [] });
  });

  it("collects text items only", () => {
    const content = [
      { type: "text", text: "Hello" },
      { type: "text", text: "World" },
    ];
    expect(extractAssistantContent(content)).toEqual({
      textParts: ["Hello", "World"],
      toolNames: [],
    });
  });

  it("collects toolCall items only", () => {
    const content = [
      { type: "toolCall", name: "Bash" },
      { type: "toolCall", toolName: "Read" },
    ];
    expect(extractAssistantContent(content)).toEqual({
      textParts: [],
      toolNames: ["Bash", "Read"],
    });
  });

  it("collects mixed text and toolCall items", () => {
    const content = [
      { type: "text", text: "Some analysis" },
      { type: "toolCall", name: "Bash" },
      { type: "text", text: "More text" },
      { type: "toolCall", name: "Write" },
    ];
    expect(extractAssistantContent(content)).toEqual({
      textParts: ["Some analysis", "More text"],
      toolNames: ["Bash", "Write"],
    });
  });

  it("skips items with other types (e.g. image)", () => {
    const content = [
      { type: "text", text: "Before" },
      { type: "image", data: "base64...", mediaType: "image/png" },
      { type: "toolCall", name: "Read" },
    ];
    expect(extractAssistantContent(content)).toEqual({
      textParts: ["Before"],
      toolNames: ["Read"],
    });
  });

  it("skips text items with falsy text", () => {
    const content = [
      { type: "text", text: "" },
      { type: "text", text: "Real content" },
    ];
    expect(extractAssistantContent(content)).toEqual({
      textParts: ["Real content"],
      toolNames: [],
    });
  });
});
