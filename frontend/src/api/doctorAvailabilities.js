import api from "./axios";

export const getDoctorAvailabilities = (doctorId) =>
  api.get(`/doctors/${doctorId}/availabilities`);

export const saveDoctorAvailabilities = (doctorId, schedules) =>
  api.put(`/doctors/${doctorId}/availabilities`, { schedules });

export const checkDoctorAvailability = (doctorId, payload) =>
  api.post(`/doctors/${doctorId}/availability/check`, payload);
