const sEl = document.getElementById('symbol')
const startEl = document.getElementById('start')
const endEl = document.getElementById('end')
const stratEl = document.getElementById('strategy')
const shortEl = document.getElementById('short')
const longEl = document.getElementById('long')
const rsiLowEl = document.getElementById('rsi_low')
const rsiHighEl = document.getElementById('rsi_high')
const bbWinEl = document.getElementById('bb_window')
const bbMultEl = document.getElementById('bb_mult')
const donEl = document.getElementById('donchian_window')
const statusEl = document.getElementById('status')

function normalizeDate(s) {
  const t = String(s || '').trim().replace(/\s+/g, '')
  const m = t.match(/^(\d{4})([-/]?)(\d{2})([-/]?)(\d{2})$/)
  if (!m) return null
  return `${m[1]}-${m[3]}-${m[5]}`
}

function mkChart(containerId) {
  const el = document.getElementById(containerId)
  if (!window.LightweightCharts || typeof LightweightCharts.createChart !== 'function') {
    return null
  }
  const rect = el.getBoundingClientRect()
  const chart = LightweightCharts.createChart(el, { width: Math.floor(rect.width), height: Math.floor(rect.height), layout: { background: { type: 'solid', color: '#0b1220' }, textColor: '#e6e8ff' }, grid: { vertLines: { color: '#1c2333' }, horzLines: { color: '#1c2333' } } })
  const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(entries => {
    for (const entry of entries) {
      const w = Math.floor(entry.contentRect.width)
      const h = Math.floor(entry.contentRect.height)
      chart.resize(w, h)
    }
  }) : null
  if (ro) ro.observe(el)
  else window.addEventListener('resize', () => {
    const r = el.getBoundingClientRect()
    chart.resize(Math.floor(r.width), Math.floor(r.height))
  })
  return chart
}

function addBestSeries(chart) {
  if (!chart) return null
  if (typeof chart.addCandlestickSeries === 'function') return chart.addCandlestickSeries()
  if (typeof chart.addBarSeries === 'function') return chart.addBarSeries()
  if (typeof chart.addLineSeries === 'function') return chart.addLineSeries({ color: '#7c6cff' })
  return null
}

async function fetchJSON(url) {
  const r = await fetch(url)
  let data
  try { data = await r.json() } catch { data = null }
  if (!r.ok) {
    const msg = (data && data.error) ? data.error : `HTTP ${r.status}`
    throw new Error(msg)
  }
  return data
}

async function run() {
  const symbol = sEl.value.trim()
  const start = normalizeDate(startEl.value)
  const end = normalizeDate(endEl.value)
  if (!start || !end) { statusEl.textContent = 'Invalid date. Use YYYY-MM-DD'; return }
  const strategy = stratEl.value
  const short = parseInt(shortEl.value || '10', 10)
  const long = parseInt(longEl.value || '20', 10)
  const rsi_low = parseInt(rsiLowEl.value || '30', 10)
  const rsi_high = parseInt(rsiHighEl.value || '70', 10)
  const bb_window = parseInt(bbWinEl.value || '20', 10)
  const bb_mult = parseFloat(bbMultEl.value || '2')
  const donchian_window = parseInt(donEl.value || '20', 10)
  statusEl.textContent = 'Running...'

  let ohlc, bt
  try {
    ohlc = await fetchJSON(`/ohlcv?symbol=${encodeURIComponent(symbol)}&start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`)
    bt = await fetchJSON(`/backtest?symbol=${encodeURIComponent(symbol)}&start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}&strategy=${encodeURIComponent(strategy)}&short=${short}&long=${long}&rsi_low=${rsi_low}&rsi_high=${rsi_high}&bb_window=${bb_window}&bb_mult=${bb_mult}&donchian_window=${donchian_window}`)
  } catch (e) {
    statusEl.textContent = String(e.message || e)
    return
  }
  statusEl.textContent = 'OK'

  // Clear previous charts when symbol changes
  document.getElementById('tvchart').innerHTML = ''
  document.getElementById('ohlcChart').innerHTML = ''
  document.getElementById('equityChart').innerHTML = ''

  const overview = mkChart('tvchart')
  const series1 = addBestSeries(overview)
  if (series1 && typeof series1.setData === 'function') {
    series1.setData(ohlc.map(d => ({ time: d.time, open: d.open, high: d.high, low: d.low, close: d.close, value: d.close })))
  } else {
    // Fallback: show last price in text if chart library missing
    const tv = document.getElementById('tvchart')
    tv.innerHTML = `<div style="padding:12px;color:#a9accb">Chart library unavailable. Last close: ${ohlc.length ? ohlc[ohlc.length-1].close : 'N/A'}</div>`
  }

  const c1 = mkChart('ohlcChart')
  const candle = addBestSeries(c1)
  if (candle && typeof candle.setData === 'function') {
    candle.setData(ohlc.map(d => ({ time: d.time, open: d.open, high: d.high, low: d.low, close: d.close, value: d.close })))
  }
  const markers = []
  const isoToSec = (iso) => Math.floor(new Date(iso).getTime() / 1000)
  bt.curve.buy_signals.forEach(([t, p]) => { markers.push({ time: isoToSec(t), position: 'belowBar', color: '#26a69a', shape: 'arrowUp', text: 'BUY' }) })
  bt.curve.sell_signals.forEach(([t, p]) => { markers.push({ time: isoToSec(t), position: 'aboveBar', color: '#ef5350', shape: 'arrowDown', text: 'SELL' }) })
  if (candle && typeof candle.setMarkers === 'function') candle.setMarkers(markers)

  const c2 = mkChart('equityChart')
  const line = c2 && typeof c2.addLineSeries === 'function' ? c2.addLineSeries({ color: '#7c6cff' }) : null
  const eq = bt.curve.equity_curve || []
  const dates = (bt.curve.dates || []).map(d => isoToSec(d))
  if (line && eq.length && dates.length) {
    line.setData(eq.map((v, i) => ({ time: dates[i], value: v })))
  }

  const m = bt.metrics || {}
  const pct = (x) => (typeof x === 'number' ? (x*100).toFixed(2)+'%' : x)
  const num = (x, d=2) => (typeof x === 'number' ? x.toFixed(d) : x)
  document.getElementById('m_annual').textContent = pct(m.annual_return)
  document.getElementById('m_sharpe').textContent = num(m.sharpe_ratio)
  document.getElementById('m_vol').textContent = pct(m.volatility)
  document.getElementById('m_mdd').textContent = pct(m.max_drawdown)
}

document.getElementById('run').addEventListener('click', run)
document.addEventListener('DOMContentLoaded', () => {
  // Auto-run with defaults
  try { run() } catch (e) { statusEl.textContent = String(e.message || e) }
})
