// Load the test environment that sets up a fresh in-memory SQLite database before each test
require("./setupDatabaseTests.js");

// Group all related tests under a common description
describe("UNIT TESTS - SQLite Diary Database Operations", () => {
  // Helper function to create test entry data
  const createTestEntry = (overrides = {}) => ({
    user_id: "testuser",
    title: "Test Entry",
    content: "Test content",
    mood: "neutral",
    entry_date: "2025-01-15",
    ...overrides,
  });

  // TESTS FOR saveDiaryEntry() - CREATE NEW

  describe("saveDiaryEntry() - Create Operations", () => {
    test("Should create new diary entry with valid data (normal case)", () => {
      const entry = createTestEntry({
        title: "My First Entry",
        content: "Today was a good day!",
        mood: "happy",
      });

      const result = global.testDb.saveDiaryEntry(entry);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.id).toBeGreaterThan(0);

      // Verify data was actually saved
      const stmt = global.testDb.db.prepare(
        "SELECT * FROM diary_entries WHERE id = ?",
      );
      const savedEntry = stmt.get(result.id);
      expect(savedEntry.title).toBe("My First Entry");
      expect(savedEntry.content).toBe("Today was a good day!");
      expect(savedEntry.mood).toBe("happy");
    });

    test("Should handle missing optional fields (edge case)", () => {
      const entry = {
        user_id: "testuser",
        title: "Minimal Entry",
        content: "Basic content",
        entry_date: "2025-01-16",
        // mood is optional, test without it
      };

      const result = global.testDb.saveDiaryEntry(entry);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.id).toBeGreaterThan(0);

      // Verify data was saved with null mood
      const stmt = global.testDb.db.prepare(
        "SELECT * FROM diary_entries WHERE id = ?",
      );
      const savedEntry = stmt.get(result.id);
      expect(savedEntry.mood).toBeNull();
    });
  });

  // TESTS FOR saveDiaryEntry() - UPDATE

  describe("saveDiaryEntry() - Update Operations", () => {
    test("Should update existing diary entry (normal case)", () => {
      // First create an entry
      const originalEntry = createTestEntry();
      const createResult = global.testDb.saveDiaryEntry(originalEntry);

      // Now update it
      const updatedEntry = {
        ...originalEntry,
        id: createResult.id,
        title: "Updated Title",
        content: "Updated content",
        mood: "excited",
      };

      const updateResult = global.testDb.saveDiaryEntry(updatedEntry);

      expect(updateResult.success).toBe(true);
      expect(updateResult.id).toBe(createResult.id);

      // Verify the update actually worked
      const stmt = global.testDb.db.prepare(
        "SELECT * FROM diary_entries WHERE id = ?",
      );
      const savedEntry = stmt.get(createResult.id);
      expect(savedEntry.title).toBe("Updated Title");
      expect(savedEntry.content).toBe("Updated content");
      expect(savedEntry.mood).toBe("excited");
    });

    test("Should fail to update non-existent entry (edge case)", () => {
      const fakeEntry = createTestEntry({
        id: 99999, // Non-existent ID
        title: "Should Fail",
      });

      const result = global.testDb.saveDiaryEntry(fakeEntry);

      expect(result.success).toBe(false);
    });
  });

  // TESTS FOR getDiaryEntries()

  describe("getDiaryEntries()", () => {
    test("Should retrieve all entries for a user (normal case)", () => {
      // Create multiple entries for the same user
      const userId = "multiuser";
      const entries = [
        createTestEntry({
          user_id: userId,
          title: "Entry 1",
          entry_date: "2025-01-10",
        }),
        createTestEntry({
          user_id: userId,
          title: "Entry 2",
          entry_date: "2025-01-11",
        }),
        createTestEntry({
          user_id: userId,
          title: "Entry 3",
          entry_date: "2025-01-12",
        }),
      ];

      entries.forEach((entry) => {
        const result = global.testDb.saveDiaryEntry(entry);
        expect(result.success).toBe(true);
      });

      const retrievedEntries = global.testDb.getDiaryEntries(userId);

      expect(retrievedEntries).toBeDefined();
      expect(retrievedEntries.length).toBe(3);
      expect(retrievedEntries[0].user_id).toBe(userId);
      // Should be sorted by date DESC
      expect(retrievedEntries[0].entry_date).toBe("2025-01-12");
    });

    test("Should return empty array for user with no entries (edge case)", () => {
      const nonExistentUserId = "noentries";
      const retrievedEntries = global.testDb.getDiaryEntries(nonExistentUserId);

      expect(retrievedEntries).toBeDefined();
      expect(Array.isArray(retrievedEntries)).toBe(true);
      expect(retrievedEntries.length).toBe(0);
    });
  });

  // TESTS FOR getAllDiaryEntries()

  describe("getAllDiaryEntries()", () => {
    test("Should retrieve all entries for a user across all dates (normal case)", () => {
      const userId = "alluser";
      const entries = [
        createTestEntry({
          user_id: userId,
          title: "Jan Entry",
          entry_date: "2025-01-01",
        }),
        createTestEntry({
          user_id: userId,
          title: "Feb Entry",
          entry_date: "2025-02-01",
        }),
        createTestEntry({
          user_id: userId,
          title: "Mar Entry",
          entry_date: "2025-03-01",
        }),
      ];

      entries.forEach((entry) => {
        global.testDb.saveDiaryEntry(entry);
      });

      const allEntries = global.testDb.getAllDiaryEntries(userId);

      expect(allEntries).toBeDefined();
      expect(allEntries.length).toBe(3);
      // Should be sorted by entry_date DESC
      expect(allEntries[0].entry_date).toBe("2025-03-01");
      expect(allEntries[2].entry_date).toBe("2025-01-01");
    });

    test("Should handle user with many entries without performance issues (edge case)", () => {
      const userId = "bulkuser";
      const startTime = Date.now();

      // Create 100 entries
      for (let i = 1; i <= 100; i++) {
        const entry = createTestEntry({
          user_id: userId,
          title: `Bulk Entry ${i}`,
          entry_date: `2025-01-${String((i % 28) + 1).padStart(2, "0")}`,
        });
        global.testDb.saveDiaryEntry(entry);
      }

      const allEntries = global.testDb.getAllDiaryEntries(userId);
      const endTime = Date.now();

      expect(allEntries.length).toBe(100);
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
    });
  });

  // TESTS FOR deleteDiaryEntry()

  describe("deleteDiaryEntry()", () => {
    test("Should delete existing diary entry (normal case)", () => {
      // Create an entry first
      const entry = createTestEntry({ title: "To Be Deleted" });
      const createResult = global.testDb.saveDiaryEntry(entry);

      // Delete it
      const deleteResult = global.testDb.deleteDiaryEntry(createResult.id);

      expect(deleteResult.success).toBe(true);
      expect(deleteResult.deletedId).toBe(createResult.id);

      // Verify it's actually deleted
      const stmt = global.testDb.db.prepare(
        "SELECT * FROM diary_entries WHERE id = ?",
      );
      const deletedEntry = stmt.get(createResult.id);
      expect(deletedEntry).toBeUndefined();
    });

    test("Should fail when trying to delete non-existent entry (edge case)", () => {
      const nonExistentId = 99999;

      expect(() => {
        global.testDb.deleteDiaryEntry(nonExistentId);
      }).toThrow();
    });
  });

  // ADDITIONAL TESTS FOR EDGE CASES

  describe("Edge Cases and Data Validation", () => {
    test("Should handle special characters in content (edge case)", () => {
      const entry = createTestEntry({
        title: "Special Characters Test",
        content: "Content with special chars: !@#$%^&*()[]{}|;':\",./<>?`~",
        mood: "neutral",
      });

      const result = global.testDb.saveDiaryEntry(entry);
      expect(result.success).toBe(true);

      const stmt = global.testDb.db.prepare(
        "SELECT * FROM diary_entries WHERE id = ?",
      );
      const savedEntry = stmt.get(result.id);
      expect(savedEntry.content).toBe(
        "Content with special chars: !@#$%^&*()[]{}|;':\",./<>?`~",
      );
    });

    test("Should handle very long content (edge case)", () => {
      const longContent = "A".repeat(5000); // 5000 character string
      const entry = createTestEntry({
        title: "Long Content Test",
        content: longContent,
      });

      const result = global.testDb.saveDiaryEntry(entry);
      expect(result.success).toBe(true);

      const stmt = global.testDb.db.prepare(
        "SELECT * FROM diary_entries WHERE id = ?",
      );
      const savedEntry = stmt.get(result.id);
      expect(savedEntry.content).toBe(longContent);
      expect(savedEntry.content.length).toBe(5000);
    });
  });

  // INTEGRATION TESTS

  describe("Integration Tests", () => {
    test("Should handle complete CRUD workflow (create, read, update, delete)", () => {
      const userId = "cruduser";

      // CREATE
      const originalEntry = createTestEntry({
        user_id: userId,
        title: "CRUD Test Entry",
        content: "Original content",
      });
      const createResult = global.testDb.saveDiaryEntry(originalEntry);
      expect(createResult.success).toBe(true);

      // READ
      const entries = global.testDb.getDiaryEntries(userId);
      expect(entries.length).toBe(1);
      expect(entries[0].title).toBe("CRUD Test Entry");

      // UPDATE
      const updatedEntry = {
        ...originalEntry,
        id: createResult.id,
        title: "Updated CRUD Entry",
        content: "Updated content",
      };
      const updateResult = global.testDb.saveDiaryEntry(updatedEntry);
      expect(updateResult.success).toBe(true);

      // Verify update
      const updatedEntries = global.testDb.getDiaryEntries(userId);
      expect(updatedEntries[0].title).toBe("Updated CRUD Entry");

      // DELETE
      const deleteResult = global.testDb.deleteDiaryEntry(createResult.id);
      expect(deleteResult.success).toBe(true);

      // Verify deletion
      const finalEntries = global.testDb.getDiaryEntries(userId);
      expect(finalEntries.length).toBe(0);
    });

    test("Should handle multiple users independently (isolation test)", () => {
      const user1 = "user1";
      const user2 = "user2";

      // Create entries for both users
      global.testDb.saveDiaryEntry(
        createTestEntry({ user_id: user1, title: "User 1 Entry" }),
      );
      global.testDb.saveDiaryEntry(
        createTestEntry({ user_id: user2, title: "User 2 Entry" }),
      );

      // Each user should only see their own entries
      const user1Entries = global.testDb.getDiaryEntries(user1);
      const user2Entries = global.testDb.getDiaryEntries(user2);

      expect(user1Entries.length).toBe(1);
      expect(user2Entries.length).toBe(1);
      expect(user1Entries[0].title).toBe("User 1 Entry");
      expect(user2Entries[0].title).toBe("User 2 Entry");
    });
  });
});
