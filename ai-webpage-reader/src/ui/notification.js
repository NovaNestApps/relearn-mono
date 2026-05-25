/**
 * Notification UI
 * Shows non-intrusive notifications to users
 * 
 * Why: Better UX than alert() - can be dismissed, styled, positioned
 */

class Notification {
  constructor() {
    this.container = null;
    this.currentNotification = null;
  }

  /**
   * Show a notification
   * @param {string} message - Message to display
   * @param {string} type - 'info', 'success', 'error', 'loading'
   * @param {number} duration - Auto-dismiss after ms (0 = no auto-dismiss)
   */
  show(message, type = 'info', duration = 5000) {
    // Create container if it doesn't exist
    if (!this.container) {
      this.createContainer();
    }

    // Remove existing notification
    if (this.currentNotification) {
      this.currentNotification.remove();
    }

    // Create notification element
    const notification = document.createElement('div');
    notification.className = `ai-reader-notification ai-reader-notification-${type}`;
    
    // Add icon based on type
    const icon = this.getIcon(type);
    
    notification.innerHTML = `
      <div class="ai-reader-notification-content">
        <span class="ai-reader-notification-icon">${icon}</span>
        <span class="ai-reader-notification-message">${message}</span>
        ${type !== 'loading' ? '<button class="ai-reader-notification-close">×</button>' : ''}
      </div>
    `;

    // Add to container
    this.container.appendChild(notification);
    this.currentNotification = notification;

    // Close button handler
    const closeBtn = notification.querySelector('.ai-reader-notification-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.hide());
    }

    // Auto-dismiss
    if (duration > 0 && type !== 'loading') {
      setTimeout(() => this.hide(), duration);
    }

    // Animate in
    setTimeout(() => notification.classList.add('show'), 10);

    return notification;
  }

  /**
   * Hide current notification
   */
  hide() {
    if (this.currentNotification) {
      this.currentNotification.classList.remove('show');
      setTimeout(() => {
        if (this.currentNotification) {
          this.currentNotification.remove();
          this.currentNotification = null;
        }
      }, 300);
    }
  }

  /**
   * Show loading notification
   */
  showLoading(message = 'Processing...') {
    return this.show(message, 'loading', 0);
  }

  /**
   * Show success notification
   */
  showSuccess(message, duration = 3000) {
    return this.show(message, 'success', duration);
  }

  /**
   * Show error notification
   */
  showError(message, duration = 5000) {
    return this.show(message, 'error', duration);
  }

  /**
   * Show info notification
   */
  showInfo(message, duration = 4000) {
    return this.show(message, 'info', duration);
  }

  /**
   * Create notification container
   */
  createContainer() {
    this.container = document.createElement('div');
    this.container.id = 'ai-reader-notification-container';
    document.body.appendChild(this.container);
  }

  /**
   * Get icon for notification type
   */
  getIcon(type) {
    const icons = {
      info: 'ℹ️',
      success: '✅',
      error: '❌',
      loading: '⏳'
    };
    return icons[type] || icons.info;
  }
}

// Make available globally
if (typeof window !== 'undefined') {
  window.NotificationUI = new Notification();
}