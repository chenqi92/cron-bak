// Main application controller

class App {
    constructor() {
        this.isAuthenticated = false;
        this.currentUser = null;
        this.loginModal = null;
    }

    async init() {
        // Initialize theme and i18n first
        if (window.themeManager) {
            window.themeManager.init();
        }

        if (window.i18n) {
            await window.i18n.init();
        }

        // Initialize Bootstrap modal
        this.loginModal = new bootstrap.Modal(document.getElementById('loginModal'));

        // Check authentication status
        await this.checkAuthStatus();

        // Initialize components if authenticated
        if (this.isAuthenticated) {
            await this.initializeApp();
        }

        // Set up event listeners
        this.setupEventListeners();
    }

    async checkAuthStatus() {
        try {
            // Check local storage first
            const token = localStorage.getItem('token');
            const userStr = localStorage.getItem('user');

            if (!token || !userStr) {
                this.redirectToLogin();
                return;
            }

            try {
                this.currentUser = JSON.parse(userStr);
                this.isAuthenticated = true;
                this.updateUserInfo();
            } catch (error) {
                console.error('Invalid user data in localStorage:', error);
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                this.redirectToLogin();
                return;
            }

            // Verify token with server
            try {
                const response = await api.getAuthStatus();

                if (!response.success || !response.isAuthenticated) {
                    localStorage.removeItem('token');
                    localStorage.removeItem('user');
                    this.redirectToLogin();
                    return;
                }

                // Update user info if server returns updated data
                if (response.user) {
                    this.currentUser = response.user;
                    localStorage.setItem('user', JSON.stringify(response.user));
                    this.updateUserInfo();
                }
            } catch (error) {
                console.error('Failed to verify auth status:', error);
                // Don't redirect on network error, allow offline usage
            }
        } catch (error) {
            console.error('Failed to check auth status:', error);
            this.redirectToLogin();
        }
    }

    redirectToLogin() {
        window.location.href = 'login.html';
    }

    async initializeApp() {
        try {
            // Initialize dashboard
            await dashboard.init();
            
            // Initialize task manager
            await taskManager.init();
            
            // Show dashboard by default
            this.showView('dashboard');
            
            console.log('Application initialized successfully');
        } catch (error) {
            console.error('Failed to initialize application:', error);
            this.showError('Failed to initialize application');
        }
    }

    setupEventListeners() {
        // Login form submission
        document.getElementById('loginForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleLogin();
        });

        // Enter key in login form
        document.getElementById('login-password').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.handleLogin();
            }
        });

        // Handle browser back/forward
        window.addEventListener('popstate', (e) => {
            if (e.state && e.state.view) {
                this.showView(e.state.view, false);
            }
        });

        // Handle page visibility change (pause/resume auto-refresh)
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                dashboard.stopAutoRefresh();
            } else {
                dashboard.startAutoRefresh();
            }
        });

        // Handle language change events
        window.addEventListener('languageChanged', (e) => {
            this.onLanguageChanged(e.detail.language);
        });

        // Handle theme change events
        window.addEventListener('themeChanged', (e) => {
            this.onThemeChanged(e.detail.theme);
        });
    }

    showLoginModal() {
        this.loginModal.show();
        
        // Focus on username field
        setTimeout(() => {
            document.getElementById('login-username').focus();
        }, 500);
    }

    hideLoginModal() {
        this.loginModal.hide();
    }

    async handleLogin() {
        const username = document.getElementById('login-username').value.trim();
        const password = document.getElementById('login-password').value;
        const errorDiv = document.getElementById('login-error');
        
        // Clear previous errors
        errorDiv.style.display = 'none';
        
        if (!username || !password) {
            this.showLoginError('Please enter both username and password');
            return;
        }

        // Show loading state
        const loginButton = document.querySelector('#loginModal .btn-primary');
        const originalText = loginButton.innerHTML;
        loginButton.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i>Logging in...';
        loginButton.disabled = true;

        try {
            const response = await api.login(username, password);
            
            if (response.success) {
                this.isAuthenticated = true;
                this.currentUser = response.user;
                this.updateUserInfo();
                this.hideLoginModal();
                
                // Clear form
                document.getElementById('loginForm').reset();
                
                // Initialize app
                await this.initializeApp();
                
                this.showSuccess('Login successful');
            } else {
                this.showLoginError(response.error || 'Login failed');
            }
        } catch (error) {
            console.error('Login failed:', error);
            this.showLoginError(error.message || 'Login failed');
        } finally {
            // Restore button state
            loginButton.innerHTML = originalText;
            loginButton.disabled = false;
        }
    }

    showLoginError(message) {
        const errorDiv = document.getElementById('login-error');
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
    }

    updateUserInfo() {
        if (this.currentUser) {
            document.getElementById('username').textContent = this.currentUser.username;
        }
    }

    showView(viewName, updateHistory = true) {
        // Hide all views
        document.querySelectorAll('.content-view').forEach(view => {
            view.style.display = 'none';
        });
        
        // Show requested view
        const viewElement = document.getElementById(`${viewName}-view`);
        if (viewElement) {
            viewElement.style.display = 'block';
        }
        
        // Update navigation
        document.querySelectorAll('.sidebar .nav-link').forEach(link => {
            link.classList.remove('active');
        });
        
        const navLink = document.querySelector(`.sidebar .nav-link[onclick*="${viewName}"]`);
        if (navLink) {
            navLink.classList.add('active');
        }
        
        // Update browser history
        if (updateHistory) {
            history.pushState({ view: viewName }, '', `#${viewName}`);
        }
        
        // Load view-specific data
        this.loadViewData(viewName);
    }

    async loadViewData(viewName) {
        switch (viewName) {
            case 'dashboard':
                await dashboard.refresh();
                break;
            case 'tasks':
                await taskManager.loadTasks();
                break;
            case 'logs':
                // TODO: Load logs
                break;
            case 'notifications':
                if (window.notificationManager) {
                    await window.notificationManager.init();
                }
                break;
            case 'statistics':
                // TODO: Load statistics
                break;
            case 'settings':
                // TODO: Load settings
                break;
        }
    }

    showError(message) {
        const alertDiv = document.createElement('div');
        alertDiv.className = 'alert alert-danger alert-dismissible fade show';
        alertDiv.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        
        const container = document.querySelector('main');
        container.insertBefore(alertDiv, container.firstChild);
        
        setTimeout(() => {
            if (alertDiv.parentNode) {
                alertDiv.remove();
            }
        }, 5000);
    }

    showSuccess(message) {
        const alertDiv = document.createElement('div');
        alertDiv.className = 'alert alert-success alert-dismissible fade show';
        alertDiv.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;

        const container = document.querySelector('main');
        container.insertBefore(alertDiv, container.firstChild);

        setTimeout(() => {
            if (alertDiv.parentNode) {
                alertDiv.remove();
            }
        }, 3000);
    }

    onLanguageChanged(language) {
        // Update document language attribute
        document.documentElement.lang = language === 'zh' ? 'zh-CN' : 'en';

        // Refresh current view to apply new translations
        if (this.isAuthenticated) {
            this.refreshCurrentView();
        }

        console.log('Language changed to:', language);
    }

    onThemeChanged(theme) {
        // Update any theme-specific logic here
        console.log('Theme changed to:', theme);

        // Update chart colors if any charts are present
        this.updateChartThemes();
    }

    refreshCurrentView() {
        // Get current active view
        const activeView = document.querySelector('.content-view:not([style*="display: none"])');
        if (activeView) {
            const viewId = activeView.id.replace('-view', '');
            this.loadViewData(viewId);
        }
    }

    updateChartThemes() {
        // Update chart themes if charts are present
        // This can be extended when charts are implemented
        if (window.Chart) {
            // Update Chart.js default colors based on theme
            const isDark = window.themeManager && window.themeManager.getCurrentTheme() === 'dark';
            Chart.defaults.color = isDark ? '#ffffff' : '#666666';
            Chart.defaults.borderColor = isDark ? '#404040' : '#dee2e6';
        }
    }
}

// Global app instance
window.app = new App();

// Global functions for HTML onclick handlers
window.login = function() {
    app.handleLogin();
};

window.handleLogout = async function() {
    if (confirm(window.i18n.t('common.confirmLogout') || 'Are you sure you want to logout?')) {
        try {
            // Clear local storage
            localStorage.removeItem('token');
            localStorage.removeItem('user');

            // Try to logout from server
            try {
                await api.logout();
            } catch (error) {
                console.error('Server logout failed:', error);
                // Continue with client-side logout even if server fails
            }

            // Redirect to login page
            window.location.href = 'login.html';
            
            // Stop auto-refresh
            dashboard.stopAutoRefresh();
            
            // Show login modal
            app.showLoginModal();
            
            app.showSuccess('Logged out successfully');
        } catch (error) {
            console.error('Logout failed:', error);
            app.showError('Logout failed');
        }
    }
};

window.showChangePassword = function() {
    // TODO: Implement change password modal
    alert('Change password functionality not yet implemented');
};

// Global navigation functions
window.showDashboard = () => app.showView('dashboard');
window.showTasks = () => app.showView('tasks');
window.showLogs = () => app.showView('logs');
window.showNotifications = () => app.showView('notifications');
window.showStatistics = () => app.showView('statistics');
window.showSettings = () => app.showView('settings');

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    app.init();
});

// Handle initial route from URL hash
window.addEventListener('load', () => {
    const hash = window.location.hash.substring(1);
    if (hash && app.isAuthenticated) {
        app.showView(hash, false);
    }
});
