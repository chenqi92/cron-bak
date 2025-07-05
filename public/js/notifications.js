// Notification Management System

class NotificationManager {
    constructor() {
        this.modules = [];
        this.preferences = [];
        this.logs = [];
        this.currentUser = null;
    }

    async init() {
        try {
            this.currentUser = app.currentUser;
            
            // Show/hide super admin tabs
            this.updateUIForUserRole();
            
            // Load initial data
            await this.loadModules();
            await this.loadPreferences();
            
            // Render UI
            this.renderPreferences();
            if (this.currentUser && this.currentUser.is_super_admin) {
                this.renderModules();
            }

            // Setup tab event listeners
            this.setupTabListeners();

            console.log('Notification manager initialized');
        } catch (error) {
            console.error('Failed to initialize notification manager:', error);
            app.showError('Failed to load notification settings');
        }
    }

    updateUIForUserRole() {
        const modulesTabItem = document.getElementById('modules-tab-item');
        if (this.currentUser && this.currentUser.is_super_admin) {
            modulesTabItem.style.display = 'block';
        } else {
            modulesTabItem.style.display = 'none';
        }
    }

    setupTabListeners() {
        // Listen for tab changes
        const tabButtons = document.querySelectorAll('#notificationTabs button[data-bs-toggle="tab"]');
        tabButtons.forEach(button => {
            button.addEventListener('shown.bs.tab', (event) => {
                const targetId = event.target.getAttribute('data-bs-target');
                if (targetId === '#notification-logs-pane') {
                    this.loadAndRenderLogs();
                }
            });
        });
    }

    async loadModules() {
        try {
            const response = await api.get('/notifications/modules');
            this.modules = response.data || [];
        } catch (error) {
            console.error('Failed to load notification modules:', error);
            throw error;
        }
    }

    async loadPreferences() {
        try {
            const response = await api.get('/notifications/preferences');
            this.preferences = response.data || [];
        } catch (error) {
            console.error('Failed to load notification preferences:', error);
            throw error;
        }
    }

    async loadLogs() {
        try {
            const response = await api.get('/notifications/logs');
            this.logs = response.data || [];
            this.renderLogs();
        } catch (error) {
            console.error('Failed to load notification logs:', error);
            app.showError('Failed to load notification logs');
        }
    }

    renderPreferences() {
        const container = document.getElementById('notification-preferences-container');
        
        if (this.modules.length === 0) {
            container.innerHTML = `
                <div class="alert alert-info">
                    <i class="fas fa-info-circle me-2"></i>
                    <span data-i18n="notifications.noModules">No notification modules available</span>
                </div>
            `;
            return;
        }

        let html = '<div class="row">';
        
        this.modules.forEach(module => {
            const preference = this.preferences.find(p => p.module_id === module.id) || {
                module_id: module.id,
                is_enabled: false,
                triggers: [],
                has_config: false
            };

            html += `
                <div class="col-lg-6 mb-4">
                    <div class="card">
                        <div class="card-header d-flex justify-content-between align-items-center">
                            <h6 class="mb-0">
                                <i class="fas fa-${this.getModuleIcon(module.type)} me-2"></i>
                                ${module.display_name}
                            </h6>
                            <div class="form-check form-switch">
                                <input class="form-check-input" type="checkbox" 
                                       id="module-${module.id}-enabled" 
                                       ${preference.is_enabled ? 'checked' : ''}
                                       onchange="notificationManager.togglePreference(${module.id}, this.checked)">
                            </div>
                        </div>
                        <div class="card-body">
                            <p class="text-muted small mb-3">${module.description}</p>
                            
                            <!-- Triggers -->
                            <div class="mb-3">
                                <label class="form-label small fw-bold" data-i18n="notifications.triggers">Triggers</label>
                                <div class="d-flex flex-wrap gap-2">
                                    ${this.renderTriggerCheckboxes(module.id, preference.triggers)}
                                </div>
                            </div>
                            
                            <!-- Configuration -->
                            <div class="d-flex gap-2">
                                <button class="btn btn-sm btn-outline-primary" 
                                        onclick="notificationManager.showConfigModal(${module.id})">
                                    <i class="fas fa-cog me-1"></i>
                                    <span data-i18n="notifications.configure">Configure</span>
                                </button>
                                <button class="btn btn-sm btn-outline-secondary" 
                                        onclick="notificationManager.testNotification(${module.id})">
                                    <i class="fas fa-vial me-1"></i>
                                    <span data-i18n="notifications.test">Test</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        });
        
        html += '</div>';
        container.innerHTML = html;
        
        // Apply translations
        if (window.i18n) {
            window.i18n.applyLanguage();
        }
    }

    renderModules() {
        const container = document.getElementById('notification-modules-container');
        
        if (this.modules.length === 0) {
            container.innerHTML = `
                <div class="alert alert-info">
                    <i class="fas fa-info-circle me-2"></i>
                    <span data-i18n="notifications.noModules">No notification modules available</span>
                </div>
            `;
            return;
        }

        let html = `
            <div class="card">
                <div class="card-header">
                    <h6 class="mb-0" data-i18n="notifications.globalSettings">Global Settings</h6>
                </div>
                <div class="card-body">
                    <div class="table-responsive">
                        <table class="table table-hover">
                            <thead>
                                <tr>
                                    <th data-i18n="notifications.modules">Module</th>
                                    <th data-i18n="notifications.moduleStatus">Status</th>
                                    <th data-i18n="nav.actions">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
        `;

        this.modules.forEach(module => {
            html += `
                <tr>
                    <td>
                        <div class="d-flex align-items-center">
                            <i class="fas fa-${this.getModuleIcon(module.type)} me-2"></i>
                            <div>
                                <div class="fw-bold">${module.display_name}</div>
                                <small class="text-muted">${module.description}</small>
                            </div>
                        </div>
                    </td>
                    <td>
                        <span class="badge ${module.is_enabled ? 'bg-success' : 'bg-secondary'}">
                            ${module.is_enabled ? window.i18n.t('notifications.enabled') : window.i18n.t('notifications.disabled')}
                        </span>
                    </td>
                    <td>
                        <div class="btn-group btn-group-sm">
                            <button class="btn btn-outline-${module.is_enabled ? 'danger' : 'success'}" 
                                    onclick="notificationManager.toggleModule(${module.id}, ${!module.is_enabled})">
                                <i class="fas fa-${module.is_enabled ? 'times' : 'check'} me-1"></i>
                                ${module.is_enabled ? window.i18n.t('notifications.disable') : window.i18n.t('notifications.enable')}
                            </button>
                            <button class="btn btn-outline-primary" 
                                    onclick="notificationManager.showGlobalConfigModal(${module.id})">
                                <i class="fas fa-cog me-1"></i>
                                <span data-i18n="notifications.configure">Configure</span>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        });

        html += `
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;

        container.innerHTML = html;
        
        // Apply translations
        if (window.i18n) {
            window.i18n.applyLanguage();
        }
    }

    renderTriggerCheckboxes(moduleId, enabledTriggers) {
        const triggers = [
            { type: 'backup_start', name: window.i18n.t('notifications.triggers.backup_start') },
            { type: 'backup_success', name: window.i18n.t('notifications.triggers.backup_success') },
            { type: 'backup_failure', name: window.i18n.t('notifications.triggers.backup_failure') }
        ];

        return triggers.map(trigger => `
            <div class="form-check form-check-inline">
                <input class="form-check-input" type="checkbox" 
                       id="trigger-${moduleId}-${trigger.type}"
                       value="${trigger.type}"
                       ${enabledTriggers.includes(trigger.type) ? 'checked' : ''}
                       onchange="notificationManager.updateTriggers(${moduleId})">
                <label class="form-check-label small" for="trigger-${moduleId}-${trigger.type}">
                    ${trigger.name}
                </label>
            </div>
        `).join('');
    }

    getModuleIcon(type) {
        const icons = {
            'wechat_work': 'comments',
            'dingtalk': 'bell',
            'webhook': 'link',
            'synology_chat': 'comment-dots'
        };
        return icons[type] || 'bell';
    }

    async togglePreference(moduleId, enabled) {
        try {
            await api.put(`/notifications/preferences/${moduleId}`, {
                is_enabled: enabled
            });
            
            // Update local state
            const preference = this.preferences.find(p => p.module_id === moduleId);
            if (preference) {
                preference.is_enabled = enabled;
            }
            
            app.showSuccess(enabled ? 'Notification enabled' : 'Notification disabled');
        } catch (error) {
            console.error('Failed to toggle preference:', error);
            app.showError('Failed to update notification preference');
            
            // Revert checkbox state
            const checkbox = document.getElementById(`module-${moduleId}-enabled`);
            if (checkbox) {
                checkbox.checked = !enabled;
            }
        }
    }

    async updateTriggers(moduleId) {
        try {
            const triggers = [];
            const checkboxes = document.querySelectorAll(`input[id^="trigger-${moduleId}-"]:checked`);
            checkboxes.forEach(cb => triggers.push(cb.value));
            
            await api.put(`/notifications/preferences/${moduleId}`, {
                triggers: triggers
            });
            
            // Update local state
            const preference = this.preferences.find(p => p.module_id === moduleId);
            if (preference) {
                preference.triggers = triggers;
            }
            
            app.showSuccess('Notification triggers updated');
        } catch (error) {
            console.error('Failed to update triggers:', error);
            app.showError('Failed to update notification triggers');
        }
    }

    async testNotification(moduleId) {
        try {
            const module = this.modules.find(m => m.id === moduleId);
            if (!module) return;
            
            // Get user config for this module
            const preference = this.preferences.find(p => p.module_id === moduleId);
            const config = preference ? preference.config : {};
            
            const response = await api.post(`/notifications/test/${module.type}`, {
                config: config
            });
            
            if (response.success) {
                app.showSuccess(window.i18n.t('notifications.testSuccess'));
            } else {
                app.showError(response.error || window.i18n.t('notifications.testFailed'));
            }
        } catch (error) {
            console.error('Failed to test notification:', error);
            app.showError(window.i18n.t('notifications.testFailed'));
        }
    }

    showConfigModal(moduleId) {
        const module = this.modules.find(m => m.id === moduleId);
        if (!module) return;

        this.currentConfigModule = module;
        this.currentConfigPreference = this.preferences.find(p => p.module_id === moduleId);

        // Set modal title
        const modalTitle = document.querySelector('#notificationConfigModal .modal-title span');
        modalTitle.textContent = `${window.i18n.t('notifications.configure')} - ${module.display_name}`;

        // Generate form fields
        this.renderConfigFields(module);

        // Show modal
        const modal = new bootstrap.Modal(document.getElementById('notificationConfigModal'));
        modal.show();
    }

    showGlobalConfigModal(moduleId) {
        // TODO: Implement global configuration modal
        alert('Global configuration modal not yet implemented');
    }

    async loadAndRenderLogs() {
        try {
            await this.loadLogs();
        } catch (error) {
            console.error('Failed to load notification logs:', error);
        }
    }

    renderLogs() {
        const container = document.getElementById('notification-logs-container');

        if (this.logs.length === 0) {
            container.innerHTML = `
                <div class="alert alert-info">
                    <i class="fas fa-info-circle me-2"></i>
                    <span data-i18n="notifications.noLogs">No notification logs</span>
                </div>
            `;
            return;
        }

        let html = `
            <div class="card">
                <div class="card-header d-flex justify-content-between align-items-center">
                    <h6 class="mb-0" data-i18n="notifications.logs">Notification Logs</h6>
                    <button class="btn btn-sm btn-outline-primary" onclick="notificationManager.loadAndRenderLogs()">
                        <i class="fas fa-sync-alt me-1"></i>
                        <span data-i18n="dashboard.refresh">Refresh</span>
                    </button>
                </div>
                <div class="card-body">
                    <div class="table-responsive">
                        <table class="table table-hover">
                            <thead>
                                <tr>
                                    <th data-i18n="notifications.modules">Module</th>
                                    <th data-i18n="tasks.name">Task</th>
                                    <th data-i18n="notifications.triggers">Trigger</th>
                                    <th data-i18n="tasks.status">Status</th>
                                    <th data-i18n="logs.sentAt">Sent At</th>
                                    <th data-i18n="logs.message">Message</th>
                                </tr>
                            </thead>
                            <tbody>
        `;

        this.logs.forEach(log => {
            const statusClass = log.status === 'sent' ? 'success' : 'danger';
            const statusIcon = log.status === 'sent' ? 'check-circle' : 'times-circle';

            html += `
                <tr>
                    <td>
                        <i class="fas fa-${this.getModuleIcon(log.module_type || 'bell')} me-2"></i>
                        ${log.module_name || 'Unknown'}
                    </td>
                    <td>${log.task_name || '-'}</td>
                    <td>
                        <span class="badge bg-info">
                            ${this.getTriggerDisplayName(log.trigger_type)}
                        </span>
                    </td>
                    <td>
                        <span class="badge bg-${statusClass}">
                            <i class="fas fa-${statusIcon} me-1"></i>
                            ${log.status}
                        </span>
                    </td>
                    <td>${new Date(log.sent_at).toLocaleString()}</td>
                    <td>
                        ${log.message || '-'}
                        ${log.error_details ? `<br><small class="text-danger">${log.error_details}</small>` : ''}
                    </td>
                </tr>
            `;
        });

        html += `
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;

        container.innerHTML = html;

        // Apply translations
        if (window.i18n) {
            window.i18n.applyLanguage();
        }
    }

    getTriggerDisplayName(triggerType) {
        const triggers = {
            'backup_start': window.i18n.t('notifications.triggers.backup_start'),
            'backup_success': window.i18n.t('notifications.triggers.backup_success'),
            'backup_failure': window.i18n.t('notifications.triggers.backup_failure'),
            'test': 'Test'
        };
        return triggers[triggerType] || triggerType;
    }

    renderConfigFields(module) {
        const container = document.getElementById('notification-config-fields');
        const currentConfig = this.currentConfigPreference ? this.currentConfigPreference.config || {} : {};

        let html = `
            <div class="alert alert-info">
                <i class="fas fa-info-circle me-2"></i>
                ${this.getModuleHelpText(module.type)}
            </div>
        `;

        // Generate fields based on module type
        const schema = this.getConfigSchema(module.type);

        Object.entries(schema).forEach(([fieldName, fieldConfig]) => {
            const value = currentConfig[fieldName] || '';
            const required = fieldConfig.required ? 'required' : '';
            const fieldId = `config-${fieldName}`;

            html += `<div class="mb-3">`;
            html += `<label for="${fieldId}" class="form-label">`;
            html += fieldConfig.label;
            if (fieldConfig.required) {
                html += ' <span class="text-danger">*</span>';
            }
            html += `</label>`;

            if (fieldConfig.type === 'select') {
                html += `<select class="form-select" id="${fieldId}" ${required}>`;
                if (!fieldConfig.required) {
                    html += `<option value="">请选择...</option>`;
                }
                fieldConfig.options.forEach(option => {
                    const selected = value === option ? 'selected' : '';
                    html += `<option value="${option}" ${selected}>${option}</option>`;
                });
                html += `</select>`;
            } else if (fieldConfig.type === 'textarea') {
                html += `<textarea class="form-control" id="${fieldId}" rows="3" ${required}>${value}</textarea>`;
            } else {
                const inputType = fieldName.includes('password') || fieldName.includes('secret') || fieldName.includes('token') ? 'password' : 'text';
                html += `<input type="${inputType}" class="form-control" id="${fieldId}" value="${value}" ${required}>`;
            }

            if (fieldConfig.help) {
                html += `<div class="form-text">${fieldConfig.help}</div>`;
            }

            html += `</div>`;
        });

        container.innerHTML = html;
    }

    getConfigSchema(moduleType) {
        const schemas = {
            wechat_work: {
                webhook_url: {
                    type: 'text',
                    required: true,
                    label: window.i18n.t('notifications.config.webhook_url'),
                    help: '企业微信群机器人的Webhook URL'
                },
                secret: {
                    type: 'text',
                    required: false,
                    label: window.i18n.t('notifications.config.secret'),
                    help: '可选的密钥，用于验证消息来源'
                }
            },
            dingtalk: {
                webhook_url: {
                    type: 'text',
                    required: true,
                    label: window.i18n.t('notifications.config.webhook_url'),
                    help: '钉钉群机器人的Webhook URL'
                },
                secret: {
                    type: 'text',
                    required: false,
                    label: window.i18n.t('notifications.config.secret'),
                    help: '可选的加签密钥'
                }
            },
            webhook: {
                url: {
                    type: 'text',
                    required: true,
                    label: window.i18n.t('notifications.config.url'),
                    help: 'HTTP Webhook URL'
                },
                method: {
                    type: 'select',
                    required: true,
                    label: window.i18n.t('notifications.config.method'),
                    options: ['POST', 'PUT'],
                    help: 'HTTP请求方法'
                },
                auth_type: {
                    type: 'select',
                    required: false,
                    label: window.i18n.t('notifications.config.auth_type'),
                    options: ['none', 'basic', 'bearer'],
                    help: '认证类型'
                },
                username: {
                    type: 'text',
                    required: false,
                    label: window.i18n.t('notifications.config.username'),
                    help: 'Basic认证用户名'
                },
                password: {
                    type: 'text',
                    required: false,
                    label: window.i18n.t('notifications.config.password'),
                    help: 'Basic认证密码'
                },
                token: {
                    type: 'text',
                    required: false,
                    label: window.i18n.t('notifications.config.token'),
                    help: 'Bearer令牌'
                }
            },
            synology_chat: {
                webhook_url: {
                    type: 'text',
                    required: true,
                    label: window.i18n.t('notifications.config.webhook_url'),
                    help: 'Synology Chat频道的Webhook URL'
                },
                token: {
                    type: 'text',
                    required: false,
                    label: window.i18n.t('notifications.config.token'),
                    help: '可选的访问令牌'
                }
            }
        };

        return schemas[moduleType] || {};
    }

    getModuleHelpText(moduleType) {
        const helpTexts = {
            wechat_work: window.i18n.t('notifications.help.wechat_work'),
            dingtalk: window.i18n.t('notifications.help.dingtalk'),
            webhook: window.i18n.t('notifications.help.webhook'),
            synology_chat: window.i18n.t('notifications.help.synology_chat')
        };
        return helpTexts[moduleType] || '';
    }

    async saveConfig() {
        if (!this.currentConfigModule) return;

        try {
            const config = this.getConfigFromForm();

            await api.put(`/notifications/preferences/${this.currentConfigModule.id}`, {
                config: config
            });

            // Update local state
            if (this.currentConfigPreference) {
                this.currentConfigPreference.config = config;
            }

            // Close modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('notificationConfigModal'));
            modal.hide();

            app.showSuccess(window.i18n.t('notifications.configSaved'));

            // Refresh preferences display
            this.renderPreferences();
        } catch (error) {
            console.error('Failed to save config:', error);
            app.showError(window.i18n.t('notifications.configFailed'));
        }
    }

    async testCurrentConfig() {
        if (!this.currentConfigModule) return;

        try {
            const config = this.getConfigFromForm();

            const response = await api.post(`/notifications/test/${this.currentConfigModule.type}`, {
                config: config
            });

            if (response.success) {
                app.showSuccess(window.i18n.t('notifications.testSuccess'));
            } else {
                app.showError(response.error || window.i18n.t('notifications.testFailed'));
            }
        } catch (error) {
            console.error('Failed to test notification:', error);
            app.showError(window.i18n.t('notifications.testFailed'));
        }
    }

    getConfigFromForm() {
        const config = {};
        const schema = this.getConfigSchema(this.currentConfigModule.type);

        Object.keys(schema).forEach(fieldName => {
            const field = document.getElementById(`config-${fieldName}`);
            if (field && field.value.trim()) {
                config[fieldName] = field.value.trim();
            }
        });

        // Handle webhook auth config
        if (this.currentConfigModule.type === 'webhook') {
            const authType = config.auth_type;
            if (authType && authType !== 'none') {
                config.auth_config = {};
                if (authType === 'basic' && config.username && config.password) {
                    config.auth_config.username = config.username;
                    config.auth_config.password = config.password;
                    delete config.username;
                    delete config.password;
                } else if (authType === 'bearer' && config.token) {
                    config.auth_config.token = config.token;
                    delete config.token;
                }
            }
        }

        return config;
    }

    async toggleModule(moduleId, enabled) {
        try {
            await api.put(`/notifications/modules/${moduleId}/enabled`, {
                enabled: enabled
            });
            
            // Update local state
            const module = this.modules.find(m => m.id === moduleId);
            if (module) {
                module.is_enabled = enabled;
            }
            
            // Re-render modules
            this.renderModules();
            
            app.showSuccess(`Module ${enabled ? 'enabled' : 'disabled'} successfully`);
        } catch (error) {
            console.error('Failed to toggle module:', error);
            app.showError('Failed to update module status');
        }
    }
}

// Create global instance
window.notificationManager = new NotificationManager();
