function Modal({ title, open, onClose, children }) {
  if (!open) return null;

  return (
    <div className="crud-modal-backdrop" onClick={onClose}>
      <div className="crud-modal" onClick={(e) => e.stopPropagation()}>
        <h3>{title}</h3>
        {children}
      </div>
    </div>
  );
}

export default Modal;
