# 通知系统功能说明

## 概述

cron-bak备份服务现已支持完整的通知系统，包括多种通知渠道、用户权限管理和灵活的配置选项。

## 新增功能

### 1. 默认管理员配置
- 默认管理员密码已更改为 `admin123`
- 管理员用户自动设置为超级管理员角色
- 支持安全的密码哈希存储

### 2. 用户角色系统
- **普通用户 (user)**: 只能管理自己的备份任务和通知偏好
- **管理员 (admin)**: 具有管理权限
- **超级管理员 (super_admin)**: 具有最高权限，可以管理通知模块

### 3. 通知模块支持
支持以下通知渠道：

#### 企业微信 (WeChat Work)
- 支持群机器人Webhook
- 支持Markdown格式消息
- 可选密钥验证

#### 钉钉 (DingTalk)
- 支持群机器人Webhook
- 支持加签验证
- 支持Markdown格式消息

#### 自定义Webhook
- 支持HTTP/HTTPS请求
- 支持多种认证方式（Basic、Bearer、API Key）
- 支持自定义请求头
- 支持自定义消息格式

#### Synology Chat
- 支持频道Webhook
- 支持富文本格式
- 支持附件和字段显示

### 4. 通知触发器
- **备份开始 (backup_start)**: 备份任务开始执行时
- **备份成功 (backup_success)**: 备份任务成功完成时
- **备份失败 (backup_failure)**: 备份任务执行失败时

### 5. 权限管理
- 超级管理员可以启用/禁用通知模块
- 超级管理员可以配置全局通知设置
- 普通用户只能配置自己的通知偏好
- 用户只能使用已启用的通知模块

## 安装和配置

### 1. 安装依赖
```bash
npm install
```

### 2. 运行通知系统迁移
```bash
npm run migrate:notifications
```

### 3. 启动服务
```bash
npm start
```

### 4. 访问管理界面
- 访问 http://localhost:3000
- 使用管理员账户登录：
  - 用户名: `admin`
  - 密码: `admin123`

## 使用指南

### 超级管理员操作

1. **启用通知模块**
   - 进入"通知管理" → "通知模块"标签页
   - 点击"启用"按钮启用需要的通知模块
   - 配置全局设置（可选）

2. **配置全局设置**
   - 点击"配置"按钮设置模块的全局配置
   - 全局配置会作为所有用户的默认配置

### 普通用户操作

1. **配置通知偏好**
   - 进入"通知管理" → "通知偏好"标签页
   - 启用需要的通知模块
   - 选择通知触发器
   - 配置个人通知设置

2. **测试通知**
   - 点击"测试"按钮发送测试通知
   - 验证配置是否正确

### 通知配置示例

#### 企业微信配置
```json
{
  "webhook_url": "https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=YOUR_KEY",
  "secret": "可选的密钥"
}
```

#### 钉钉配置
```json
{
  "webhook_url": "https://oapi.dingtalk.com/robot/send?access_token=YOUR_TOKEN",
  "secret": "可选的加签密钥"
}
```

#### 自定义Webhook配置
```json
{
  "url": "https://your-webhook-url.com/notify",
  "method": "POST",
  "auth_type": "bearer",
  "auth_config": {
    "token": "your-bearer-token"
  },
  "headers": {
    "Content-Type": "application/json"
  }
}
```

#### Synology Chat配置
```json
{
  "webhook_url": "https://your-synology.com:5001/webapi/entry.cgi/SYNO.Chat.External/chatbot/YOUR_TOKEN",
  "token": "可选的访问令牌"
}
```

## API接口

### 通知模块管理 (超级管理员)
- `GET /api/notifications/modules` - 获取所有通知模块
- `PUT /api/notifications/modules/:id/enabled` - 启用/禁用模块
- `PUT /api/notifications/modules/:id/config` - 更新全局配置

### 用户通知偏好
- `GET /api/notifications/preferences` - 获取用户通知偏好
- `PUT /api/notifications/preferences/:moduleId` - 更新通知偏好
- `POST /api/notifications/test/:moduleType` - 测试通知配置

### 通知日志
- `GET /api/notifications/logs` - 获取用户通知日志
- `GET /api/notifications/logs/all` - 获取所有通知日志 (超级管理员)

## 数据库结构

### 新增表

#### notification_modules
存储通知模块信息
- `id` - 模块ID
- `name` - 模块名称
- `type` - 模块类型
- `display_name` - 显示名称
- `description` - 描述
- `is_enabled` - 是否启用
- `global_config` - 全局配置（加密存储）

#### user_notification_preferences
存储用户通知偏好
- `id` - 偏好ID
- `user_id` - 用户ID
- `module_id` - 模块ID
- `is_enabled` - 是否启用
- `config` - 用户配置（加密存储）
- `triggers` - 触发器列表

#### notification_logs
存储通知发送日志
- `id` - 日志ID
- `user_id` - 用户ID
- `module_id` - 模块ID
- `task_id` - 任务ID
- `trigger_type` - 触发类型
- `status` - 发送状态
- `message` - 消息内容
- `error_details` - 错误详情

### 更新表

#### users
新增字段：
- `role` - 用户角色 (user/admin/super_admin)
- `is_super_admin` - 是否为超级管理员

## 安全特性

1. **加密存储**: 所有敏感配置信息使用AES-256-GCM加密存储
2. **权限隔离**: 用户只能访问自己的通知配置和日志
3. **角色验证**: API接口具有严格的权限验证
4. **配置验证**: 所有通知配置都经过严格验证

## 故障排除

### 常见问题

1. **通知发送失败**
   - 检查网络连接
   - 验证Webhook URL是否正确
   - 检查认证配置是否有效

2. **无法看到通知模块**
   - 确认用户是否为超级管理员
   - 检查模块是否已启用

3. **测试通知失败**
   - 检查配置参数是否正确
   - 查看通知日志获取详细错误信息

### 日志查看
- 应用日志: `./logs/backup_service.log`
- 通知日志: 通过Web界面查看

## 版本信息

- **版本**: 2.1.0
- **更新日期**: 2024年
- **主要变更**: 
  - 添加完整的通知系统
  - 实现用户角色管理
  - 支持多种通知渠道
  - 增强安全性和权限控制
