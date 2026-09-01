/**
 * Проверенные данные о транзите через аэропорт пересадки.
 *
 * История. Приложение само сочиняло текст про пересадку по раздельным
 * билетам и утверждало, что придётся выйти через паспортный контроль и
 * зайти на вылет заново. Для Стамбула это оказалось неправдой: Владимир
 * прошёл трансферный контроль по посадочному на Москву, не въезжая в
 * Турцию. Раздельные брони этому не помешали.
 *
 * Вывод не «поменять текст на противоположный», а «перестать угадывать».
 * У вопроса о транзите нет ответа по умолчанию: он зависит от аэропорта,
 * гражданства, багажа и наличия посадочного. Проверяет это скилл
 * `transit-check` снаружи, приложение только показывает проверенное — и
 * честно молчит, когда проверки не было.
 */

/** Транзит подтверждён / подтверждено, что нужен въезд / не проверяли. */
const VERDICTS = ['ok', 'needs-entry', 'unknown']

function text(value, limit = 400) {
  if (value == null) return null
  const s = String(value).trim()
  return s ? s.slice(0, limit) : null
}

function list(value, limit = 8) {
  if (!Array.isArray(value)) return []
  return value.map((v) => text(v)).filter(Boolean).slice(0, limit)
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

function sources(value) {
  if (!Array.isArray(value)) return []
  return value
    .map((s) => {
      const url = text(s?.url, 500)
      // Ссылка без адреса бесполезна: проверить по ней ничего нельзя.
      if (!url) return null
      return { title: text(s?.title) || url, url }
    })
    .filter(Boolean)
    .slice(0, 6)
}

export function normalizeTransit(raw) {
  if (!raw || typeof raw !== 'object') return null

  const verdict = VERDICTS.includes(raw.verdict) ? raw.verdict : 'unknown'
  const minConnectionMin = Number.isFinite(Number(raw.minConnectionMin))
    ? Number(raw.minConnectionMin)
    : null

  const transit = {
    airport: text(raw.airport, 8),
    verdict,
    citizenship: text(raw.citizenship, 40),
    steps: list(raw.steps),
    baggage: text(raw.baggage),
    boardingPass: text(raw.boardingPass),
    visaNote: text(raw.visaNote),
    minConnectionMin,
    warnings: list(raw.warnings, 6),
    checkedOn: DATE_RE.test(raw.checkedOn || '') ? raw.checkedOn : null,
    sources: sources(raw.sources),
  }

  // Проверка без даты и без источника — это не проверка, а чьё-то мнение.
  // Понижаем до «не проверено», чтобы приложение не выдавало её за факт.
  if (transit.verdict !== 'unknown' && !transit.checkedOn && !transit.sources.length) {
    transit.verdict = 'unknown'
    transit.unverifiedClaim = true
  }

  const hasSubstance = transit.steps.length || transit.baggage || transit.boardingPass
    || transit.visaNote || transit.warnings.length || transit.verdict !== 'unknown'

  return hasSubstance ? transit : null
}

/**
 * Насколько данные о транзите устарели.
 *
 * Визовые и транзитные правила меняются, и проверка полугодовой давности
 * уже не основание. Не отбрасываем её молча — помечаем, чтобы человек
 * знал, чему верит.
 */
export function transitIsStale(transit, now = new Date(), maxAgeDays = 120) {
  if (!transit?.checkedOn) return false
  const checked = Date.parse(`${transit.checkedOn}T00:00:00Z`)
  if (Number.isNaN(checked)) return false
  return now.getTime() - checked > maxAgeDays * 86400000
}
