import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  vi,
  beforeEach,
} from "vitest";

process.env.TOKEN_ENCRYPTION_KEY =
  process.env.TOKEN_ENCRYPTION_KEY ||
  "test-secret-key-that-is-long-enough-for-aes";

import { getMetrics } from "../src/services/user.service.js";
import { UserModel } from "../src/models/User.js";
import {
  createTestApp,
  teardownTestApp,
  TestAppContext,
  inTenant,
} from "./helpers.js";

let ctx: TestAppContext;

describe("getMetrics - Drive failure logging security", () => {
  beforeAll(async () => {
    ctx = await createTestApp();
  });

  afterAll(async () => {
    await teardownTestApp(ctx);
  });

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("logs Drive failure using static string and separate arguments without tainted format string", async () => {
    const taintedOwnerId = "attacker-%s-%d-%j";

    await inTenant(taintedOwnerId, async () => {
      await UserModel.create({
        ownerId: taintedOwnerId,
        driveRefreshToken: "valid-drive-token",
      });
    });

    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const mockStorage = {
      uploadFile: vi.fn(),
      deleteFile: vi.fn(),
      getFileStream: vi.fn(),
      getQuota: vi
        .fn()
        .mockRejectedValue(new Error("Drive API rate limit exceeded")),
    };

    const metrics = await inTenant(taintedOwnerId, async () => {
      return getMetrics(taintedOwnerId, mockStorage as any);
    });

    expect(mockStorage.getQuota).toHaveBeenCalledWith(taintedOwnerId);

    // Verify error was logged safely:
    // Arg 0 MUST be the static prefix string (no interpolation of taintedOwnerId)
    // Arg 1 MUST be the ownerId passed separately
    // Arg 2 MUST be the error message
    expect(errorSpy).toHaveBeenCalled();
    const calls = errorSpy.mock.calls;
    const matchingCall = calls.find(
      (call) =>
        call[0] === "Failed to fetch drive metrics for user:" ||
        (typeof call[0] === "string" &&
          call[0].includes("Failed to fetch drive metrics")),
    );

    expect(matchingCall).toBeDefined();
    // Enforce static format string without interpolated ownerId in first parameter
    expect(matchingCall![0]).toBe("Failed to fetch drive metrics for user:");
    expect(matchingCall![1]).toBe(taintedOwnerId);
    expect(matchingCall![2]).toBe("Drive API rate limit exceeded");

    // Verify metrics fallback gracefully
    expect(metrics.drive.connected).toBe(true);
    expect(metrics.drive.usedInDrive).toBeNull();
    expect(metrics.drive.limit).toBeNull();
    expect(metrics.drive.remaining).toBeNull();
  });
});
