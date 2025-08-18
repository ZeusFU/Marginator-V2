export interface ContourExportPoint {
  dataset: string
  x: number
  y: number
}

export function downloadBlob(content: string | Blob, filename: string, type: string) {
  const blob = content instanceof Blob ? content : new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export function exportContourAsCSV(points: ContourExportPoint[], filename = 'contours.csv') {
  const header = 'dataset,x,y\n'
  const rows = points.map(p => `${escapeCsv(p.dataset)},${p.x},${p.y}`).join('\n')
  downloadBlob(header + rows + '\n', filename, 'text/csv;charset=utf-8;')
}

export function exportContourAsJSON(points: ContourExportPoint[], meta: Record<string, unknown> = {}, filename = 'contours.json') {
  const payload = { meta, points }
  downloadBlob(JSON.stringify(payload, null, 2), filename, 'application/json')
}

export function exportChartAsPNG(chart: any, filename = 'contours.png') {
  if (!chart || typeof chart.toBase64Image !== 'function') return
  const dataUrl = chart.toBase64Image('image/png', 1)
  downloadBlob(dataUrlToBlob(dataUrl), filename, 'image/png')
}

function dataUrlToBlob(dataUrl: string): Blob {
  const arr = dataUrl.split(',')
  const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/png'
  const bstr = atob(arr[1])
  let n = bstr.length
  const u8arr = new Uint8Array(n)
  while (n--) u8arr[n] = bstr.charCodeAt(n)
  return new Blob([u8arr], { type: mime })
}

function escapeCsv(value: string): string {
  if (/[",\n]/.test(value)) return '"' + value.replace(/"/g, '""') + '"'
  return value
}


