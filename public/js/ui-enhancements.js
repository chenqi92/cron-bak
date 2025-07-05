/**
 * UI Enhancements - Modern Interactive Features
 */

class UIEnhancements {
    constructor() {
        this.init();
    }

    init() {
        this.setupThemeTransitions();
        this.setupScrollEffects();
        this.setupTooltips();
        this.setupNotifications();
        this.setupMicroInteractions();
        this.setupAccessibility();
    }

    /**
     * Setup smooth theme transitions
     */
    setupThemeTransitions() {
        // Add theme transition class to body when theme changes
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'attributes' && mutation.attributeName === 'data-theme') {
                    document.body.classList.add('theme-transition');
                    setTimeout(() => {
                        document.body.classList.remove('theme-transition');
                    }, 300);
                }
            });
        });

        observer.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ['data-theme']
        });
    }

    /**
     * Setup scroll-based effects
     */
    setupScrollEffects() {
        // Parallax effect for hero sections
        const parallaxElements = document.querySelectorAll('.parallax');
        
        if (parallaxElements.length > 0) {
            window.addEventListener('scroll', () => {
                const scrolled = window.pageYOffset;
                const rate = scrolled * -0.5;
                
                parallaxElements.forEach(element => {
                    element.style.transform = `translateY(${rate}px)`;
                });
            });
        }

        // Fade in elements on scroll
        const observerOptions = {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        };

        const fadeObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('fade-in');
                    fadeObserver.unobserve(entry.target);
                }
            });
        }, observerOptions);

        document.querySelectorAll('.fade-on-scroll').forEach(el => {
            fadeObserver.observe(el);
        });
    }

    /**
     * Enhanced tooltip system
     */
    setupTooltips() {
        const tooltips = document.querySelectorAll('.tooltip-modern');
        
        tooltips.forEach(tooltip => {
            tooltip.addEventListener('mouseenter', (e) => {
                this.showTooltip(e.target);
            });
            
            tooltip.addEventListener('mouseleave', (e) => {
                this.hideTooltip(e.target);
            });
        });
    }

    showTooltip(element) {
        // Add a small delay for better UX
        element.tooltipTimeout = setTimeout(() => {
            element.classList.add('tooltip-visible');
        }, 300);
    }

    hideTooltip(element) {
        if (element.tooltipTimeout) {
            clearTimeout(element.tooltipTimeout);
        }
        element.classList.remove('tooltip-visible');
    }

    /**
     * Modern notification system
     */
    setupNotifications() {
        // Create toast container if it doesn't exist
        if (!document.querySelector('.toast-container')) {
            const container = document.createElement('div');
            container.className = 'toast-container';
            document.body.appendChild(container);
        }
    }

    showNotification(message, type = 'info', duration = 5000) {
        const container = document.querySelector('.toast-container');
        const toast = document.createElement('div');
        toast.className = `toast-modern toast-${type}`;
        
        const icon = this.getNotificationIcon(type);
        toast.innerHTML = `
            <div class="d-flex align-items-center">
                <i class="${icon} me-2"></i>
                <span class="flex-grow-1">${message}</span>
                <button type="button" class="btn-close btn-close-sm ms-2" onclick="this.parentElement.parentElement.remove()"></button>
            </div>
        `;
        
        container.appendChild(toast);
        
        // Auto remove after duration
        setTimeout(() => {
            if (toast.parentElement) {
                toast.style.animation = 'slideOutRight 0.3s ease-in-out';
                setTimeout(() => toast.remove(), 300);
            }
        }, duration);
    }

    getNotificationIcon(type) {
        const icons = {
            success: 'fas fa-check-circle text-success',
            error: 'fas fa-exclamation-circle text-danger',
            warning: 'fas fa-exclamation-triangle text-warning',
            info: 'fas fa-info-circle text-info'
        };
        return icons[type] || icons.info;
    }

    /**
     * Micro interactions and animations
     */
    setupMicroInteractions() {
        // Button ripple effect
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('btn') && !e.target.classList.contains('no-ripple')) {
                this.createRipple(e);
            }
        });

        // Card hover effects
        document.querySelectorAll('.card').forEach(card => {
            card.addEventListener('mouseenter', () => {
                card.style.transform = 'translateY(-2px)';
            });
            
            card.addEventListener('mouseleave', () => {
                card.style.transform = '';
            });
        });
    }

    createRipple(event) {
        const button = event.target;
        const rect = button.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        const x = event.clientX - rect.left - size / 2;
        const y = event.clientY - rect.top - size / 2;
        
        const ripple = document.createElement('span');
        ripple.style.cssText = `
            position: absolute;
            width: ${size}px;
            height: ${size}px;
            left: ${x}px;
            top: ${y}px;
            background: rgba(255, 255, 255, 0.3);
            border-radius: 50%;
            transform: scale(0);
            animation: ripple 0.6s linear;
            pointer-events: none;
        `;
        
        button.style.position = 'relative';
        button.style.overflow = 'hidden';
        button.appendChild(ripple);
        
        setTimeout(() => ripple.remove(), 600);
    }

    /**
     * Accessibility enhancements
     */
    setupAccessibility() {
        // Focus management
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Tab') {
                document.body.classList.add('keyboard-navigation');
            }
        });

        document.addEventListener('mousedown', () => {
            document.body.classList.remove('keyboard-navigation');
        });

        // Skip to main content link
        const skipLink = document.createElement('a');
        skipLink.href = '#main-content';
        skipLink.textContent = 'Skip to main content';
        skipLink.className = 'skip-link';
        skipLink.style.cssText = `
            position: absolute;
            top: -40px;
            left: 6px;
            background: var(--primary-color);
            color: white;
            padding: 8px;
            text-decoration: none;
            border-radius: 4px;
            z-index: 1000;
            transition: top 0.3s;
        `;
        
        skipLink.addEventListener('focus', () => {
            skipLink.style.top = '6px';
        });
        
        skipLink.addEventListener('blur', () => {
            skipLink.style.top = '-40px';
        });
        
        document.body.insertBefore(skipLink, document.body.firstChild);
    }

    /**
     * Utility methods
     */
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    throttle(func, limit) {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }
}

// CSS for ripple animation
const rippleCSS = `
@keyframes ripple {
    to {
        transform: scale(4);
        opacity: 0;
    }
}

@keyframes slideOutRight {
    from {
        transform: translateX(0);
        opacity: 1;
    }
    to {
        transform: translateX(100%);
        opacity: 0;
    }
}

.keyboard-navigation *:focus {
    outline: 2px solid var(--primary-color) !important;
    outline-offset: 2px !important;
}
`;

// Inject CSS
const style = document.createElement('style');
style.textContent = rippleCSS;
document.head.appendChild(style);

// Initialize UI enhancements when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.uiEnhancements = new UIEnhancements();
});

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UIEnhancements;
}
