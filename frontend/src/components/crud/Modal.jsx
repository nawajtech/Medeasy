function Modal({ title, open, onClose, children, wide, className = "" }) {
  if (!open) return null;

  const modalClass = ["crud-modal", wide ? "crud-modal--wide" : "", className]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="crud-modal-backdrop" role="presentation">
      <div
        className={modalClass}
        role="dialog"
        aria-modal="true"
        aria-labelledby="crud-modal-title"
      >
        <div className="crud-modal-header">
          <h3 id="crud-modal-title">{title}</h3>
          <button
            type="button"
            className="crud-modal-close"
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export default Modal;
