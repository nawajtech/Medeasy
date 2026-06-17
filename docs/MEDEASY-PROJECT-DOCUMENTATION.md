# MedEasy — Project Documentation

**Version:** 1.0  
**Date:** June 2026  
**Document type:** Client overview & feature documentation  
**Audience:** Business stakeholders, clinic owners, project sponsors

---

## 1. Executive Summary

**MedEasy** is a cloud-ready **Healthcare Management SaaS Platform** designed for clinics, hospitals, pathology labs, diagnostic centers, and pharmacies. It provides a single web application where healthcare organizations can manage patients, doctors, appointments, billing, laboratory workflows, diagnostic imaging orders, staff, branches, and organization-specific settings — all from one secure dashboard.

The platform is built as a **multi-tenant system**: one MedEasy installation can serve **many independent healthcare organizations** (companies), each with its own data, branding, staff, and configuration. A platform **Super Admin** manages all organizations; each clinic has its own **Company Admin** and role-based staff users.

This document describes what MedEasy provides today, how it is structured, who can use which features, and what has been implemented in the current release.

---

## 2. What Problem MedEasy Solves

Healthcare organizations often rely on spreadsheets, paper records, or disconnected tools for:

- Patient registration and history  
- Doctor schedules and appointments  
- Billing and invoices  
- Lab test orders and results  
- Radiology / diagnostic orders and reports  
- Multi-branch operations  
- Staff access control  

MedEasy centralizes these workflows into one modern web application with role-based access, so each team member sees only what they need — receptionists handle appointments, lab technicians process lab orders, radiologists approve imaging reports, doctors manage their patients and schedules, and administrators control the organization.

---

## 3. Services & Capabilities Provided

MedEasy delivers the following **core services** to healthcare organizations:

| Service | Description |
|--------|-------------|
| **Organization Management** | Register and manage multiple clinic/hospital organizations from one platform (Super Admin). |
| **Branch Management** | Support multiple physical locations per organization with a designated main branch. |
| **Patient Management** | Store patient profiles, demographics, medical history, allergies, and emergency contacts. |
| **Department Management** | Organize clinical departments (e.g. General Medicine, Cardiology, Pediatrics). |
| **Doctor Management** | Manage doctor profiles, qualifications, fees, departments, and weekly availability. |
| **Appointment Scheduling** | Book, confirm, complete, or cancel appointments; record vitals and prescriptions. |
| **Billing & Invoicing** | Track charges, payments, dues, and generate printable invoices per appointment. |
| **Laboratory Module** | Lab test catalog (categories, tests, packages), orders, sample collection, results, verification, and approval workflow. |
| **Diagnostics Module** | Imaging/diagnostic test types, order scheduling, report upload, and radiologist approval. |
| **Analytics Dashboard** | Visual overview of appointments, billing trends, and doctor performance. |
| **Reports** | Saved report records for appointments, billing, patients, doctors, and custom periods. |
| **User & Role Management** | Create staff accounts with appropriate roles and optional branch assignment. |
| **Company Settings & Branding** | Per-organization configuration: logo, favicon, contact details, billing preferences, and appointment defaults. |

---

## 4. Supported Organization Types

Each organization (tenant) in MedEasy can be classified as one of the following:

| Type | Description |
|------|-------------|
| Clinic | General outpatient clinic |
| Hospital | Full hospital operations |
| Pathology Lab | Laboratory-focused organization |
| Diagnostic Center | Imaging and diagnostic services |
| Pharmacy | Pharmacy operations |

When a new organization is created, the system automatically provisions:

- A **main branch** using the organization’s contact details  
- **Default departments** (General Medicine, Cardiology, Pediatrics, Orthopedics)  
- **Default settings** (clinic name, contact info, currency, appointment duration, etc.)

---

## 5. User Roles & Access Control

MedEasy uses **role-based access control (RBAC)**. Each user is assigned one role that determines which menus and features they can access.

### 5.1 Role Overview

| Role | Purpose |
|------|---------|
| **Super Admin** | Platform owner — manages all companies, branches, and cross-tenant operations. |
| **Company Admin** | Administrator for one organization — manages staff, settings, branches, and all clinic modules. |
| **Staff** | General clinic staff with access to patients, appointments, lab, and diagnostics. |
| **Doctor** | Clinician — views own appointments, patients, schedule, lab orders, and diagnostics. |
| **Receptionist** | Front desk — patients, appointments, lab, and diagnostics. |
| **Lab Technician** | Laboratory workflow — patients and lab catalog/orders. |
| **Radiologist** | Imaging workflow — patients and diagnostic orders/reports. |
| **Pharmacist** | Patient access for pharmacy-related workflows. |

### 5.2 Menu Access by Role

| Module | Super Admin | Company Admin | Staff | Doctor | Receptionist | Lab Tech | Radiologist | Pharmacist |
|--------|:-----------:|:-------------:|:-----:|:------:|:------------:|:--------:|:-----------:|:----------:|
| Dashboard | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Companies | ✓ | — | — | — | — | — | — | — |
| Branches | ✓ | ✓ | — | — | — | — | — | — |
| Patients | ✓ | ✓ | ✓ | Own* | ✓ | ✓ | ✓ | ✓ |
| Departments | ✓ | ✓ | ✓ | — | — | — | — | — |
| Doctors | ✓ | ✓ | ✓ | — | — | — | — | — |
| Appointments | ✓ | ✓ | ✓ | Own* | ✓ | — | — | — |
| Lab Catalog & Orders | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | — | — |
| Diagnostics | ✓ | ✓ | ✓ | ✓ | ✓ | — | ✓ | — |
| Reports | ✓ | ✓ | — | — | — | — | — | — |
| Users / Staff | ✓ | ✓ | — | — | — | — | — | — |
| Settings | ✓ | ✓ | — | — | — | — | — | — |
| My Schedule | — | — | — | ✓ | — | — | — | — |

\* *Doctors see only their own appointments and patients linked through their appointments.*

### 5.3 Security Features

- Secure login with email and password  
- API token authentication (session tokens stored securely in the browser)  
- Automatic logout on expired or invalid sessions  
- Data isolation per organization — users cannot access another company’s records  
- Disabled accounts cannot log in  
- Doctors cannot modify system settings or user accounts  

---

## 6. Module Details

### 6.1 Dashboard

The dashboard provides an at-a-glance view of clinic operations:

- Appointment counts by status (scheduled, confirmed, completed, cancelled)  
- Monthly appointment trends  
- Billing overview (revenue, payments, outstanding dues)  
- Doctor performance metrics  
- Date range filtering  
- **Super Admin:** filter by organization to view any clinic’s analytics  
- **Doctors:** dashboard scoped to their own activity; billing charts hidden  

---

### 6.2 Companies (Organizations)

**Available to:** Super Admin only

- Create, edit, and deactivate healthcare organizations  
- Set organization type, short code, contact details, address, website  
- Upload organization logo  
- Business details: GST number, registration number, currency  
- On creation, the system auto-provisions main branch, departments, and default settings  

**Demo organizations included:** Apollo Clinic, Riyaj Clinic

---

### 6.3 Branches

**Available to:** Super Admin, Company Admin

- Manage multiple physical locations per organization  
- Each branch has name, code, address, city, phone, email  
- One branch is marked as the **main branch** (created automatically)  
- Branches can be activated or deactivated  
- Operational records (appointments, lab orders, diagnostics) can be linked to a branch  

---

### 6.4 Patients

- Full patient profile: name, code, contact, date of birth, gender, blood group  
- Medical history, allergies, height, weight  
- Emergency contact details  
- Unique patient code and contact per organization  
- Search and filter; Super Admin can filter by organization  

---

### 6.5 Departments

- Clinical department master data (name, code, description)  
- Used to categorize doctors  
- Default departments seeded when an organization is created  

---

### 6.6 Doctors

- Doctor profile linked to a user account  
- Department assignment, qualification, consultation fee, doctor code  
- Branch assignment  
- **Weekly availability / schedule** — define working hours and appointment slots  
- Slot availability checking when booking appointments  

---

### 6.7 Appointments

- Schedule appointments between patients and doctors  
- Status workflow: Scheduled → Confirmed → Completed / Cancelled  
- Branch-aware booking  
- **Vitals recording:** blood pressure, heart rate, temperature, SpO₂, respiratory rate, blood sugar  
- **Prescription** text with printable prescription document  
- **Billing** linked to each appointment (charges, payments, dues)  
- Printable invoice generation  

---

### 6.8 Billing

- Per-appointment billing records  
- Fields: charge amount, paid amount, previous due, total amount, due amount  
- Payment status: pending, paid, partial, overdue, cancelled  
- Patient billing balance lookup  
- Printable invoice (PDF-ready view)  
- Clinic name on invoices pulled from organization settings  

*Note: Billing is integrated into the Appointments workflow and Dashboard analytics. A dedicated billing list page exists in development but is not yet linked in the main navigation.*

---

### 6.9 Laboratory Module

#### Lab Catalog
- **Categories** — group lab tests  
- **Tests** — individual tests with sample type, reference ranges, turnaround time, price  
- **Packages** — bundled test panels at a package price  

#### Lab Orders — Workflow
```
Pending → Collected → Processing → Resulted → Verified → Approved
                                                              ↘ Cancelled (at any stage)
```

| Step | Action |
|------|--------|
| Create order | Select patient, branch, tests/packages, collection type |
| Collect | Mark sample as collected |
| Enter results | Record values with flags (normal / high / low / critical) |
| Verify | Lab supervisor verification |
| Approve | Final approval of results |
| Cancel | Cancel order if needed |

---

### 6.10 Diagnostics Module (Radiology / Imaging)

#### Test Types
- Modalities: X-Ray, CT, MRI, Ultrasound, ECG, Echo, and others  
- Preparation instructions and pricing  

#### Diagnostic Orders — Workflow
```
Booked → Scheduled → In Progress → Completed
                                    ↘ Cancelled
```

| Step | Action |
|------|--------|
| Create order | Select patient, branch, test type, priority, clinical notes |
| Schedule | Assign date/time for the procedure |
| Start | Mark procedure as in progress |
| Upload report | Enter findings, impression, recommendations |
| Approve | Radiologist final approval |
| Cancel | Cancel order if needed |

---

### 6.11 Reports

- Saved report records (not live drill-down analytics)  
- Report types: appointments, billing, patients, doctors, custom  
- Period range, summary text, status, generation timestamp  
- Super Admin can filter by organization  

---

### 6.12 Users & Staff Management

**Available to:** Super Admin, Company Admin

- Create and manage staff user accounts  
- Assign roles: Company Admin, Staff, Doctor, Lab Technician, Radiologist, Receptionist, Pharmacist  
- Optional branch assignment  
- Enable or disable accounts  
- Role assignment rules: higher roles can only create roles at or below their level  

---

### 6.13 Settings (Organization Configuration)

**Available to:** Super Admin, Company Admin

Settings are **company-specific** — each organization has its own values while sharing the same predefined configuration keys across the platform.

#### How Settings Work

- **Predefined keys** — the system defines which settings exist; organizations cannot add arbitrary new keys  
- **Per-company values** — each clinic fills in its own logo, contact details, and preferences  
- **Open form layout** — all settings appear in grouped sections (not a generic database table)  
- **Super Admin** selects which organization to configure  
- **Company Admin** automatically sees only their own organization’s settings  

#### Setting Groups & Fields

**General & Branding**

| Key | Description | Input Type |
|-----|-------------|------------|
| `clinic_name` | Clinic / organization display name | Text |
| `company_logo` | Company logo | File upload (drag & drop) |
| `favicon` | Browser favicon | File upload (drag & drop) |
| `clinic_email` | Contact email | Email |
| `clinic_phone` | Contact phone | Phone |
| `clinic_address` | Full clinic address | Text area |
| `clinic_website` | Website URL | URL |

**Billing**

| Key | Description | Default |
|-----|-------------|---------|
| `currency` | Default currency code | USD |
| `invoice_footer` | Footer note on printed invoices | — |

**Appointments**

| Key | Description | Default |
|-----|-------------|---------|
| `appointment_slot_minutes` | Default appointment duration | 30 minutes |

**Notifications**

| Key | Description | Default |
|-----|-------------|---------|
| `appointment_reminder_hours` | Hours before appointment to send reminder | 24 hours |

#### Logo & Favicon Upload

- Drag-and-drop or browse to upload  
- Supported formats: JPG, PNG, GIF, WebP, SVG  
- Maximum file size: 2 MB  
- Preview before save  
- Replace or remove existing images  
- Images stored securely on the server and linked to the organization  

#### Where Settings Are Used

- Clinic name appears on invoices and prescriptions  
- Logo and branding support white-label appearance per organization  
- Currency and invoice footer customize billing documents  
- Appointment slot duration guides scheduling defaults  

---

## 7. Multi-Tenant Architecture

MedEasy is designed as a **Software-as-a-Service (SaaS)** platform:

```
┌─────────────────────────────────────────────────────────┐
│                    MedEasy Platform                      │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐   │
│  │ Apollo      │  │ Riyaj       │  │  Future     │   │
│  │ Clinic      │  │ Clinic      │  │  Clinics…   │   │
│  │             │  │             │  │             │   │
│  │ • Patients  │  │ • Patients  │  │ • Patients  │   │
│  │ • Doctors   │  │ • Doctors   │  │ • Doctors   │   │
│  │ • Settings  │  │ • Settings  │  │ • Settings  │   │
│  │ • Branches  │  │ • Branches  │  │ • Branches  │   │
│  └─────────────┘  └─────────────┘  └─────────────┘   │
│                                                          │
│  Super Admin manages all organizations above             │
└─────────────────────────────────────────────────────────┘
```

**Key principles:**

1. **One platform, many tenants** — each company is fully isolated  
2. **Shared application** — all organizations use the same MedEasy software  
3. **Separate data** — patients, appointments, and settings belong to one company only  
4. **Separate branding** — logo, favicon, and contact info per organization  
5. **Branch support** — large organizations can operate multiple locations  

---

## 8. Technology Overview

| Layer | Technology |
|-------|------------|
| **Frontend** | React 19, Vite, React Router, Axios, Recharts |
| **Backend** | Laravel 12 (PHP 8.2+), REST API |
| **Authentication** | Laravel Sanctum (secure API tokens) |
| **Database** | SQLite (development) / MySQL or PostgreSQL (production) |
| **Architecture** | Single Page Application (SPA) + API backend |

The frontend and backend communicate over a secure JSON REST API. The application is browser-based — no desktop installation required for end users.

---

## 9. Application Screens

| Screen | Route | Description |
|--------|-------|-------------|
| Login | `/login` | Secure sign-in |
| Dashboard | `/` | Analytics overview |
| Companies | `/companies` | Organization management (Super Admin) |
| Branches | `/branches` | Branch management |
| Patients | `/patients` | Patient records |
| Departments | `/departments` | Department master |
| Doctors | `/doctors` | Doctor management |
| Doctor Availability | `/doctors/:id/availability` | Weekly schedule |
| My Schedule | `/my-schedule` | Doctor’s own schedule shortcut |
| Appointments | `/appointments` | Scheduling, vitals, billing, prescriptions |
| Lab Catalog | `/lab/tests` | Categories, tests, packages |
| Lab Orders | `/lab/orders` | Lab order workflow |
| Diagnostics | `/diagnostics` | Diagnostic types and orders |
| Reports | `/reports` | Saved reports |
| Users / Staff | `/users` | User management |
| Settings | `/settings` | Organization configuration |

---

## 10. Demo Access (Development / UAT)

The following demo accounts are available after running the database seeder:

| Role | Email | Password | Organization |
|------|-------|----------|--------------|
| Super Admin | `super@medeasy.com` | `password` | Platform (all companies) |
| Company Admin | `admin@apollo.com` | `password` | Apollo Clinic |
| Doctor | `doctor@apollo.com` | `password` | Apollo Clinic |
| Company Admin | `admin@riyaj.com` | `password` | Riyaj Clinic |
| Doctor | `doctor@riyaj.com` | `password` | Riyaj Clinic |

*Change all passwords before production deployment.*

---

## 11. Current Delivery Status

### ✅ Delivered & Functional

- Multi-tenant company and branch management  
- Full patient, doctor, department, and appointment modules  
- Vitals, prescriptions, and appointment-linked billing  
- Printable invoices and prescriptions  
- Laboratory catalog and full order workflow  
- Diagnostics catalog and full order/report workflow  
- Role-based navigation and API security  
- Analytics dashboard with charts  
- User/staff management  
- Company-specific settings with logo/favicon upload  
- Doctor weekly availability and schedule management  
- Auto-provisioning of new organizations (branch, departments, settings)  

### 🔶 In Progress / Partial

- **Billing list page** — backend API complete; dedicated frontend page exists but is not yet added to navigation (billing works through Appointments)  
- **Subscription plans** — database structure exists for future SaaS billing tiers; no UI yet  

### 📋 Potential Future Enhancements

- Patient portal (online booking for patients)  
- SMS/email notification delivery for appointment reminders  
- Subscription plan management and usage limits  
- Pharmacy dispensing module expansion  
- Mobile application  
- Apply organization logo/favicon globally across the app UI and documents  

---

## 12. Deployment Requirements (Summary)

For production hosting, the following is required:

| Component | Requirement |
|-----------|-------------|
| Web server | Apache or Nginx (e.g. XAMPP, Linux server) |
| PHP | 8.2 or higher |
| Database | MySQL 8+ or PostgreSQL (recommended for production) |
| Node.js | For building the frontend (build-time only) |
| SSL certificate | HTTPS recommended for production |
| Storage | Writable storage for uploaded logos, favicons, and diagnostic reports |

**Typical URLs:**

- Frontend (user app): `https://yourdomain.com`  
- Backend API: `https://yourdomain.com/api` or `https://api.yourdomain.com/api`  

---

## 13. Support & Maintenance Scope

This documentation covers the **MedEasy healthcare management platform** as implemented in the current codebase. Ongoing services typically include:

- Bug fixes and stability improvements  
- Security updates for framework dependencies  
- Feature enhancements per agreed roadmap  
- Database backups and deployment support  
- User training for clinic administrators  

---

## 14. Glossary

| Term | Meaning |
|------|---------|
| **Tenant** | One healthcare organization (company) on the platform |
| **Super Admin** | Platform-level administrator with access to all tenants |
| **Company Admin** | Administrator for a single organization |
| **Branch** | A physical location belonging to an organization |
| **SaaS** | Software as a Service — one application serving multiple customers |
| **RBAC** | Role-Based Access Control — permissions based on user role |
| **Modality** | Type of diagnostic imaging (X-Ray, CT, MRI, etc.) |
| **TAT** | Turnaround Time — expected time for lab results |

---

## 15. Document Revision History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | June 2026 | Initial client documentation — full platform overview, modules, roles, settings, and delivery status |

---

**MedEasy** — *Healthcare Management, Made Easy.*

For technical setup instructions or deployment assistance, contact your development team.
