<template>
  <div class="app">
    <!-- Global Error Component -->
    <GlobalError />
    
    <header class="header">
      <div class="header-content">
        <div class="title-section">
          <h1>🔗 Multisig Escrow</h1>
          <p class="subtitle">Secure and transparent multisig escrow service</p>
        </div>
        <div class="connection-status">
          <button 
            class="menu-toggle"
            @click="toggleMenu"
            :class="{ active: isMenuOpen }"
          >
            <span></span>
            <span></span>
            <span></span>
          </button>
          <div class="mobile-menu" :class="{ active: isMenuOpen }">
            <div v-if="currentAccount" class="account-info">
              <span class="account-label">Account:</span>
              <span class="account-address">{{ formatAddress(currentAccount) }}</span>
            </div>
            <div class="status-indicator" :class="{ connected: isConnected }">
              <span class="status-dot" :class="{ connected: isConnected }">●</span>
              <span class="status-text">{{ isConnected ? 'Connected' : 'Disconnected' }}</span>
            </div>
            <button 
              v-if="!isConnected" 
              @click="connectWallet" 
              class="btn btn-connect"
              :disabled="loading"
            >
              Connect Wallet
            </button>
            <button 
              v-if="isConnected" 
              @click="disconnectWallet" 
              class="btn btn-disconnect"
              :disabled="loading"
            >
              Disconnect
            </button>
          </div>
        </div>
      </div>
    </header>

    <main class="main-content">
      <router-view 
        v-if="isConnected"
        :current-account="currentAccount"
        @create-escrow="handleCreateEscrow"
        @escrow-created="handleEscrowCreated"
      />
    </main>
  </div>
</template>

<script>
import { getWeb3, handleError } from "./utils/web3";
import InitView from './components/InitView.vue';
import CreateEscrow from './components/CreateEscrow.vue';
import ViewEscrow from './components/ViewEscrow.vue';
import GlobalError from './components/GlobalError.vue';

export default {
  name: 'App',
  components: {
    InitView,
    CreateEscrow,
    ViewEscrow,
    GlobalError
  },
  data() {
    return {
      isConnected: false,
      currentAccount: null,
      loading: false,
      isMenuOpen: false
    };
  },
  methods: {
    toggleMenu() {
      this.isMenuOpen = !this.isMenuOpen;
    },
    async connectWallet() {
      try {
        this.loading = true;
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        this.currentAccount = accounts[0];
        this.isConnected = true;
        await this.initializeWeb3();
      } catch (error) {
        handleError(error, "Failed to connect wallet");
      } finally {
        this.loading = false;
      }
    },

    async initializeWeb3() {
      try {
        await getWeb3();
      } catch (error) {
        handleError(error, "Failed to initialize Web3");
      }
    },

    async disconnectWallet() {
      try {
        this.loading = true;
        this.isConnected = false;
        this.currentAccount = null;
        this.$router.push('/');
      } catch (error) {
        handleError(error, "Failed to disconnect wallet");
      } finally {
        this.loading = false;
      }
    },

    formatAddress(address) {
      return `${address.slice(0, 6)}...${address.slice(-4)}`;
    },

    handleCreateEscrow() {
      this.$router.push('/create');
    },

    handleEscrowCreated(escrowAddress) {
      this.$router.push(`/view/${escrowAddress}`);
    }
  },

  async created() {
    // Check if wallet is already connected
    if (window.ethereum) {
      const accounts = await window.ethereum.request({ method: 'eth_accounts' });
      if (accounts.length > 0) {
        this.isConnected = true;
        this.currentAccount = accounts[0];
        await this.initializeWeb3();
      }
    }
  }
};
</script>

<style>
.app {
  min-height: 100vh;
  background: #f5f5f5;
}

.header {
  background: white;
  padding: 1rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.header-content {
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.title-section h1 {
  margin: 0;
  font-size: 1.5rem;
  color: #333;
}

.subtitle {
  margin: 0.5rem 0 0;
  color: #666;
  font-size: 0.9rem;
}

.connection-status {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.account-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.account-label {
  color: #666;
}

.account-address {
  font-family: monospace;
  color: #333;
}

.status-indicator {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.status-dot {
  color: #f44336;
}

.status-dot.connected {
  color: #4CAF50;
}

.status-text {
  color: #666;
}

.btn {
  padding: 0.5rem 1rem;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
  border: none;
  font-weight: 500;
}

.btn-connect {
  background: #4CAF50;
  color: white;
}

.btn-disconnect {
  background: #f44336;
  color: white;
}

.btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.error-message {
  background: #ffebee;
  color: #c62828;
  padding: 1rem;
  margin: 1rem;
  border-radius: 8px;
  text-align: center;
}

.main-content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem 1rem;
}

.menu-toggle {
  display: none;
  flex-direction: column;
  justify-content: space-between;
  width: 30px;
  height: 21px;
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  z-index: 10;
}

.menu-toggle span {
  display: block;
  width: 100%;
  height: 3px;
  background: #333;
  border-radius: 3px;
  transition: all 0.3s ease;
}

.menu-toggle.active span:nth-child(1) {
  transform: translateY(9px) rotate(45deg);
}

.menu-toggle.active span:nth-child(2) {
  opacity: 0;
}

.menu-toggle.active span:nth-child(3) {
  transform: translateY(-9px) rotate(-45deg);
}

.mobile-menu {
  display: flex;
  align-items: center;
  gap: 1rem;
}

@media (max-width: 768px) {
  .menu-toggle {
    display: flex;
  }

  .mobile-menu {
    position: fixed;
    top: 0;
    right: 0;
    width: 100%;
    height: 100vh;
    background: white;
    flex-direction: column;
    padding-top: 5rem;
    transform: translateX(100%);
    transition: transform 0.3s ease;
    z-index: 5;
    display: flex;
    align-items: center;
    text-align: center;
  }

  .mobile-menu .account-info,
  .mobile-menu .status-indicator {
    width: 100%;
    justify-content: center;
  }

  .mobile-menu .btn {
    width: 200px;
  }

  .mobile-menu.active {
    transform: translateX(0);
  }

  .subtitle {
    display: none;
  }

  .header-content {
    padding: 0 1rem;
  }

  .title-section h1 {
    font-size: 1.25rem;
  }
}
</style>