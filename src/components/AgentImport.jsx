import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { parseAgentPayload, applyAgentPayload } from '../utils/agentImport'

export default function AgentImport({ onClose }) {
  const [text, setText] = useState('')
  const [status, setStatus] = useState(null)
  const [busy, setBusy] = useState(false)
  const navigate = useNavigate()

  async function pasteFromClipboard() {
    try {
      const clip = await navigator.clipboard.readText()
      setText(clip)
      setStatus(null)
    } catch {
      setStatus({ ok: false, text: 'Браузер не дал доступ к буферу — вставьте текст в поле вручную (долгое нажатие → «Вставить»).' })
    }
  }

  async function load() {
    setBusy(true)
    setStatus(null)
    try {
      const data = parseAgentPayload(text)
      const s = await applyAgentPayload(data)
      setStatus({
        ok: true,
        text: `Готово: «${s.title}» — ${s.days} дн., точек ${s.pois}, билетов ${s.tickets}, вещей ${s.packing}, трат ${s.budget}.`,
      })
      setText('')
      setTimeout(() => navigate(`/trip/${s.tripId}`), 900)
    } catch (err) {
      setStatus({
        ok: false,
        text: err?.userFacing ? err.message : 'Не удалось загрузить план. Проверьте, что скопирован весь ответ агента целиком.',
      })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="card agent-import">
      <div>
        <h2>План от агента</h2>
        <p className="agent-hint">
          Попроси Claude собрать поездку — теперь каждый городской день должен начинаться
          от вашего отеля или вокзала, объяснять порядок остановок и подробно разбирать
          каждое место по официальным источникам. Если данных не хватает, приложение
          честно пометит маршрут как требующий доработки.
        </p>
      </div>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder='Сюда вставляется ответ агента, начинается с { "trip": ...'
      />

      {status && (
        <div className={`agent-status ${status.ok ? 'ok' : 'err'}`}>{status.text}</div>
      )}

      <div className="row">
        <button type="button" className="secondary" onClick={pasteFromClipboard}>
          Вставить из буфера
        </button>
        <button type="button" onClick={load} disabled={busy || !text.trim()}>
          {busy ? 'Загружаю…' : 'Создать поездку'}
        </button>
        <button type="button" className="secondary" onClick={onClose}>Закрыть</button>
      </div>
    </div>
  )
}
