/** Doctor module types — values stored in doctors.doctor_type */
export const DOCTOR_TYPES = {
  DIAGNOSTIC: "diagnostic",
  LAB: "lab",
};

export const DOCTOR_TYPE_LABELS = {
  [DOCTOR_TYPES.DIAGNOSTIC]: "Diagnostic",
  [DOCTOR_TYPES.LAB]: "Lab",
};

/** Resolve doctor_type from the current Doctors list route. */
export function doctorTypeFromPath(pathname = "") {
  if (pathname.startsWith("/diagnostics/doctors")) return DOCTOR_TYPES.DIAGNOSTIC;
  if (pathname.startsWith("/lab/doctors")) return DOCTOR_TYPES.LAB;
  return DOCTOR_TYPES.DIAGNOSTIC;
}

/** List path for a doctor_type (sidebar / back links). */
export function doctorsPathForType(doctorType) {
  switch (doctorType) {
    case DOCTOR_TYPES.DIAGNOSTIC:
      return "/diagnostics/doctors";
    case DOCTOR_TYPES.LAB:
      return "/lab/doctors";
    default:
      return "/diagnostics/doctors";
  }
}