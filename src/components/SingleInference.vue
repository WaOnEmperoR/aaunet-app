<template>
  <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
    <!-- INPUT PANEL -->
    <div class="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
      <div class="flex items-center justify-between px-5 py-4 border-b border-gray-800">
        <span class="text-xs font-bold tracking-widest uppercase text-gray-500">Input Image</span>
        <button v-if="file" @click="clear" class="text-xs px-3 py-1.5 rounded-lg bg-gray-800 text-gray-400 hover:text-gray-200 transition-colors">
          Clear
        </button>
      </div>
      <div class="p-5">
        <!-- Drop Zone -->
        <div
          class="relative border-2 border-dashed rounded-xl min-h-60 flex items-center justify-center transition-all duration-200 cursor-pointer"
          :class="[
            dragging ? 'border-emerald-400 bg-emerald-400/5' : 'border-gray-700 bg-gray-800/50',
            preview ? 'border-solid border-gray-700' : ''
          ]"
          @dragover.prevent="dragging = true"
          @dragleave="dragging = false"
          @drop.prevent="onDrop"
          @click="!preview && $refs.fileInput.click()"
        >
          <input ref="fileInput" type="file" accept="image/png,image/jpeg" class="hidden" @change="onFileChange" />
          <img v-if="preview" :src="preview" class="w-full h-60 object-contain rounded-lg" />
          <div v-else class="text-center pointer-events-none">
            <div class="text-4xl mb-3 opacity-30">👩</div>
            <p class="text-sm text-gray-400"><span class="text-emerald-400 font-semibold">Click or drag</span> to upload</p>
            <p class="text-xs text-gray-600 mt-1 font-mono-dm">PNG / JPG — image must be square</p>
          </div>
        </div>

        <!-- File Meta -->
        <div v-if="file" class="flex flex-wrap gap-2 mt-3">
          <span class="font-mono-dm text-xs px-2 py-1 rounded" :class="sizeOk ? 'bg-emerald-400/10 text-emerald-400 border border-emerald-400/20' : 'bg-red-400/10 text-red-400 border border-red-400/20'">
            {{ dims || '?×?' }}
          </span>
          <span class="font-mono-dm text-xs px-2 py-1 rounded bg-violet-400/10 text-violet-400 border border-violet-400/20">{{ file.name }}</span>
          <span class="font-mono-dm text-xs px-2 py-1 rounded bg-violet-400/10 text-violet-400 border border-violet-400/20">{{ (file.size / 1024).toFixed(1) }} KB</span>
        </div>
        <p v-if="file && !sizeOk" class="text-xs text-red-400 font-mono-dm mt-2">⚠ Image must be square (width = height)</p>

        <!-- Actions -->
        <div class="flex gap-3 mt-4">
          <button
            @click="runInference"
            :disabled="!file || !sizeOk || loading"
            class="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all duration-200 bg-emerald-400 text-gray-950 hover:shadow-lg hover:shadow-emerald-400/20 hover:-translate-y-0.5 disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none"
          >
            <span v-if="loading" class="w-4 h-4 border-2 border-gray-900 border-t-transparent rounded-full animate-spin-slow"></span>
            <span>{{ loading ? 'Running…' : '▶ Run Inference' }}</span>
          </button>
          <button @click="$refs.fileInput.click()" class="px-4 py-2.5 rounded-xl text-sm font-bold bg-gray-800 text-gray-400 hover:text-gray-200 border border-gray-700 transition-colors">
            Change
          </button>
        </div>

        <!-- Status -->
        <div v-if="status" class="flex items-center gap-2 mt-3 px-4 py-2.5 rounded-lg font-mono-dm text-xs" :class="{
          'bg-violet-400/10 text-violet-400 border border-violet-400/20': loading,
          'bg-emerald-400/10 text-emerald-400 border border-emerald-400/20': !loading && !isError,
          'bg-red-400/10 text-red-400 border border-red-400/20': isError
        }">
          <span v-if="loading" class="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin-slow flex-shrink-0"></span>
          {{ status }}
        </div>
      </div>
    </div>

    <!-- OUTPUT PANEL -->
    <div class="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
      <div class="flex items-center justify-between px-5 py-4 border-b border-gray-800">
        <span class="text-xs font-bold tracking-widest uppercase text-gray-500">Segmentation Mask</span>
        <a v-if="maskUrl" :href="maskUrl" :download="'mask_' + file?.name" class="text-xs px-3 py-1.5 rounded-lg bg-gray-800 text-gray-400 hover:text-gray-200 transition-colors">
          ↓ Download
        </a>
      </div>
      <div class="p-5">
        <div v-if="!maskUrl" class="min-h-60 flex flex-col items-center justify-center text-gray-700">
          <div class="text-4xl mb-3 opacity-30">🔬</div>
          <p class="text-sm">Mask will appear here after inference</p>
        </div>
        <div v-else>
          <div class="relative bg-black rounded-xl overflow-hidden">
            <img :src="showOverlay ? overlayUrl : maskUrl" class="w-full block" />
            <button
              @click="showOverlay = !showOverlay"
              class="absolute bottom-2 right-2 font-mono-dm text-xs px-3 py-1.5 rounded-lg bg-black/70 text-white border border-white/20 backdrop-blur-sm hover:bg-black/90 transition-colors"
            >
              {{ showOverlay ? 'Show Mask' : 'Show Overlay' }}
            </button>
          </div>
          <div class="flex flex-wrap gap-2 mt-3">
            <span class="font-mono-dm text-xs px-2 py-1 rounded bg-emerald-400/10 text-emerald-400 border border-emerald-400/20">✓ Segmentation complete</span>
            <span v-if="elapsed" class="font-mono-dm text-xs px-2 py-1 rounded bg-violet-400/10 text-violet-400 border border-violet-400/20">{{ elapsed }}ms</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { postFile, checkImageSize, readAsDataURL, createOverlay } from '../api.js'

const file = ref(null)
const preview = ref(null)
const dims = ref(null)
const sizeOk = ref(false)
const imgW = ref(0), imgH = ref(0)
const dragging = ref(false)
const loading = ref(false)
const status = ref('')
const isError = ref(false)
const maskUrl = ref(null)
const overlayUrl = ref(null)
const showOverlay = ref(false)
const elapsed = ref(null)

async function loadFile(f) {
  if (!f) return
  file.value = f
  maskUrl.value = null; overlayUrl.value = null; showOverlay.value = false
  status.value = ''; isError.value = false; elapsed.value = null

  const d = await checkImageSize(f)
  imgW.value = d?.w || 0; imgH.value = d?.h || 0
  dims.value = d ? `${d.w}×${d.h}` : '?×?'
  sizeOk.value = d !== null && d.w === d.h
  preview.value = await readAsDataURL(f)
}

function onFileChange(e) { loadFile(e.target.files[0]) }
function onDrop(e) {
  dragging.value = false
  const f = e.dataTransfer.files[0]
  if (f?.type.startsWith('image/')) loadFile(f)
}
function clear() {
  file.value = null; preview.value = null; dims.value = null
  sizeOk.value = false; status.value = ''; maskUrl.value = null
  overlayUrl.value = null; elapsed.value = null
}

async function runInference() {
  if (!file.value || !sizeOk.value) return
  loading.value = true; status.value = 'Sending to inference endpoint…'; isError.value = false
  const t0 = Date.now()
  try {
    const blob = await postFile(file.value)
    maskUrl.value = URL.createObjectURL(blob)
    elapsed.value = Date.now() - t0
    overlayUrl.value = await createOverlay(preview.value, maskUrl.value, imgW.value, imgH.value)
    status.value = `Inference complete in ${elapsed.value}ms`
  } catch (err) {
    status.value = err.message; isError.value = true
  } finally {
    loading.value = false
  }
}
</script>