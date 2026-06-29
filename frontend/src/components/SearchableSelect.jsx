import { useEffect, useMemo, useRef, useState } from "react";
import "./SearchableSelect.css";

/**
 * Lightweight searchable dropdown for reception workflows.
 */
export default function SearchableSelect({
  id,
  label,
  options = [],
  value,
  onChange,
  placeholder = "Search…",
  emptyLabel = "No matches",
  getOptionLabel = (o) => o.name || String(o.id),
  getOptionValue = (o) => o.id,
  disabled = false,
  hint,
}) {
  const wrapRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const selected = useMemo(
    () => options.find((o) => String(getOptionValue(o)) === String(value)),
    [options, value, getOptionValue]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => getOptionLabel(o).toLowerCase().includes(q));
  }, [options, query, getOptionLabel]);

  useEffect(() => {
    if (selected) {
      setQuery(getOptionLabel(selected));
    } else if (!value) {
      setQuery("");
    }
  }, [selected, value, getOptionLabel]);

  useEffect(() => {
    const onDoc = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false);
        if (selected) setQuery(getOptionLabel(selected));
        else if (!value) setQuery("");
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [selected, value, getOptionLabel]);

  const pick = (option) => {
    onChange(getOptionValue(option));
    setQuery(getOptionLabel(option));
    setOpen(false);
  };

  const clear = () => {
    onChange("");
    setQuery("");
    setOpen(false);
  };

  return (
    <div className="crud-field crud-field--full searchable-select" ref={wrapRef}>
      {label && <label htmlFor={id}>{label}</label>}
      <div className={`searchable-select__control ${open ? "is-open" : ""}`}>
        <input
          id={id}
          type="text"
          value={query}
          placeholder={placeholder}
          disabled={disabled}
          autoComplete="off"
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            if (!e.target.value) onChange("");
          }}
        />
        {value && !disabled && (
          <button type="button" className="searchable-select__clear" onClick={clear} aria-label="Clear">
            ×
          </button>
        )}
      </div>
      {open && !disabled && (
        <ul className="searchable-select__list" role="listbox">
          {!filtered.length && <li className="searchable-select__empty">{emptyLabel}</li>}
          {filtered.map((o) => (
            <li key={getOptionValue(o)}>
              <button
                type="button"
                role="option"
                className={String(getOptionValue(o)) === String(value) ? "is-selected" : ""}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick(o)}
              >
                {getOptionLabel(o)}
              </button>
            </li>
          ))}
        </ul>
      )}
      {hint && <p className="company-modules-hint">{hint}</p>}
    </div>
  );
}
