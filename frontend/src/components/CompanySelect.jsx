import { useEffect, useState } from "react";
import { getCompaniesList } from "../api/companiesList";
import { useAuth } from "../auth/AuthContext";

function CompanySelect({
  value,
  onChange,
  required = true,
  id = "company_id",
  variant = "field",
  allowAll = false,
  label = "Company / clinic",
}) {
  const { isSuperAdmin } = useAuth();
  const [companies, setCompanies] = useState([]);

  useEffect(() => {
    if (!isSuperAdmin) return;
    getCompaniesList()
      .then((res) => setCompanies(res.data))
      .catch(() => setCompanies([]));
  }, [isSuperAdmin]);

  if (!isSuperAdmin) return null;

  const select = (
    <select id={id} name="company_id" value={value} onChange={onChange} required={required}>
      {allowAll && <option value="">All clinics</option>}
      {!allowAll && <option value="">Select clinic…</option>}
      {companies.map((c) => (
        <option key={c.id} value={c.id}>
          {c.name}
        </option>
      ))}
    </select>
  );

  if (variant === "inline") {
    return (
      <span className="company-select-inline">
        {label && <span className="company-select-inline-label">{label}</span>}
        {select}
      </span>
    );
  }

  return (
    <div className="crud-field">
      <label htmlFor={id}>{label}</label>
      {select}
    </div>
  );
}

export default CompanySelect;
