export const routeMeta = {
  "/": {
    title: "Dashboard",
    breadcrumb: "Dashboard",
    description: "Welcome back — here's your organisation overview.",
  },
  "/patients": {
    title: "Patients",
    breadcrumb: "Patients",
    description: "View and manage all patient records in one table.",
  },
  "/companies": {
    title: "Companies",
    breadcrumb: "Companies",
    description: "Manage diagnostic organisations and branches.",
  },
  "/departments": {
    title: "Departments",
    breadcrumb: "Departments",
    description: "Manage doctor departments and specialities master.",
  },
  "/diagnostics/doctors": {
    title: "Diagnostic Doctors",
    breadcrumb: "Doctors",
    description: "View and manage diagnostic doctors mapped to departments.",
  },
  "/lab/doctors": {
    title: "Lab Doctors",
    breadcrumb: "Doctors",
    description: "View and manage laboratory doctors mapped to departments.",
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
  "/audit-trail": {
    title: "Audit Trail",
    breadcrumb: "Audit Trail",
    description: "View all system changes across your organization — who did what and when.",
  },
};

export function getRouteMeta(pathname) {
  if (pathname === "/diagnostics/today") {
    return {
      title: "Today's appointments",
      breadcrumb: "Today's appointments",
      description: "Your patient queue for today — serial order with live status updates.",
    };
  }
  if (pathname === "/diagnostics/chats") {
    return {
      title: "Partner chats",
      breadcrumb: "Partner chats",
      description: "Reply to partners who message this diagnostic centre.",
    };
  }
  if (pathname === "/diagnostics/referrals") {
    return {
      title: "Referral By",
      breadcrumb: "Referral By",
      description: "Manage referral partners — doctors, clinics, hospitals, and agents.",
    };
  }
  if (pathname === "/diagnostics/orders") {
    return {
      title: "Diagnostic Orders",
      breadcrumb: "Diagnostic Orders",
      description: "Book, schedule, and manage diagnostic test orders for patients.",
    };
  }
  if (pathname === "/diagnostics/catalog") {
    return {
      title: "Diagnostic Catalog",
      breadcrumb: "Catalog",
      description: "Manage diagnostic categories, tests, packages, and pricing.",
    };
  }
  if (pathname === "/lab/orders") {
    return {
      title: "Lab Orders",
      breadcrumb: "Lab Orders",
      description: "Book and manage laboratory test orders.",
    };
  }
  const patientMatch = pathname.match(/^\/patients\/(\d+)$/);
  if (patientMatch) {
    return {
      title: "Patient chart",
      breadcrumb: "Patient chart",
      description: "Lab and diagnostic reports, wallet, and activity.",
    };
  }
  return routeMeta[pathname] ?? routeMeta["/"];
}