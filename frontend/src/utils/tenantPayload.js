/**
 * Strip company_id for tenant users — the API resolves it from the logged-in account.
 */
export function withCompanyScope(payload, isSuperAdmin) {
  if (isSuperAdmin) {
    return payload;
  }
  const { company_id: _ignored, ...rest } = payload;
  return rest;
}
