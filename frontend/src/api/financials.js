import api from "./axios";

export const getFinancialSummary = (params) => api.get("/financials/summary", { params });

export const getExpenses = (params) => api.get("/financials/expenses", { params });

export const createExpense = (payload) => api.post("/financials/expenses", payload);

export const deleteExpense = (id) => api.delete(`/financials/expenses/${id}`);
