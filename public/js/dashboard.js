// Dashboard functionality

class Dashboard {
    constructor() {
        this.refreshInterval = null;
        this.autoRefreshEnabled = true;
        this.refreshIntervalMs = 30000; // 30 seconds
    }

    async init() {
        await this.loadOverview();
        this.startAutoRefresh();
    }

    async loadOverview() {
        try {
            const response = await api.getDashboardOverview();
            
            if (response.success) {
                this.updateStatistics(response.data);
                this.updateRecentLogs(response.data.recentLogs);
                this.updateNextRuns(response.data.nextRuns);
                this.updateSystemInfo(response.data.systemInfo);
            }
        } catch (error) {
            console.error('Failed to load dashboard overview:', error);
            this.showError('Failed to load dashboard data');
        }
    }

    updateStatistics(data) {
        // Update task statistics
        document.getElementById('total-tasks').textContent = data.tasks.total;
        document.getElementById('active-tasks').textContent = data.tasks.active;
        document.getElementById('running-backups').textContent = data.runningBackups.length;
        document.getElementById('success-rate').textContent = data.backups.successRate + '%';
    }

    updateRecentLogs(logs) {
        const tbody = document.querySelector('#recent-logs-table tbody');
        tbody.innerHTML = '';

        if (logs.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="4" class="text-center text-muted">No recent backup logs</td>
                </tr>
            `;
            return;
        }

        logs.forEach(log => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>
                    <div class="d-flex align-items-center">
                        <i class="${api.getTaskTypeIcon(log.task_type)} task-type-icon task-type-${log.task_type.split('_')[0]}"></i>
                        <div>
                            <div class="fw-bold">${log.task_name || 'Unknown Task'}</div>
                            <small class="text-muted">${api.getTaskTypeName(log.task_type)}</small>
                        </div>
                    </div>
                </td>
                <td>
                    <span class="badge status-badge ${api.getStatusBadgeClass(log.status)}">
                        ${log.status.charAt(0).toUpperCase() + log.status.slice(1)}
                    </span>
                </td>
                <td>
                    <div>${api.formatDate(log.started_at)}</div>
                </td>
                <td>
                    <span class="duration">${api.formatDuration(log.duration)}</span>
                </td>
            `;
            tbody.appendChild(row);
        });
    }

    updateNextRuns(nextRuns) {
        const container = document.getElementById('next-runs-list');
        container.innerHTML = '';

        if (nextRuns.length === 0) {
            container.innerHTML = `
                <div class="text-center text-muted">
                    <i class="fas fa-calendar-times fa-2x mb-2"></i>
                    <p>No scheduled runs</p>
                </div>
            `;
            return;
        }

        nextRuns.forEach(run => {
            const nextRunTime = api.formatNextRun(run.next_run);
            const isOverdue = new Date(run.next_run) < new Date();
            const isSoon = new Date(run.next_run) - new Date() < 60 * 60 * 1000; // 1 hour

            const item = document.createElement('div');
            item.className = 'mb-3 p-2 border rounded';
            item.innerHTML = `
                <div class="d-flex justify-content-between align-items-start">
                    <div>
                        <div class="fw-bold">${run.name}</div>
                        <small class="text-muted">${api.getTaskTypeName(run.type)}</small>
                    </div>
                    <div class="text-end">
                        <div class="next-run ${isOverdue ? 'overdue' : isSoon ? 'soon' : ''}">${nextRunTime}</div>
                    </div>
                </div>
            `;
            container.appendChild(item);
        });
    }

    updateSystemInfo(systemInfo) {
        // Update system information in the UI if needed
        console.log('System info:', systemInfo);
    }

    startAutoRefresh() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
        }

        if (this.autoRefreshEnabled) {
            this.refreshInterval = setInterval(() => {
                this.loadOverview();
            }, this.refreshIntervalMs);
        }
    }

    stopAutoRefresh() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
        }
    }

    toggleAutoRefresh() {
        this.autoRefreshEnabled = !this.autoRefreshEnabled;
        
        if (this.autoRefreshEnabled) {
            this.startAutoRefresh();
        } else {
            this.stopAutoRefresh();
        }
    }

    async refresh() {
        await this.loadOverview();
    }

    showError(message) {
        // Show error notification
        const alertDiv = document.createElement('div');
        alertDiv.className = 'alert alert-danger alert-dismissible fade show';
        alertDiv.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;

        const container = document.querySelector('main');
        container.insertBefore(alertDiv, container.firstChild);

        // Auto-dismiss after 5 seconds
        setTimeout(() => {
            if (alertDiv.parentNode) {
                alertDiv.remove();
            }
        }, 5000);
    }

    showSuccess(message) {
        // Show success notification
        const alertDiv = document.createElement('div');
        alertDiv.className = 'alert alert-success alert-dismissible fade show';
        alertDiv.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;

        const container = document.querySelector('main');
        container.insertBefore(alertDiv, container.firstChild);

        // Auto-dismiss after 3 seconds
        setTimeout(() => {
            if (alertDiv.parentNode) {
                alertDiv.remove();
            }
        }, 3000);
    }

    // Helper method to get translated text
    t(key, params = {}) {
        return window.i18n ? window.i18n.t(key, params) : key;
    }

    // Helper method to format numbers with locale
    formatNumber(number) {
        return window.i18n ? window.i18n.formatNumber(number) : number.toLocaleString();
    }

    // Helper method to format dates with locale
    formatDate(date) {
        return window.i18n ? window.i18n.formatDate(date) : new Date(date).toLocaleString();
    }
}

// Global dashboard instance
window.dashboard = new Dashboard();

// Global functions for HTML onclick handlers
window.refreshDashboard = async function() {
    const button = event.target.closest('button');
    const originalContent = button.innerHTML;

    const loadingText = window.i18n ? window.i18n.t('common.loading') : 'Loading...';
    button.innerHTML = `<i class="fas fa-spinner fa-spin me-1"></i>${loadingText}`;
    button.disabled = true;
    button.classList.add('loading');

    try {
        await dashboard.refresh();
        const successMsg = window.i18n ? window.i18n.t('dashboard.refreshed') : 'Dashboard refreshed successfully';
        dashboard.showSuccess(successMsg);
    } catch (error) {
        const errorMsg = window.i18n ? window.i18n.t('dashboard.refreshFailed') : 'Failed to refresh dashboard';
        dashboard.showError(errorMsg);
    } finally {
        button.innerHTML = originalContent;
        button.disabled = false;
        button.classList.remove('loading');
    }
};

window.showDashboard = function() {
    // Hide all views
    document.querySelectorAll('.content-view').forEach(view => {
        view.style.display = 'none';
    });
    
    // Show dashboard view
    document.getElementById('dashboard-view').style.display = 'block';
    
    // Update navigation
    document.querySelectorAll('.sidebar .nav-link').forEach(link => {
        link.classList.remove('active');
    });
    event.target.classList.add('active');
    
    // Refresh dashboard data
    dashboard.refresh();
};
