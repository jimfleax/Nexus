import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
  vi,
} from "vitest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import {
  connectDB,
  disconnectDB,
  getDatabaseStatus,
  maskMongoUri,
  DatabaseConnectionError,
  _resetConnectionCacheForTesting,
} from "../src/db.js";

let mongoServer: MongoMemoryServer;
let mongoUri: string;

describe("Database Connection Setup & Caching", () => {
  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    mongoUri = mongoServer.getUri();
  }, 60000);

  afterAll(async () => {
    await disconnectDB();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    vi.restoreAllMocks();
    await disconnectDB();
  });

  describe("URI Validation (Fail Fast)", () => {
    it("should throw DatabaseConnectionError immediately without retrying if URI is empty", async () => {
      const origEnv = process.env.MONGODB_URI;
      delete process.env.MONGODB_URI;

      const connectSpy = vi.spyOn(mongoose, "connect");

      await expect(connectDB("")).rejects.toThrow(DatabaseConnectionError);
      await expect(connectDB("   ")).rejects.toThrow(DatabaseConnectionError);
      await expect(connectDB(undefined)).rejects.toThrow(
        "MongoDB URI is required. Provide a valid connection string or set MONGODB_URI.",
      );

      // Verify no connection attempts were made
      expect(connectSpy).not.toHaveBeenCalled();

      process.env.MONGODB_URI = origEnv;
    });
  });

  describe("Connection Caching", () => {
    it("should establish a connection and return the mongoose instance", async () => {
      const instance = await connectDB(mongoUri);

      expect(instance).toBe(mongoose);
      expect(mongoose.connection.readyState).toBe(1);

      const status = getDatabaseStatus();
      expect(status.isConnected).toBe(true);
      expect(status.readyState).toBe(1);
      expect(status.statusName).toBe("connected");
    });

    it("should reuse the existing connection on subsequent calls without reconnecting", async () => {
      await connectDB(mongoUri);

      const connectSpy = vi.spyOn(mongoose, "connect");

      // Multiple subsequent requests/calls
      const inst1 = await connectDB(mongoUri);
      const inst2 = await connectDB(mongoUri);
      const inst3 = await connectDB();

      expect(inst1).toBe(mongoose);
      expect(inst2).toBe(mongoose);
      expect(inst3).toBe(mongoose);

      // mongoose.connect should NOT have been called again
      expect(connectSpy).not.toHaveBeenCalled();
    });

    it("should coalesce concurrent connection attempts to the same in-flight promise", async () => {
      let connectCallCount = 0;
      const originalConnect = mongoose.connect.bind(mongoose);
      vi.spyOn(mongoose, "connect").mockImplementation(async (uri, opts) => {
        connectCallCount++;
        // Small delay to simulate network latency
        await new Promise((r) => setTimeout(r, 50));
        return originalConnect(uri, opts);
      });

      // Fire 5 concurrent requests attempting to connect at the exact same moment
      const promises = [
        connectDB(mongoUri),
        connectDB(mongoUri),
        connectDB(mongoUri),
        connectDB(mongoUri),
        connectDB(mongoUri),
      ];

      const results = await Promise.all(promises);

      // All 5 calls should resolve to the same mongoose instance
      results.forEach((res) => expect(res).toBe(mongoose));

      // mongoose.connect must be called only ONCE despite 5 concurrent callers
      expect(connectCallCount).toBe(1);
    });
  });

  describe("3-Retry Mechanism with Exponential Backoff", () => {
    it("should retry on transient failures and succeed on subsequent attempt", async () => {
      let attemptCounter = 0;
      const originalConnect = mongoose.connect.bind(mongoose);

      const warnings: string[] = [];
      const testLogger = {
        info: vi.fn(),
        warn: (msg: string) => warnings.push(msg),
        error: vi.fn(),
      };

      vi.spyOn(mongoose, "connect").mockImplementation(async (uri, opts) => {
        attemptCounter++;
        if (attemptCounter < 3) {
          throw new Error(
            `Simulated transient error attempt ${attemptCounter}`,
          );
        }
        return originalConnect(uri, opts);
      });

      const instance = await connectDB(mongoUri, {
        retries: 3,
        initialBackoffMs: 10,
        maxBackoffMs: 50,
        logger: testLogger,
      });

      expect(instance).toBe(mongoose);
      expect(attemptCounter).toBe(3);
      expect(warnings.length).toBe(2);
      expect(warnings[0]).toContain("attempt 1/3 failed");
      expect(warnings[1]).toContain("attempt 2/3 failed");
      expect(getDatabaseStatus().isConnected).toBe(true);
    });

    it("should throw DatabaseConnectionError after all 3 retries fail", async () => {
      const originalConnect = mongoose.connect.bind(mongoose);
      const errorsLogged: string[] = [];
      const warningsLogged: string[] = [];
      const testLogger = {
        info: vi.fn(),
        warn: (msg: string) => warningsLogged.push(msg),
        error: (msg: string | Error) => errorsLogged.push(String(msg)),
      };

      vi.spyOn(mongoose, "connect").mockImplementation(async () => {
        throw new Error("Persistent MongoDB unreachable error");
      });

      await expect(
        connectDB(mongoUri, {
          retries: 3,
          initialBackoffMs: 10,
          maxBackoffMs: 30,
          logger: testLogger,
        }),
      ).rejects.toThrow(DatabaseConnectionError);

      expect(warningsLogged.length).toBe(2);
      expect(errorsLogged.length).toBe(1);
      expect(errorsLogged[0]).toContain("Connection failed after 3 attempts");

      // Verify that after failure, the in-flight promise was cleared so a future attempt can try again
      _resetConnectionCacheForTesting();
      vi.spyOn(mongoose, "connect").mockImplementation(async (uri, opts) => {
        return originalConnect(uri, opts);
      });

      const recovered = await connectDB(mongoUri, {
        retries: 3,
        initialBackoffMs: 10,
      });
      expect(recovered).toBe(mongoose);
      expect(getDatabaseStatus().isConnected).toBe(true);
    });
  });

  describe("URI Masking and Security", () => {
    it("should obscure passwords in MongoDB URIs", () => {
      const masked = maskMongoUri(
        "mongodb://admin:superSecretPass123!@cluster0.mongodb.net:27017/nexus",
      );
      expect(masked).toBe(
        "mongodb://admin:****@cluster0.mongodb.net:27017/nexus",
      );
      expect(masked).not.toContain("superSecretPass123!");
    });

    it("should handle URIs without credentials safely", () => {
      const masked = maskMongoUri("mongodb://localhost:27017/nexus");
      expect(masked).toBe("mongodb://localhost:27017/nexus");
    });

    it("should mask credentials in DatabaseConnectionError", async () => {
      vi.spyOn(mongoose, "connect").mockImplementation(async () => {
        throw new Error("Connection failed");
      });

      try {
        await connectDB(
          "mongodb://secretUser:secretPass@localhost:27017/test",
          {
            retries: 1,
            initialBackoffMs: 5,
          },
        );
        expect.unreachable("Should have thrown");
      } catch (err) {
        expect(err).toBeInstanceOf(DatabaseConnectionError);
        const connErr = err as DatabaseConnectionError;
        expect(connErr.sanitizedUri).toBe(
          "mongodb://secretUser:****@localhost:27017/test",
        );
        expect(connErr.sanitizedUri).not.toContain("secretPass");
        expect(connErr.attempts).toBe(1);
      }
    });
  });

  describe("Disconnection & Lifecycle", () => {
    it("should disconnect and update database status accordingly", async () => {
      await connectDB(mongoUri);
      expect(getDatabaseStatus().isConnected).toBe(true);

      await disconnectDB();

      const status = getDatabaseStatus();
      expect(status.isConnected).toBe(false);
      expect(status.readyState).toBe(0);
      expect(status.statusName).toBe("disconnected");
    });

    it("should reconnect after disconnection", async () => {
      await connectDB(mongoUri);
      await disconnectDB();

      // Reconnect
      await connectDB(mongoUri);
      expect(getDatabaseStatus().isConnected).toBe(true);
    });

    it("should invalidate cache when connection is disconnected", async () => {
      await connectDB(mongoUri);
      expect(getDatabaseStatus().isConnected).toBe(true);

      // Disconnect mongoose
      await mongoose.disconnect();
      expect(mongoose.connection.readyState).toBe(0);

      const connectSpy = vi.spyOn(mongoose, "connect");
      // The next connectDB should re-attempt connection rather than returning a stale cache
      await connectDB(mongoUri);
      expect(connectSpy).toHaveBeenCalledTimes(1);
      expect(getDatabaseStatus().isConnected).toBe(true);
    });
  });
});
