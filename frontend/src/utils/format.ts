/** Format price based on its magnitude */
export function formatPrice(price: number | undefined | null): string {
  if (price === undefined || price === null || price === 0) return '—'
  if (price > 10000)  return price.toLocaleString('fr-FR', { maximumFractionDigits: 0 })
  if (price > 1000)   return price.toFixed(2)
  if (price > 100)    return price.toFixed(3)
  if (price > 1)      return price.toFixed(4)
  return price.toFixed(6)
}

export function formatChange(pct: number | undefined): string {
  if (pct === undefined) return '—'
  return `${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%`
}

export function formatVolume(vol: number): string {
  if (vol > 1e9) return `${(vol/1e9).toFixed(1)}B`
  if (vol > 1e6) return `${(vol/1e6).toFixed(1)}M`
  if (vol > 1e3) return `${(vol/1e3).toFixed(1)}K`
  return vol.toFixed(0)
}
