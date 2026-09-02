/**
 * @file slugify.test.ts
 * @description Unit tests for the shared slugify utility function.
 */

import { describe, it, expect } from "vitest";
import { slugify } from "../src/services/slugify.js";

describe("slugify", () => {
  it("should convert a simple name to a slug", () => {
    expect(slugify("Hello World")).toBe("hello-world");
  });

  it("should lowercase the input", () => {
    expect(slugify("My PROJECT")).toBe("my-project");
  });

  it("should replace spaces with hyphens", () => {
    expect(slugify("one two three")).toBe("one-two-three");
  });

  it("should replace special characters with hyphens", () => {
    expect(slugify("my_project!@#name")).toBe("my-project-name");
  });

  it("should collapse multiple consecutive non-alphanumeric characters", () => {
    expect(slugify("hello___world")).toBe("hello-world");
  });

  it("should strip leading and trailing hyphens", () => {
    expect(slugify("--hello--")).toBe("hello");
  });

  it("should handle empty string", () => {
    expect(slugify("")).toBe("");
  });

  it("should handle numbers", () => {
    expect(slugify("Project 123")).toBe("project-123");
  });

  it("should handle single character", () => {
    expect(slugify("A")).toBe("a");
  });
});
