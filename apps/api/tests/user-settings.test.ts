/**
 * @file user-settings.test.ts
 * @description Tests for the user settings endpoints (GET/PATCH /api/user/settings).
 * @architecture Uses createTestApp helper with user routes registered.
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { userRoutes } from "../src/routes/user.js";
import { UserModel } from "../src/models/User.js";
import { createTestApp, teardownTestApp, TestAppContext } from "./helpers.js";

describe("User Settings Endpoints", () => {
  let ctx: TestAppContext;

  beforeAll(async () => {
    ctx = await createTestApp({ routes: [userRoutes] });
  });

  afterAll(async () => {
    await teardownTestApp(ctx);
  });

  describe("GET /api/user/settings", () => {
    it("should create a new user on first visit and return empty settings", async () => {
      const response = await ctx.app.inject({
        method: "GET",
        url: "/api/user/settings",
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.payload);
      expect(data.driveRefreshToken).toBeUndefined();
    });

    it("should return existing settings for a known user", async () => {
      // Pre-create user with a token
      const ownerId = "test-user-1"; // matches the mock hook
      await UserModel.findOneAndUpdate(
        { ownerId },
        { driveRefreshToken: "existing-token" },
        { upsert: true, new: true },
      );

      const response = await ctx.app.inject({
        method: "GET",
        url: "/api/user/settings",
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.payload);
      expect(data.driveRefreshToken).toBe("existing-token");
    });
  });

  describe("PATCH /api/user/settings", () => {
    it("should update drive refresh token for existing user", async () => {
      const response = await ctx.app.inject({
        method: "PATCH",
        url: "/api/user/settings",
        payload: { driveRefreshToken: "new-token-abc" },
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.payload);
      expect(data.driveRefreshToken).toBe("new-token-abc");
    });

    it("should create user and set token if user does not exist", async () => {
      // Delete the default owner's user to ensure the record doesn't exist
      await UserModel.deleteMany({ ownerId: "test-user-1" });

      const response = await ctx.app.inject({
        method: "PATCH",
        url: "/api/user/settings",
        payload: { driveRefreshToken: "patched-token" },
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.payload);
      expect(data.driveRefreshToken).toBe("patched-token");
    });

    it("should not change token when body has no driveRefreshToken", async () => {
      const response = await ctx.app.inject({
        method: "PATCH",
        url: "/api/user/settings",
        payload: {},
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.payload);
      // Should keep the previously set value
      expect(data.driveRefreshToken).toBe("patched-token");
    });
  });
});
