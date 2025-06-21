<template>
  <div class="init-view">
    <div class="card">
      <h2>Welcome to Multisig Escrow</h2>
      <p class="subtitle">Choose an action to get started</p>
      
      <div class="actions-grid">
        <router-link 
          to="/create" 
          class="btn btn-primary"
        >
          Create Escrow
        </router-link>
        <router-link 
          to="/view/new" 
          class="btn btn-secondary"
        >
          View Escrow
        </router-link>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'InitView'
}
</script>

<style scoped>
.init-view {
  max-width: 600px;
  margin: 2rem auto;
}

.card {
  background: white;
  border-radius: 12px;
  padding: 2rem;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  text-align: center;
}

.subtitle {
  color: #666;
  margin-bottom: 2rem;
}

.actions-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  margin-top: 2rem;
}

.btn {
  padding: 1rem 2rem;
  font-size: 1.1rem;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
  text-decoration: none;
  display: inline-block;
  text-align: center;
}

.btn-primary {
  background: #4CAF50;
  color: white;
  border: none;
}

.btn-secondary {
  background: #2196F3;
  color: white;
  border: none;
}

.btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
}
</style> 