// Test script to verify recurring task database operations
const { LocalDataManager } = require('./electron/localDataBridge.js');

async function testRecurringTasks() {
    try {
        console.log('Testing recurring task database operations...');
        
        // Initialize the data manager
        const dataManager = new LocalDataManager();
        
        // Test user ID
        const userId = 'test-user-' + Date.now();
        
        // 1. Create a recurring task template
        const recurringTemplate = {
            user_id: userId,
            task_title: 'Morning Exercise',
            task_time: '07:00',
            weekdays: [1, 2, 3, 4, 5], // Monday to Friday
            is_active: true
        };
        
        console.log('\n1. Creating recurring task template...');
        const savedTemplate = dataManager.saveRecurringTask(recurringTemplate);
        console.log('Created recurring template:', savedTemplate);
        
        // 2. Get recurring task templates
        console.log('\n2. Retrieving recurring task templates...');
        const templates = dataManager.getRecurringTasks(userId);
        console.log('Found templates:', templates);
        
        // 3. Generate recurring tasks for today
        console.log('\n3. Generating recurring tasks for today...');
        const generationResult = dataManager.generateRecurringTasks(userId);
        console.log('Generation result:', generationResult);
        
        // 4. Test updating recurring template
        console.log('\n4. Testing template update...');
        const updateResult = dataManager.updateRecurringTask(savedTemplate.id, {
            task_time: '08:00',
            weekdays: [1, 2, 3] // Monday, Tuesday, Wednesday only
        });
        console.log('Update result:', updateResult);
        
        // 5. Test disabling recurring template
        console.log('\n5. Testing template disable...');
        const disableResult = dataManager.updateRecurringTask(savedTemplate.id, {
            is_active: false
        });
        console.log('Disable result:', disableResult);
        
        // 6. Verify templates after disable
        console.log('\n6. Checking templates after disable...');
        const templatesAfterDisable = dataManager.getRecurringTasks(userId);
        console.log('Active templates (should be empty):', templatesAfterDisable);
        
        // 7. Test regular task creation with recurring_id
        console.log('\n7. Testing regular task with recurring reference...');
        const regularTask = {
            user_id: userId,
            title: 'Generated Morning Exercise',
            task_date: '2025-06-12',
            task_time: '07:00',
            completed: false,
            failed: false,
            recurring_id: savedTemplate.id
        };
        
        const savedRegularTask = dataManager.saveTask(regularTask);
        console.log('Created task with recurring_id:', savedRegularTask);
        
        // 8. Test recurring task completion handling
        console.log('\n8. Testing recurring task completion handling...');
        const completionResult = dataManager.handleRecurringTaskCompletion(savedRegularTask.id);
        console.log('Completion handling result:', completionResult);
        
        console.log('\n🎉 All tests completed successfully!');
        
    } catch (error) {
        console.error('❌ Test failed:', error);
        console.error('Stack:', error.stack);
    }
}

testRecurringTasks();
