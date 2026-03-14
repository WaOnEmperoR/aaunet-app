const ENDPOINT = 'https://aaunet-inference-947799904861.asia-southeast2.run.app/predict'

// Ping the endpoint with a HEAD/GET request to check if it's reachable
export async function pingEndpoint() {
  return new Promise((resolve) => {
    const xhr = new XMLHttpRequest()
    // Send an empty POST — server will return 400 (no file) but that means it's UP
    xhr.open('POST', ENDPOINT)
    xhr.timeout = 10000
    xhr.onload = () => resolve('online')      // any HTTP response = server is up
    xhr.onerror = () => resolve('offline')
    xhr.ontimeout = () => resolve('timeout')
    xhr.send(new FormData())                  // empty form — just checking reachability
  })
}

export function postFile(file) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', ENDPOINT)
    xhr.responseType = 'blob'
    xhr.timeout = 60000
    xhr.onload = () => {
      if (xhr.status === 200) resolve(xhr.response)
      else reject(new Error(`HTTP ${xhr.status}`))
    }
    xhr.onerror = () => reject(new Error('Network error — check CORS or endpoint'))
    xhr.ontimeout = () => reject(new Error('Timed out after 60s (cold start?)'))
    const fd = new FormData()
    fd.append('file', file, file.name)
    xhr.send(fd)
  })
}

export async function checkImageSize(file) {
  try {
    const bitmap = await createImageBitmap(file)
    const w = bitmap.width, h = bitmap.height
    bitmap.close()
    return { w, h }
  } catch {
    return null
  }
}

export function readAsDataURL(file) {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = e => resolve(e.target.result)
    reader.readAsDataURL(file)
  })
}

export async function createOverlay(inputDataUrl, maskObjectUrl, w, h) {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas')
    canvas.width = w; canvas.height = h
    const ctx = canvas.getContext('2d')
    const imgA = new Image(), imgB = new Image()
    imgA.onload = () => {
      ctx.drawImage(imgA, 0, 0, w, h)
      imgB.onload = () => {
        ctx.globalAlpha = 0.5
        ctx.globalCompositeOperation = 'multiply'
        ctx.drawImage(imgB, 0, 0, w, h)
        resolve(canvas.toDataURL())
      }
      imgB.src = maskObjectUrl
    }
    imgA.src = inputDataUrl
  })
}