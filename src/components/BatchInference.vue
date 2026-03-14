<template>
  <div>
    <!-- Drop Zone -->
    <div
      class="relative border-2 border-dashed rounded-2xl p-10 text-center transition-all duration-200 cursor-pointer"
      :class="dragging ? 'border-violet-400 bg-violet-400/5' : 'border-gray-700 bg-gray-800/40'"
      @dragover.prevent="dragging = true"
      @dragleave="dragging = false"
      @drop.prevent="onDrop"
    >
      <input type="file" accept="image/png,image/jpeg" multiple class="absolute inset-0 opacity-0 cursor-pointer" @change="onFilesChange" />
      <div class="text-4xl mb-3 opacity-30">📂</div>
      <p class="text-sm text-gray-400"><span class="text-violet-400 font-semibold">Drag & drop images here</span> or click to browse</p>
      <p class="font-mono-dm text-xs text-gray-600 mt-2">PNG, JPG · Must be square · Multiple files</p>
    </div>

    <!-- Queue -->
    <div v-if="queue.length" class="mt-6 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
      <div v-for="item in queue" :key="item.id" class="relative bg-gray-900 border border-gray-800 rounded-xl overflow-hidden group hover:border-gray-600 transition-colors">
        <img v-if="item.preview" :src="item.preview" class="w-full h-24 object-cover" />
        <div v-else class="w-full h-24 flex items-center justify-center text-2xl bg-gray-800">🖼</div>

        <!-- Remove btn -->
        <button
          @click="removeItem(item.id)"
          class="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-black/70 text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/80"
        >✕</button>

        <div class="p-2">
          <p class="font-mono-dm text-xs text-gray-500 truncate">{{ item.name }}</p>
          <div class="flex items-center gap-1.5 mt-1">
            <span class="w-1.5 h-1.5 rounded-full flex-shrink-0" :class="dotClass(item.status)"></span>
            <span class="font-mono-dm text-xs" :class="labelClass(item.status)">{{ statusLabel(item.status) }}</span>
          </div>
          <p v-if="!item.sizeOk && item.dims" class="font-mono-dm text-xs text-orange-400 mt-0.5">Not square</p>
        </div>
      </div>
    </div>

    <!-- Controls -->
    <div v-if="queue.length" class="flex flex-wrap items-center gap-3 mt-5 pt-5 border-t border-gray-800">
      <button
        @click="runBatch"
        :disabled="running || validQueue.length === 0"
        class="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm bg-emerald-400 text-gray-950 hover:shadow-lg hover:shadow-emerald-400/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <span v-if="running" class="w-4 h-4 border-2 border-gray-900 border-t-transparent rounded-full animate-spin-slow"></span>
        <span>{{ running ? 'Processing…' : `▶ Run Batch (${validQueue.length} valid)` }}</span>
      </button>
      <button @click="clearAll" :disabled="running" class="px-4 py-2.5 rounded-xl text-sm font-bold bg-gray-800 text-gray-400 hover:text-gray-200 border border-gray-700 transition-colors disabled:opacity-40">
        Clear All
      </button>
      <div class="font-mono-dm text-xs text-gray-500 ml-auto">
        <span class="text-gray-300">{{ queue.length }}</span> total ·
        <span class="text-gray-300">{{ validQueue.length }}</span> valid ·
        <span class="text-emerald-400">{{ doneCount }}</span> done ·
        <span class="text-red-400">{{ errorCount }}</span> errors
      </div>
    </div>

    <!-- Progress -->
    <div v-if="running || (progress > 0 && progress < 100)" class="mt-4">
      <div class="flex justify-between font-mono-dm text-xs text-gray-500 mb-1.5">
        <span>{{ currentName || '…' }}</span>
        <span>{{ progress }}%</span>
      </div>
      <div class="h-1.5 bg-gray-800 rounded-full overflow-hidden">
        <div class="h-full rounded-full bg-gradient-to-r from-violet-400 to-emerald-400 transition-all duration-300 shadow-lg shadow-emerald-400/30" :style="{ width: progress + '%' }"></div>
      </div>
    </div>

    <!-- Results -->
    <div v-if="results.length" class="mt-8">
      <div class="flex items-center justify-between mb-4">
        <p class="text-xs font-bold tracking-widest uppercase text-gray-500">Results — {{ results.length }} masks</p>
        <button @click="downloadAll" :disabled="zipping" class="text-xs px-3 py-1.5 rounded-lg bg-gray-800 text-gray-400 hover:text-gray-200 border border-gray-700 transition-colors disabled:opacity-40">
          {{ zipping ? '⏳ Downloading…' : '⬇ Download All' }}
        </button>
      </div>
      <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        <div v-for="r in results" :key="r.id" class="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <div class="grid grid-cols-2">
            <img :src="r.preview" class="w-full h-20 object-cover" title="Input" />
            <img :src="r.maskUrl" class="w-full h-20 object-cover" style="filter:hue-rotate(90deg) saturate(1.5)" title="Mask" />
          </div>
          <div class="p-2.5">
            <p class="font-mono-dm text-xs text-gray-500 truncate">{{ r.name }}</p>
            <a :href="r.maskUrl" :download="'mask_' + r.name" class="inline-block mt-2 text-xs px-2.5 py-1 rounded-lg bg-gray-800 text-gray-400 hover:text-gray-200 border border-gray-700 transition-colors">
              ↓ Mask
            </a>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { postFile, checkImageSize, readAsDataURL } from '../api.js'

const queue = ref([])
const dragging = ref(false)
const running = ref(false)
const progress = ref(0)
const currentName = ref('')
const zipping = ref(false)
let uid = 0

const validQueue = computed(() => queue.value.filter(i => i.sizeOk && i.status === 'pending'))
const doneCount = computed(() => queue.value.filter(i => i.status === 'done').length)
const errorCount = computed(() => queue.value.filter(i => i.status === 'error').length)
const results = computed(() => queue.value.filter(i => i.maskUrl))

async function addFiles(files) {
  for (const file of files) {
    if (!file.type.startsWith('image/')) continue
    const item = { id: ++uid, file, name: file.name, preview: null, dims: null, sizeOk: false, status: 'pending', maskUrl: null }
    queue.value.push(item)
    readAsDataURL(file).then(url => { item.preview = url })
    const d = await checkImageSize(file)
    item.dims = d ? `${d.w}×${d.h}` : null
    item.sizeOk = d !== null && d.w === d.h
    if (!item.sizeOk) item.status = 'invalid'
  }
}

function onFilesChange(e) { addFiles(Array.from(e.target.files)); e.target.value = '' }
function onDrop(e) { dragging.value = false; addFiles(Array.from(e.dataTransfer.files)) }
function removeItem(id) { queue.value = queue.value.filter(i => i.id !== id) }
function clearAll() { queue.value = []; progress.value = 0; currentName.value = '' }

async function runBatch() {
  const toRun = queue.value.filter(i => i.sizeOk && i.status === 'pending')
  if (!toRun.length) return
  running.value = true; progress.value = 0
  let done = 0
  for (const item of toRun) {
    item.status = 'processing'; currentName.value = item.name
    try {
      const blob = await postFile(item.file)
      item.maskUrl = URL.createObjectURL(blob)
      item.status = 'done'
    } catch (err) {
      item.status = 'error'
    }
    done++
    progress.value = Math.round((done / toRun.length) * 100)
  }
  running.value = false; currentName.value = ''
}

async function downloadAll() {
  zipping.value = true
  for (const r of results.value) {
    const a = document.createElement('a')
    a.href = r.maskUrl; a.download = 'mask_' + r.name; a.click()
    await new Promise(res => setTimeout(res, 300))
  }
  zipping.value = false
}

function dotClass(s) {
  return {
    pending: 'bg-gray-600',
    processing: 'bg-violet-400 animate-pulse-dot',
    done: 'bg-emerald-400',
    error: 'bg-red-400',
    invalid: 'bg-orange-400',
  }[s] || 'bg-gray-600'
}
function labelClass(s) {
  return {
    pending: 'text-gray-500',
    processing: 'text-violet-400',
    done: 'text-emerald-400',
    error: 'text-red-400',
    invalid: 'text-orange-400',
  }[s] || 'text-gray-500'
}
function statusLabel(s) {
  return { pending: 'Pending', processing: 'Running…', done: 'Done', error: 'Error', invalid: 'Invalid' }[s] || s
}
</script>
