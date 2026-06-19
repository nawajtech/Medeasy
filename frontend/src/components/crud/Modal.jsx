function Modal({ title, open, onClose, children, wide, className = "" }) {
  if (!open) return null;

  const modalClass = ["crud-modal", wide ? "crud-modal--wide" : "", className]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="crud-modal-backdrop" onClick={onClose}>
      <div className={modalClass} onClick={(e) => e.stopPropagation()}>
        <h3>{title}</h3>
        {children}
      </div>
    </div>
  );
}

export default Modal;
