<template>
  <div class="view-escrow">
    <div class="card">
      <div class="title-section">
      <h2>View Escrow</h2>
        <a 
          v-if="escrowAddress"
          :href="`https://etherscan.io/address/${escrowAddress}`"
          target="_blank"
          rel="noopener noreferrer"
          class="etherscan-link"
        >
          View on Etherscan ↗
        </a>
      </div>
      
      <!-- Address Input -->
      <div v-if="!escrowAddress" class="form-group">
        <label for="escrowAddress">Escrow Contract Address</label>
        <input 
          type="text" 
          v-model="inputAddress" 
          placeholder="0x..." 
          class="input"
          :disabled="loading"
        />
        <button 
          @click="loadEscrowDetails" 
          class="btn btn-primary"
          :disabled="loading || !inputAddress"
        >
          {{ loading ? 'Loading...' : 'View Details' }}
        </button>
      </div>

      <!-- Escrow Details -->
      <div v-else class="escrow-details">
        <div v-if="contractDetails?.status === 'ACTIVE' || contractDetails?.status === 'LOCKED'" class="countdown-section">
          <h3>Time Remaining</h3>
          <div class="countdown-timer" :class="{ 'warning': timeRemaining < 3600 }">
            {{ formatTimeRemaining }}
          </div>
        </div>

        <div class="details-grid">
          <div class="detail-item">
            <span class="detail-label">Contract Address</span>
            <span 
              class="detail-value copyable" 
              @click="copyToClipboard(escrowAddress)"
              :title="copyStatus"
            >
              {{ formatAddress(escrowAddress) }}
              <span class="copy-icon">📋</span>
            </span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Created Date</span>
            <span class="detail-value">{{ formatDate(contractDetails.startDate) }}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Deadline</span>
            <span class="detail-value">{{ formatDate(contractDetails.deadlineDate) }}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Value Locked</span>
            <span class="detail-value">
              {{ formatEth(contractDetails.amount) }} ETH
              <span v-if="ethPrice" class="usd-value">(≈ ${{ formatUsd(contractDetails.amount) }})</span>
            </span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Status</span>
            <span class="detail-value status-container">
              <span :class="contractDetails.status.toLowerCase()">
                {{ contractDetails.status }}
              </span>
              <span 
                class="info-icon" 
                :title="getStatusDescription(contractDetails.status)"
              >
                ℹ️
              </span>
            </span>
          </div>
          <div class="detail-item" v-if="currentAccount.toLowerCase() === contractDetails.depositor.toLowerCase()">
            <span class="detail-label">Beneficiary</span>
            <span 
              class="detail-value copyable" 
              @click="copyToClipboard(contractDetails.beneficiary)"
              :title="copyStatus"
            >
              {{ formatAddress(contractDetails.beneficiary) }}
              <span class="copy-icon">📋</span>
            </span>
          </div>
          <div class="detail-item" v-if="currentAccount.toLowerCase() === contractDetails.beneficiary.toLowerCase()">
            <span class="detail-label">Depositor</span>
            <span 
              class="detail-value copyable" 
              @click="copyToClipboard(contractDetails.depositor)"
              :title="copyStatus"
            >
              {{ formatAddress(contractDetails.depositor) }}
              <span class="copy-icon">📋</span>
            </span>
          </div>
        </div>

        <!-- Available Actions -->
        <div class="actions-section">
          <h3>Available Actions</h3>
          <div class="actions-grid">
            <button 
              v-if="canRevoke"
              @click="revokeAgreement"
              class="btn btn-action btn-warning"
              :disabled="loading"
            >
              Revoke Agreement
            </button>
            <button 
              v-if="canApprove"
              @click="approveAgreement"
              class="btn btn-action btn-success"
              :disabled="loading"
            >
              Approve Agreement
            </button>
            <button 
              v-if="canReject"
              @click="rejectAgreement"
              class="btn btn-action btn-danger"
              :disabled="loading"
            >
              Reject Agreement
            </button>
            <button 
              v-if="canRefund"
              @click="refundAgreement"
              class="btn btn-action btn-warning"
              :disabled="loading"
            >
              Refund Agreement
            </button>
            <button 
              v-if="canRelease"
              @click="releaseFunds"
              class="btn btn-action btn-success"
              :disabled="loading"
            >
              Release Funds
            </button>
            <button 
              v-if="canWithdraw"
              @click="withdrawFunds"
              class="btn btn-action btn-success"
              :disabled="loading"
            >
              Withdraw Funds
            </button>
            <button 
              v-if="canRemoveFunds"
              @click="removeFunds"
              class="btn btn-action btn-success"
              :disabled="loading"
            >
              Remove Funds
            </button>
            <button 
              v-if="canLock"
              @click="lockFunds"
              class="btn btn-action btn-danger"
              :disabled="loading"
            >
              Lock Funds
            </button>
            <button 
              v-if="canSetMultisig"
              @click="setMultisig"
              class="btn btn-action"
              :disabled="loading"
            >
              Set Multisig
            </button>
            <button 
              v-if="canApproveMultisig"
              @click="approveMultisig"
              class="btn btn-action btn-success"
              :disabled="loading"
            >
              Approve Multisig
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { getWeb3, getContract, formatEth, handleError } from "../utils/web3";
import MultisigEscrowABI from "../abi/MultisigEscrow.json" with { type: "json" };

export default {
  name: 'ViewEscrow',
  props: {
    currentAccount: {
      type: String,
      required: true
    },
    address: {
      type: String,
      default: null
    }
  },
  data() {
    return {
      inputAddress: '',
      escrowAddress: null,
      contractDetails: null,
      escrowContract: null,
      loading: false,
      timeRemaining: 0,
      timer: null,
      copyStatus: 'Click to copy',
      ethPrice: null
    };
  },
  computed: {
    formatTimeRemaining() {
      if (this.timeRemaining <= 0) return 'Expired';
      
      const days = Math.floor(this.timeRemaining / (24 * 3600));
      const hours = Math.floor((this.timeRemaining % (24 * 3600)) / 3600);
      const minutes = Math.floor((this.timeRemaining % 3600) / 60);
      const seconds = this.timeRemaining % 60;
      
      if (days > 0) {
        return `${days}d ${hours}h`;
      } else {
      return `${hours}h ${minutes}m ${seconds}s`;
      }
    },
    canApprove() {
      return this.contractDetails?.status === 'FUNDED' && 
             this.currentAccount.toLowerCase() === this.contractDetails.beneficiary.toLowerCase();
    },
    canReject() {
      return this.contractDetails?.status === 'FUNDED' && 
             this.currentAccount.toLowerCase() === this.contractDetails.beneficiary.toLowerCase();
    },
    canRevoke() {
      return this.contractDetails?.status === 'FUNDED' && 
             this.currentAccount.toLowerCase() === this.contractDetails.depositor.toLowerCase();
    },
    canRefund() {
      return this.contractDetails?.status === 'ACTIVE' && 
             this.currentAccount.toLowerCase() === this.contractDetails.beneficiary.toLowerCase();
    },
    canRelease() {
      return this.contractDetails?.status === 'ACTIVE' && 
             (this.currentAccount.toLowerCase() === this.contractDetails.depositor.toLowerCase() || 
              (this.currentAccount.toLowerCase() === this.contractDetails.beneficiary.toLowerCase() && 
                this.contractDetails.deadlineDate + (3 * 24 * 60 * 60) < Date.now() / 1000));
    },
    canWithdraw() {
      return this.contractDetails?.status === 'CLOSED' && 
             this.currentAccount.toLowerCase() === this.contractDetails.beneficiary.toLowerCase() && 
             parseFloat(this.contractDetails.amount) !== 0;
    },
    canRemoveFunds() {
      return ['REVOKED', 'REJECTED', 'REFUNDED'].includes(this.contractDetails?.status) && 
             this.currentAccount.toLowerCase() === this.contractDetails.depositor.toLowerCase() &&
             parseFloat(this.contractDetails.amount) !== 0;
    },
    canLock() {
      const now = Math.floor(Date.now() / 1000);
      const deadline = this.contractDetails?.deadlineDate;
      const threeDaysAfterDeadline = deadline + (3 * 24 * 60 * 60);
      return this.contractDetails?.status === 'ACTIVE' && 
             this.currentAccount.toLowerCase() === this.contractDetails.depositor.toLowerCase() &&
             now > deadline &&
             now < threeDaysAfterDeadline;
    },
    canSetMultisig() {
      return this.contractDetails?.status === 'LOCKED' && 
             this.currentAccount.toLowerCase() === this.contractDetails.beneficiary.toLowerCase() &&
             !this.contractDetails.approved;
    },
    canApproveMultisig() {
      return this.contractDetails?.status === 'LOCKED' && 
             this.currentAccount.toLowerCase() === this.contractDetails.depositor.toLowerCase() &&
             this.contractDetails.multisig.toLowerCase() !== '0x0000000000000000000000000000000000000000' &&
             !this.contractDetails.approved;
    },
  },
  watch: {
    address: {
      immediate: true,
      handler(newAddress) {
        if (newAddress && newAddress !== 'new') {
          this.inputAddress = newAddress;
          this.loadEscrowDetails();
        }
      }
    }
  },
  methods: {
    async loadEscrowDetails() {
      try {
        this.loading = true;

        this.web3 = await getWeb3();
        this.escrowContract = await getContract(
          this.web3,
          MultisigEscrowABI,
          this.inputAddress
        );

        const details = await this.escrowContract.methods.getAgreementDetails().call(
            { from: this.currentAccount }
        );
        
        this.contractDetails = {
          amount: this.web3.utils.fromWei(details[0], 'ether'),
          startDate: parseInt(details[1]),
          deadlineDate: parseInt(details[2]),
          status: this.getStatusString(parseInt(details[3])),
          depositor: details[4],
          beneficiary: details[5],
          multisig: details[6],
          approved: details[7],
        };

        console.log('Contract Details:', this.contractDetails);

        this.escrowAddress = this.inputAddress;
        this.startCountdown();
      } catch (error) {
        console.error('Load escrow details error:', error);
        handleError(error, "Failed to load escrow details");
      } finally {
        this.loading = false;
      }
    },

    startCountdown() {
      if (this.timer) clearInterval(this.timer);
      
      this.timer = setInterval(() => {
        const now = Math.floor(Date.now() / 1000);
        if (this.contractDetails.status === 'LOCKED') {
          const deadline = this.contractDetails.deadlineDate;
          const threeDaysAfterDeadline = deadline + (3 * 24 * 60 * 60);
          this.timeRemaining = Math.max(0, threeDaysAfterDeadline - now);
        } else {
        this.timeRemaining = Math.max(0, this.contractDetails.deadlineDate - now);
        }
        
        if (this.timeRemaining <= 0) {
          clearInterval(this.timer);
        }
      }, 1000);
    },

    formatAddress(address) {
      return `${address.slice(0, 6)}...${address.slice(-4)}`;
    },

    formatDate(timestamp) {
      if (!timestamp) return 'N/A';
      const date = new Date(timestamp * 1000);
      return date.toLocaleString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    },

    formatEth(amount) {
      return formatEth(amount);
    },

    getStatusString(statusInt) {
      const statusMap = {
        0: 'FUNDED',
        1: 'REVOKED',
        2: 'REJECTED',
        3: 'ACTIVE',
        4: 'REFUNDED',
        5: 'CLOSED',
        6: 'LOCKED'
      };
      return statusMap[statusInt] || 'UNKNOWN';
    },

    getStatusDescription(status) {
      const descriptions = {
        'FUNDED': 'Initial state when funds are deposited but not yet approved by the beneficiary',
        'REVOKED': 'Contract was revoked by the depositor before beneficiary approval',
        'REJECTED': 'Contract was rejected by the beneficiary',
        'ACTIVE': 'Contract is active and funds are locked until deadline',
        'REFUNDED': 'Funds were refunded to the depositor',
        'CLOSED': 'Contract is completed and funds were released to the beneficiary',
        'LOCKED': 'Contract is locked after deadline, waiting for multisig setup'
      };
      return descriptions[status] || 'Unknown status';
    },

    // Contract Actions
    async revokeAgreement() {
      try {
        this.loading = true;
        await this.escrowContract.methods.revokeAgreement().send({ from: this.currentAccount });
        await this.loadEscrowDetails();
      } catch (error) {
        handleError(error, "Failed to revoke agreement");
      } finally {
        this.loading = false;
      }
    },

    async approveAgreement() {
      try {
        this.loading = true;
        await this.escrowContract.methods.approveAgreement().send({ from: this.currentAccount });
        await this.loadEscrowDetails();
      } catch (error) {
        handleError(error, "Failed to approve agreement");
      } finally {
        this.loading = false;
      }
    },

    async rejectAgreement() {
      try {
        this.loading = true;
        await this.escrowContract.methods.rejectAgreement().send({ from: this.currentAccount });
        await this.loadEscrowDetails();
      } catch (error) {
        handleError(error, "Failed to reject agreement");
      } finally {
        this.loading = false;
      }
    },

    async refundAgreement() {
      try {
        this.loading = true;
        await this.escrowContract.methods.refundAgreement().send({ from: this.currentAccount });
        await this.loadEscrowDetails();
      } catch (error) {
        handleError(error, "Failed to refund agreement");
      } finally {
        this.loading = false;
      }
    },

    async releaseFunds() {
      try {
        this.loading = true;
        await this.escrowContract.methods.releaseFunds().send({ from: this.currentAccount });
        await this.loadEscrowDetails();
      } catch (error) {
        handleError(error, "Failed to release funds");
      } finally {
        this.loading = false;
      }
    },

    async withdrawFunds() {
      try {
        this.loading = true;
        await this.escrowContract.methods.withdrawFunds().send({ from: this.currentAccount });
        await this.loadEscrowDetails();
      } catch (error) {
        handleError(error, "Failed to withdraw funds");
      } finally {
        this.loading = false;
      }
    },

    async removeFunds() {
      try {
        this.loading = true;
        await this.escrowContract.methods.removeFunds().send({ from: this.currentAccount });
        await this.loadEscrowDetails();
      } catch (error) {
        handleError(error, "Failed to remove funds");
      } finally {
        this.loading = false;
      }
    },

    async lockFunds() {
      try {
        this.loading = true;
        await this.escrowContract.methods.lockFunds().send({ from: this.currentAccount });
        await this.loadEscrowDetails();
      } catch (error) {
        handleError(error, "Failed to lock funds");
      } finally {
        this.loading = false;
      }
    },

    async setMultisig(multisigAddress) {
      try {
        this.loading = true;
        await this.escrowContract.methods.setMultisig(multisigAddress).send({ from: this.currentAccount });
        await this.loadEscrowDetails();
      } catch (error) {
        handleError(error, "Failed to set multisig");
      } finally {
        this.loading = false;
      }
    },

    async approveMultisig() {
      try {
        this.loading = true;
        await this.escrowContract.methods.approveMultisig().send({ from: this.currentAccount });
        await this.loadEscrowDetails();
      } catch (error) {
        handleError(error, "Failed to approve multisig");
      } finally {
        this.loading = false;
      }
    },

    async copyToClipboard(text) {
      try {
        await navigator.clipboard.writeText(text);
        this.copyStatus = 'Copied!';
        setTimeout(() => {
          this.copyStatus = 'Click to copy';
        }, 2000);
      } catch (err) {
        console.error('Failed to copy:', err);
        this.copyStatus = 'Failed to copy';
      }
    },

    async fetchEthPrice() {
      try {
        const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd');
        const data = await response.json();
        this.ethPrice = data.ethereum.usd;
      } catch (error) {
        console.error('Failed to fetch ETH price:', error);
      }
    },

    formatUsd(ethAmount) {
      if (!this.ethPrice) return '0.00';
      const usdValue = parseFloat(ethAmount) * this.ethPrice;
      return usdValue.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      });
    },
  },
  async created() {
    await this.fetchEthPrice();
    // Update price every 5 minutes
    setInterval(this.fetchEthPrice, 5 * 60 * 1000);
  },
  beforeUnmount() {
    if (this.timer) clearInterval(this.timer);
  }
};
</script>

<style scoped>
.view-escrow {
  max-width: 800px;
  margin: 2rem auto;
}

.card {
  background: white;
  border-radius: 12px;
  padding: 2rem;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.form-group {
  margin-bottom: 1.5rem;
}

.input {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 8px;
  margin-bottom: 1rem;
}

.countdown-section {
  text-align: center;
  margin-bottom: 2rem;
}

.countdown-timer {
  font-size: 2rem;
  font-weight: bold;
  color: #4CAF50;
  margin: 1rem 0;
}

.countdown-timer.warning {
  color: #f44336;
}

.details-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 2rem;
}

.detail-item {
  padding: 1rem;
  background: #f5f5f5;
  border-radius: 8px;
}

.detail-label {
  display: block;
  font-size: 0.9rem;
  color: #666;
  margin-bottom: 0.5rem;
}

.detail-value {
  font-weight: 500;
}

.actions-section {
  margin-top: 2rem;
}

.actions-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  margin-top: 1rem;
}

.btn {
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
  border: none;
  font-weight: 500;
  width: fit-content;
  white-space: nowrap;
  text-align: center;
}

.btn-primary {
  background: #4CAF50;
  color: white;
}

.btn-action {
  background: #2196F3;
  color: white;
}

.btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
}

.title-section {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
}

.title-section h2 {
  margin: 0;
}

.etherscan-link {
  color: #2196F3;
  text-decoration: none;
  font-size: 0.9rem;
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.etherscan-link:hover {
  text-decoration: underline;
}

.btn-success {
  background: #4CAF50;
  color: white;
}

.btn-danger {
  background: #f44336;
  color: white;
}

.btn-warning {
  background: #ffc107;
  color: #000;
}

.copyable {
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.2s ease;
}

.copyable:hover {
  opacity: 0.8;
}

.copy-icon {
  font-size: 0.9em;
  opacity: 0.7;
}

.status-container {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.info-icon {
  cursor: help;
  opacity: 0.7;
  transition: opacity 0.2s ease;
}

.info-icon:hover {
  opacity: 1;
}

.usd-value {
  color: #666;
  font-size: 0.9em;
  margin-left: 0.5rem;
}
</style> 