<template>
  <div class="min-h-screen flex flex-col">
    <!-- Header -->
    <header class="sticky top-0 z-50 flex items-center justify-between px-8 py-4 border-b border-gray-800 bg-gray-950/90 backdrop-blur-md">
      <div class="flex items-center gap-3">
        <div class="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-emerald-400 flex items-center justify-center font-mono-dm text-sm font-medium text-white">AU</div>
        <div>
          <p class="text-lg font-extrabold tracking-tight leading-tight">Enhanced AAU-<span class="text-emerald-400">Net</span></p>
          <p class="text-xs text-gray-500 font-mono-dm leading-tight">Breast Lesion Segmentation</p>
        </div>
      </div>

      <!-- API Status Lamp -->
      <div class="flex items-center gap-2.5 bg-gray-900 border border-gray-800 rounded-full px-4 py-2">
        <!-- Checking -->
        <template v-if="apiStatus === 'checking'">
          <span class="w-2 h-2 rounded-full bg-gray-500 animate-pulse-dot"></span>
          <span class="font-mono-dm text-xs text-gray-500">Checking…</span>
        </template>
        <!-- Online -->
        <template v-else-if="apiStatus === 'online'">
          <span class="relative flex w-2 h-2">
            <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60"></span>
            <span class="relative inline-flex w-2 h-2 rounded-full bg-emerald-400"></span>
          </span>
          <span class="font-mono-dm text-xs text-emerald-400">API Online</span>
        </template>
        <!-- Timeout (cold start) -->
        <template v-else-if="apiStatus === 'timeout'">
          <span class="relative flex w-2 h-2">
            <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-60"></span>
            <span class="relative inline-flex w-2 h-2 rounded-full bg-yellow-400"></span>
          </span>
          <span class="font-mono-dm text-xs text-yellow-400">Cold Starting…</span>
        </template>
        <!-- Offline -->
        <template v-else>
          <span class="w-2 h-2 rounded-full bg-red-400"></span>
          <span class="font-mono-dm text-xs text-red-400">API Offline</span>
        </template>

        <!-- Refresh button -->
        <button @click="checkApi" class="ml-1 text-gray-600 hover:text-gray-400 transition-colors" title="Recheck">
          <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" :class="apiStatus === 'checking' ? 'animate-spin-slow' : ''" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <path d="M21 2v6h-6M3 12a9 9 0 0 1 15-6.7L21 8M3 22v-6h6M21 12a9 9 0 0 1-15 6.7L3 16"/>
          </svg>
        </button>
      </div>
    </header>

    <!-- Tabs -->
    <div class="px-8 pt-8">
      <div class="inline-flex bg-gray-900 border border-gray-800 rounded-xl p-1 gap-1">
        <button
          v-for="t in tabs" :key="t.id"
          @click="activeTab = t.id"
          class="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold transition-all duration-200"
          :class="activeTab === t.id
            ? 'bg-gray-800 text-gray-100 shadow'
            : 'text-gray-500 hover:text-gray-300'"
        >
          <span>{{ t.icon }}</span>
          {{ t.label }}
        </button>
      </div>
    </div>

    <!-- Content -->
    <main class="flex-1 px-8 py-8 max-w-7xl w-full mx-auto">
      <SingleInference v-if="activeTab === 'single'" />
      <BatchInference v-if="activeTab === 'batch'" />
    </main>

    <!-- Footer -->
    <footer class="border-t border-gray-800 px-8 py-4 flex items-center justify-between bg-gray-950">
      <p class="text-xs text-gray-500 font-mono-dm">© 2026 Rachmawan and Lyla</p>
      <img
        src="/brin_logo.png"
        alt="BRIN Logo"
        class="h-8 object-contain opacity-80 hover:opacity-100 transition-opacity"
      />
    </footer>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import SingleInference from './components/SingleInference.vue'
import BatchInference from './components/BatchInference.vue'
import { pingEndpoint } from './api.js'

const activeTab = ref('single')
const tabs = [
  { id: 'single', icon: '🔬', label: 'Single Inference' },
  { id: 'batch',  icon: '📂', label: 'Batch Inference'  },
]

const apiStatus = ref('checking') // 'checking' | 'online' | 'offline' | 'timeout'

async function checkApi() {
  apiStatus.value = 'checking'
  apiStatus.value = await pingEndpoint()
}

onMounted(() => checkApi())
</script>