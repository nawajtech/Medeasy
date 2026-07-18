# MedEasy — Project Documentation

**Version:** 2.0  
**Date:** July 2026  
**Document type:** Client overview & feature documentation  
**Audience:** Business stakeholders, clinic owners, project sponsors, development team

---

## 1. Executive Summary

**MedEasy** is a cloud-ready **Healthcare Management SaaS Platform** designed for clinics, hospitals, pathology labs, diagnostic centers, and pharmacies. It provides a single web application where healthcare organizations can manage patients, doctors, appointments, billing, laboratory workflows, diagnostic imaging orders, staff, branches, subscriptions, and organization-specific settings — all from one secure dashboard.

The platform is built as a **multi-tenant SaaS system**: one MedEasy installation can serve **many independent healthcare organizations** (companies), each with its own data, branding, staff, subscription plan, and configuration. A platform **Super Admin** manages all organizations and master subscription plans; each clinic has its own **Company Admin** and role-based staff users.

**Key capabilities in the current release:**

- Full clinic operations (patients, doctors, appointments, prescriptions, billing)
- Laboratory catalog and order workflow (tests, packages, results, verification)
- Diagnostics module with **packages**, referral partners, payments, refunds, and today's queue
- **Subscription plans** with feature gating, checkout, and platform admin tools
- **Finance & P&L** reporting with gains vs expenses
- **Patient wallets** for refund credits and diagnostic payments
- **Custom roles & permissions** per organization
- **Push notifications** (Firebase) and in-app notification inbox
- **Platform theme** customization (Super Admin)

This document describes what MedEasy provides today, how it is structured, who can use which features, and what has been implemented in the current release.

---

## 2. What Problem MedEasy Solves

Healthcare organizations often rely on spreadsheets, paper records, or disconnected tools for:

- Patient registration and history  
- Doctor schedules and appointments  
- Billing and invoices  
- Lab test orders and results  
- Radiology / diagnostic orders and reports  
- Referral partner commission tracking  
- Multi-branch operations  
- Staff access control  
- SaaS subscription and plan limits  

MedEasy centralizes these workflows into one modern web application with role-based access, subscription-based feature gating, and per-organization data isolation — so each team member sees only what they need.

---

## 3. Services & Capabilities Provided

| Service | Description |
|--------|-------------|
| **Organization Management** | Register and manage multiple clinic/hospital organizations from one platform (Super Admin). |
| **Subscription & Plans** | SaaS plans with features, usage limits, trial periods, checkout, and admin assignment. |
| **Branch Management** | Support multiple physical locations per organization (gated by plan feature). |
| **Patient Management** | Store patient profiles, demographics, medical history, allergies, emergency contacts, and patient chart. |
| **Patient Wallets** | Credit balance from refunds; pay for diagnostic orders from wallet. |
| **Department Management** | Organize clinical departments (e.g. General Medicine, Cardiology, Pediatrics). |
| **Doctor Management** | Manage doctor profiles, qualifications, fees, departments, weekly availability, and diagnostic test mapping. |
| **Appointment Scheduling** | Book, confirm, complete, or cancel appointments; record vitals and prescriptions. |
| **Billing & Invoicing** | Track charges, payments, dues, and generate printable invoices per appointment. |
| **Finance & P&L** | Profit/loss summary — appointment, lab, and diagnostic gains vs commissions and expenses. |
| **Laboratory Module** | Lab test catalog (categories, tests, packages), orders, sample collection, results, verification, and approval workflow. |
| **Diagnostics Module** | Categories, test types, **packages**, orders, scheduling, payments, refunds, reports, and radiologist approval. |
| **Diagnostic Packages** | Bundle multiple tests with percentage discount; book as one package (creates one order per test). |
| **Referral Partners** | Manage referral sources (doctor, clinic, hospital, agent) with commission and payout ledger. |
| **Medicine Master** | Global medicine catalog shared across all clinics (import/export CSV). |
| **Analytics Dashboard** | Visual overview of appointments, billing trends, and doctor performance. |
| **Reports** | Saved report records for appointments, billing, patients, doctors, and custom periods. |
| **User & Role Management** | Create staff accounts, custom roles, and granular permissions per organization. |
| **Company Settings & Branding** | Per-organization configuration: logo, favicon, contact details, billing/tax preferences, and appointment defaults. |
| **Theme / Appearance** | Platform-wide color palette (Super Admin). |
| **Notifications** | In-app notification inbox and Firebase push notification support. |

---

## 4. Supported Organization Types & Modules

Each organization (tenant) in MedEasy can be classified as one of the following:

| Type | Description |
|------|-------------|
| Clinic | General outpatient clinic |
| Hospital | Full hospital operations |
| Pathology Lab | Laboratory-focused organization |
| Diagnostic Center | Imaging and diagnostic services |
| Pharmacy | Pharmacy operations |

### 4.1 Company Modules

Each organization is enabled for one or more **operational modules**:

| Module | Enables |
|--------|---------|
| `clinic` | Patients, doctors, appointments, prescriptions, billing |
| `laboratory` | Lab catalog and lab orders |
| `diagnostics` | Diagnostic catalog, orders, referrals, today's queue |

When a new organization is created, the system automatically provisions:

- A **main branch** using the organization's contact details  
- **Default departments** (General Medicine, Cardiology, Pediatrics, Orthopedics)  
- **Default settings** (clinic name, contact info, currency, appointment duration, etc.)  
- **Default subscription plan** (Basic with trial)  
- **Tenant roles** with appropriate permissions  

**Demo organizations included:** Apollo Clinic, Riyaj Clinic

---

## 5. User Roles & Access Control

MedEasy uses **role-based access control (RBAC)** with **Spatie permissions**. Each user is assigned one role that determines which menus and API actions they can access. Organizations can also create **custom roles** and assign specific permissions.

### 5.1 System Roles

| Role | Purpose |
|------|---------|
| **Super Admin** | Platform owner — manages all companies, plans, subscriptions, theme, and cross-tenant operations. |
| **Company Admin** | Administrator for one organization — manages staff, settings, branches, subscription, and all enabled modules. |
| **Staff** | General clinic staff with access to patients, appointments, lab, and diagnostics. |
| **Doctor** | Clinician — views own appointments, patients, schedule, lab orders, and diagnostics. |
| **Receptionist** | Front desk — patients, appointments, lab, and diagnostics. |
| **Lab Technician** | Laboratory workflow — patients and lab catalog/orders. |
| **Radiologist** | Imaging workflow — patients and diagnostic orders/reports. |
| **Pharmacist** | Patient and medicine master access. |
| **Nurse** | Clinical support staff. |
| **Accountant** | Finance and billing access. |

### 5.2 Effective Access Formula

A user's actual access is determined by:

```
Effective Access = Role Permissions
                 ∩ Company Enabled Modules (clinic / laboratory / diagnostics)
                 ∩ Subscription Plan Features
                 ∩ Active Subscription (or fallback to settings-only)
```

**Special cases:**

- **Super Admin:** Full platform access across all tenants  
- **Diagnostics-only doctor:** May see only today's diagnostic queue  
- **Expired subscription:** Operational routes blocked; user can still access Settings and Subscription upgrade  

### 5.3 Permission Modules (17 groups)

| Module | Covers |
|--------|--------|
| dashboard | Dashboard analytics |
| companies | Organization management (Super Admin) |
| branches | Branch CRUD |
| departments | Department master |
| patients | Patient records |
| appointments | Appointment scheduling |
| doctors | Doctor profiles and availability |
| prescriptions | Prescription documents |
| medicine | Medicine master |
| billing | Appointment billing |
| finance | Finance & P&L |
| lab | Lab catalog and orders |
| diagnostics | Diagnostic catalog, orders, referrals |
| reports | Saved reports |
| settings | Organization settings |
| users | Staff user management |
| roles | Custom roles and permissions |

### 5.4 Menu Access by Role (Summary)

| Module | Super Admin | Company Admin | Staff | Doctor | Receptionist | Lab Tech | Radiologist |
|--------|:-----------:|:-------------:|:-----:|:------:|:------------:|:--------:|:-----------:|
| Dashboard | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Companies | ✓ | — | — | — | — | — | — |
| Plans / Subscriptions | ✓ | — | — | — | — | — | — |
| Branches | ✓ | ✓* | — | — | — | — | — |
| Patients | ✓ | ✓ | ✓ | Own* | ✓ | ✓ | ✓ |
| Patient Chart | ✓ | ✓ | ✓ | Own* | ✓ | ✓ | ✓ |
| Departments | ✓ | ✓ | ✓ | — | — | — | — |
| Doctors | ✓ | ✓ | ✓ | — | — | — | — |
| Appointments | ✓ | ✓ | ✓ | Own* | ✓ | — | — |
| Lab Catalog & Orders | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | — |
| Diagnostics | ✓ | ✓ | ✓ | ✓ | ✓ | — | ✓ |
| Referral Partners | ✓ | ✓ | ✓ | — | ✓ | — | ✓ |
| Today's Queue | — | — | — | ✓ | — | — | ✓ |
| Finance & P&L | ✓ | ✓ | — | — | — | — | — |
| Medicine Master | ✓ | ✓ | ✓ | ✓ | ✓ | — | — |
| Reports | ✓ | ✓ | — | — | — | — | — |
| Users / Roles | ✓ | ✓ | — | — | — | — | — |
| Settings | ✓ | ✓ | — | — | — | — | — |
| Subscription | ✓ | ✓ | — | — | — | — | — |
| Appearance (Theme) | ✓ | — | — | — | — | — | — |
| My Schedule | — | — | — | ✓ | — | — | — |

\* *Doctors see only their own appointments and patients linked through their appointments. Branch access requires subscription `multi_branch` feature.*

### 5.5 Security Features

- Secure login with email and password  
- API token authentication (Laravel Sanctum)  
- Automatic logout on expired or invalid sessions  
- Data isolation per organization — users cannot access another company's records  
- Disabled accounts cannot log in  
- Permission checks on every API route  
- Subscription middleware blocks expired tenants from operational features  

---

## 6. Module Details

### 6.1 Dashboard

The dashboard provides an at-a-glance view of clinic operations:

- Appointment counts by status (scheduled, confirmed, completed, cancelled)  
- Monthly appointment trends  
- Billing overview (revenue, payments, outstanding dues)  
- Doctor performance metrics  
- Payment summary  
- Date range filtering  
- **Super Admin:** filter by organization to view any clinic's analytics  
- **Doctors:** dashboard scoped to their own activity; billing charts hidden  

---

### 6.2 Companies (Organizations)

**Available to:** Super Admin only

- Create, edit, and deactivate healthcare organizations  
- Set organization type, short code, contact details, address, website  
- Enable modules: clinic, laboratory, diagnostics  
- Upload organization logo  
- Business details: GST number, registration number, currency  
- On creation, auto-provisions main branch, departments, settings, roles, and default subscription  

---

### 6.3 Subscription & Plans

**Available to:** Super Admin (plan management), Company Admin (own subscription)

#### Platform Admin (Super Admin)

| Screen | Route | Purpose |
|--------|-------|---------|
| Subscription Plans | `/plans` | Create/edit master plans — pricing, features, limits, discounts, tax |
| Company Subscriptions | `/admin/subscriptions` | View all tenant subscriptions; assign or change plans |

**Plan configuration includes:**

- Monthly and yearly pricing  
- Trial period (days)  
- Feature flags (patient management, lab, diagnostics, billing, analytics, multi-branch, etc.)  
- Usage limits (max users, branches, patients, storage, reports, API requests)  
- Plan-level discount percentage  
- Tax settings (CGST/SGST/IGST) on subscription invoices  

**Default plan codes:** `basic`, `premium`, `enterprise`, `ai_gold`

#### Tenant View (Company Admin)

| Screen | Route | Purpose |
|--------|-------|---------|
| Subscription | `/subscription` | View current plan, features, limits, billing period, and payment history |

**Tenant workflow:**

1. View available plans and current subscription status  
2. Checkout — creates pending subscription invoice with tax  
3. Confirm payment — activates plan and unlocks features  
4. Expired subscription → fallback access to Settings only until renewed  

**Subscription features (examples):**

| Feature Key | Unlocks |
|-------------|---------|
| patient_management | Patients, departments |
| appointment_management | Appointments, doctors, prescriptions |
| billing | Billing, finance |
| lab_module | Laboratory |
| diagnostics_module | Diagnostics |
| pharmacy | Medicine master |
| multi_branch | Branches |
| analytics | Reports |

---

### 6.4 Branches

**Available to:** Super Admin, Company Admin (requires `multi_branch` subscription feature)

- Manage multiple physical locations per organization  
- Each branch has name, code, address, city, phone, email  
- One branch is marked as the **main branch** (created automatically)  
- Branches can be activated or deactivated  
- Operational records (appointments, lab orders, diagnostics, expenses) can be linked to a branch  

---

### 6.5 Patients & Patient Chart

- Full patient profile: name, code, contact, date of birth, gender, blood group  
- Medical history, allergies, height, weight  
- Emergency contact details  
- Unique patient code and contact per organization  
- Search and filter; Super Admin can filter by organization  

#### Patient Chart (`/patients/:id`)

Unified view of a patient's history:

- Visit and appointment history  
- Prescriptions  
- Lab orders and results  
- Diagnostic orders and reports  
- **Wallet balance** and transaction history  

#### Patient Wallets

- Auto-created when first accessed  
- **Credit sources:** diagnostic order refunds, manual credit  
- **Debit sources:** diagnostic order payments, manual debit  
- Wallet balance shown on patient list and chart  
- Wallet can be selected as payment method for diagnostic orders  

---

### 6.6 Departments

- Clinical department master data (name, code, description)  
- Used to categorize doctors  
- Default departments seeded when an organization is created  

---

### 6.7 Doctors

- Doctor profile linked to a user account  
- Department assignment, qualification, consultation fee, doctor code, license number  
- Branch assignment  
- **Weekly availability / schedule** — define working hours and appointment slots  
- Slot availability checking when booking appointments  
- **Diagnostic test mapping** — assign which doctors can perform which diagnostic tests  

---

### 6.8 Appointments

- Schedule appointments between patients and doctors  
- Status workflow: Scheduled → Confirmed → In Progress → Completed / Cancelled  
- Branch-aware booking  
- **Vitals recording:** blood pressure, heart rate, temperature, SpO₂, respiratory rate, blood sugar  
- **Prescription** — structured data or file upload; printable prescription document  
- **Billing** linked to each appointment (charges, payments, dues)  
- Printable invoice generation  

---

### 6.9 Billing

- Per-appointment billing records  
- Fields: charge amount, paid amount, previous due, total amount, due amount  
- Payment status: pending, paid, partial, overdue, cancelled  
- Patient billing balance lookup  
- Printable invoice (PDF-ready view)  
- Clinic name on invoices pulled from organization settings  

*Billing UI is integrated into the Appointments workflow and Dashboard analytics. A standalone billing list page exists in the codebase but is not linked in the main navigation.*

---

### 6.10 Finance & P&L

**Available to:** Company Admin

| Screen | Route |
|--------|-------|
| Finance & P&L | `/finance` |

**Gains (revenue sources):**

- Appointment billing payments  
- Diagnostic order payments  
- Lab order payments  

**Expenses (cost sources):**

- Referral partner commissions (from diagnostic orders)  
- Doctor commissions (from diagnostic orders)  
- Referral partner payouts (manual payout records)  
- Manual expense entries  

**Features:**

- Date range filtering  
- Summary cards: total gains, total expenses, net profit, profit margin  
- Breakdown by source  
- Add and delete manual expenses  

---

### 6.11 Laboratory Module

#### Lab Catalog (`/lab/tests`)

- **Categories** — group lab tests  
- **Tests** — individual tests with sample type, reference ranges, turnaround time, price  
- **Packages** — bundled test panels at a package price  

#### Lab Orders (`/lab/orders`)

**Workflow:**
```
Pending → Collected → Processing → Resulted → Verified → Approved
                                                              ↘ Cancelled (at any stage)
```

| Step | Action |
|------|--------|
| Create order | Select patient, branch, tests and/or packages, collection type |
| Collect | Mark sample as collected |
| Enter results | Record values with flags (normal / high / low / critical) |
| Verify | Lab supervisor verification |
| Approve | Final approval of results |
| Cancel | Cancel order if needed |

Orders support individual tests or packages via `package_id` on line items.

---

### 6.12 Diagnostics Module

#### Diagnostic Catalog (`/diagnostics`)

Three tabs:

| Tab | Content |
|-----|---------|
| Categories | Group diagnostic test types |
| Test Master | Individual tests — modality, price, referral commission, doctor commission, assigned doctors |
| Packages | Bundle multiple tests with percentage discount |

**Modalities:** X-Ray, CT, MRI, Ultrasound, ECG, Echo, and others

#### Diagnostic Packages

Packages are stored in the `diago_package` table:

| Field | Description |
|-------|-------------|
| package_name | Unique name per company |
| test_ids | JSON array of diagnostic test type IDs |
| offer_percentage | Discount % applied to each test's price |
| description | Optional notes |

**Computed pricing (at display time):**

```
list_price    = sum of all test prices
package_discount = list_price × (offer_percentage / 100)
package_price = list_price - package_discount
```

#### Diagnostic Orders (`/diagnostics/orders`)

**Booking types:**

| Type | How it works |
|------|--------------|
| Single test | One order for one `test_type_id` |
| Package | One order **per test** in the package; all linked via `package_id` |

**Package booking example** (3 tests, 30% package discount):

| Test | Original price | Package discount (30%) | Net per test |
|------|----------------|------------------------|--------------|
| Test A | ₹1,000 | ₹300 | ₹700 |
| Test B | ₹800 | ₹240 | ₹560 |
| Test C | ₹500 | ₹150 | ₹350 |

Each order stores:

- `package_id` — links to the package (null for single-test orders)  
- `package_discount` — discount amount applied to that test  
- `gross_amount` — original test price  
- `referral_discount` — referral commission deducted from bill (if enabled)  
- `net_amount` — final payable amount  

**Order workflow:**
```
Booked → Scheduled → In Progress → Completed
         ↘ Not Present    ↘ Cancelled
```

| Step | Action |
|------|--------|
| Create order | Select patient, test or package, branch, doctor, referral partner, priority |
| Schedule | Assign date/time and technician |
| Start | Mark procedure as in progress |
| Write Rx | Save findings, impression, recommendations (prescription modal) |
| Upload report | Enter or update report content |
| Approve | Radiologist final approval |
| Record payment | Partial or full payment (cash, UPI, card, wallet, etc.) |
| Process refund | Refund to cash, online, or patient wallet |
| Cancel | Cancel order if needed |
| Print bill | Printable diagnostic invoice |

**Payment tracking:**

- `paid_amount`, `due_amount`, `payment_status` (pending / partial / paid)  
- Payment history per order  
- Refund history with wallet credit option  

#### Today's Queue (`/diagnostics/today`)

**Available to:** Doctors assigned to diagnostic tests

- Serial-ordered queue for today's diagnostic appointments  
- Live status updates: scheduled, in progress, completed, not present  
- Queue serial number assigned on scheduling  

#### Referral Partners (`/diagnostics/referrals`)

| Partner type | Description |
|--------------|-------------|
| doctor | Referring doctor |
| clinic | Referring clinic |
| hospital | Referring hospital |
| agent | Marketing / referral agent |

**Features:**

- Auto-generated referral codes  
- Normal commission per test + optional surcharge (fixed or percentage)  
- Option to deduct commission from patient bill  
- Commission ledger: earned, paid, balance  
- Record payouts against partner balance  

---

### 6.13 Medicine Master

**Route:** `/pharmacy/medicines`

- Global medicine catalog (shared across all clinics, not per-tenant)  
- Fields: name, manufacturer, composition, form, strength  
- CSV import and export  
- Used as reference for prescriptions  

---

### 6.14 Reports

- Saved report records (not live drill-down analytics)  
- Report types: appointments, billing, patients, doctors, custom  
- Period range, summary text, status, generation timestamp  
- Super Admin can filter by organization  

---

### 6.15 Users, Roles & Permissions

**Available to:** Super Admin, Company Admin

#### Users (`/users`)

- Create and manage staff user accounts  
- Assign roles and optional branch  
- Enable or disable accounts  

#### Roles (`/roles`)

- View system and custom roles per organization  
- Create custom roles with selected permissions  
- Edit role permissions via permission matrix (`/roles/:id`)  

**Permission assignment rules:**

- Higher roles can only create roles at or below their level  
- Permissions grouped by module for easy assignment  
- Changes take effect on next login / API request  

---

### 6.16 Settings (Organization Configuration)

**Available to:** Super Admin, Company Admin

**Route:** `/settings`

Settings are **company-specific** — each organization has its own values.

#### Setting Groups

**General & Branding**

| Key | Description |
|-----|-------------|
| clinic_name | Display name |
| company_logo | Logo (file upload) |
| favicon | Browser favicon |
| clinic_email, clinic_phone, clinic_address, clinic_website | Contact info |

**Billing & Tax**

| Key | Description |
|-----|-------------|
| currency | Default currency (e.g. INR, USD) |
| invoice_footer | Footer on printed invoices |
| gst_number | Organization GST number |
| tax_enabled, tax_mode, tax_rate, tax_inclusive | GST configuration for diagnostic invoices |

**Appointments**

| Key | Description |
|-----|-------------|
| appointment_slot_minutes | Default slot duration |
| appointment_reminder_hours | Reminder timing |

#### Where Settings Are Used

- Clinic name and logo on invoices and prescriptions  
- Currency and tax on diagnostic bills  
- Appointment slot duration for scheduling  

---

### 6.17 Theme / Appearance

**Available to:** Super Admin only

**Route:** `/appearance`

- Customize platform-wide color palette  
- Keys: primary, secondary, accent, success, warning, error, background, text  
- Applied across login screen and authenticated app via ThemeContext  
- Public theme endpoint serves colors before login  

---

### 6.18 Notifications

- **In-app inbox** — view, mark read, delete notifications  
- **Firebase Cloud Messaging (FCM)** — push notifications to registered devices  
- Token registration on login; removal on logout  
- Test notification endpoint for development  

---

## 7. Multi-Tenant SaaS Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                       MedEasy Platform                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐           │
│  │ Apollo       │  │ Riyaj        │  │  Future      │           │
│  │ Clinic       │  │ Clinic       │  │  Clinics…    │           │
│  │              │  │              │  │              │           │
│  │ Plan: Premium│  │ Plan: Basic  │  │ Plan: …      │           │
│  │ • Patients   │  │ • Patients   │  │ • Patients   │           │
│  │ • Lab        │  │ • Lab        │  │ • Lab        │           │
│  │ • Diagnostics│  │ • Diagnostics│  │ • Diagnostics│           │
│  └──────────────┘  └──────────────┘  └──────────────┘           │
│                                                                   │
│  Super Admin: companies, plans, subscriptions, theme              │
└──────────────────────────────────────────────────────────────────┘
```

**Key principles:**

1. **One platform, many tenants** — each company is fully isolated  
2. **Shared application** — all organizations use the same MedEasy software  
3. **Separate data** — patients, orders, and settings belong to one company only  
4. **Separate branding** — logo, favicon, and contact info per organization  
5. **Subscription gating** — plan features and limits control what each tenant can use  
6. **Branch support** — large organizations can operate multiple locations  

---

## 8. Technology Overview

| Layer | Technology |
|-------|------------|
| **Frontend** | React 19, Vite, React Router, Axios, Recharts |
| **Backend** | Laravel 12 (PHP 8.2+), REST API |
| **Authentication** | Laravel Sanctum (secure API tokens) |
| **Permissions** | Spatie Laravel Permission |
| **Database** | SQLite (development) / MySQL or PostgreSQL (production) |
| **Push Notifications** | Firebase Cloud Messaging |
| **Architecture** | Single Page Application (SPA) + API backend |

The frontend and backend communicate over a secure JSON REST API. The application is browser-based — no desktop installation required for end users.

---

## 9. Application Screens (Complete)

| Screen | Route | Description |
|--------|-------|-------------|
| Login | `/login` | Secure sign-in |
| Dashboard | `/` | Analytics overview |
| Companies | `/companies` | Organization management (Super Admin) |
| Subscription Plans | `/plans` | Master plan management (Super Admin) |
| Company Subscriptions | `/admin/subscriptions` | Assign plans to tenants (Super Admin) |
| Branches | `/branches` | Branch management |
| Patients | `/patients` | Patient records |
| Patient Chart | `/patients/:id` | Full patient history, wallet, orders |
| Departments | `/departments` | Department master |
| Doctors | `/doctors` | Doctor management |
| Doctor Availability | `/doctors/:id/availability` | Weekly schedule |
| My Schedule | `/my-schedule` | Doctor's own schedule shortcut |
| Appointments | `/appointments` | Scheduling, vitals, billing, prescriptions |
| Medicine Master | `/pharmacy/medicines` | Global medicine catalog |
| Lab Catalog | `/lab/tests` | Categories, tests, packages |
| Lab Orders | `/lab/orders` | Lab order workflow |
| Diagnostic Catalog | `/diagnostics` | Categories, tests, packages |
| Diagnostic Orders | `/diagnostics/orders` | Book, schedule, pay, report |
| Referral Partners | `/diagnostics/referrals` | Referral partner master and ledger |
| Today's Queue | `/diagnostics/today` | Doctor's diagnostic appointment queue |
| Finance & P&L | `/finance` | Profit/loss summary |
| Reports | `/reports` | Saved reports |
| Users | `/users` | User management |
| Roles | `/roles` | Role management |
| Role Permissions | `/roles/:id` | Permission matrix |
| Subscription | `/subscription` | Tenant plan view and checkout |
| Settings | `/settings` | Organization configuration |
| Appearance | `/appearance` | Platform theme (Super Admin) |

---

## 10. Database Overview (Key Tables)

| Area | Tables |
|------|--------|
| Core | users, companies, branches, settings |
| RBAC | permissions, roles, role/permission pivots |
| Subscription | plans, features, plan_features, plan_limits, subscriptions, subscription_payments |
| Clinical | patients, departments, doctors, doctor_availabilities, appointments, appointment_vitals, billings |
| Laboratory | lab_test_categories, lab_tests, lab_test_packages, lab_orders, lab_order_items, lab_samples, lab_results |
| Diagnostics | diagnostic_categories, diagnostic_test_types, diago_package, diagnostic_orders, diagnostic_reports, diagnostic_order_payments, diagnostic_order_refunds |
| Referrals | referral_partners, referral_commission_payouts |
| Wallets | patient_wallets, patient_wallet_transactions |
| Finance | expenses |
| Other | medicines, reports, theme_settings, fcm_tokens, app_notifications |

---

## 11. Demo Access (Development / UAT)

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

## 12. Current Delivery Status

### ✅ Delivered & Functional

**Platform & Admin**
- Multi-tenant company and branch management  
- Subscription plans with features, limits, discounts, and tax  
- Company subscription assignment (Super Admin)  
- Tenant subscription view, checkout, and payment confirmation  
- Custom roles and granular permissions (Spatie RBAC)  
- Platform theme / appearance settings  
- Push notifications (FCM) and in-app notification inbox  

**Clinic**
- Full patient, doctor, department, and appointment modules  
- Patient chart with unified history  
- Vitals, prescriptions (structured + file upload), and appointment-linked billing  
- Printable invoices and prescriptions  
- Medicine master with CSV import/export  
- Doctor weekly availability and schedule management  
- Auto-provisioning of new organizations  

**Laboratory**
- Lab catalog (categories, tests, packages)  
- Full lab order workflow (collect → results → verify → approve)  

**Diagnostics**
- Diagnostic catalog (categories, test types, packages)  
- **Package booking** — one order per test with `package_id` and per-test discount  
- Single test and package order creation  
- Referral partner management with commission and payout ledger  
- Order scheduling, today's queue with serial numbers  
- Partial/full payments and refunds (cash, online, wallet)  
- Patient wallets (refund credit, wallet payments)  
- Printable diagnostic invoices and prescriptions  
- Doctor-to-test mapping  
- Report upload and radiologist approval  

**Finance & Analytics**
- Finance & P&L module (gains vs expenses)  
- Analytics dashboard with charts  
- Saved reports  

**Security**
- Role-based navigation and API permission checks  
- Subscription middleware (expired tenants blocked from operations)  
- Tenant data isolation  

### 🔶 Partial / Not in Main Navigation

- **Billing list page** — backend API complete; standalone frontend page exists but billing works through Appointments  
- **AI features** — seeded in subscription plans (`ai_ocr`, `ai_report_explanation`, `voice_assistant`, `ai_chat_assistant`) but no UI or API yet  
- **Inventory module** — feature key exists in plans; no implementation yet  
- **External API access tier** — feature key exists; no separate API gateway yet  

### 📋 Potential Future Enhancements

- Patient portal (online booking for patients)  
- SMS/email notification delivery for appointment reminders  
- AI-powered report explanation and OCR  
- Pharmacy dispensing module expansion  
- Inventory management  
- Mobile application  
- Apply organization logo/favicon globally across all document templates  

---

## 13. Deployment Requirements (Summary)

| Component | Requirement |
|-----------|-------------|
| Web server | Apache or Nginx (e.g. XAMPP, Linux server) |
| PHP | 8.2 or higher |
| Database | MySQL 8+ or PostgreSQL (recommended for production) |
| Node.js | For building the frontend (build-time only) |
| SSL certificate | HTTPS recommended for production |
| Storage | Writable storage for logos, favicons, and diagnostic reports |
| Firebase | Optional — for push notifications (FCM credentials in `.env`) |

**Typical URLs:**

- Frontend (user app): `https://yourdomain.com`  
- Backend API: `https://yourdomain.com/api` or `https://api.yourdomain.com/api`  

**Key environment variables (backend):**

- Database connection (`DB_*`)  
- `APP_URL`, `APP_KEY`  
- Mail settings (for welcome emails)  
- Firebase credentials (for push notifications)  

---

## 14. Support & Maintenance Scope

This documentation covers the **MedEasy healthcare management platform** as implemented in the current codebase. Ongoing services typically include:

- Bug fixes and stability improvements  
- Security updates for framework dependencies  
- Feature enhancements per agreed roadmap  
- Database backups and deployment support  
- User training for clinic administrators  

---

## 15. Glossary

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
| **Package** | Bundle of tests sold together at a discount (lab or diagnostic) |
| **offer_percentage** | Diagnostic package discount % applied to each test price |
| **package_id** | Foreign key on diagnostic orders linking to a package booking |
| **Referral partner** | External source that refers patients; earns commission on diagnostic orders |
| **Patient wallet** | Stored credit balance for a patient (from refunds or manual credit) |
| **Today's queue** | Serial-ordered list of today's diagnostic appointments for a doctor |
| **Plan feature** | Subscription capability that unlocks permission modules |
| **Plan limit** | Usage cap (users, branches, patients, etc.) per subscription |

---

## 16. Document Revision History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | June 2026 | Initial client documentation — platform overview, modules, roles, settings |
| 2.0 | July 2026 | Full update: subscriptions, diagnostic packages & booking, referral partners, patient wallets, finance/P&L, custom roles, medicine master, theme, notifications, today's queue, complete screen list, delivery status |

---

**MedEasy** — *Healthcare Management, Made Easy.*

For technical setup instructions or deployment assistance, contact your development team.
