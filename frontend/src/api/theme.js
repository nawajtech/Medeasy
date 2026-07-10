import api from "./axios";

export const getTheme = () => api.get("/theme");
export const updateTheme = (colors) => api.put("/theme", colors);
