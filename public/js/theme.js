// Theme Management System for Backup Service

class ThemeManager {
    constructor() {
        this.currentTheme = localStorage.getItem('theme') || 'light';
        this.systemPreference = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        this.autoTheme = localStorage.getItem('autoTheme') === 'true';
    }

    init() {
        this.applyTheme();
        this.setupThemeToggle();
        this.setupSystemThemeListener();
        this.setupThemeTransitions();
    }

    applyTheme(theme = null) {
        const targetTheme = theme || (this.autoTheme ? this.systemPreference : this.currentTheme);
        
        // Remove existing theme classes
        document.documentElement.classList.remove('theme-light', 'theme-dark');
        
        // Add new theme class
        document.documentElement.classList.add(`theme-${targetTheme}`);
        
        // Update data attribute for CSS targeting
        document.documentElement.setAttribute('data-theme', targetTheme);
        
        // Update theme meta tag for mobile browsers
        this.updateThemeColor(targetTheme);
        
        // Update theme toggle button
        this.updateThemeToggle(targetTheme);
        
        // Store current theme if not auto
        if (!this.autoTheme) {
            this.currentTheme = targetTheme;
            localStorage.setItem('theme', targetTheme);
        }

        // Trigger theme change event
        window.dispatchEvent(new CustomEvent('themeChanged', {
            detail: { 
                theme: targetTheme,
                auto: this.autoTheme
            }
        }));
    }

    setTheme(theme) {
        if (theme === 'auto') {
            this.autoTheme = true;
            localStorage.setItem('autoTheme', 'true');
            this.applyTheme(this.systemPreference);
        } else {
            this.autoTheme = false;
            localStorage.setItem('autoTheme', 'false');
            this.currentTheme = theme;
            this.applyTheme(theme);
        }
    }

    toggleTheme() {
        if (this.autoTheme) {
            // If auto, switch to opposite of system preference
            const newTheme = this.systemPreference === 'dark' ? 'light' : 'dark';
            this.setTheme(newTheme);
        } else {
            // Toggle between light and dark
            const newTheme = this.currentTheme === 'dark' ? 'light' : 'dark';
            this.setTheme(newTheme);
        }
    }

    getCurrentTheme() {
        return this.autoTheme ? this.systemPreference : this.currentTheme;
    }

    isAutoTheme() {
        return this.autoTheme;
    }

    setupThemeToggle() {
        const themeToggle = document.getElementById('themeToggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', () => {
                this.toggleTheme();
            });
        }
    }

    setupSystemThemeListener() {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        mediaQuery.addEventListener('change', (e) => {
            this.systemPreference = e.matches ? 'dark' : 'light';
            if (this.autoTheme) {
                this.applyTheme(this.systemPreference);
            }
        });
    }

    setupThemeTransitions() {
        // Add transition class to enable smooth theme transitions
        document.documentElement.classList.add('theme-transition');
        
        // Remove transition class after initial load to prevent flash
        setTimeout(() => {
            document.documentElement.classList.remove('theme-transition');
        }, 100);
    }

    updateThemeColor(theme) {
        const metaThemeColor = document.querySelector('meta[name="theme-color"]');
        const colors = {
            light: '#ffffff',
            dark: '#1a1a1a'
        };
        
        if (metaThemeColor) {
            metaThemeColor.setAttribute('content', colors[theme]);
        } else {
            const meta = document.createElement('meta');
            meta.name = 'theme-color';
            meta.content = colors[theme];
            document.head.appendChild(meta);
        }
    }

    updateThemeToggle(theme) {
        const themeToggle = document.getElementById('themeToggle');
        const themeIcon = document.getElementById('themeIcon');
        
        if (themeToggle && themeIcon) {
            // Update icon
            themeIcon.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
            
            // Update tooltip
            const tooltipText = theme === 'dark' ? 
                (window.i18n ? window.i18n.t('theme.light') : 'Light Theme') : 
                (window.i18n ? window.i18n.t('theme.dark') : 'Dark Theme');
            themeToggle.title = tooltipText;
            
            // Update aria-label for accessibility
            themeToggle.setAttribute('aria-label', tooltipText);
        }
    }

    // Utility method to get CSS custom property value
    getCSSVariable(property) {
        return getComputedStyle(document.documentElement).getPropertyValue(property).trim();
    }

    // Utility method to set CSS custom property value
    setCSSVariable(property, value) {
        document.documentElement.style.setProperty(property, value);
    }

    // Get theme-aware color
    getThemeColor(lightColor, darkColor) {
        const currentTheme = this.getCurrentTheme();
        return currentTheme === 'dark' ? darkColor : lightColor;
    }

    // Apply theme to specific element
    applyThemeToElement(element, lightClass, darkClass) {
        const currentTheme = this.getCurrentTheme();
        element.classList.remove(lightClass, darkClass);
        element.classList.add(currentTheme === 'dark' ? darkClass : lightClass);
    }

    // Get theme-specific image source
    getThemedImageSrc(lightSrc, darkSrc) {
        const currentTheme = this.getCurrentTheme();
        return currentTheme === 'dark' ? darkSrc : lightSrc;
    }

    // Preload theme assets
    preloadThemeAssets() {
        const themes = ['light', 'dark'];
        themes.forEach(theme => {
            // Preload theme-specific images if any
            // This can be extended based on your needs
        });
    }

    // Export theme settings
    exportThemeSettings() {
        return {
            theme: this.currentTheme,
            autoTheme: this.autoTheme,
            systemPreference: this.systemPreference
        };
    }

    // Import theme settings
    importThemeSettings(settings) {
        if (settings.autoTheme !== undefined) {
            this.autoTheme = settings.autoTheme;
            localStorage.setItem('autoTheme', settings.autoTheme.toString());
        }
        
        if (settings.theme && !this.autoTheme) {
            this.currentTheme = settings.theme;
            localStorage.setItem('theme', settings.theme);
        }
        
        this.applyTheme();
    }
}

// Global theme manager instance
window.themeManager = new ThemeManager();

// Initialize theme when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.themeManager.init();
});

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ThemeManager;
}
