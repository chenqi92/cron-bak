// Tasks management functionality

class TaskManager {
    constructor() {
        this.tasks = [];
        this.currentTask = null;
        this.editingTask = null;
    }

    async init() {
        await this.loadTasks();
    }

    async loadTasks() {
        try {
            const response = await api.getTasks();
            
            if (response.success) {
                this.tasks = response.data;
                this.renderTasksTable();
            }
        } catch (error) {
            console.error('Failed to load tasks:', error);
            this.showError('Failed to load backup tasks');
        }
    }

    renderTasksTable() {
        const tbody = document.querySelector('#tasks-table tbody');
        tbody.innerHTML = '';

        if (this.tasks.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center text-muted">
                        <div class="empty-state">
                            <i class="fas fa-tasks"></i>
                            <p>No backup tasks configured</p>
                            <button class="btn btn-primary" onclick="showCreateTaskModal()">
                                <i class="fas fa-plus me-1"></i>Create Your First Task
                            </button>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }

        this.tasks.forEach(task => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>
                    <div class="d-flex align-items-center">
                        <i class="${api.getTaskTypeIcon(task.type)} task-type-icon task-type-${task.type.split('_')[0]}"></i>
                        <div>
                            <div class="fw-bold">${task.name}</div>
                            <small class="text-muted">ID: ${task.id}</small>
                        </div>
                    </div>
                </td>
                <td>
                    <span class="badge bg-secondary">${api.getTaskTypeName(task.type)}</span>
                </td>
                <td>
                    <code class="small">${task.schedule}</code>
                </td>
                <td>
                    <span class="badge status-badge ${api.getStatusBadgeClass(task.is_active ? 'active' : 'inactive')}">
                        ${task.is_active ? 'Active' : 'Inactive'}
                    </span>
                </td>
                <td>
                    <div>${api.formatDate(task.last_run)}</div>
                </td>
                <td>
                    <div class="next-run ${this.getNextRunClass(task.next_run)}">
                        ${api.formatNextRun(task.next_run)}
                    </div>
                </td>
                <td>
                    <div class="action-buttons">
                        <button class="btn btn-sm btn-outline-primary" onclick="taskManager.runTask(${task.id})" 
                                ${!task.is_active ? 'disabled' : ''} title="Run Now">
                            <i class="fas fa-play"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-secondary" onclick="taskManager.toggleTask(${task.id})" 
                                title="${task.is_active ? 'Deactivate' : 'Activate'}">
                            <i class="fas fa-${task.is_active ? 'pause' : 'play'}"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-info" onclick="taskManager.editTask(${task.id})" title="Edit">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-warning" onclick="taskManager.viewLogs(${task.id})" title="View Logs">
                            <i class="fas fa-list"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-danger" onclick="taskManager.deleteTask(${task.id})" title="Delete">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            `;
            tbody.appendChild(row);
        });
    }

    getNextRunClass(nextRun) {
        if (!nextRun) return '';
        
        const date = new Date(nextRun);
        const now = new Date();
        const diff = date.getTime() - now.getTime();
        
        if (diff < 0) return 'overdue';
        if (diff < 60 * 60 * 1000) return 'soon'; // 1 hour
        return '';
    }

    async runTask(taskId) {
        if (!confirm('Are you sure you want to run this backup task now?')) {
            return;
        }

        try {
            const response = await api.runTask(taskId);
            
            if (response.success) {
                this.showSuccess('Backup task started successfully');
                await this.loadTasks(); // Refresh the table
            }
        } catch (error) {
            console.error('Failed to run task:', error);
            this.showError('Failed to start backup task: ' + error.message);
        }
    }

    async toggleTask(taskId) {
        const task = this.tasks.find(t => t.id === taskId);
        const action = task.is_active ? 'deactivate' : 'activate';
        
        if (!confirm(`Are you sure you want to ${action} this backup task?`)) {
            return;
        }

        try {
            const response = await api.toggleTask(taskId);
            
            if (response.success) {
                this.showSuccess(`Task ${action}d successfully`);
                await this.loadTasks(); // Refresh the table
            }
        } catch (error) {
            console.error('Failed to toggle task:', error);
            this.showError(`Failed to ${action} task: ` + error.message);
        }
    }

    async deleteTask(taskId) {
        const task = this.tasks.find(t => t.id === taskId);
        
        if (!confirm(`Are you sure you want to delete the task "${task.name}"? This action cannot be undone.`)) {
            return;
        }

        try {
            const response = await api.deleteTask(taskId);
            
            if (response.success) {
                this.showSuccess('Task deleted successfully');
                await this.loadTasks(); // Refresh the table
            }
        } catch (error) {
            console.error('Failed to delete task:', error);
            this.showError('Failed to delete task: ' + error.message);
        }
    }

    async editTask(taskId) {
        try {
            const response = await api.getTask(taskId);
            
            if (response.success) {
                this.editingTask = response.data;
                this.showTaskModal(true);
            }
        } catch (error) {
            console.error('Failed to load task for editing:', error);
            this.showError('Failed to load task details');
        }
    }

    viewLogs(taskId) {
        // Switch to logs view and filter by task
        showLogs();
        // TODO: Implement log filtering by task ID
    }

    showTaskModal(isEdit = false) {
        // TODO: Implement task creation/editing modal
        console.log('Show task modal:', isEdit ? 'edit' : 'create');
        
        if (isEdit && this.editingTask) {
            console.log('Editing task:', this.editingTask);
        }
        
        // For now, show a simple alert
        alert('Task creation/editing modal not yet implemented');
    }

    async createTask(taskData) {
        try {
            const response = await api.createTask(taskData);
            
            if (response.success) {
                this.showSuccess('Task created successfully');
                await this.loadTasks(); // Refresh the table
                return true;
            }
        } catch (error) {
            console.error('Failed to create task:', error);
            this.showError('Failed to create task: ' + error.message);
            return false;
        }
    }

    async updateTask(taskId, updates) {
        try {
            const response = await api.updateTask(taskId, updates);
            
            if (response.success) {
                this.showSuccess('Task updated successfully');
                await this.loadTasks(); // Refresh the table
                return true;
            }
        } catch (error) {
            console.error('Failed to update task:', error);
            this.showError('Failed to update task: ' + error.message);
            return false;
        }
    }

    showError(message) {
        // Show error notification
        const alertDiv = document.createElement('div');
        alertDiv.className = 'alert alert-danger alert-dismissible fade show';
        alertDiv.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        
        const container = document.querySelector('#tasks-view');
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
        
        const container = document.querySelector('#tasks-view');
        container.insertBefore(alertDiv, container.firstChild);
        
        // Auto-dismiss after 3 seconds
        setTimeout(() => {
            if (alertDiv.parentNode) {
                alertDiv.remove();
            }
        }, 3000);
    }
}

// Global task manager instance
window.taskManager = new TaskManager();

// Global functions for HTML onclick handlers
window.showTasks = function() {
    // Hide all views
    document.querySelectorAll('.content-view').forEach(view => {
        view.style.display = 'none';
    });
    
    // Show tasks view
    document.getElementById('tasks-view').style.display = 'block';
    
    // Update navigation
    document.querySelectorAll('.sidebar .nav-link').forEach(link => {
        link.classList.remove('active');
    });
    event.target.classList.add('active');
    
    // Load tasks
    taskManager.loadTasks();
};

window.showCreateTaskModal = function() {
    taskManager.editingTask = null;
    taskManager.showTaskModal(false);
};

window.showLogs = function() {
    // Hide all views
    document.querySelectorAll('.content-view').forEach(view => {
        view.style.display = 'none';
    });
    
    // Show logs view
    document.getElementById('logs-view').style.display = 'block';
    
    // Update navigation
    document.querySelectorAll('.sidebar .nav-link').forEach(link => {
        link.classList.remove('active');
    });
    event.target.classList.add('active');
    
    // TODO: Load logs
};

window.showStatistics = function() {
    // Hide all views
    document.querySelectorAll('.content-view').forEach(view => {
        view.style.display = 'none';
    });
    
    // Show statistics view
    document.getElementById('statistics-view').style.display = 'block';
    
    // Update navigation
    document.querySelectorAll('.sidebar .nav-link').forEach(link => {
        link.classList.remove('active');
    });
    event.target.classList.add('active');
    
    // TODO: Load statistics
};

window.showSettings = function() {
    // Hide all views
    document.querySelectorAll('.content-view').forEach(view => {
        view.style.display = 'none';
    });
    
    // Show settings view
    document.getElementById('settings-view').style.display = 'block';
    
    // Update navigation
    document.querySelectorAll('.sidebar .nav-link').forEach(link => {
        link.classList.remove('active');
    });
    event.target.classList.add('active');
    
    // TODO: Load settings
};
