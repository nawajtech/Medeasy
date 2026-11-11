# ApnaMedi — B2B Referral Partner Portal Brief

**Purpose of this document:** Product + architecture brief for external review (e.g. ChatGPT).  
**Date:** 11 November 2026  
**Product:** ApnaMedi (diagnostic / healthcare SaaS)  
**Decision under review:** B2B partner-first model vs patient consumer portal  

---

## 1. Business model (intended)

ApnaMedi’s external growth channel is **B2B referrals**, not B2C patient self-service.

| Actor | Who they are | What they do |
|-------|----------------|--------------|
| **Diagnostic centre (tenant)** | Lab / imaging / diagnostic org on ApnaMedi staff app | Runs tests, issues reports, pays referral commission |
| **Referral partner** | Referring doctor, clinic, hospital, agent, or other organisation | Sends patients to the centre; earns commission |
| **Patient** | End consumer | Gets tested; is a **record** in the system, not a primary product user |

**Core loop**

1. Centre adds a referral partner (doctor / clinic / hospital / agent) and generates a referral code.  
2. Partner logs into the **Partner Portal**, registers/refers a patient, and books a test/slot.  
3. Centre executes the order, generates the report, and tracks commission / payout.  
4. Partner sees referred cases and earnings ledger.

**What we are NOT building as the main product**

- A consumer “patient marketplace” where patients shop centres and book themselves as the primary funnel.  
- Patient social/chat features as a go-to-market dependency.

Patients may later receive SMS/email with appointment or report links **without needing a patient account**.

---

## 2. Recommended product surfaces

| URL / app | Audience | Purpose |
|-----------|----------|---------|
| `app.apnamedi.com` | Centre staff (admin, reception, radiologist, etc.) | Full operations: catalog, orders, reports, partners master, payouts |
| `partner.apnamedi.com` *(or current patient host rebranded)* | Referral doctors / clinics / hospitals / agents | Refer patients, track cases, view commission |
| Patient login app | Optional / deferred | Not required for B2B v1 |

**Naming rule**

- External brand language: **Partner Portal** / **Referral Portal**  
- Avoid leading with “Patient Portal” for this business line  

---

## 3. Partner types (already in system)

Stored as `referral_partners` with types:

| Type | Typical user |
|------|----------------|
| `doctor` | Individual referring doctor |
| `clinic` | Referring clinic / OPD |
| `hospital` | Referring hospital |
| `agent` | Marketing / channel agent |

Each partner belongs to **one diagnostic centre (company)** and has:

- Name, phone, address  
- Auto-generated `referral_code`  
- Commission rules (per test + optional surcharge)  
- Ledger: earned / paid / pending balance  

---

## 4. Partner Portal — features (implemented / intended)

### Auth (no staff-app change required)

1. Centre creates partner in staff app (name + phone + type → referral code).  
2. Partner opens Partner Portal → **Activate** with referral code + registered phone → sets email + password.  
3. Later visits → **Login** with email + password.

### Partner can

| Feature | Description |
|---------|-------------|
| Dashboard | Counts: total referrals, upcoming, completed; pending payout; recent cases |
| Refer patient | Enter patient details, choose tests/package, pick slot, book — **referral auto-applied** |
| Referred patients | List/filter orders under their partner ID |
| Earnings | Commission entries + payout history (view only; centre records payouts) |
| Profile | Code, centre name, change password, copy patient booking deep-link |

### Partner cannot

- Change test prices / catalog  
- Record their own payouts  
- See other partners’ patients  
- Access staff admin modules  

### Optional patient deep-link

`/centres/{centreId}?ref=CODE` can pre-fill referral on a patient booking page **if** that page remains. For pure B2B, booking is done by the partner; the link is optional marketing.

---

## 5. Staff app responsibilities (unchanged B2B core)

On `app.apnamedi.com` (diagnostics module):

- Referral partner master (CRUD)  
- Commission config on tests  
- Orders show referral partner  
- Commission ledger + manual payout recording  
- Diagnostic workflow (schedule → perform → report → approve)

This remains the **system of record**.

---

## 6. Why Partner-first beats Patient-first for this business

| Criterion | Patient-first portal | Partner-first portal |
|-----------|----------------------|----------------------|
| Who pays / who drives volume | Patient (hard CAC) | Referring org (relationship sales) |
| Booking quality | Patient may pick wrong test | Doctor/clinic chooses clinically |
| Commission attribution | Patient must remember code | Auto-attached to logged-in partner |
| Sales motion | B2C marketing | B2B: onboard clinics & doctors |
| Support load | Many consumer accounts | Fewer partner accounts |
| Fit to “referral business” | Weak | Strong |

**Conclusion for ApnaMedi’s stated model:** Partner Portal is the correct external product. Patient accounts are optional later (report access), not the funnel.

---

## 7. Suggested roadmap

### Phase 1 — B2B MVP (now)

- Partner activate / login  
- Refer/book patient  
- Referral list + earnings ledger  
- Rebrand external site as Partner Portal (hide/remove patient signup from primary entry)  
- Staff continues partner master + payouts  

### Phase 2 — Partner ops polish

- Multi-user under one clinic partner (receptionist logins)  
- Same doctor linked to multiple centres (one login, multi-centre switcher)  
- Shareable QR for referral code  
- SMS to patient: appointment confirmation  

### Phase 3 — Light patient touch (optional)

- Report view via secure token / QR (no full patient app)  
- Payment link for patient pay-on-phone  

### Explicitly later / maybe never

- Full patient marketplace  
- Patient ↔ centre chat as primary product  

---

## 8. Technical notes (for engineers / reviewers)

| Item | Detail |
|------|--------|
| Staff app | Existing React + Laravel multi-tenant SaaS |
| Partner APIs | `/api/partner/*` (activate, login, dashboard, referrals, ledger, book) |
| Auth | Sanctum tokens on `referral_partners` (email/password after activate) |
| Data model | Reuses `referral_partners`, `diagnostic_orders`, commission ledger |
| Isolation | Partner only sees orders where `referral_partner_id = self` |
| Hosting intent | External portal on patient/partner subdomain; staff on `app.*` |

---

## 9. Open questions for ChatGPT / advisors

Please review this brief and answer:

1. Is **Partner-first B2B** the right primary product for a diagnostic referral network in India, vs a patient consumer app?  
2. Any critical features missing in Phase 1 for clinics/doctors to actually adopt?  
3. Is “activate with referral code + phone” a good onboarding UX, or should centres set the password?  
4. Should we keep a minimal patient report-download path in Phase 1, or strictly partner-only?  
5. For clinic-type partners, is multi-staff login (Phase 2) essential at launch?  
6. Any compliance / consent risks when a partner books a patient without the patient creating an account?  
7. Better domain branding: `partner.apnamedi.com` vs keeping `patient.apnamedi.com` with Partner UI?  
8. Summarize risks of building both Patient + Partner portals in parallel for a small team.

---

## 10. One-paragraph summary (paste-friendly)

ApnaMedi is positioning its external portal as a **B2B Referral Partner Portal** for doctors, clinics, hospitals, and agents who send patients to diagnostic centres. Diagnostic centres use the existing staff app (`app.apnamedi.com`) to manage catalog, orders, reports, and commission payouts. Partners activate with a centre-issued referral code, then book patients under their code, track referred cases, and view earnings. End patients are records in the system, not the primary users. A full patient consumer portal is deferred; optional later touchpoints are appointment/report links via SMS without patient accounts. This matches a referral-driven B2B sales motion rather than B2C patient acquisition.

---

**End of brief**
