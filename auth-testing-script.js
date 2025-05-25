/**
 * Automated Testing Script for Hybrid Authentication
 * Run this in the browser console to test basic functionality
 */

// Import the auth functions (adjust path if needed)
// Note: This assumes the functions are available globally or you can import them

class AuthTester {
    constructor() {
        this.results = [];
        this.testCount = 0;
        this.passCount = 0;
    }

    log(message, type = 'info') {
        const timestamp = new Date().toLocaleTimeString();
        const logMessage = `[${timestamp}] ${type.toUpperCase()}: ${message}`;
        console.log(logMessage);

        if (type === 'error') {
            console.error(logMessage);
        }
    }

    async test(name, testFunction) {
        this.testCount++;
        this.log(`Running test: ${name}`, 'info');

        try {
            await testFunction();
            this.passCount++;
            this.results.push({ name, status: 'PASS' });
            this.log(`✅ PASS: ${name}`, 'info');
        } catch (error) {
            this.results.push({ name, status: 'FAIL', error: error.message });
            this.log(`❌ FAIL: ${name} - ${error.message}`, 'error');
        }
    }

    async testConnectionStatus() {
        return this.test('Connection Status Check', async () => {
            if (typeof getConnectionStatus === 'undefined') {
                throw new Error('getConnectionStatus function not available');
            }

            const status = await getConnectionStatus();
            if (!['online', 'offline', 'server-offline'].includes(status)) {
                throw new Error(`Invalid status returned: ${status}`);
            }

            this.log(`Connection status: ${status}`);
        });
    }

    async testUsernameAvailability() {
        return this.test('Username Availability Check', async () => {
            if (typeof checkUsernameAvailability === 'undefined') {
                throw new Error('checkUsernameAvailability function not available');
            }

            // Test with a username that should be available
            const randomUsername = `testuser_${Date.now()}`;
            const result = await checkUsernameAvailability(randomUsername);

            if (!result.hasOwnProperty('available')) {
                throw new Error('Username check result missing "available" property');
            }

            this.log(`Username "${randomUsername}" available: ${result.available}`);
        });
    }

    async testRegistrationValidation() {
        return this.test('Registration Validation', async () => {
            // Test that we can call the registration function
            if (typeof registerUser === 'undefined') {
                throw new Error('registerUser function not available');
            }

            // Don't actually register, just test the function exists and validates input
            try {
                await registerUser('', '', ''); // Should fail validation
                throw new Error('Expected validation error for empty fields');
            } catch (error) {
                if (error.message.includes('valid email') || error.message.includes('Password must be')) {
                    this.log('Registration validation working correctly');
                } else {
                    throw error;
                }
            }
        });
    }

    async testLocalStorageOperations() {
        return this.test('Local Storage Operations', async () => {
            const testUser = {
                id: 'test-user-id',
                username: 'testuser',
                email: 'test@example.com'
            };

            // Test storing user data
            localStorage.setItem('user', JSON.stringify(testUser));

            // Test retrieving user data
            const stored = localStorage.getItem('user');
            if (!stored) {
                throw new Error('Failed to store user data in localStorage');
            }

            const parsed = JSON.parse(stored);
            if (parsed.username !== testUser.username) {
                throw new Error('Retrieved user data does not match stored data');
            }

            // Clean up
            localStorage.removeItem('user');
            this.log('Local storage operations working correctly');
        });
    }

    async testUIElements() {
        return this.test('UI Elements Present', async () => {
            // Check if connection status component exists
            const connectionStatus = document.querySelector('.connection-status');
            if (!connectionStatus) {
                throw new Error('Connection status component not found in DOM');
            }

            // Check if login form exists
            const loginForm = document.querySelector('.login-form');
            if (!loginForm) {
                throw new Error('Login form not found in DOM');
            }

            // Check if username input exists
            const usernameInput = document.querySelector('input[placeholder*="Username"]');
            if (!usernameInput) {
                throw new Error('Username input not found in DOM');
            }

            this.log('All required UI elements found');
        });
    }

    async testDatabaseMethods() {
        return this.test('Database Methods Available', async () => {
            if (typeof window.electronAPI === 'undefined') {
                throw new Error('ElectronAPI not available');
            }

            if (typeof window.electronAPI.db === 'undefined') {
                throw new Error('Database API not available');
            }

            const requiredMethods = [
                'getCurrentUser',
                'storeUserCredentials',
                'getUserCredentials',
                'userNeedsSync',
                'markUserSynced'
            ];

            for (const method of requiredMethods) {
                if (typeof window.electronAPI.db[method] !== 'function') {
                    throw new Error(`Database method ${method} not available`);
                }
            }

            this.log('All required database methods available');
        });
    }

    async runAllTests() {
        this.log('🚀 Starting Hybrid Authentication Tests', 'info');
        this.log('=====================================', 'info');

        await this.testConnectionStatus();
        await this.testUsernameAvailability();
        await this.testRegistrationValidation();
        await this.testLocalStorageOperations();
        await this.testUIElements();
        await this.testDatabaseMethods();

        this.printResults();
    }

    printResults() {
        this.log('=====================================', 'info');
        this.log('🏁 Test Results Summary', 'info');
        this.log('=====================================', 'info');

        this.results.forEach(result => {
            const status = result.status === 'PASS' ? '✅' : '❌';
            this.log(`${status} ${result.name}${result.error ? ` - ${result.error}` : ''}`);
        });

        this.log('=====================================', 'info');
        this.log(`Tests: ${this.testCount} | Passed: ${this.passCount} | Failed: ${this.testCount - this.passCount}`, 'info');

        if (this.passCount === this.testCount) {
            this.log('🎉 All tests passed!', 'info');
        } else {
            this.log(`⚠️  ${this.testCount - this.passCount} test(s) failed`, 'error');
        }
    }
}

// Manual test functions for specific scenarios
const ManualTests = {
    async testOfflineRegistration() {
        console.log('🔧 Manual Test: Offline Registration');
        console.log('1. Disconnect your internet');
        console.log('2. Fill out registration form');
        console.log('3. Submit and verify it works offline');
        console.log('4. Reconnect internet');
        console.log('5. Check if sync conflict modal appears');
    },

    async testUsernameConflict() {
        console.log('🔧 Manual Test: Username Conflict');
        console.log('1. Register user with username "testuser123" online');
        console.log('2. Go offline and register another user with same username');
        console.log('3. Go back online');
        console.log('4. Username conflict modal should appear');
        console.log('5. Enter new username and verify sync works');
    },

    async testConnectionStates() {
        console.log('🔧 Manual Test: Connection States');
        console.log('1. Check connection indicator shows "Online" (green)');
        console.log('2. Disconnect internet - should show "Offline" (orange)');
        console.log('3. Stop backend server - should show "Server Offline" (red)');
        console.log('4. Restart backend - should return to "Online"');
    }
};

// Usage instructions
console.log(`
🧪 Hybrid Authentication Testing Suite
======================================

To run automated tests:
const tester = new AuthTester();
await tester.runAllTests();

To run manual tests:
ManualTests.testOfflineRegistration();
ManualTests.testUsernameConflict();
ManualTests.testConnectionStates();

Individual automated tests:
await tester.testConnectionStatus();
await tester.testUsernameAvailability();
await tester.testUIElements();

Note: Make sure you're on the login page and the backend is running!
`);

// Export for use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { AuthTester, ManualTests };
} else {
    window.AuthTester = AuthTester;
    window.ManualTests = ManualTests;
}
