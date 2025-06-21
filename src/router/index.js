import { createRouter, createWebHistory } from 'vue-router'
import InitView from '../components/InitView.vue'
import CreateEscrow from '../components/CreateEscrow.vue'
import ViewEscrow from '../components/ViewEscrow.vue'

const routes = [
  {
    path: '/',
    name: 'init',
    component: InitView
  },
  {
    path: '/create',
    name: 'create',
    component: CreateEscrow
  },
  {
    path: '/view/:address',
    name: 'view',
    component: ViewEscrow,
    props: true
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router 