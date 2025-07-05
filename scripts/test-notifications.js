#!/usr/bin/env node

/**
 * Test script for notification system
 * This script tests the notification functionality
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const notificationManager = require('../services/NotificationManager');

async function testNotifications() {
    console.log('🧪 Testing notification system...');
    
    try {
        // Test message
        const testMessage = {
            title: '测试通知',
            task_id: 1,
            task_name: '测试备份任务',
            task_type: 'mysql_to_mysql',
            trigger_type: 'test',
            status: 'success',
            duration: 5000,
            bytes_transferred: 1024000,
            files_transferred: 10,
            timestamp: new Date().toISOString()
        };

        console.log('📧 Test message:', testMessage);

        // Test WeChat Work notification
        console.log('\n🔧 Testing WeChat Work notification...');
        try {
            const wechatConfig = {
                webhook_url: 'https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=test'
            };
            
            const wechatResult = await notificationManager.testNotification('wechat_work', wechatConfig);
            console.log('WeChat Work result:', wechatResult);
        } catch (error) {
            console.log('WeChat Work test failed (expected):', error.message);
        }

        // Test DingTalk notification
        console.log('\n🔧 Testing DingTalk notification...');
        try {
            const dingtalkConfig = {
                webhook_url: 'https://oapi.dingtalk.com/robot/send?access_token=test'
            };
            
            const dingtalkResult = await notificationManager.testNotification('dingtalk', dingtalkConfig);
            console.log('DingTalk result:', dingtalkResult);
        } catch (error) {
            console.log('DingTalk test failed (expected):', error.message);
        }

        // Test Webhook notification
        console.log('\n🔧 Testing Webhook notification...');
        try {
            const webhookConfig = {
                url: 'https://httpbin.org/post',
                method: 'POST'
            };
            
            const webhookResult = await notificationManager.testNotification('webhook', webhookConfig);
            console.log('Webhook result:', webhookResult);
        } catch (error) {
            console.log('Webhook test failed:', error.message);
        }

        // Test Synology Chat notification
        console.log('\n🔧 Testing Synology Chat notification...');
        try {
            const synologyConfig = {
                webhook_url: 'https://httpbin.org/post'
            };
            
            const synologyResult = await notificationManager.testNotification('synology_chat', synologyConfig);
            console.log('Synology Chat result:', synologyResult);
        } catch (error) {
            console.log('Synology Chat test failed:', error.message);
        }

        console.log('\n✅ Notification system test completed!');
        console.log('\n📋 Notes:');
        console.log('- Some tests may fail due to invalid URLs (this is expected)');
        console.log('- The httpbin.org tests should succeed if internet connection is available');
        console.log('- Real webhook URLs need to be configured for actual notifications');

    } catch (error) {
        console.error('❌ Test failed:', error);
        process.exit(1);
    }
}

// Test configuration validation
async function testConfigValidation() {
    console.log('\n🔍 Testing configuration validation...');

    const WeChatWorkService = require('../services/notifications/WeChatWorkService');
    const DingTalkService = require('../services/notifications/DingTalkService');
    const WebhookService = require('../services/notifications/WebhookService');
    const SynologyChatService = require('../services/notifications/SynologyChatService');

    // Test WeChat Work validation
    console.log('\n📋 Testing WeChat Work validation...');
    const wechatService = new WeChatWorkService();
    
    const validWeChatConfig = {
        webhook_url: 'https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=test'
    };
    const wechatValidation = wechatService.validateConfig(validWeChatConfig);
    console.log('Valid WeChat config:', wechatValidation);

    const invalidWeChatConfig = {
        webhook_url: 'invalid-url'
    };
    const wechatInvalidValidation = wechatService.validateConfig(invalidWeChatConfig);
    console.log('Invalid WeChat config:', wechatInvalidValidation);

    // Test DingTalk validation
    console.log('\n📋 Testing DingTalk validation...');
    const dingtalkService = new DingTalkService();
    
    const validDingTalkConfig = {
        webhook_url: 'https://oapi.dingtalk.com/robot/send?access_token=test'
    };
    const dingtalkValidation = dingtalkService.validateConfig(validDingTalkConfig);
    console.log('Valid DingTalk config:', dingtalkValidation);

    // Test Webhook validation
    console.log('\n📋 Testing Webhook validation...');
    const webhookService = new WebhookService();
    
    const validWebhookConfig = {
        url: 'https://example.com/webhook',
        method: 'POST',
        auth_type: 'bearer',
        auth_config: {
            token: 'test-token'
        }
    };
    const webhookValidation = webhookService.validateConfig(validWebhookConfig);
    console.log('Valid Webhook config:', webhookValidation);

    const invalidWebhookConfig = {
        url: 'invalid-url',
        method: 'INVALID'
    };
    const webhookInvalidValidation = webhookService.validateConfig(invalidWebhookConfig);
    console.log('Invalid Webhook config:', webhookInvalidValidation);

    // Test Synology Chat validation
    console.log('\n📋 Testing Synology Chat validation...');
    const synologyService = new SynologyChatService();
    
    const validSynologyConfig = {
        webhook_url: 'https://synology.example.com:5001/webapi/entry.cgi/SYNO.Chat.External/chatbot/token'
    };
    const synologyValidation = synologyService.validateConfig(validSynologyConfig);
    console.log('Valid Synology config:', synologyValidation);

    console.log('\n✅ Configuration validation test completed!');
}

// Test message formatting
async function testMessageFormatting() {
    console.log('\n🎨 Testing message formatting...');

    const WeChatWorkService = require('../services/notifications/WeChatWorkService');
    const wechatService = new WeChatWorkService();

    const testMessage = {
        title: '备份任务测试',
        task_id: 1,
        task_name: '数据库备份',
        task_type: 'mysql_to_mysql',
        trigger_type: 'backup_success',
        status: 'success',
        duration: 30000,
        bytes_transferred: 1048576,
        files_transferred: 5,
        timestamp: new Date().toISOString()
    };

    const formatted = wechatService.formatMessage(testMessage);
    console.log('Formatted message:', formatted);

    const payload = wechatService.buildPayload(formatted, {});
    console.log('WeChat payload:', JSON.stringify(payload, null, 2));

    console.log('\n✅ Message formatting test completed!');
}

// Run all tests
async function runAllTests() {
    console.log('🚀 Starting comprehensive notification system tests...\n');
    
    try {
        await testConfigValidation();
        await testMessageFormatting();
        await testNotifications();
        
        console.log('\n🎉 All tests completed successfully!');
        console.log('\n📝 Next steps:');
        console.log('1. Run the migration: npm run migrate:notifications');
        console.log('2. Start the service: npm start');
        console.log('3. Configure notification modules in the web interface');
        console.log('4. Test with real webhook URLs');
        
    } catch (error) {
        console.error('❌ Test suite failed:', error);
        process.exit(1);
    }
}

// Run tests if this script is executed directly
if (require.main === module) {
    runAllTests().catch(error => {
        console.error('❌ Test script failed:', error);
        process.exit(1);
    });
}

module.exports = {
    testNotifications,
    testConfigValidation,
    testMessageFormatting,
    runAllTests
};
