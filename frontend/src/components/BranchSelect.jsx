import { useEffect, useState } from "react";
import { getBranches } from "../api/branches";

/**
 * Reusable branch dropdown.
 *
 * Props:
 *   value        – controlled value (branch_id or "")
 *   onChange     – standard event handler  e => ...
 *   companyId    – filter branches to this company (pass when in super-admin context)
 *   id           – <select> id for label binding
 *   name         – <select> name
 *   required     – bool
 *   allowAll     – prepend "All branches" / "No branch" option
 *   allLabel     – label for the blank option  (default "All branches")
 *   disabled     – bool
 */
function BranchSelect({
  value = "",
  onChange,
  companyId = "",
  id = "branch_id",
  name = "branch_id",
  required = false,
  allowAll = true,
  allLabel = "All branches",
  disabled = false,
}) {
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const fetch = async () => {
      setLoading(true);
      try {
        const { data } = await getBranches({ active_only: 1, ...(companyId ? { company_id: companyId } : {}) });
        if (!cancelled) setBranches(data);
      } catch {
        // ignore
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetch();
    return () => { cancelled = true; };
  }, [companyId]);

  return (
    <select
      id={id}
      name={name}
      value={value}
      onChange={onChange}
      required={required}
      disabled={disabled || loading}
    >
      {allowAll && <option value="">{loading ? "Loading…" : allLabel}</option>}
      {branches.map((b) => (
        <option key={b.id} value={b.id}>
          {b.name}{b.is_main ? " ★" : ""}
          {b.city ? ` — ${b.city}` : ""}
        </option>
      ))}
    </select>
  );
}

export default BranchSelect;
