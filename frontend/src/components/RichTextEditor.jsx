import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef } from "react";
import "./RichTextEditor.css";

const TOOLBAR = [
  { cmd: "bold", label: "B", title: "Bold", className: "rte-btn--bold" },
  { cmd: "italic", label: "I", title: "Italic", className: "rte-btn--italic" },
  { cmd: "underline", label: "U", title: "Underline", className: "rte-btn--underline" },
  { cmd: "insertUnorderedList", label: "•", title: "Bullet list" },
  { cmd: "insertOrderedList", label: "1.", title: "Numbered list" },
  { cmd: "createLink", label: "Link", title: "Insert link" },
  { cmd: "removeFormat", label: "Clear", title: "Clear formatting" },
];

const RichTextEditor = forwardRef(function RichTextEditor({ id, value, onChange, placeholder }, ref) {
  const editorRef = useRef(null);
  const lastHtml = useRef(value || "");

  const getHtml = useCallback(() => {
    const html = editorRef.current?.innerHTML ?? "";
    return html === "<br>" ? "" : html;
  }, []);

  const emitChange = useCallback(() => {
    const normalized = getHtml();
    lastHtml.current = normalized;
    onChange(normalized);
  }, [getHtml, onChange]);

  useImperativeHandle(ref, () => ({ getHtml }), [getHtml]);

  useEffect(() => {
    const el = editorRef.current;
    if (!el) return;
    const next = value || "";
    if (next !== lastHtml.current && next !== el.innerHTML) {
      el.innerHTML = next;
      lastHtml.current = next;
    }
  }, [value]);

  const runCommand = (cmd) => {
    const el = editorRef.current;
    if (!el) return;
    el.focus();

    if (cmd === "createLink") {
      const url = window.prompt("Enter URL:");
      if (url) document.execCommand(cmd, false, url);
    } else {
      document.execCommand(cmd, false, null);
    }

    emitChange();
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const text = e.clipboardData.getData("text/plain");
    document.execCommand("insertText", false, text);
    emitChange();
  };

  return (
    <div className="rte" id={id}>
      <div className="rte-toolbar" role="toolbar" aria-label="Formatting">
        {TOOLBAR.map((btn) => (
          <button
            key={btn.cmd}
            type="button"
            className={`rte-btn${btn.className ? ` ${btn.className}` : ""}`}
            title={btn.title}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => runCommand(btn.cmd)}
          >
            {btn.label}
          </button>
        ))}
      </div>
      <div
        ref={editorRef}
        className="rte-body"
        contentEditable
        role="textbox"
        aria-multiline="true"
        data-placeholder={placeholder}
        onInput={emitChange}
        onBlur={emitChange}
        onPaste={handlePaste}
        suppressContentEditableWarning
      />
    </div>
  );
});

export default RichTextEditor;
