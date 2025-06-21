<template>
  <div class="create-escrow">
    <div class="card">
      <h2>Deploy New Multisig Escrow</h2>
      <form @submit.prevent="deployContract" class="form">
        <div class="form-group">
          <label for="beneficiary">Beneficiary Address</label>
          <input 
            type="text" 
            v-model="beneficiary" 
            placeholder="0x..." 
            required 
            class="input"
            :disabled="loading"
          />
        </div>

        <div class="form-group">
          <label for="amount">Amount (ETH)</label>
          <input 
            type="number" 
            v-model="amount" 
            placeholder="0.1" 
            required 
            class="input"
            step="0.000000000000000001"
            min="0"
            :disabled="loading"
          />
        </div>

        <div class="form-group">
          <label for="deadline">Deadline</label>
          <input 
            type="datetime-local" 
            v-model="deadlineDate" 
            :min="getCurrentDateTime()"
            required 
            class="input"
            :disabled="loading"
            @change="updateDeadlineTimestamp"
          />
        </div>

        <button 
          type="submit" 
          class="btn btn-primary"
          :disabled="loading"
        >
          {{ loading ? 'Deploying...' : 'Deploy Contract' }}
        </button>
      </form>
    </div>
  </div>
</template>

<script>
import { getWeb3, getContract, handleError } from "../utils/web3";
import MultisigEscrowFactoryABI from "../abi/MultisigEscrowFactory.json" with { type: "json" };

export default {
  name: 'CreateEscrow',
  props: {
    currentAccount: {
      type: String,
      required: true
    }
  },
  data() {
    return {
      web3: null,
      beneficiary: "",
      amount: "",
      deadlineDate: "",
      deadlineTimestamp: 0,
      loading: false,
      factoryContract: null
    };
  },
  methods: {
    async initializeContracts() {
      try {
        this.web3 = await getWeb3();
        const factoryAddress = import.meta.env.VITE_FACTORY_ADDRESS;
        this.factoryContract = await getContract(
          this.web3,
          MultisigEscrowFactoryABI,
          factoryAddress
        );
      } catch (error) {
        handleError(error, "Failed to initialize contracts");
      }
    },

    async deployContract() {
      try {
        this.loading = true;

        if (!this.factoryContract) {
          await this.initializeContracts();
        }

        // Convert deadline to Unix timestamp (seconds)
        const deadlineTimestamp = Math.floor(new Date(this.deadlineDate).getTime() / 1000);
        
        if (!deadlineTimestamp || deadlineTimestamp <= Math.floor(Date.now() / 1000)) {
          throw new Error("Deadline must be in the future");
        }

        console.log('Deploying contract with params:', {
          beneficiary: this.beneficiary,
          deadlineTimestamp,
          amount: this.amount,
          from: this.currentAccount
        });

        // Send the transaction
        const tx = await this.factoryContract.methods.createEscrow(
          this.beneficiary,
          deadlineTimestamp
        ).send({ 
          from: this.currentAccount,
          value: this.web3.utils.toWei(this.amount, 'ether'),
          gas: 5000000
        });

        console.log('Transaction sent:', tx);

        if (!tx || !tx.events) {
          throw new Error("Transaction failed or no events emitted");
        }

        // Get the EscrowCreated event from the transaction events
        const event = tx.events.EscrowCreated;
        if (!event) {
          console.error('Transaction events:', tx.events);
          throw new Error("EscrowCreated event not found in transaction");
        }

        const escrowAddress = event.returnValues.escrow;
        console.log('Escrow address from event:', escrowAddress);

        if (!escrowAddress) {
          throw new Error("No escrow address in event");
        }

        // Verify the contract was deployed
        const code = await this.web3.eth.getCode(escrowAddress);
        if (code === '0x' || code === '') {
          throw new Error("Contract deployment failed - no code at address");
        }

        console.log('Contract code length:', code.length);
        
        // Emit success event with the escrow address
        this.$emit('escrow-created', escrowAddress);
        
        // Clear form
        this.beneficiary = "";
        this.amount = "";
        this.deadlineDate = "";
        this.deadlineTimestamp = 0;
      } catch (error) {
        console.error('Deploy contract error:', error);
        if (error.data) {
          console.error('Error data:', error.data);
        }
        handleError(error, "Failed to deploy contract");
      } finally {
        this.loading = false;
      }
    },

    getCurrentDateTime() {
      const now = new Date();
      return now.toISOString().slice(0, 16);
    },

    updateDeadlineTimestamp() {
      if (this.deadlineDate) {
        const date = new Date(this.deadlineDate);
        this.deadlineTimestamp = Math.floor(date.getTime() / 1000);
      }
    }
  }
};
</script>

<style scoped>
.create-escrow {
  max-width: 600px;
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

.btn {
  width: 100%;
  padding: 1rem;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
  border: none;
  font-weight: 500;
  font-size: 1.1rem;
}

.btn-primary {
  background: #4CAF50;
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
</style> 