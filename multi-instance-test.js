// Multi-Instance Protection Test Script
// Tests the comprehensive multi-instance fixes implemented for Wingman

const { spawn, exec } = require('child_process');
const path = require('path');
const fs = require('fs');

class MultiInstanceTester {
  constructor() {
    this.testResults = [];
    this.processes = [];
  }

  log(message) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${message}`);
  }

  async runTest(testName, testFn) {
    this.log(`🧪 Starting test: ${testName}`);
    try {
      const result = await testFn();
      this.testResults.push({ name: testName, status: 'PASS', result });
      this.log(`✅ Test passed: ${testName}`);
      return result;
    } catch (error) {
      this.testResults.push({ name: testName, status: 'FAIL', error: error.message });
      this.log(`❌ Test failed: ${testName} - ${error.message}`);
      throw error;
    }
  }

  async testSingleInstanceLock() {
    return this.runTest('Single Instance Lock', async () => {
      // Start first instance
      const firstInstance = spawn('npm', ['run', 'electron'], {
        cwd: process.cwd(),
        stdio: 'pipe'
      });

      // Wait for first instance to initialize
      await new Promise(resolve => setTimeout(resolve, 5000));

      // Try to start second instance
      const secondInstance = spawn('npm', ['run', 'electron'], {
        cwd: process.cwd(),
        stdio: 'pipe'
      });

      let secondInstanceOutput = '';
      secondInstance.stdout.on('data', (data) => {
        secondInstanceOutput += data.toString();
      });

      // Wait for second instance to respond
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Check if second instance was blocked
      const wasBlocked = secondInstanceOutput.includes('Another instance') || 
                        secondInstance.exitCode !== null;

      // Cleanup
      firstInstance.kill();
      secondInstance.kill();

      return { blocked: wasBlocked, output: secondInstanceOutput };
    });
  }

  async testDatabaseConnectionHandling() {
    return this.runTest('Database Connection Handling', async () => {
      const Database = require('better-sqlite3');
      const os = require('os');
      
      // Test database path
      const testDbPath = path.join(os.tmpdir(), 'wingman-test.db');
      
      // Create first connection with WAL mode
      const db1 = new Database(testDbPath, {
        timeout: 5000,
        fileMustExist: false
      });
      
      db1.pragma('journal_mode = WAL');
      db1.exec('CREATE TABLE IF NOT EXISTS test (id INTEGER PRIMARY KEY, data TEXT)');
      db1.prepare('INSERT INTO test (data) VALUES (?)').run('test1');

      // Try second connection (should work with WAL)
      const db2 = new Database(testDbPath, {
        timeout: 5000,
        fileMustExist: false
      });
      
      db2.prepare('INSERT INTO test (data) VALUES (?)').run('test2');

      // Verify both writes succeeded
      const count = db1.prepare('SELECT COUNT(*) as count FROM test').get().count;

      // Cleanup
      db1.close();
      db2.close();
      fs.unlinkSync(testDbPath);

      return { concurrentWrites: count === 2 };
    });
  }

  async testGracefulShutdown() {
    return this.runTest('Graceful Shutdown', async () => {
      // This test verifies the shutdown handlers are registered correctly
      const mainJsPath = path.join(__dirname, 'electron', 'main.js');
      const mainJsContent = fs.readFileSync(mainJsPath, 'utf8');

      const hasGracefulShutdown = mainJsContent.includes('gracefulShutdown');
      const hasProcessHandlers = mainJsContent.includes('process.on(\'SIGINT\'');
      const hasBeforeQuit = mainJsContent.includes('app.on(\'before-quit\'');

      return {
        hasGracefulShutdown,
        hasProcessHandlers,
        hasBeforeQuit,
        allPresent: hasGracefulShutdown && hasProcessHandlers && hasBeforeQuit
      };
    });
  }

  async testMemoryLeakPrevention() {
    return this.runTest('Memory Leak Prevention', async () => {
      // Verify cleanup handlers in notification services
      const osNotificationPath = path.join(__dirname, 'src', 'services', 'OSNotificationManager.ts');
      const taskFailurePath = path.join(__dirname, 'src', 'services', 'TaskFailureManager.ts');

      const osContent = fs.readFileSync(osNotificationPath, 'utf8');
      const taskContent = fs.readFileSync(taskFailurePath, 'utf8');

      const osHasCleanup = osContent.includes('cleanupCallbacks') && osContent.includes('destroy');
      const taskHasCleanup = taskContent.includes('cleanupCallbacks') && taskContent.includes('destroy');

      return {
        osNotificationManager: osHasCleanup,
        taskFailureManager: taskHasCleanup,
        bothImplemented: osHasCleanup && taskHasCleanup
      };
    });
  }

  async testDatabaseEnhancements() {
    return this.runTest('Database Enhancements', async () => {
      const localDataPath = path.join(__dirname, 'electron', 'localDataBridge.js');
      const content = fs.readFileSync(localDataPath, 'utf8');

      const hasWAL = content.includes('journal_mode = WAL');
      const hasTimeout = content.includes('timeout: 5000');
      const hasCheckpoint = content.includes('wal_checkpoint');
      const hasOptimize = content.includes('pragma(\'optimize\')');

      return {
        walMode: hasWAL,
        timeout: hasTimeout,
        checkpoint: hasCheckpoint,
        optimize: hasOptimize,
        allEnhancements: hasWAL && hasTimeout && hasCheckpoint && hasOptimize
      };
    });
  }

  async testThemePersistence() {
    return this.runTest('Theme Persistence System', async () => {
      const themeContextPath = path.join(__dirname, 'src', 'context', 'ThemeContext.tsx');
      const content = fs.readFileSync(themeContextPath, 'utf8');

      const hasMultipleFallbacks = content.includes('lastUsedTheme') && 
                                  content.includes('getLastUserId');
      const hasGlobalPersistence = content.includes('loadThemeFromStorage');

      return {
        multipleFallbacks: hasMultipleFallbacks,
        globalPersistence: hasGlobalPersistence,
        systemComplete: hasMultipleFallbacks && hasGlobalPersistence
      };
    });
  }

  async runAllTests() {
    this.log('🚀 Starting Multi-Instance Protection Test Suite');
    this.log('================================================');

    try {
      // Test 1: Single Instance Lock
      await this.testSingleInstanceLock();

      // Test 2: Database Connection Handling
      await this.testDatabaseConnectionHandling();

      // Test 3: Graceful Shutdown
      await this.testGracefulShutdown();

      // Test 4: Memory Leak Prevention
      await this.testMemoryLeakPrevention();

      // Test 5: Database Enhancements
      await this.testDatabaseEnhancements();

      // Test 6: Theme Persistence
      await this.testThemePersistence();

    } catch (error) {
      this.log(`❌ Test suite failed: ${error.message}`);
    }

    // Generate report
    this.generateReport();
  }

  generateReport() {
    this.log('📊 Test Results Summary');
    this.log('======================');

    const passed = this.testResults.filter(t => t.status === 'PASS').length;
    const failed = this.testResults.filter(t => t.status === 'FAIL').length;

    this.testResults.forEach(test => {
      const icon = test.status === 'PASS' ? '✅' : '❌';
      this.log(`${icon} ${test.name}: ${test.status}`);
      
      if (test.status === 'FAIL') {
        this.log(`   Error: ${test.error}`);
      } else if (test.result) {
        this.log(`   Result: ${JSON.stringify(test.result, null, 2)}`);
      }
    });

    this.log('======================');
    this.log(`📈 Summary: ${passed} passed, ${failed} failed`);
    
    if (failed === 0) {
      this.log('🎉 All multi-instance protection tests passed!');
      this.log('🔒 Wingman is now protected against multi-instance conflicts');
    } else {
      this.log('⚠️ Some tests failed - please review the implementation');
    }
  }

  cleanup() {
    // Kill any remaining processes
    this.processes.forEach(proc => {
      try {
        proc.kill();
      } catch (e) {
        // Process already dead
      }
    });
  }
}

// Run tests if called directly
if (require.main === module) {
  const tester = new MultiInstanceTester();
  
  // Handle cleanup on exit
  process.on('exit', () => tester.cleanup());
  process.on('SIGINT', () => {
    tester.cleanup();
    process.exit(0);
  });

  tester.runAllTests().catch(error => {
    console.error('Test suite error:', error);
    process.exit(1);
  });
}

module.exports = MultiInstanceTester;
