export const routeMeta = {
  "/": {
    title: "Dashboard",
    breadcrumb: "Dashboard",
    description: "Welcome back, Admin — here's your clinic overview.",
  },
  "/patients": {
    title: "Patients",
    breadcrumb: "Patients",
    description: "View and manage all patient records in one table.",
  },
  "/companies": {
    title: "Companies",
    breadcrumb: "Companies",
    description: "Manage clinic organizations and branches (Apollo, Riyaj, etc.).",
  },
  "/departments": {
    title: "Departments",
    breadcrumb: "Departments",
    description: "Manage doctor departments and specialities master.",
  },
  "/doctors": {
    title: "Doctors",
    breadcrumb: "Doctors",
    description: "View and manage doctors mapped to departments.",
  },
  "/appointments": {
    title: "Appointments",
    breadcrumb: "Appointments",
    description: "Schedule visits, billing, prescriptions, and documents.",
  },
  "/reports": {
    title: "Reports",
    breadcrumb: "Reports",
    description: "View analytics and clinic reports.",
  },
  "/users": {
    title: "Users",
    breadcrumb: "Users",
    description: "Manage system users, roles, and permissions.",
  },
  "/settings": {
    title: "Settings",
    breadcrumb: "Settings",
    description: "Manage clinic and account settings.",
  },
};

export function getRouteMeta(pathname) {
  if (pathname === "/my-schedule") {
    return { title: "My schedule", breadcrumb: "My schedule", description: "Your weekly availability." };
  }
  const patientMatch = pathname.match(/^\/patients\/(\d+)$/);
  if (patientMatch) {
    return {
      title: "Patient chart",
      breadcrumb: "Patient chart",
      description: "Complete visit history, prescriptions, lab and diagnostic reports.",
    };
  }
  const match = pathname.match(/^\/doctors\/(\d+)\/availability$/);
  if (match) {
    return {
      title: "Doctor schedule",
      breadcrumb: "Availability",
      description: "Weekly working hours and slot settings.",
    };
  }
  return routeMeta[pathname] ?? routeMeta["/"];
}
