import { describe, expect, it, vi } from "vitest";
import { createBlockingRunner, createRunResult, createSessionRunner } from "./manager-stubs";
import { createMockSession } from "./mock-session";

describe("createBlockingRunner", () => {
	it("run returns a pending promise (never resolves)", () => {
		const runner = createBlockingRunner();
		const p = runner.run({} as never, "general-purpose", "test", {} as never);
		// The promise must still be pending — we check it doesn't settle synchronously
		let settled = false;
		void p.then(() => {
			settled = true;
		});
		expect(settled).toBe(false);
	});

	it("exposes run and resume as vi.fn stubs", () => {
		const runner = createBlockingRunner();
		expect(vi.isMockFunction(runner.run)).toBe(true);
		expect(vi.isMockFunction(runner.resume)).toBe(true);
	});
});

describe("createRunResult", () => {
	it("returns the expected default shape", () => {
		const result = createRunResult();
		expect(result.responseText).toBe("done");
		expect(result.aborted).toBe(false);
		expect(result.steered).toBe(false);
		expect(result.session).toBeDefined();
	});

	it("uses the provided session", () => {
		const session = createMockSession();
		const result = createRunResult(session);
		// The session is cast to AgentSession — verify it is the same object via identity.
		expect(result.session).toBe(session);
	});
});

describe("createSessionRunner", () => {
	it("calls onSessionCreated with the given session", async () => {
		const session = createMockSession();
		const runner = createSessionRunner(session);
		const onSessionCreated = vi.fn();

		await runner.run({} as never, "general-purpose", "test", {
			context: {},
			onSessionCreated,
		});

		expect(onSessionCreated).toHaveBeenCalledOnce();
		expect(onSessionCreated).toHaveBeenCalledWith(session);
	});

	it("resolves with a RunResult containing the given session", async () => {
		const session = createMockSession();
		const runner = createSessionRunner(session);

		const result = await runner.run({} as never, "general-purpose", "test", {
			context: {},
		});

		expect(result.responseText).toBe("done");
		expect(result.session).toBe(session);
	});

	it("exposes run and resume as vi.fn stubs", () => {
		const runner = createSessionRunner(createMockSession());
		expect(vi.isMockFunction(runner.run)).toBe(true);
		expect(vi.isMockFunction(runner.resume)).toBe(true);
	});
});
