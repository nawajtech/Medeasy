import api from "./axios";

export const getTodayCentre = (params = {}) =>
  api.get("/ops/today-centre", { params });
