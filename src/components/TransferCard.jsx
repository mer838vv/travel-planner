import { useState } from 'react'
import { formatMoney } from '../utils/formatMoney'
import { formatDuration } from '../utils/time'

/** Кнопка, которая кладёт текст в буфер и коротко подтверждает это. */
function CopyButton({ text, label, className = 'secondary' }) {
  const [done, setDone] = useState(false)

  async function copy() {
    try {
      await navigator.clipboard.writeText(text)
      setDone(true)
      setTimeout(() => setDone(false), 2000)
    } catch {
      setDone('fail')
    }
  }

  return (
    <button type="button" className={className} onClick={copy}>
      {done === true ? '✓ Скопировано' : done === 'fail' ? 'Скопируй вручную' : label}
    </button>
  )
}

export default function TransferCard({ transfer }) {
  if (!transfer?.options?.length) return null

  return (
    <div className="transfer-card">
      <div className="transfer-head">
        <h3>Как доехать в аэропорт</h3>
        {transfer.durationMin && (
          <span className="muted">{formatDuration(transfer.durationMin * 60000)} в пути</span>
        )}
      </div>

      {transfer.from && <p className="transfer-from">От: {transfer.from}</p>}

      <div className="transfer-options">
        {transfer.options.map((option, i) => (
          <TransferOption key={i} option={option} />
        ))}
      </div>

      {transfer.warnings.map((warning, i) => (
        <p key={i} className="transfer-warning">⚠️ {warning}</p>
      ))}
    </div>
  )
}

function TransferOption({ option }) {
  const price = option.price !== null ? formatMoney(option.price, option.currency) : null

  return (
    <div className={`transfer-option${option.best ? ' best' : ''}${option.unavailable ? ' off' : ''}`}>
      <div className="transfer-option-head">
        <strong>{option.name}</strong>
        {option.best && <span className="transfer-badge">дешевле всего</span>}
      </div>

      <div className="transfer-price-row">
        {price ? (
          <>
            <span className="transfer-price">{price}</span>
            {option.unit && <span className="muted">{option.unit}</span>}
            {option.priceRub != null && <span className="muted">≈ {formatMoney(option.priceRub, 'RUB')}</span>}
          </>
        ) : (
          <span className="muted">{option.unavailable ? 'не работает в этом городе' : 'цена не проверена'}</span>
        )}

        {/* Надбавка к самому дешёвому: решать «стоит ли удобство этих денег»
            проще по разнице, чем вычитая два числа в уме. */}
        {option.deltaAbs != null && (
          <span className="transfer-delta">
            +{formatMoney(option.deltaAbs, option.currency)}
            {option.deltaPercent != null && ` · +${option.deltaPercent}%`}
          </span>
        )}
      </div>

      {option.note && <p className="transfer-note">{option.note}</p>}
      {option.howTo && <p className="transfer-howto">{option.howTo}</p>}

      {(option.phone || option.url || option.phrase) && (
        <div className="transfer-actions">
          {option.phone && <a className="transfer-call" href={`tel:${option.phone.replace(/\s/g, '')}`}>📞 {option.phone}</a>}
          {option.url && <a className="transfer-link" href={option.url} target="_blank" rel="noreferrer">Открыть приложение</a>}
          {option.phrase && <CopyButton text={option.phrase} label="📋 Фраза для заказа" />}
        </div>
      )}

      {option.phrase && (
        <div className="transfer-phrase">
          <p lang="und">{option.phrase}</p>
          {option.phraseTranslation && <p className="transfer-translation">{option.phraseTranslation}</p>}
        </div>
      )}
    </div>
  )
}
