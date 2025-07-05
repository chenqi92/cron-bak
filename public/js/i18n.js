// Internationalization (i18n) System for Backup Service

class I18n {
    constructor() {
        this.currentLanguage = localStorage.getItem('language') || 'zh';
        this.translations = {};
        this.fallbackLanguage = 'en';
    }

    async init() {
        await this.loadTranslations();
        this.applyLanguage();
        this.setupLanguageToggle();
    }

    async loadTranslations() {
        try {
            // Load English translations
            const enResponse = await fetch('/js/translations/en.json');
            this.translations.en = await enResponse.json();

            // Load Chinese translations
            const zhResponse = await fetch('/js/translations/zh.json');
            this.translations.zh = await zhResponse.json();
        } catch (error) {
            console.error('Failed to load translations:', error);
            // Fallback to embedded translations
            this.loadFallbackTranslations();
        }
    }

    loadFallbackTranslations() {
        this.translations = {
            en: {
                nav: {
                    title: "Backup Service",
                    dashboard: "Dashboard",
                    tasks: "Backup Tasks",
                    logs: "Backup Logs",
                    statistics: "Statistics",
                    settings: "Settings",
                    changePassword: "Change Password",
                    logout: "Logout"
                },
                dashboard: {
                    title: "Dashboard",
                    refresh: "Refresh",
                    totalTasks: "Total Tasks",
                    activeTasks: "Active Tasks",
                    runningBackups: "Running Backups",
                    successRate: "Success Rate (30d)",
                    recentLogs: "Recent Backup Logs",
                    nextRuns: "Next Scheduled Runs",
                    noRecentLogs: "No recent backup logs",
                    noScheduledRuns: "No scheduled runs"
                },
                tasks: {
                    title: "Backup Tasks",
                    createTask: "Create Task",
                    name: "Name",
                    type: "Type",
                    schedule: "Schedule",
                    status: "Status",
                    lastRun: "Last Run",
                    nextRun: "Next Run",
                    actions: "Actions",
                    active: "Active",
                    inactive: "Inactive",
                    noTasks: "No backup tasks configured",
                    createFirstTask: "Create Your First Task"
                },
                common: {
                    loading: "Loading...",
                    save: "Save",
                    cancel: "Cancel",
                    delete: "Delete",
                    edit: "Edit",
                    run: "Run",
                    activate: "Activate",
                    deactivate: "Deactivate",
                    yes: "Yes",
                    no: "No",
                    success: "Success",
                    error: "Error",
                    warning: "Warning",
                    info: "Info"
                },
                login: {
                    title: "Login to Backup Service",
                    username: "Username",
                    password: "Password",
                    loginButton: "Login",
                    loginFailed: "Login failed",
                    invalidCredentials: "Invalid credentials"
                },
                theme: {
                    light: "Light Theme",
                    dark: "Dark Theme",
                    toggleTheme: "Toggle Theme"
                },
                language: {
                    english: "English",
                    chinese: "简体中文",
                    toggleLanguage: "Switch Language"
                }
            },
            zh: {
                nav: {
                    title: "备份服务",
                    dashboard: "仪表板",
                    tasks: "备份任务",
                    logs: "备份日志",
                    statistics: "统计信息",
                    settings: "设置",
                    changePassword: "修改密码",
                    logout: "退出登录"
                },
                dashboard: {
                    title: "仪表板",
                    refresh: "刷新",
                    totalTasks: "总任务数",
                    activeTasks: "活跃任务",
                    runningBackups: "运行中备份",
                    successRate: "成功率 (30天)",
                    recentLogs: "最近备份日志",
                    nextRuns: "下次计划运行",
                    noRecentLogs: "暂无最近备份日志",
                    noScheduledRuns: "暂无计划运行"
                },
                tasks: {
                    title: "备份任务",
                    createTask: "创建任务",
                    name: "名称",
                    type: "类型",
                    schedule: "计划",
                    status: "状态",
                    lastRun: "上次运行",
                    nextRun: "下次运行",
                    actions: "操作",
                    active: "活跃",
                    inactive: "非活跃",
                    noTasks: "暂无配置的备份任务",
                    createFirstTask: "创建您的第一个任务"
                },
                common: {
                    loading: "加载中...",
                    save: "保存",
                    cancel: "取消",
                    delete: "删除",
                    edit: "编辑",
                    run: "运行",
                    activate: "激活",
                    deactivate: "停用",
                    yes: "是",
                    no: "否",
                    success: "成功",
                    error: "错误",
                    warning: "警告",
                    info: "信息"
                },
                login: {
                    title: "登录备份服务",
                    username: "用户名",
                    password: "密码",
                    loginButton: "登录",
                    loginFailed: "登录失败",
                    invalidCredentials: "凭据无效"
                },
                theme: {
                    light: "浅色主题",
                    dark: "深色主题",
                    toggleTheme: "切换主题"
                },
                language: {
                    english: "English",
                    chinese: "简体中文",
                    toggleLanguage: "切换语言"
                }
            }
        };
    }

    t(key, params = {}) {
        const keys = key.split('.');
        let translation = this.translations[this.currentLanguage];
        
        // Navigate through nested keys
        for (const k of keys) {
            if (translation && typeof translation === 'object' && k in translation) {
                translation = translation[k];
            } else {
                // Fallback to English if key not found
                translation = this.translations[this.fallbackLanguage];
                for (const fallbackKey of keys) {
                    if (translation && typeof translation === 'object' && fallbackKey in translation) {
                        translation = translation[fallbackKey];
                    } else {
                        return key; // Return key if translation not found
                    }
                }
                break;
            }
        }

        // Replace parameters in translation
        if (typeof translation === 'string') {
            return translation.replace(/\{\{(\w+)\}\}/g, (match, param) => {
                return params[param] || match;
            });
        }

        return translation || key;
    }

    setLanguage(language) {
        if (this.translations[language]) {
            this.currentLanguage = language;
            localStorage.setItem('language', language);
            this.applyLanguage();
            
            // Trigger language change event
            window.dispatchEvent(new CustomEvent('languageChanged', {
                detail: { language: this.currentLanguage }
            }));
        }
    }

    getCurrentLanguage() {
        return this.currentLanguage;
    }

    applyLanguage() {
        // Update all elements with data-i18n attribute
        document.querySelectorAll('[data-i18n]').forEach(element => {
            const key = element.getAttribute('data-i18n');
            const translation = this.t(key);
            
            if (element.tagName === 'INPUT' && (element.type === 'text' || element.type === 'password')) {
                element.placeholder = translation;
            } else if (element.hasAttribute('title')) {
                element.title = translation;
            } else {
                element.textContent = translation;
            }
        });

        // Update page title
        const titleKey = document.documentElement.getAttribute('data-i18n-title');
        if (titleKey) {
            document.title = this.t(titleKey);
        }

        // Update language toggle button text
        this.updateLanguageToggle();
    }

    setupLanguageToggle() {
        const languageToggle = document.getElementById('languageToggle');
        if (languageToggle) {
            languageToggle.addEventListener('click', () => {
                const newLanguage = this.currentLanguage === 'en' ? 'zh' : 'en';
                this.setLanguage(newLanguage);
            });
        }
    }

    updateLanguageToggle() {
        const languageToggle = document.getElementById('languageToggle');
        const languageText = document.getElementById('languageText');
        
        if (languageToggle && languageText) {
            const currentLangText = this.currentLanguage === 'en' ? '中文' : 'EN';
            languageText.textContent = currentLangText;
            
            const tooltip = this.currentLanguage === 'en' ? 
                this.t('language.chinese') : this.t('language.english');
            languageToggle.title = tooltip;
        }
    }

    // Format numbers according to locale
    formatNumber(number) {
        const locale = this.currentLanguage === 'zh' ? 'zh-CN' : 'en-US';
        return new Intl.NumberFormat(locale).format(number);
    }

    // Format dates according to locale
    formatDate(date) {
        const locale = this.currentLanguage === 'zh' ? 'zh-CN' : 'en-US';
        return new Intl.DateTimeFormat(locale, {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        }).format(new Date(date));
    }

    // Format relative time
    formatRelativeTime(date) {
        const locale = this.currentLanguage === 'zh' ? 'zh-CN' : 'en-US';
        const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
        
        const now = new Date();
        const targetDate = new Date(date);
        const diffInSeconds = (targetDate.getTime() - now.getTime()) / 1000;
        
        if (Math.abs(diffInSeconds) < 60) {
            return rtf.format(Math.round(diffInSeconds), 'second');
        } else if (Math.abs(diffInSeconds) < 3600) {
            return rtf.format(Math.round(diffInSeconds / 60), 'minute');
        } else if (Math.abs(diffInSeconds) < 86400) {
            return rtf.format(Math.round(diffInSeconds / 3600), 'hour');
        } else {
            return rtf.format(Math.round(diffInSeconds / 86400), 'day');
        }
    }
}

// Global i18n instance
window.i18n = new I18n();

// Initialize i18n when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.i18n.init();
});
