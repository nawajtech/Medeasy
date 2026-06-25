import api from "./axios";

export const getRoles = () => api.get("/roles");
export const getRole = (id) => api.get(`/roles/${id}`);
export const createRole = (data) => api.post("/roles", data);
export const updateRole = (id, data) => api.put(`/roles/${id}`, data);
export const deleteRole = (id) => api.delete(`/roles/${id}`);
export const syncRolePermissions = (id, permissions) =>
  api.put(`/roles/${id}/permissions`, { permissions });
export const getAssignableRoles = () => api.get("/roles/assignable");
export const getPermissions = () => api.get("/permissions");
