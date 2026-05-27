import api from "./axios";

export const getCompaniesList = () => api.get("/companies-list");
