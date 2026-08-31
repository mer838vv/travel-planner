import test from 'node:test'
import assert from 'node:assert/strict'

import { rankTransferOptions, normalizeTransfer } from '../src/utils/transfer.js'

// Настоящие цены Рим → Фьюмичино, проверены 01.09.2026
const ROME = [
  { name: 'Uber', price: 95, currency: 'EUR', note: 'только премиальный класс' },
  { name: 'Такси по фиксированному тарифу', price: 58.5, currency: 'EUR', phone: '+39 06 3570' },
  { name: 'Трансфер отеля', price: 85, currency: 'EUR' },
  { name: 'Bolt', unavailable: true, note: 'в Риме не работает' },
]

test('самый дешёвый вариант помечается, остальные показывают надбавку', () => {
  const ranked = rankTransferOptions(ROME)

  const taxi = ranked.find((o) => o.name.startsWith('Такси'))
  assert.equal(taxi.best, true)
  assert.equal(taxi.deltaAbs, null, 'у самого дешёвого надбавки нет')

  const hotel = ranked.find((o) => o.name === 'Трансфер отеля')
  assert.equal(hotel.deltaAbs, 26.5)
  assert.equal(hotel.deltaPercent, 45)

  const uber = ranked.find((o) => o.name === 'Uber')
  assert.equal(uber.deltaAbs, 36.5)
  assert.equal(uber.deltaPercent, 62)
})

test('порядок: рекомендованный первым, недоступные в конце', () => {
  const names = rankTransferOptions(ROME).map((o) => o.name)
  assert.equal(names[0], 'Такси по фиксированному тарифу')
  assert.equal(names[1], 'Трансфер отеля', 'дальше по возрастанию цены')
  assert.equal(names[2], 'Uber')
  assert.equal(names[3], 'Bolt', 'неработающий сервис показываем, но последним')
})

test('недоступный вариант не участвует в расчёте минимума', () => {
  const ranked = rankTransferOptions([
    { name: 'Дешёвый, но не работает', price: 5, currency: 'EUR', unavailable: true },
    { name: 'Такси', price: 58.5, currency: 'EUR' },
  ])
  assert.equal(ranked.find((o) => o.name === 'Такси').best, true)
})

test('разные валюты — разницу не показываем, а не складываем евро с лирами', () => {
  const ranked = rankTransferOptions([
    { name: 'Такси', price: 58.5, currency: 'EUR' },
    { name: 'Местное', price: 900, currency: 'TRY' },
  ])
  for (const o of ranked) {
    assert.equal(o.deltaAbs, null)
    assert.equal(o.best, false, 'без сопоставимости никто не объявляется лучшим')
  }
})

test('вариант без цены остаётся в списке', () => {
  const ranked = rankTransferOptions([
    { name: 'Такси', price: 58.5, currency: 'EUR' },
    { name: 'Ночной автобус', note: 'расписание уточнить на месте' },
  ])
  assert.equal(ranked.length, 2)
  const bus = ranked.find((o) => o.name === 'Ночной автобус')
  assert.equal(bus.price, null)
  assert.equal(bus.deltaAbs, null)
})

test('мусор отсеивается, пустой блок даёт null', () => {
  assert.equal(normalizeTransfer(null), null)
  assert.equal(normalizeTransfer({ options: [] }), null)
  assert.equal(rankTransferOptions([{ price: 10 }]).length, 0, 'без названия вариант не нужен')

  const t = normalizeTransfer({ from: 'Отель', durationMin: '40', options: ROME, warnings: ['раз', 'два'] })
  assert.equal(t.durationMin, 40, 'строка приводится к числу')
  assert.equal(t.warnings.length, 2)
  assert.equal(t.options.length, 4)
})
