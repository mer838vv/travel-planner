import test from 'node:test'
import assert from 'node:assert/strict'

import { plural } from '../src/utils/plural.js'
import { formatMoney } from '../src/utils/formatMoney.js'
import { formatDay, formatRange } from '../src/utils/formatDate.js'

test('склонение при числе', () => {
  const forms = ['точка', 'точки', 'точек']
  const cases = [
    [0, '0 точек'], [1, '1 точка'], [2, '2 точки'], [4, '4 точки'], [5, '5 точек'],
    // Одиннадцать–четырнадцать — исключение: «11 точек», а не «11 точка»
    [11, '11 точек'], [12, '12 точек'], [14, '14 точек'],
    [21, '21 точка'], [22, '22 точки'], [25, '25 точек'], [101, '101 точка'], [111, '111 точек'],
  ]
  for (const [n, expected] of cases) {
    assert.equal(plural(n, forms), expected, `n=${n}`)
  }
})

test('суммы: копейки только когда они есть', () => {
  // Разряды и знак валюты отбиты неразрывным пробелом (U+00A0), поэтому в
  // ожиданиях он записан escape-последовательностью: невидимый символ в
  // исходнике неотличим от обычного пробела и однажды уже стоил отладки.
  const NB = '\u00A0'
  assert.equal(formatMoney(44986, 'RUB'), `44${NB}986${NB}\u20BD`)
  // У денег копейки показываем полностью: 420,50, а не 420,5
  assert.equal(formatMoney(420.5, 'EUR'), `420,50${NB}\u20AC`)
  assert.equal(formatMoney(420.55, 'EUR'), `420,55${NB}\u20AC`)
  assert.equal(formatMoney(100, 'EUR'), `100${NB}\u20AC`)
  // Неизвестную валюту показываем кодом, а не теряем
  assert.equal(formatMoney(10, 'CZK'), `10${NB}CZK`)
  assert.equal(formatMoney('\u043d\u0435\u0442'), '')
})

test('даты по-человечески', () => {
  assert.equal(formatDay('2026-09-01', 2026), '1 сентября')
  assert.equal(formatDay('2027-09-01', 2026), '1 сентября 2027')
  // Однодневная поездка не должна выглядеть как диапазон
  assert.equal(formatRange('2026-09-01', '2026-09-01', 2026), '1 сентября')
  // В пределах месяца название месяца не повторяем
  assert.equal(formatRange('2026-09-01', '2026-09-07', 2026), '1 — 7 сентября')
  assert.equal(formatRange('2026-09-28', '2026-10-03', 2026), '28 сентября — 3 октября')
})
