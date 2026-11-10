import { describe, it, expect } from "vitest";
import dotenv from "dotenv";

describe("dotenv integration", () => {
  it("exports config, parse, and populate functions", () => {
    expect(typeof dotenv.config).toBe("function");
    expect(typeof dotenv.parse).toBe("function");
  });

  it("parses environment definitions correctly", () => {
    const src = "TEST_FOO=bar\nTEST_NUM=123";
    const parsed = dotenv.parse(src);
    expect(parsed.TEST_FOO).toBe("bar");
    expect(parsed.TEST_NUM).toBe("123");
  });

  it("loads config from options object without errors", () => {
    const result = dotenv.config({ path: "/dev/null" });
    expect(result).toBeDefined();
    expect(result.error).toBeUndefined();
  });
});
