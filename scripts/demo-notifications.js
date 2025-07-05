#!/usr/bin/env node

/**
 * Demo script for notification system
 * This script demonstrates how to send notifications programmatically
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const notificationManager = require('../services/NotificationManager');

async function demoNotifications() {
    console.log('🎭 CronBak Notification System Demo\n');
    
    try {
        // Demo message for backup start
        const backupStartMessage = {
            title: '备份任务开始',
            task_id: 1,
            task_name: '生产数据库备份',
            task_type: 'mysql_to_mysql',
            trigger_type: 'backup_start',
            timestamp: new Date().toISOString()
        };

        console.log('📧 Demo: Backup Start Notification');
        console.log('Message:', JSON.stringify(backupStartMessage, null, 2));
        console.log('');

        // Demo message for backup success
        const backupSuccessMessage = {
            title: '备份任务成功',
            task_id: 1,
            task_name: '生产数据库备份',
            task_type: 'mysql_to_mysql',
            trigger_type: 'backup_success',
            status: 'success',
            duration: 45000, // 45 seconds
            bytes_transferred: 2048000, // 2MB
            files_transferred: 15,
            timestamp: new Date().toISOString()
        };

        console.log('📧 Demo: Backup Success Notification');
        console.log('Message:', JSON.stringify(backupSuccessMessage, null, 2));
        console.log('');

        // Demo message for backup failure
        const backupFailureMessage = {
            title: '备份任务失败',
            task_id: 1,
            task_name: '生产数据库备份',
            task_type: 'mysql_to_mysql',
            trigger_type: 'backup_failure',
            status: 'failed',
            duration: 5000, // 5 seconds
            error_details: 'Connection timeout: Unable to connect to source database',
            timestamp: new Date().toISOString()
        };

        console.log('📧 Demo: Backup Failure Notification');
        console.log('Message:', JSON.stringify(backupFailureMessage, null, 2));
        console.log('');

        // Demo different notification formats
        console.log('🎨 Demo: Different Notification Formats\n');

        // WeChat Work format
        const WeChatWorkService = require('../services/notifications/WeChatWorkService');
        const wechatService = new WeChatWorkService();
        const wechatFormatted = wechatService.formatMessage(backupSuccessMessage);
        const wechatPayload = wechatService.buildPayload(wechatFormatted, {});
        
        console.log('📱 WeChat Work Format:');
        console.log(JSON.stringify(wechatPayload, null, 2));
        console.log('');

        // DingTalk format
        const DingTalkService = require('../services/notifications/DingTalkService');
        const dingtalkService = new DingTalkService();
        const dingtalkFormatted = dingtalkService.formatMessage(backupSuccessMessage);
        const dingtalkPayload = dingtalkService.buildPayload(dingtalkFormatted, {});
        
        console.log('🔔 DingTalk Format:');
        console.log(JSON.stringify(dingtalkPayload, null, 2));
        console.log('');

        // Webhook format
        const WebhookService = require('../services/notifications/WebhookService');
        const webhookService = new WebhookService();
        const webhookFormatted = webhookService.formatMessage(backupSuccessMessage);
        const webhookPayload = webhookService.buildPayload(webhookFormatted, {});
        
        console.log('🔗 Webhook Format:');
        console.log(JSON.stringify(webhookPayload, null, 2));
        console.log('');

        // Synology Chat format
        const SynologyChatService = require('../services/notifications/SynologyChatService');
        const synologyService = new SynologyChatService();
        const synologyFormatted = synologyService.formatMessage(backupSuccessMessage);
        const synologyPayload = synologyService.buildPayload(synologyFormatted, {});
        
        console.log('💬 Synology Chat Format:');
        console.log(JSON.stringify(synologyPayload, null, 2));
        console.log('');

        // Demo configuration examples
        console.log('⚙️  Demo: Configuration Examples\n');

        const configExamples = {
            wechat_work: {
                webhook_url: 'https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=YOUR_KEY',
                secret: 'optional_secret_key'
            },
            dingtalk: {
                webhook_url: 'https://oapi.dingtalk.com/robot/send?access_token=YOUR_TOKEN',
                secret: 'optional_sign_secret'
            },
            webhook: {
                url: 'https://your-webhook-url.com/notify',
                method: 'POST',
                auth_type: 'bearer',
                auth_config: {
                    token: 'your-bearer-token'
                },
                headers: {
                    'Content-Type': 'application/json',
                    'X-Custom-Header': 'custom-value'
                }
            },
            synology_chat: {
                webhook_url: 'https://your-synology.com:5001/webapi/entry.cgi/SYNO.Chat.External/chatbot/YOUR_TOKEN',
                token: 'optional_access_token'
            }
        };

        Object.entries(configExamples).forEach(([type, config]) => {
            console.log(`📋 ${type.toUpperCase()} Configuration:`);
            console.log(JSON.stringify(config, null, 2));
            console.log('');
        });

        // Demo validation
        console.log('✅ Demo: Configuration Validation\n');

        Object.entries(configExamples).forEach(([type, config]) => {
            let service;
            switch (type) {
                case 'wechat_work':
                    service = new WeChatWorkService();
                    break;
                case 'dingtalk':
                    service = new DingTalkService();
                    break;
                case 'webhook':
                    service = new WebhookService();
                    break;
                case 'synology_chat':
                    service = new SynologyChatService();
                    break;
            }

            if (service) {
                const validation = service.validateConfig(config);
                console.log(`🔍 ${type.toUpperCase()} Validation:`, validation);
            }
        });

        console.log('\n🎉 Demo completed successfully!');
        console.log('\n📋 Next Steps:');
        console.log('1. Run: npm run migrate:notifications');
        console.log('2. Start: npm run start:full');
        console.log('3. Login with admin/admin123');
        console.log('4. Configure notification modules in the web interface');
        console.log('5. Test notifications with real webhook URLs');

    } catch (error) {
        console.error('❌ Demo failed:', error);
        process.exit(1);
    }
}

// Run demo if this script is executed directly
if (require.main === module) {
    demoNotifications().catch(error => {
        console.error('❌ Demo script failed:', error);
        process.exit(1);
    });
}

module.exports = { demoNotifications };
