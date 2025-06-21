<template>
  <Transition name="error-slide">
    <div v-if="showError" class="global-error">
      <div class="error-content">
        <div class="error-icon">⚠️</div>
        <div class="error-message">{{ error }}</div>
        <button @click="hideError" class="error-close">×</button>
      </div>
    </div>
  </Transition>
</template>

<script>
import { computed } from 'vue';
import errorStore, { hideGlobalError } from '../utils/errorStore';

export default {
  name: 'GlobalError',
  setup() {
    const showError = computed(() => errorStore.showError);
    const error = computed(() => errorStore.error);

    const hideError = () => {
      hideGlobalError();
    };

    return {
      showError,
      error,
      hideError
    };
  }
};
</script>

<style scoped>
.global-error {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 9999;
  max-width: 400px;
  min-width: 300px;
}

.error-content {
  background: #f44336;
  color: white;
  padding: 1rem;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  display: flex;
  align-items: center;
  gap: 0.75rem;
  animation: slideIn 0.3s ease-out;
}

.error-icon {
  font-size: 1.2rem;
  flex-shrink: 0;
}

.error-message {
  flex: 1;
  font-size: 0.9rem;
  line-height: 1.4;
  word-wrap: break-word;
}

.error-close {
  background: none;
  border: none;
  color: white;
  font-size: 1.5rem;
  cursor: pointer;
  padding: 0;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: background-color 0.2s ease;
  flex-shrink: 0;
}

.error-close:hover {
  background: rgba(255, 255, 255, 0.2);
}

/* Transition animations */
.error-slide-enter-active,
.error-slide-leave-active {
  transition: all 0.3s ease;
}

.error-slide-enter-from {
  transform: translateX(100%);
  opacity: 0;
}

.error-slide-leave-to {
  transform: translateX(100%);
  opacity: 0;
}

@keyframes slideIn {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

/* Responsive design */
@media (max-width: 768px) {
  .global-error {
    top: 10px;
    right: 10px;
    left: 10px;
    max-width: none;
    min-width: auto;
  }
  
  .error-content {
    padding: 0.75rem;
  }
  
  .error-message {
    font-size: 0.85rem;
  }
}
</style> 