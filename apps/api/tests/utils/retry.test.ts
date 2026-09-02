import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { withRetry } from "../../src/utils/retry.js";

describe("withRetry utility", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("should return the result immediately if no error is thrown", async () => {
    const fn = vi.fn().mockResolvedValue("success");
    const result = await withRetry(fn);

    expect(result).toBe("success");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("should retry upon failure and eventually succeed", async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error("fail 1"))
      .mockRejectedValueOnce(new Error("fail 2"))
      .mockResolvedValueOnce("success at last");

    const promise = withRetry(fn, 3, 100);

    // fast-forward first backoff
    await vi.runAllTimersAsync();

    const result = await promise;

    expect(result).toBe("success at last");
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("should throw the last error if maxAttempts is exceeded", async () => {
    const fn = vi.fn().mockRejectedValue(new Error("persistent failure"));

    // Attach handler BEFORE advancing timers so Node never sees an unhandled rejection
    const expectation = expect(withRetry(fn, 3, 100)).rejects.toThrow(
      "persistent failure",
    );

    await vi.runAllTimersAsync();

    await expectation;
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("should respect exponential backoff (e.g. 100ms -> 200ms)", async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error("fail 1"))
      .mockRejectedValueOnce(new Error("fail 2"))
      .mockResolvedValueOnce("success");

    let resolved = false;
    const promise = withRetry(fn, 3, 100).then((res) => {
      resolved = true;
      return res;
    });

    // 0ms elapsed, fn called once (attempt 0), failed, waiting 100 * 2^0 = 100ms
    expect(fn).toHaveBeenCalledTimes(1);
    expect(resolved).toBe(false);

    // Advance 99ms
    await vi.advanceTimersByTimeAsync(99);
    expect(fn).toHaveBeenCalledTimes(1);

    // Advance 1ms (total 100ms)
    await vi.advanceTimersByTimeAsync(1);
    // fn called twice (attempt 1), failed, waiting 100 * 2^1 = 200ms
    expect(fn).toHaveBeenCalledTimes(2);
    expect(resolved).toBe(false);

    // Advance 199ms
    await vi.advanceTimersByTimeAsync(199);
    expect(fn).toHaveBeenCalledTimes(2);

    // Advance 1ms (total 200ms)
    await vi.advanceTimersByTimeAsync(1);
    // fn called three times, succeeded
    expect(fn).toHaveBeenCalledTimes(3);

    // Wait for microtasks
    await Promise.resolve();
    expect(resolved).toBe(true);
    expect(await promise).toBe("success");
  });
});
