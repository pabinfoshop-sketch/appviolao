export default function ConfirmDialog({ message, subMessage, onConfirm, onCancel }) {
  const show = !!subMessage
  return (
    <div className={`confirm-overlay${show ? ' show' : ''}`} onClick={onCancel}>
      <div className="confirm-box" onClick={e => e.stopPropagation()}>
        <div className="confirm-msg">
          {message}
          {subMessage && <span>{subMessage}</span>}
        </div>
        <div className="confirm-btns">
          <button className="confirm-cancel" onClick={onCancel}>Cancelar</button>
          <button className="confirm-ok" onClick={onConfirm}>Remover</button>
        </div>
      </div>
    </div>
  )
}
