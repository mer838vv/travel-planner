import { useState } from 'react'

/**
 * Кнопка удаления с подтверждением.
 *
 * Раньше на её месте стоял крестик, стиравший запись с одного нажатия.
 * Крестик читается как «закрыть» — пользователь свернул им весь день
 * поездки и потерял данные, не получив ни вопроса, ни возможности
 * вернуть. Поэтому здесь корзина, а не крестик, и обязательный второй шаг.
 *
 * `confirm={false}` — для мелочей вроде пункта списка вещей, где потеря
 * стоит одного нажатия, чтобы вписать заново.
 */
export default function DeleteButton({ onDelete, label, confirm = true }) {
  const [asking, setAsking] = useState(false)

  if (!confirm) {
    return (
      <button type="button" className="icon-button" onClick={onDelete} aria-label={label} title={label}>
        🗑
      </button>
    )
  }

  if (asking) {
    return (
      <span className="delete-confirm">
        <button type="button" className="danger tiny" onClick={onDelete}>Удалить</button>
        <button type="button" className="secondary tiny" onClick={() => setAsking(false)}>Отмена</button>
      </span>
    )
  }

  return (
    <button
      type="button"
      className="icon-button"
      onClick={() => setAsking(true)}
      aria-label={label}
      title={label}
    >
      🗑
    </button>
  )
}
