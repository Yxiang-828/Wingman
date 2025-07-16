// Bring in the real database manager that our app Wingman uses
const { LocalDataManager } = require("../electron/localDataBridge.js");

// Node.js utilities for file operations
const Database = require("better-sqlite3");
const path = require("path");
const fs = require("fs");

// Variables to track our test database
let testDbPath;
let testDataManager;

// Run once before all tests start - set up the test folder
beforeAll(() => {
  // Create a test database in a special test folder
  testDbPath = path.join(__dirname, "../test-data/test-wingman.db");

  // Make sure the test folder exists
  const testDir = path.dirname(testDbPath);
  if (!fs.existsSync(testDir)) {
    fs.mkdirSync(testDir, { recursive: true });
  }
});

// Run before each individual test - give each test a fresh database
beforeEach(() => {
  // Delete any leftover database from previous test
  if (fs.existsSync(testDbPath)) {
    fs.unlinkSync(testDbPath);
  }

  // Create a brand new, empty database for this test
  testDataManager = new LocalDataManager(testDbPath);

  // Make it available to all test functions
  global.testDb = testDataManager;
});

// Run after each test - clean up to prevent memory leaks
afterEach(() => {
  // Close the database connection properly
  if (testDataManager && testDataManager.db) {
    testDataManager.db.close();
  }
});

// Run once after all tests finish - final cleanup
afterAll(() => {
  // Remove the test database file completely
  if (fs.existsSync(testDbPath)) {
    fs.unlinkSync(testDbPath);
  }
});
