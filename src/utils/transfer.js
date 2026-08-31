/**
 * Варианты, как доехать до аэропорта, с разницей в цене между ними.
 *
 * Смысл блока не «показать цену такси», а дать решить: сколько стоит
 * удобство. Поэтому каждый вариант показывается не абсолютной суммой, а
 * ещё и надбавкой к самому дешёвому — «трансфер отеля дороже на 26,50 €»
 * понятнее, чем два числа, которые надо вычитать в уме.
 */

const CURRENCY_ORDER = ['EUR', 'USD', 'RUB', 'GBP', 'TRY']

function num(value) {
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

/**
 * Разбор вариантов: приведение к числам, поиск самого дешёвого и расчёт
 * надбавки остальных. Варианты без цены остаются в списке — иногда важно
 * показать, что способ есть, но цена неизвестна.
 */
export function rankTransferOptions(options = []) {
  const parsed = options
    .filter((o) => o?.name)
    .map((o) => ({
      name: String(o.name),
      price: num(o.price),
      currency: o.currency ? String(o.currency).toUpperCase() : 'EUR',
      priceRub: num(o.priceRub),
      unit: o.unit ? String(o.unit) : null,
      note: o.note ? String(o.note) : null,
      howTo: o.howTo ? String(o.howTo) : null,
      phrase: o.phrase ? String(o.phrase) : null,
      phraseTranslation: o.phraseTranslation ? String(o.phraseTranslation) : null,
      phone: o.phone ? String(o.phone) : null,
      url: o.url ? String(o.url) : null,
      unavailable: Boolean(o.unavailable),
    }))

  // Сравнивать можно только однородные цены: если валюты разъехались,
  // честнее не показывать разницу вовсе, чем складывать евро с лирами.
  const priced = parsed.filter((o) => o.price !== null && !o.unavailable)
  const currencies = new Set(priced.map((o) => o.currency))
  const comparable = currencies.size <= 1

  const cheapest = comparable && priced.length
    ? priced.reduce((a, b) => (b.price < a.price ? b : a))
    : null

  const ranked = parsed.map((o) => {
    const isCheapest = cheapest !== null && o === cheapest
    const canCompare = comparable && cheapest && o.price !== null && !o.unavailable

    return {
      ...o,
      best: isCheapest,
      deltaAbs: canCompare && !isCheapest ? o.price - cheapest.price : null,
      deltaPercent: canCompare && !isCheapest && cheapest.price > 0
        ? Math.round(((o.price - cheapest.price) / cheapest.price) * 100)
        : null,
    }
  })

  // Сначала рекомендованный, потом по возрастанию цены, недоступные — в конец
  return ranked.sort((a, b) => {
    if (a.unavailable !== b.unavailable) return a.unavailable ? 1 : -1
    if (a.best !== b.best) return a.best ? -1 : 1
    if (a.price === null) return 1
    if (b.price === null) return -1
    return a.price - b.price
  })
}

export function normalizeTransfer(raw) {
  if (!raw) return null
  const options = rankTransferOptions(raw.options)
  if (!options.length && !raw.from) return null

  return {
    from: raw.from ? String(raw.from) : null,
    durationMin: num(raw.durationMin),
    warnings: Array.isArray(raw.warnings) ? raw.warnings.map(String).slice(0, 6) : [],
    options,
  }
}

export { CURRENCY_ORDER }
