/**
 * Русское склонение при числе: 1 точка, 2 точки, 5 точек.
 *
 * Без этого приходится писать «точек: 2», и текст читается как отчёт
 * программы, а не как фраза на русском.
 *
 * @param {number} n
 * @param {[string, string, string]} forms — для 1, для 2, для 5
 */
export function plural(n, [one, few, many]) {
  const abs = Math.abs(n) % 100
  const last = abs % 10

  if (abs > 10 && abs < 20) return `${n} ${many}`
  if (last > 1 && last < 5) return `${n} ${few}`
  if (last === 1) return `${n} ${one}`
  return `${n} ${many}`
}
