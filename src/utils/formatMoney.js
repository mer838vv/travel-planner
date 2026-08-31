const SYMBOLS = { RUB: '₽', EUR: '€', USD: '$', GBP: '£', TRY: '₺' }

// Неразрывный пробел записан escape-последовательностью намеренно: как
// невидимый символ в исходнике он неотличим от обычного пробела и уже
// стоил отладки упавшего теста.
const NBSP = '\u00A0'

/**
 * «44 986 ₽», «420,5 €».
 *
 * Копейки показываем только когда они не нулевые: у большинства расходов в
 * поездке их нет, и «.00» у каждой строки превращает список в кашу из цифр.
 *
 * Разряды и знак валюты отбиваются неразрывным пробелом, чтобы сумма не
 * разорвалась при переносе строки.
 */
export function formatMoney(amount, currency = 'EUR') {
  const n = Number(amount)
  if (!Number.isFinite(n)) return ''

  const hasCents = Math.round(n * 100) % 100 !== 0
  const body = n.toLocaleString('ru-RU', {
    minimumFractionDigits: hasCents ? 2 : 0,
    maximumFractionDigits: 2,
  })

  const code = String(currency || '').toUpperCase()
  return `${body}${NBSP}${SYMBOLS[code] || code}`
}
