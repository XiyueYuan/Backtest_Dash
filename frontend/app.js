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
const feeRateEl = document.getElementById('fee_rate')
const slippageEl = document.getElementById('slippage')
const maxPositionPctEl = document.getElementById('max_position_pct')
const initialCapitalEl = document.getElementById('initial_capital')

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
  const chart = LightweightCharts.createChart(el, { width: Math.floor(rect.width), height: Math.floor(rect.height), layout: { background: { type: 'solid', color: '#0b1220' }, textColor: '#e6e8ff' }, grid: { vertLines: { color: '#1c2333' }, horzLines: { color: '#1c2333' } }, handleScroll: { mouseWheel: true, pressedMouseMove: true, horzTouchDrag: true }, handleScale: { axisPressedMouseMove: true, mouseWheel: true, pinch: true } })
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
  const fee_rate = parseFloat(feeRateEl.value || '0')
  const slippage = parseFloat(slippageEl.value || '0.002')
  const max_position_pct = parseFloat(maxPositionPctEl.value || '1')
  const initial_capital = parseFloat(initialCapitalEl.value || '10000')

  statusEl.textContent = 'Running...'

  let ohlc, bt
  try {
    ohlc = await fetchJSON(`/ohlcv?symbol=${encodeURIComponent(symbol)}&start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`)
    bt = await fetchJSON(
      `/backtest?symbol=${encodeURIComponent(symbol)}&start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}&strategy=${encodeURIComponent(strategy)}&short=${short}&long=${long}&rsi_low=${rsi_low}&rsi_high=${rsi_high}&bb_window=${bb_window}&bb_mult=${bb_mult}&donchian_window=${donchian_window}` + 
      `&fee_rate=${fee_rate}&slippage=${slippage}&max_position_pct=${max_position_pct}&initial_capital=${initial_capital}`)
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

  const closes = ohlc.map(d => d.close)
  const highs = ohlc.map(d => d.high)
  const lows = ohlc.map(d => d.low)
  const times = ohlc.map(d => d.time)
  const wMean = (arr, w) => {
    const out = new Array(arr.length).fill(null)
    let sum = 0
    for (let i = 0; i < arr.length; i++) {
      sum += arr[i]
      if (i >= w) sum -= arr[i - w]
      if (i >= w - 1) out[i] = sum / w
    }
    return out
  }
  const wStd = (arr, w, mids) => {
    const out = new Array(arr.length).fill(null)
    for (let i = w - 1; i < arr.length; i++) {
      let s = 0
      for (let j = i - w + 1; j <= i; j++) s += Math.pow(arr[j] - mids[i], 2)
      out[i] = Math.sqrt(s / w)
    }
    return out
  }
  const mkData = (arr) => arr.map((v, i) => (v == null ? null : { time: times[i], value: v }))
  const setLine = (chart, color, scale, data) => {
    if (!chart || typeof chart.addLineSeries !== 'function') return
    const s = chart.addLineSeries({ color, lineWidth: 2, priceScaleId: scale })
    s.setData(data.filter(Boolean))
  }
  if (strategy === 'sma') {
    const s1 = wMean(closes, short)
    const s2 = wMean(closes, long)
    setLine(c1, '#00d4ff', 'right', mkData(s1))
    setLine(c1, '#7c6cff', 'right', mkData(s2))
  } else if (strategy === 'ema') {
    const emaCalc = (arr, w) => {
      const out = new Array(arr.length).fill(null)
      const k = 2 / (w + 1)
      let prev = null
      for (let i = 0; i < arr.length; i++) {
        const x = arr[i]
        if (prev == null) prev = x
        prev = x * k + prev * (1 - k)
        if (i >= w - 1) out[i] = prev
      }
      return out
    }
    const e1 = emaCalc(closes, short)
    const e2 = emaCalc(closes, long)
    setLine(c1, '#00d4ff', 'right', mkData(e1))
    setLine(c1, '#7c6cff', 'right', mkData(e2))
  } else if (strategy === 'bbands') {
    const mid = wMean(closes, bb_window)
    const std = wStd(closes, bb_window, mid)
    const up = mid.map((m, i) => (m == null || std[i] == null ? null : m + bb_mult * std[i]))
    const lo = mid.map((m, i) => (m == null || std[i] == null ? null : m - bb_mult * std[i]))
    setLine(c1, '#ffd166', 'right', mkData(mid))
    setLine(c1, '#26a69a', 'right', mkData(up))
    setLine(c1, '#ef5350', 'right', mkData(lo))
  } else if (strategy === 'donchian') {
    const window = donchian_window
    const up = new Array(highs.length).fill(null)
    const lo = new Array(lows.length).fill(null)
    for (let i = window - 1; i < highs.length; i++) {
      let m = -Infinity, n = Infinity
      for (let j = i - window + 1; j <= i; j++) { m = Math.max(m, highs[j]); n = Math.min(n, lows[j]) }
      up[i] = m; lo[i] = n
    }
    setLine(c1, '#26a69a', 'right', mkData(up))
    setLine(c1, '#ef5350', 'right', mkData(lo))
  } else if (strategy === 'rsi') {
    const w = Math.max(2, rsi_low)
    const delta = closes.map((x, i) => (i === 0 ? 0 : x - closes[i - 1]))
    const gain = delta.map(d => (d > 0 ? d : 0))
    const loss = delta.map(d => (d < 0 ? -d : 0))
    const avg = (arr, w) => wMean(arr, w)
    const ag = avg(gain, w)
    const al = avg(loss, w)
    const rs = ag.map((g, i) => (g == null || al[i] == null ? null : g / al[i]))
    const rsi = rs.map(r => (r == null ? null : 100 - 100 / (1 + r)))
    setLine(c1, '#ffd166', 'left', mkData(rsi))
  } else if (strategy === 'macd') {
    const emaCalc = (arr, w) => {
      const out = new Array(arr.length).fill(null)
      const k = 2 / (w + 1)
      let prev = null
      for (let i = 0; i < arr.length; i++) {
        const x = arr[i]
        if (prev == null) prev = x
        prev = x * k + prev * (1 - k)
        if (i >= w - 1) out[i] = prev
      }
      return out
    }
    const fast = emaCalc(closes, 12)
    const slow = emaCalc(closes, 26)
    const diff = fast.map((f, i) => (f == null || slow[i] == null ? null : f - slow[i]))
    const signalArr = (() => {
      const w = 9
      const out = new Array(diff.length).fill(null)
      const k = 2 / (w + 1)
      let prev = null
      for (let i = 0; i < diff.length; i++) {
        const x = diff[i]
        if (x == null) continue
        if (prev == null) prev = x
        prev = x * k + prev * (1 - k)
        if (i >= w - 1) out[i] = prev
      }
      return out
    })()
    setLine(c1, '#00d4ff', 'left', mkData(diff))
    setLine(c1, '#7c6cff', 'left', mkData(signalArr))
  }


  const c2 = mkChart('equityChart')
  const line = c2 && typeof c2.addLineSeries === 'function' ? c2.addLineSeries({ color: '#7c6cff' }) : null
  const eq = bt.curve.equity_curve || []
  const dates = (bt.curve.dates || []).map(d => isoToSec(d))
  if (line && eq.length && dates.length) {
    const shift = (typeof initial_capital === 'number' && typeof max_position_pct === 'number') 
      ? (initial_capital - initial_capital * Math.max(0, Math.min(1, max_position_pct))) 
      : 0
    line.setData(eq.map((v, i) => ({ time: dates[i], value: (typeof v === 'number' ? v - shift : v) })))
  }

  const m = bt.metrics || {}
  const pct = (x) => (typeof x === 'number' ? (x*100).toFixed(3)+'%' : x)
  const num = (x, d=3) => (typeof x === 'number' ? x.toFixed(d) : x)
  const amt = (x) => (typeof x === 'number' ? x.toFixed(0) : x)
  if (document.getElementById('m_invested')) document.getElementById('m_invested').textContent = amt(m.invested_initial)
  document.getElementById('m_annual').textContent = pct(m.annual_return)
  document.getElementById('m_sharpe').textContent = num(m.sharpe_ratio)
  document.getElementById('m_vol').textContent = pct(m.volatility)
  document.getElementById('m_mdd').textContent = pct(m.max_drawdown)
  attachZoom(overview, 'zoom_tv_in', 'zoom_tv_out')
  attachZoom(c1, 'zoom_ohlc_in', 'zoom_ohlc_out')
  attachZoom(c2, 'zoom_eq_in', 'zoom_eq_out')
}

document.getElementById('run').addEventListener('click', run)
document.addEventListener('DOMContentLoaded', () => {
  // Auto-run with defaults
  try { run() } catch (e) { statusEl.textContent = String(e.message || e) }
})

function zoom(chart, factor) {
  if (!chart || typeof chart.timeScale !== 'function') return
  const ts = chart.timeScale()
  if (!ts || typeof ts.getVisibleLogicalRange !== 'function' || typeof ts.setVisibleLogicalRange !== 'function') return
  const r = ts.getVisibleLogicalRange()
  if (!r || typeof r.from !== 'number' || typeof r.to !== 'number') return
  const c = (r.from + r.to) / 2
  const len = (r.to - r.from) * factor
  ts.setVisibleLogicalRange({ from: c - len / 2, to: c + len / 2 })
}

function attachZoom(chart, inId, outId) {
  const zi = document.getElementById(inId)
  const zo = document.getElementById(outId)
  if (zi) zi.addEventListener('click', () => zoom(chart, 0.8))
  if (zo) zo.addEventListener('click', () => zoom(chart, 1.25))
}
