import test from 'node:test'
import assert from 'node:assert/strict'

import { resolveKind, kindMeta, isLogistics } from '../src/utils/poiKind.js'

test('явный тип от агента имеет приоритет над угадыванием', () => {
  assert.equal(resolveKind({ kind: 'hotel', name: 'Аэропорт Фьюмичино' }), 'hotel')
  // Неизвестный тип не принимаем молча — падаем на распознавание по тексту
  assert.equal(resolveKind({ kind: 'выдуманный', name: 'Колизей' }), 'sight')
})

test('точки настоящей поездки распознаются по названию', () => {
  const cases = [
    ['Рим, Фьюмичино (FCO) — вылет', 'flight'],
    ['Шереметьево, терминал C (SVO) — прилёт', 'flight'],
    ['Стамбул (IST) — пересадка 5 ч 05 мин', 'flight'],
    ['Hilton Garden Inn Rome Colosseum — выезд', 'hotel'],
    ['Колизей', 'sight'],
    ['Римский форум', 'sight'],
    ['Собор Святого Петра', 'sight'],
    ['Устричная ферма', 'food'],
    ['Вилла Боргезе, парк', 'nature'],
    ['Вокзал Термини', 'transfer'],
  ]
  for (const [name, expected] of cases) {
    assert.equal(resolveKind({ name }), expected, name)
  }
})

test('отель не путается с аэропортом, хотя слово встречается в описании', () => {
  const poi = { name: 'Hilton Garden Inn', description: 'Трансфер в аэропорт заказывать на ресепшн' }
  assert.equal(resolveKind(poi), 'hotel', 'название важнее слова из описания')
})

test('логистику видно отдельно от достопримечательностей', () => {
  assert.equal(isLogistics('flight'), true)
  assert.equal(isLogistics('hotel'), true)
  assert.equal(isLogistics('transfer'), true)
  assert.equal(isLogistics('sight'), false)
  assert.equal(isLogistics('food'), false)
})

test('неизвестная точка получает нейтральный вид, а не пустоту', () => {
  const kind = resolveKind({ name: 'Встреча с Марией' })
  assert.equal(kind, 'other')
  assert.equal(kindMeta(kind).icon, '📍')
  assert.equal(kindMeta('чепуха').icon, '📍')
  assert.equal(resolveKind(null), 'other')
})
