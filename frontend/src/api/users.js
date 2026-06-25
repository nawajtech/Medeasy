import api from "./axios";

export const getUsers = () => api.get("/users");
export const getUser = (id) => api.get(`/users/${id}`);
export const getUserAssignableRoles = (companyId) =>
  api.get("/users/assignable-roles", { params: companyId ? { company_id: companyId } : {} });
export const createUser = (data) => api.post("/users", data);
export const updateUser = (id, data) => api.put(`/users/${id}`, data);
export const deleteUser = (id) => api.delete(`/users/${id}`);
