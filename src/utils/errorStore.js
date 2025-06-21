import { reactive } from 'vue';

// Global error store
const errorStore = reactive({
  error: null,
  showError: false,
  errorTimeout: null
});

/**
 * Show a global error message
 * @param {string} message - The error message to display
 * @param {number} duration - Duration in milliseconds to show the error (default: 5000)
 */
export const showGlobalError = (message, duration = 5000) => {
  // Clear any existing timeout
  if (errorStore.errorTimeout) {
    clearTimeout(errorStore.errorTimeout);
  }
  
  errorStore.error = message;
  errorStore.showError = true;
  
  // Auto-hide after duration
  errorStore.errorTimeout = setTimeout(() => {
    hideGlobalError();
  }, duration);
};

/**
 * Hide the global error message
 */
export const hideGlobalError = () => {
  errorStore.showError = false;
  errorStore.error = null;
  if (errorStore.errorTimeout) {
    clearTimeout(errorStore.errorTimeout);
    errorStore.errorTimeout = null;
  }
};

/**
 * Get the current error state
 */
export const getErrorState = () => {
  return {
    error: errorStore.error,
    showError: errorStore.showError
  };
};

export default errorStore; 