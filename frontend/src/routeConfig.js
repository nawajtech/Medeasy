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
  "/plans": {
    title: "Subscription Plans",
    breadcrumb: "Plans",
    description: "Create and manage master subscription plans, pricing, features, and limits.",
  },
  "/admin/subscriptions": {
    title: "Company Subscriptions",
    breadcrumb: "Subscriptions",
    description: "View and assign subscription plans to organizations.",
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
  "/finance": {
    title: "Finance & P&L",
    breadcrumb: "Finance & P&L",
    description: "Today's profit margin, doctor commission, referral costs, and all gains vs expenses.",
  },
  "/users": {
    title: "Users",
    breadcrumb: "Users",
    description: "Manage system users, roles, and permissions.",
  },
  "/settings": {
    title: "Settings",
    breadcrumb: "Settings",
    description: "Manage organisation and account settings.",
  },
  "/appearance": {
    title: "Theme Settings",
    breadcrumb: "Appearance",
    description: "Customize the platform-wide color palette applied across the app.",
  },
  "/subscription": {
    title: "Subscription",
    breadcrumb: "Subscription",
    description: "View your organization's plan, features, limits, and billing period.",
  },
  "/pharmacy/medicines": {
    title: "Medicine Master",
    breadcrumb: "Medicine Master",
    description: "Global medicine list — name, manufacturer, and composition. Shared across all clinics.",
  },
};

export function getRouteMeta(pathname) {
  if (pathname === "/my-schedule") {
    return { title: "My schedule", breadcrumb: "My schedule", description: "Your weekly availability." };
  }
  if (pathname === "/diagnostics/today") {
    return {
      title: "Today's appointments",
      breadcrumb: "Today's appointments",
      description: "Your patient queue for today — serial order with live status updates.",
    };
  }
  if (pathname === "/diagnostics/referrals") {
    return {
      title: "Referral By",
      breadcrumb: "Referral By",
      description: "Manage referral partners — doctors, clinics, hospitals, and agents.",
    };
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
