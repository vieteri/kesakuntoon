import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the generated server code BEFORE importing the actual code
vi.mock("./_generated/server", () => ({
  mutation: (args: any) => args,
  query: (args: any) => args,
}));

// Mock auth validation
vi.mock("./auth", () => ({
  validateTelegramWebAppData: vi.fn(),
}));

import { logWorkout, getMyStats, getGlobalStats, getLeaderboard, getGoalsProgress } from "./workouts";
import { validateTelegramWebAppData } from "./auth";

// Mock Convex context
const mockDb = {
  query: vi.fn(() => mockDb), // Chainable for .withIndex()
  withIndex: vi.fn(() => mockDb), // Chainable for .first() or .collect()
  first: vi.fn(),
  collect: vi.fn(),
  insert: vi.fn(),
  replace: vi.fn(),
  patch: vi.fn(),
};

const mockCtx = {
  db: mockDb,
};

describe("Workout Backend Logic (Unit Tests)", () => {
  beforeEach(() => {
    // Reset all mocks fully (clears calls + restores default implementations)
    vi.resetAllMocks();
    // Re-establish the default chainable mock after reset
    mockDb.query.mockReturnValue(mockDb);
    mockDb.withIndex.mockReturnValue(mockDb);
  });

  describe("logWorkout", () => {
    beforeEach(() => {
      // Mock BOT_TOKEN
      process.env.BOT_TOKEN = "123:mock";

      // Mock validation success
      (validateTelegramWebAppData as any).mockResolvedValue({
        user: {
          id: 12345,
          first_name: "Test User",
          username: "testuser",
        }
      });
    });

    it("should create a new user if not exists", async () => {
      // Mock: No existing user found
      mockDb.first.mockResolvedValue(null);
      mockDb.insert.mockResolvedValue("new_user_id");

      const args = {
        initData: "valid_init_data",
        type: "pushup",
        count: 10,
        date: "2023-10-27",
      };

      await (logWorkout as any).handler(mockCtx, args);

      // Verify user created
      expect(mockDb.insert).toHaveBeenCalledWith("users", expect.objectContaining({
        telegramId: 12345,
        firstName: "Test User",
      }));

      // Verify workout logged
      expect(mockDb.insert).toHaveBeenCalledWith("workouts", expect.objectContaining({
        userId: "new_user_id",
        type: "pushup",
        count: 10,
      }));
    });

    it("should use existing user if found", async () => {
      // Mock: Existing user found
      mockDb.first.mockResolvedValue({ _id: "existing_user_id" });

      const args = {
        initData: "valid_init_data",
        type: "squat",
        count: 20,
        date: "2023-10-27",
      };

      await (logWorkout as any).handler(mockCtx, args);

      // Verify user NOT created (only 1 insert for workout)
      expect(mockDb.insert).toHaveBeenCalledTimes(1);

      // Verify workout logged with existing ID
      expect(mockDb.insert).toHaveBeenCalledWith("workouts", expect.objectContaining({
        userId: "existing_user_id",
        type: "squat",
        count: 20,
      }));
    });

    it("should store chatId on workout and upsert groupMembers when chatId is provided", async () => {
      // No existing user, no existing membership
      mockDb.first.mockResolvedValue(null);
      mockDb.insert.mockResolvedValue("new_user_id");

      const args = {
        initData: "valid_init_data",
        type: "pushup",
        count: 15,
        date: "2023-10-27",
        chatId: -100123456789,
      };

      await (logWorkout as any).handler(mockCtx, args);

      // Should insert a groupMembers row
      expect(mockDb.insert).toHaveBeenCalledWith("groupMembers", expect.objectContaining({
        chatId: -100123456789,
        userId: "new_user_id",
      }));

      // Workout row should contain chatId
      expect(mockDb.insert).toHaveBeenCalledWith("workouts", expect.objectContaining({
        chatId: -100123456789,
        type: "pushup",
        count: 15,
      }));
    });

    it("should not insert groupMembers row when chatId is not provided (solo mode)", async () => {
      mockDb.first.mockResolvedValue({ _id: "existing_user_id" });

      const args = {
        initData: "valid_init_data",
        type: "situp",
        count: 30,
        date: "2023-10-27",
        // no chatId
      };

      await (logWorkout as any).handler(mockCtx, args);

      // groupMembers should NOT be touched
      expect(mockDb.insert).not.toHaveBeenCalledWith("groupMembers", expect.anything());

      // Workout row should NOT have chatId
      expect(mockDb.insert).toHaveBeenCalledWith("workouts", expect.not.objectContaining({
        chatId: expect.anything(),
      }));
    });

    it("should not insert duplicate groupMembers row if membership already exists", async () => {
      // Existing user
      mockDb.first
        .mockResolvedValueOnce({ _id: "existing_user_id", firstName: "Test", username: "test" }) // user lookup
        .mockResolvedValueOnce({ _id: "membership_id", chatId: -999, userId: "existing_user_id" }); // membership exists

      const args = {
        initData: "valid_init_data",
        type: "squat",
        count: 10,
        chatId: -999,
      };

      await (logWorkout as any).handler(mockCtx, args);

      // groupMembers insert should NOT be called (membership already exists)
      expect(mockDb.insert).not.toHaveBeenCalledWith("groupMembers", expect.anything());
      // But workout should still be inserted
      expect(mockDb.insert).toHaveBeenCalledWith("workouts", expect.objectContaining({ chatId: -999 }));
    });
  });

  describe("getLeaderboard", () => {
    it("should filter workouts by chatId using by_chat_date index", async () => {
      const mockWorkouts = [
        { userId: "user_1", type: "pushup", count: 20 },
        { userId: "user_2", type: "squat", count: 40 },
      ];
      // First collect() call returns workouts; second (users) returns user list
      mockDb.collect
        .mockResolvedValueOnce(mockWorkouts)
        .mockResolvedValueOnce([
          { _id: "user_1", firstName: "Alice", telegramId: 1 },
          { _id: "user_2", firstName: "Bob", telegramId: 2 },
        ]);

      const board = await (getLeaderboard as any).handler(mockCtx, { chatId: -100999 });

      // withIndex should have been called with by_chat_date
      expect(mockDb.withIndex).toHaveBeenCalledWith("by_chat_date", expect.any(Function));
      expect(board.length).toBe(2);
      expect(board.find((u: any) => u.name === "Alice")?.pushup).toBe(20);
    });
  });

  describe("getGoalsProgress", () => {
    it("should filter workouts by chatId using by_chat_date index", async () => {
      const mockWorkouts = [
        { userId: "user_1", type: "pushup", count: 30 },
      ];
      mockDb.collect
        .mockResolvedValueOnce(mockWorkouts)
        .mockResolvedValueOnce([
          { _id: "user_1", firstName: "Alice", telegramId: 1, targetPushup: 50, targetSquat: 50, targetSitup: 50 },
        ]);

      const progress = await (getGoalsProgress as any).handler(mockCtx, { chatId: -100999 });

      expect(mockDb.withIndex).toHaveBeenCalledWith("by_chat_date", expect.any(Function));
      expect(progress.length).toBe(1);
      expect(progress[0].pushup).toBe(30);
    });
  });

  describe("getMyStats", () => {
    it("should return zeros if user not found", async () => {
      mockDb.first.mockResolvedValue(null);

      const stats = await (getMyStats as any).handler(mockCtx, { telegramId: 999 });

      expect(stats).toEqual({ pushup: 0, squat: 0, situp: 0 });
    });

    it("should aggregate workouts correctly", async () => {
      // Mock user found
      mockDb.first.mockResolvedValue({ _id: "user_123" });

      // Mock workouts found
      const mockWorkouts = [
        { type: "pushup", count: 10 },
        { type: "pushup", count: 5 },
        { type: "squat", count: 20 },
      ];
      mockDb.collect.mockResolvedValue(mockWorkouts);

      const stats = await (getMyStats as any).handler(mockCtx, { telegramId: 12345 });

      expect(stats).toEqual({
        pushup: 15,
        squat: 20,
        situp: 0,
      });
    });
  });

  describe("getGlobalStats", () => {
    it("should sum all workout counts", async () => {
      const mockAllWorkouts = [
        { count: 10 },
        { count: 20 },
        { count: 30 },
      ];
      mockDb.collect.mockResolvedValue(mockAllWorkouts);
      const stats = await (getGlobalStats as any).handler(mockCtx, {});
      expect(stats).toEqual({ totalCount: 60 });
    });
  });

  describe("Validation & Security", () => {
    it("should reject if BOT_TOKEN is missing", async () => {
      delete process.env.BOT_TOKEN;
      const args = {
        initData: "valid_init_data",
        type: "pushup",
        count: 10,
      };
      await expect((logWorkout as any).handler(mockCtx, args)).rejects.toThrow("BOT_TOKEN missing");
      process.env.BOT_TOKEN = "mock"; // Restore
    });

    it("should reject invalid initData", async () => {
      (validateTelegramWebAppData as any).mockResolvedValue(null);
      const args = {
        initData: "invalid_data",
        type: "pushup",
        count: 10,
      };
      await expect((logWorkout as any).handler(mockCtx, args)).rejects.toThrow("Invalid or expired Telegram data");
    });

    it("should reject invalid workout types", async () => {
      // Mock validation success
      (validateTelegramWebAppData as any).mockResolvedValue({
        user: { id: 12345, first_name: "Test" }
      });

      const args = {
        initData: "valid",
        type: "burpee", // Invalid type
        count: 10,
      };
      await expect((logWorkout as any).handler(mockCtx, args)).rejects.toThrow("Invalid workout type");
    });

    it("should reject non-positive counts", async () => {
      (validateTelegramWebAppData as any).mockResolvedValue({
        user: { id: 12345, first_name: "Test" }
      });

      const args = {
        initData: "valid",
        type: "pushup",
        count: -5, // Invalid count
      };
      await expect((logWorkout as any).handler(mockCtx, args)).rejects.toThrow("Count must be greater than 0");
    });
  });

  describe("User Updates", () => {
    it("should update user details if changed", async () => {
      // Mock: Existing user found with OLD details
      mockDb.first.mockResolvedValue({
        _id: "existing_user_id",
        firstName: "Old Name",
        username: "olduser"
      });

      // Mock new user data from initData
      (validateTelegramWebAppData as any).mockResolvedValue({
        user: {
          id: 12345,
          first_name: "New Name",
          username: "newuser",
        }
      });

      const args = {
        initData: "valid_new_data",
        type: "pushup",
        count: 10,
      };

      await (logWorkout as any).handler(mockCtx, args);

      // Verify user update was called
      expect(mockDb.patch).toHaveBeenCalledWith("existing_user_id", {
        firstName: "New Name",
        username: "newuser",
      });
    });
  });
});
