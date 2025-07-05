/**
 * Registration Page JavaScript
 */

class RegisterPage {
    constructor() {
        this.form = document.getElementById('registerForm');
        this.submitBtn = document.getElementById('registerBtn');
        this.init();
    }

    init() {
        this.setupFormValidation();
        this.setupFormSubmission();
        this.setupLanguageToggle();
        this.checkAuthStatus();
    }

    /**
     * Setup form validation
     */
    setupFormValidation() {
        const inputs = this.form.querySelectorAll('input');
        
        inputs.forEach(input => {
            input.addEventListener('blur', () => this.validateField(input));
            input.addEventListener('input', () => this.clearFieldError(input));
        });

        // Real-time password confirmation validation
        const password = document.getElementById('password');
        const confirmPassword = document.getElementById('confirmPassword');
        
        confirmPassword.addEventListener('input', () => {
            if (confirmPassword.value && password.value !== confirmPassword.value) {
                this.showFieldError(confirmPassword, window.i18n.t('register.errors.passwordMismatch'));
            } else {
                this.clearFieldError(confirmPassword);
            }
        });
    }

    /**
     * Setup form submission
     */
    setupFormSubmission() {
        this.form.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.handleSubmit();
        });
    }

    /**
     * Setup language toggle
     */
    setupLanguageToggle() {
        const languageToggle = document.getElementById('languageToggle');
        const currentLanguage = document.getElementById('currentLanguage');
        
        languageToggle.addEventListener('click', () => {
            const newLang = window.i18n.currentLanguage === 'zh' ? 'en' : 'zh';
            window.i18n.setLanguage(newLang);
            currentLanguage.textContent = newLang === 'zh' ? '中文' : 'English';
        });
    }

    /**
     * Check if user is already authenticated
     */
    checkAuthStatus() {
        const token = localStorage.getItem('token');
        if (token) {
            // Redirect to dashboard if already logged in
            window.location.href = 'index.html';
        }
    }

    /**
     * Validate individual field
     */
    validateField(field) {
        const value = field.value.trim();
        let isValid = true;
        let errorMessage = '';

        switch (field.name) {
            case 'username':
                if (!value) {
                    errorMessage = window.i18n.t('register.errors.usernameRequired');
                    isValid = false;
                } else if (value.length < 3) {
                    errorMessage = window.i18n.t('register.errors.usernameTooShort');
                    isValid = false;
                } else if (value.length > 30) {
                    errorMessage = window.i18n.t('register.errors.usernameTooLong');
                    isValid = false;
                } else if (!/^[a-zA-Z0-9_]+$/.test(value)) {
                    errorMessage = window.i18n.t('register.errors.usernameInvalid');
                    isValid = false;
                }
                break;

            case 'password':
                if (!value) {
                    errorMessage = window.i18n.t('register.errors.passwordRequired');
                    isValid = false;
                } else if (value.length < 6) {
                    errorMessage = window.i18n.t('register.errors.passwordTooShort');
                    isValid = false;
                }
                break;

            case 'confirmPassword':
                const password = document.getElementById('password').value;
                if (!value) {
                    errorMessage = window.i18n.t('register.errors.confirmPasswordRequired');
                    isValid = false;
                } else if (value !== password) {
                    errorMessage = window.i18n.t('register.errors.passwordMismatch');
                    isValid = false;
                }
                break;
        }

        if (isValid) {
            this.clearFieldError(field);
        } else {
            this.showFieldError(field, errorMessage);
        }

        return isValid;
    }

    /**
     * Show field error
     */
    showFieldError(field, message) {
        field.classList.add('is-invalid');
        const feedback = field.parentElement.querySelector('.invalid-feedback');
        if (feedback) {
            feedback.textContent = message;
        }
    }

    /**
     * Clear field error
     */
    clearFieldError(field) {
        field.classList.remove('is-invalid');
        const feedback = field.parentElement.querySelector('.invalid-feedback');
        if (feedback) {
            feedback.textContent = '';
        }
    }

    /**
     * Validate entire form
     */
    validateForm() {
        const fields = this.form.querySelectorAll('input[required]');
        let isValid = true;

        fields.forEach(field => {
            if (!this.validateField(field)) {
                isValid = false;
            }
        });

        return isValid;
    }

    /**
     * Handle form submission
     */
    async handleSubmit() {
        if (!this.validateForm()) {
            return;
        }

        const formData = new FormData(this.form);
        const data = {
            username: formData.get('username').trim(),
            password: formData.get('password'),
            confirmPassword: formData.get('confirmPassword')
        };

        this.setLoading(true);

        try {
            const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });

            const result = await response.json();

            if (response.ok) {
                // Store token and user info
                localStorage.setItem('token', result.token);
                localStorage.setItem('user', JSON.stringify(result.user));

                // Show success message
                window.uiEnhancements.showNotification(
                    window.i18n.t('register.success'),
                    'success'
                );

                // Redirect to dashboard after a short delay
                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 1500);
            } else {
                // Show error message
                window.uiEnhancements.showNotification(
                    result.error || window.i18n.t('register.errors.general'),
                    'error'
                );
            }
        } catch (error) {
            console.error('Registration error:', error);
            window.uiEnhancements.showNotification(
                window.i18n.t('register.errors.network'),
                'error'
            );
        } finally {
            this.setLoading(false);
        }
    }

    /**
     * Set loading state
     */
    setLoading(loading) {
        if (loading) {
            this.submitBtn.disabled = true;
            this.submitBtn.classList.add('loading');
            this.submitBtn.innerHTML = `
                <span class="spinner-border spinner-border-sm me-2" role="status"></span>
                <span data-i18n="register.submitting">注册中...</span>
            `;
        } else {
            this.submitBtn.disabled = false;
            this.submitBtn.classList.remove('loading');
            this.submitBtn.innerHTML = `
                <span data-i18n="register.submit">注册账户</span>
                <i class="fas fa-arrow-right ms-2"></i>
            `;
            // Re-apply translations
            window.i18n.applyLanguage();
        }
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
    // Initialize i18n
    await window.i18n.init();
    
    // Initialize register page
    window.registerPage = new RegisterPage();
});
