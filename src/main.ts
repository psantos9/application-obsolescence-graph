import { createApp } from 'vue'
import VNetworkGraph from 'v-network-graph'
import App from '@/App.vue'

import 'v-network-graph/lib/style.css'
import 'tailwindcss/tailwind.css'

createApp(App).use(VNetworkGraph).mount('#app')
