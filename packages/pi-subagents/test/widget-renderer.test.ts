import { describe, expect, it } from "vitest";
import { AgentTypeRegistry } from "../src/agent-types.js";
import type { Theme } from "../src/ui/display.js";
import type { WidgetActivity, WidgetAgent } from "../src/ui/widget-renderer.js";
import { renderFinishedLine } from "../src/ui/widget-renderer.js";

/** Minimal theme stub — wraps text with markup tags for assertion. */
function stubTheme(): Theme {
	return {
		fg: (color: string, text: string) => `[${color}:${text}]`,
		bold: (text: string) => `**${text}**`,
	};
}

const testRegistry = new AgentTypeRegistry(() => new Map());

function makeAgent(overrides: Partial<WidgetAgent> = {}): WidgetAgent {
	return {
		id: "agent-1",
		type: "general-purpose",
		status: "completed",
		description: "test task",
		toolUses: 5,
		startedAt: 1000,
		completedAt: 6000,
		compactionCount: 0,
		...overrides,
	};
}

function makeActivity(overrides: Partial<WidgetActivity> = {}): WidgetActivity {
	return {
		activeTools: new Map(),
		responseText: "",
		turnCount: 3,
		maxTurns: 10,
		...overrides,
	};
}

describe("renderFinishedLine", () => {
	const theme = stubTheme();

	it("renders completed agent with success icon and stats", () => {
		const agent = makeAgent();
		const activity = makeActivity();
		const line = renderFinishedLine(agent, activity, testRegistry, theme);

		// Success icon
		expect(line).toContain("[success:✓]");
		// Display name (general-purpose → "Agent")
		expect(line).toContain("[dim:Agent]");
		// Description
		expect(line).toContain("[dim:test task]");
		// Tool uses
		expect(line).toContain("5 tool uses");
		// Duration (5000ms = 5.0s)
		expect(line).toContain("5.0s");
		// Turn count with max
		expect(line).toContain("⟳3≤10");
		// No trailing status text for completed
		expect(line).not.toContain("error");
		expect(line).not.toContain("aborted");
		expect(line).not.toContain("stopped");
	});

	it("renders singular tool use", () => {
		const agent = makeAgent({ toolUses: 1 });
		const line = renderFinishedLine(agent, undefined, testRegistry, theme);

		expect(line).toContain("1 tool use");
		expect(line).not.toContain("1 tool uses");
	});

	it("omits tool uses when zero", () => {
		const agent = makeAgent({ toolUses: 0 });
		const line = renderFinishedLine(agent, undefined, testRegistry, theme);

		expect(line).not.toContain("tool use");
	});

	it("omits turn count when no activity provided", () => {
		const agent = makeAgent();
		const line = renderFinishedLine(agent, undefined, testRegistry, theme);

		expect(line).not.toContain("⟳");
	});

	it("uses Date.now() for duration when completedAt is undefined", () => {
		const now = Date.now();
		const agent = makeAgent({ startedAt: now - 2000, completedAt: undefined });
		const line = renderFinishedLine(agent, undefined, testRegistry, theme);

		// Should show ~2.0s (may vary slightly due to test execution time)
		expect(line).toMatch(/[12]\.\ds/);
	});
});
