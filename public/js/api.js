// API Client for Backup Service

class ApiClient {
    constructor() {
        this.baseUrl = '';
        this.token = localStorage.getItem('token');
    }

    // Set authentication token
    setToken(token) {
        this.token = token;
        if (token) {
            localStorage.setItem('token', token);
        } else {
            localStorage.removeItem('token');
        }
    }

    // Get authentication headers
    getHeaders() {
        const headers = {
            'Content-Type': 'application/json'
        };
        
        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }
        
        return headers;
    }

    // Make API request
    async request(endpoint, options = {}) {
        const url = `${this.baseUrl}/api${endpoint}`;
        const config = {
            headers: this.getHeaders(),
            ...options
        };

        try {
            const response = await fetch(url, config);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || `HTTP ${response.status}`);
            }

            return data;
        } catch (error) {
            console.error('API request failed:', error);
            
            // Handle authentication errors
            if (error.message.includes('401') || error.message.includes('token')) {
                this.setToken(null);
                window.location.reload();
            }
            
            throw error;
        }
    }

    // Authentication methods
    async login(username, password) {
        const response = await this.request('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ username, password })
        });
        
        if (response.success && response.token) {
            this.setToken(response.token);
        }
        
        return response;
    }

    async logout() {
        try {
            await this.request('/auth/logout', { method: 'POST' });
        } catch (error) {
            console.warn('Logout request failed:', error);
        } finally {
            this.setToken(null);
        }
    }

    async getAuthStatus() {
        return await this.request('/auth/status');
    }

    async getCurrentUser() {
        return await this.request('/auth/me');
    }

    async changePassword(currentPassword, newPassword, confirmPassword) {
        return await this.request('/auth/change-password', {
            method: 'POST',
            body: JSON.stringify({ currentPassword, newPassword, confirmPassword })
        });
    }

    // Dashboard methods
    async getDashboardOverview() {
        return await this.request('/dashboard/overview');
    }

    async getDashboardLogs(params = {}) {
        const queryString = new URLSearchParams(params).toString();
        return await this.request(`/dashboard/logs?${queryString}`);
    }

    async getDashboardStatistics(days = 30) {
        return await this.request(`/dashboard/statistics?days=${days}`);
    }

    async getSystemHealth() {
        return await this.request('/dashboard/health');
    }

    async performCleanup(retentionDays = 30) {
        return await this.request('/dashboard/cleanup', {
            method: 'POST',
            body: JSON.stringify({ retentionDays })
        });
    }

    async exportData(format = 'json') {
        return await this.request(`/dashboard/export?format=${format}`);
    }

    // Task methods
    async getTasks(params = {}) {
        const queryString = new URLSearchParams(params).toString();
        return await this.request(`/tasks?${queryString}`);
    }

    async getTask(id) {
        return await this.request(`/tasks/${id}`);
    }

    async createTask(taskData) {
        return await this.request('/tasks', {
            method: 'POST',
            body: JSON.stringify(taskData)
        });
    }

    async updateTask(id, updates) {
        return await this.request(`/tasks/${id}`, {
            method: 'PUT',
            body: JSON.stringify(updates)
        });
    }

    async deleteTask(id) {
        return await this.request(`/tasks/${id}`, {
            method: 'DELETE'
        });
    }

    async runTask(id) {
        return await this.request(`/tasks/${id}/run`, {
            method: 'POST'
        });
    }

    async toggleTask(id) {
        return await this.request(`/tasks/${id}/toggle`, {
            method: 'POST'
        });
    }

    async getTaskLogs(id, params = {}) {
        const queryString = new URLSearchParams(params).toString();
        return await this.request(`/tasks/${id}/logs?${queryString}`);
    }

    // Utility methods
    formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    formatDuration(milliseconds) {
        if (!milliseconds) return 'N/A';
        
        const seconds = Math.floor(milliseconds / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        
        if (hours > 0) {
            return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
        } else if (minutes > 0) {
            return `${minutes}m ${seconds % 60}s`;
        } else {
            return `${seconds}s`;
        }
    }

    formatDate(dateString) {
        if (!dateString) return 'Never';
        
        const date = new Date(dateString);
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        
        // If less than 24 hours ago, show relative time
        if (diff < 24 * 60 * 60 * 1000) {
            const hours = Math.floor(diff / (60 * 60 * 1000));
            const minutes = Math.floor((diff % (60 * 60 * 1000)) / (60 * 1000));
            
            if (hours > 0) {
                return `${hours}h ${minutes}m ago`;
            } else if (minutes > 0) {
                return `${minutes}m ago`;
            } else {
                return 'Just now';
            }
        }
        
        // Otherwise show formatted date
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
    }

    formatNextRun(dateString) {
        if (!dateString) return 'Not scheduled';
        
        const date = new Date(dateString);
        const now = new Date();
        const diff = date.getTime() - now.getTime();
        
        if (diff < 0) {
            return 'Overdue';
        }
        
        const hours = Math.floor(diff / (60 * 60 * 1000));
        const minutes = Math.floor((diff % (60 * 60 * 1000)) / (60 * 1000));
        
        if (hours > 24) {
            const days = Math.floor(hours / 24);
            return `In ${days}d ${hours % 24}h`;
        } else if (hours > 0) {
            return `In ${hours}h ${minutes}m`;
        } else if (minutes > 0) {
            return `In ${minutes}m`;
        } else {
            return 'Soon';
        }
    }

    getStatusBadgeClass(status) {
        const statusClasses = {
            'running': 'status-running',
            'success': 'status-success',
            'failed': 'status-failed',
            'cancelled': 'status-cancelled',
            'active': 'status-active',
            'inactive': 'status-inactive'
        };
        
        return statusClasses[status] || 'status-unknown';
    }

    getTaskTypeIcon(type) {
        const typeIcons = {
            'mysql_to_mysql': 'fas fa-database',
            'mysql_to_smb': 'fas fa-network-wired',
            'minio_to_minio': 'fas fa-cloud'
        };
        
        return typeIcons[type] || 'fas fa-question';
    }

    getTaskTypeName(type) {
        const typeNames = {
            'mysql_to_mysql': 'MySQL → MySQL',
            'mysql_to_smb': 'MySQL → SMB',
            'minio_to_minio': 'MinIO → MinIO'
        };
        
        return typeNames[type] || type;
    }
}

// Create global API client instance
window.api = new ApiClient();
