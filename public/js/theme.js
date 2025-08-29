// Theme Management System

class ThemeManager {
  constructor() {
    this.currentTheme = localStorage.getItem('theme') || 'light';
    this.init();
  }

  init() {
    // Set initial theme
    this.setTheme(this.currentTheme);
    
    // Add event listeners
    this.addEventListeners();
    
    // Update theme toggle button
    this.updateThemeToggleButton();
  }

  addEventListeners() {
    // Theme toggle button
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
      themeToggle.addEventListener('click', () => this.toggleTheme());
    }

    // Listen for system theme changes
    if (window.matchMedia) {
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        if (!localStorage.getItem('theme')) {
          this.setTheme(e.matches ? 'dark' : 'light');
        }
      });
    }
  }

  setTheme(theme) {
    this.currentTheme = theme;
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
    this.updateThemeToggleButton();
  }

  toggleTheme() {
    const newTheme = this.currentTheme === 'light' ? 'dark' : 'light';
    this.setTheme(newTheme);
  }

  updateThemeToggleButton() {
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
      const icon = themeToggle.querySelector('.theme-icon');
      if (icon) {
        icon.textContent = this.currentTheme === 'light' ? '🌙' : '☀️';
      }
      themeToggle.setAttribute('aria-label', 
        `Switch to ${this.currentTheme === 'light' ? 'dark' : 'light'} theme`
      );
    }
  }

  getTheme() {
    return this.currentTheme;
  }
}

// Utility Functions
class UIUtils {
  static showToast(message, type = 'info', duration = 3000) {
    // Create toast container if it doesn't exist
    let toastContainer = document.getElementById('toast-container');
    if (!toastContainer) {
      toastContainer = document.createElement('div');
      toastContainer.id = 'toast-container';
      toastContainer.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 9999;
        display: flex;
        flex-direction: column;
        gap: 10px;
      `;
      document.body.appendChild(toastContainer);
    }

    // Create toast element
    const toast = document.createElement('div');
    toast.className = `toast toast-${type} fade-in`;
    toast.style.cssText = `
      padding: 12px 16px;
      border-radius: 8px;
      color: white;
      font-weight: 500;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      max-width: 300px;
      word-wrap: break-word;
      transform: translateX(100%);
      transition: transform 0.3s ease-in-out;
    `;

    // Set background color based on type
    const colors = {
      success: '#10b981',
      error: '#ef4444',
      warning: '#f59e0b',
      info: '#3b82f6'
    };
    toast.style.backgroundColor = colors[type] || colors.info;
    toast.textContent = message;

    // Add to container
    toastContainer.appendChild(toast);

    // Animate in
    setTimeout(() => {
      toast.style.transform = 'translateX(0)';
    }, 10);

    // Remove after duration
    setTimeout(() => {
      toast.style.transform = 'translateX(100%)';
      setTimeout(() => {
        if (toast.parentNode) {
          toast.parentNode.removeChild(toast);
        }
      }, 300);
    }, duration);
  }

  static showLoading(element, text = 'Loading...') {
    if (!element) return;
    
    element.disabled = true;
    element.classList.add('loading');
    
    const originalText = element.textContent;
    element.innerHTML = `
      <span class="spinner"></span>
      <span>${text}</span>
    `;
    
    return () => {
      element.disabled = false;
      element.classList.remove('loading');
      element.textContent = originalText;
    };
  }

  static confirmAction(message, onConfirm, onCancel = null) {
    if (confirm(message)) {
      onConfirm();
    } else if (onCancel) {
      onCancel();
    }
  }

  static formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  static debounce(func, wait) {
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
}

// Form Validation
class FormValidator {
  static validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  static validatePassword(password) {
    return password.length >= 6;
  }

  static validateRequired(value) {
    return value && value.trim().length > 0;
  }

  static showFieldError(field, message) {
    // Remove existing error
    const existingError = field.parentNode.querySelector('.field-error');
    if (existingError) {
      existingError.remove();
    }

    // Add error class to field
    field.classList.add('error');

    // Create error message
    const errorDiv = document.createElement('div');
    errorDiv.className = 'field-error';
    errorDiv.style.cssText = `
      color: var(--danger-color);
      font-size: var(--font-size-sm);
      margin-top: var(--spacing-1);
    `;
    errorDiv.textContent = message;

    // Insert after field
    field.parentNode.insertBefore(errorDiv, field.nextSibling);
  }

  static clearFieldError(field) {
    field.classList.remove('error');
    const errorDiv = field.parentNode.querySelector('.field-error');
    if (errorDiv) {
      errorDiv.remove();
    }
  }

  static validateForm(formElement, rules) {
    let isValid = true;
    const errors = [];

    Object.keys(rules).forEach(fieldName => {
      const field = formElement.querySelector(`[name="${fieldName}"]`);
      const rule = rules[fieldName];
      
      if (!field) return;

      // Clear previous errors
      this.clearFieldError(field);

      // Validate field
      const value = field.value;
      
      if (rule.required && !this.validateRequired(value)) {
        this.showFieldError(field, rule.required);
        errors.push({ field: fieldName, message: rule.required });
        isValid = false;
      } else if (rule.email && value && !this.validateEmail(value)) {
        this.showFieldError(field, rule.email);
        errors.push({ field: fieldName, message: rule.email });
        isValid = false;
      } else if (rule.password && value && !this.validatePassword(value)) {
        this.showFieldError(field, rule.password);
        errors.push({ field: fieldName, message: rule.password });
        isValid = false;
      } else if (rule.custom && !rule.custom.validator(value)) {
        this.showFieldError(field, rule.custom.message);
        errors.push({ field: fieldName, message: rule.custom.message });
        isValid = false;
      }
    });

    return { isValid, errors };
  }
}

// Initialize theme manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.themeManager = new ThemeManager();
  window.UIUtils = UIUtils;
  window.FormValidator = FormValidator;
  
  // Add smooth scrolling to all anchor links
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      e.preventDefault();
      const target = document.querySelector(this.getAttribute('href'));
      if (target) {
        target.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
      }
    });
  });

  // Add loading states to forms
  document.querySelectorAll('form').forEach(form => {
    form.addEventListener('submit', function(e) {
      const submitButton = form.querySelector('button[type="submit"]');
      if (submitButton) {
        UIUtils.showLoading(submitButton, 'Processing...');
      }
    });
  });

  // Add confirmation to delete buttons
  document.querySelectorAll('.btn-danger, [href*="/delete/"]').forEach(button => {
    button.addEventListener('click', function(e) {
      e.preventDefault();
      const action = this.textContent.toLowerCase().includes('delete') ? 'delete' : 'remove';
      UIUtils.confirmAction(
        `Are you sure you want to ${action} this item? This action cannot be undone.`,
        () => {
          if (this.tagName === 'A') {
            window.location.href = this.href;
          } else {
            this.closest('form')?.submit();
          }
        }
      );
    });
  });
});

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ThemeManager, UIUtils, FormValidator };
}