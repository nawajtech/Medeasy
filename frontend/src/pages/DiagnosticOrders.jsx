import { useCallback, useEffect, useMemo, useState } from "react";
import {
  getDiagnosticCategories,
  getDiagnosticTypes, getDiagnosticPackages, getDiagnosticOrders, getDiagnosticOrder,
  createDiagnosticOrder, scheduleDiagnosticOrder, startDiagnosticOrder,
  approveDiagnosticReport, cancelDiagnosticOrder, openDiagnosticInvoice,
  saveDiagnosticPrescription, openDiagnosticPrescription, recordDiagnosticPayment, processDiagnosticRefund,
} from "../api/diagnostics";
import DiagnosticPrescriptionModal from "../components/diagnostic/DiagnosticPrescriptionModal";
import { getPatients } from "../api/patients";
import { getDoctors } from "../api/doctors";
import { getReferralPartners } from "../api/referrals";
import Modal from "../components/crud/Modal";
import SearchableSelect from "../components/SearchableSelect";
import BranchSelect from "../components/BranchSelect";
import CompanySelect from "../components/CompanySelect";
import { useAuth } from "../auth/AuthContext";
import "../components/crud/crud.css";
import { getApiErrorMessage } from "../utils/apiError";
import "./DiagnosticOrders.css";
import "./Referrals.css";

const PRIORITIES = ["routine", "urgent", "emergency"];

const PAYMENT_METHODS = [
  { value: "cash", label: "Cash" },
  { value: "upi", label: "UPI" },
  { value: "card", label: "Card" },
  { value: "bank", label: "Bank transfer" },
  { value: "wallet", label: "Patient wallet" },
  { value: "other", label: "Other" },
];

const REFUND_METHODS = [
  { value: "cash", label: "Cash refund" },
  { value: "online", label: "Online refund" },
  { value: "wallet", label: "Credit to wallet" },
];

const PAYMENT_STATUS_META = {
  pending: { label: "Unpaid", color: "dgn-pay-pending" },
  partial: { label: "Partial", color: "dgn-pay-partial" },
  paid: { label: "Paid", color: "dgn-pay-paid" },
};

function money(n) {
  return `₹${Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function PaymentBadge({ status }) {
  const meta = PAYMENT_STATUS_META[status] || { label: status || "—", color: "" };
  return <span className={`dgn-pay-badge ${meta.color}`}>{meta.label}</span>;
}

function extraCommissionAmount(gross, partner) {
  if (!partner?.surcharge_type || Number(partner.surcharge_value) <= 0) return 0;
  const grossAmount = Math.max(0, Number(gross) || 0);
  if (partner.surcharge_type === "percentage") {
    return Math.round(grossAmount * Number(partner.surcharge_value) / 100 * 100) / 100;
  }
  return Number(partner.surcharge_value);
}

function calcReferralBill(gross, testCommission, partner, deductCommission) {
  const grossAmount = Math.max(0, Number(gross) || 0);
  const normalCommission = partner ? Math.max(0, Number(testCommission) || 0) : 0;
  const extraCommission = partner ? extraCommissionAmount(grossAmount, partner) : 0;
  const totalCommission = Math.min(grossAmount, Math.round((normalCommission + extraCommission) * 100) / 100);
  const discount = partner && deductCommission ? totalCommission : 0;
  const net = Math.max(0, Math.round((grossAmount - discount) * 100) / 100);
  return { grossAmount, normalCommission, extraCommission, totalCommission, discount, net };
}

function calcPackageTestBill(testPrice, testCommission, offerPercentage, partner, deductCommission) {
  const gross = Math.max(0, Number(testPrice) || 0);
  const packageDiscount = Math.round(gross * (Number(offerPercentage) || 0) / 100 * 100) / 100;
  const discountedGross = Math.max(0, Math.round((gross - packageDiscount) * 100) / 100);
  const referral = calcReferralBill(discountedGross, testCommission, partner, deductCommission);
  return { gross, packageDiscount, ...referral };
}

function calcPackageBill(tests, offerPercentage, partner, deductCommission) {
  const lines = (tests || []).map((test) => calcPackageTestBill(
    test.price,
    test.referral_commission,
    offerPercentage,
    partner,
    deductCommission
  ));
  const grossAmount = lines.reduce((sum, line) => sum + line.gross, 0);
  const packageDiscount = lines.reduce((sum, line) => sum + line.packageDiscount, 0);
  const referralDiscount = lines.reduce((sum, line) => sum + line.discount, 0);
  const totalCommission = lines.reduce((sum, line) => sum + line.totalCommission, 0);
  const net = lines.reduce((sum, line) => sum + line.net, 0);
  return { lines, grossAmount, packageDiscount, referralDiscount, totalCommission, net };
}

const STATUS_META = {
  booked:      { label: "Booked",      color: "dgn-booked" },
  scheduled:   { label: "Scheduled",   color: "dgn-scheduled" },
  in_progress: { label: "In Progress", color: "dgn-progress" },
  completed:   { label: "Completed",   color: "dgn-completed" },
  not_present: { label: "Not Present", color: "dgn-absent" },
  cancelled:   { label: "Cancelled",   color: "dgn-cancelled" },
};

function StatusBadge({ status }) {
  const meta = STATUS_META[status] || { label: status, color: "" };
  return <span className={`dgn-status ${meta.color}`}>{meta.label}</span>;
}

function DiagnosticOrders() {
  const { isDoctor, isSuperAdmin } = useAuth();

  const [orders, setOrders] = useState([]);
  const [categories, setCategories] = useState([]);
  const [types, setTypes] = useState([]);
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [branchFilter, setBranchFilter] = useState("");

  const [saving, setSaving] = useState(false);

  const [createOpen, setCreateOpen] = useState(false);
  const [patients, setPatients] = useState([]);
  const [orderForm, setOrderForm] = useState({
    company_id: "", patient_id: "", branch_id: "", booking_type: "test",
    test_type_id: "", package_id: "", doctor_id: "",
    referral_partner_id: "", deduct_commission_from_bill: false,
    priority: "routine", clinical_notes: "", notes: "",
    paid_amount: "", payment_method: "cash",
  });
  const [referralPartners, setReferralPartners] = useState([]);
  const [doctors, setDoctors] = useState([]);

  const [detailOrder, setDetailOrder] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [scheduleForm, setScheduleForm] = useState({ scheduled_at: "" });
  const [rxOpen, setRxOpen] = useState(false);
  const [rxOrder, setRxOrder] = useState(null);
  const [rxSaving, setRxSaving] = useState(false);

  const [paymentOpen, setPaymentOpen] = useState(false);
  const [paymentOrder, setPaymentOrder] = useState(null);
  const [paymentForm, setPaymentForm] = useState({ amount: "", payment_method: "cash", reference: "", notes: "" });
  const [refundOpen, setRefundOpen] = useState(false);
  const [refundPayment, setRefundPayment] = useState(null);
  const [refundForm, setRefundForm] = useState({ amount: "", refund_method: "wallet", reference: "", notes: "" });

  const loadDoctors = useCallback(async (companyId = "") => {
    try {
      const params = companyId ? { company_id: companyId } : {};
      const { data } = await getDoctors(params);
      setDoctors(data || []);
    } catch {
      setDoctors([]);
    }
  }, []);

  const selectedTest = useMemo(
    () => types.find((t) => t.id === Number(orderForm.test_type_id)),
    [types, orderForm.test_type_id]
  );

  const selectedPackage = useMemo(
    () => packages.find((p) => p.id === Number(orderForm.package_id)),
    [packages, orderForm.package_id]
  );

  const packageTests = useMemo(() => {
    if (!selectedPackage) return [];
    const ids = selectedPackage.test_ids || [];
    return ids.map((id) => types.find((t) => t.id === Number(id))).filter(Boolean);
  }, [selectedPackage, types]);

  const selectedPartner = useMemo(
    () => referralPartners.find((p) => p.id === Number(orderForm.referral_partner_id)),
    [referralPartners, orderForm.referral_partner_id]
  );

  const billPreview = useMemo(() => {
    if (orderForm.booking_type === "package" && selectedPackage) {
      return calcPackageBill(
        packageTests,
        selectedPackage.offer_percentage,
        selectedPartner,
        orderForm.deduct_commission_from_bill
      );
    }
    return calcReferralBill(
      selectedTest?.price,
      selectedTest?.referral_commission,
      selectedPartner,
      orderForm.deduct_commission_from_bill
    );
  }, [orderForm.booking_type, selectedPackage, packageTests, selectedTest, selectedPartner, orderForm.deduct_commission_from_bill]);

  const billNet = billPreview.net ?? 0;

  const createDuePreview = useMemo(() => {
    const net = billNet;
    const paid = Math.min(net, Math.max(0, Number(orderForm.paid_amount) || 0));
    return Math.max(0, Math.round((net - paid) * 100) / 100);
  }, [billNet, orderForm.paid_amount]);

  const loadReferralPartners = useCallback(async (companyId = "") => {
    try {
      const params = { active_only: true, ...(companyId ? { company_id: companyId } : {}) };
      const { data } = await getReferralPartners(params);
      setReferralPartners(data || []);
    } catch {
      setReferralPartners([]);
    }
  }, []);
  const orderDoctorOptions = useMemo(() => {
    if (orderForm.booking_type === "package") {
      if (!packageTests.length) return doctors;
      const sets = packageTests.map((test) => {
        const mapped = test?.doctors || [];
        return mapped.length ? mapped : doctors;
      });
      return sets.reduce(
        (acc, set) => acc.filter((d) => set.some((x) => x.id === d.id)),
        sets[0] || doctors
      );
    }
    if (!orderForm.test_type_id) return doctors;
    const test = types.find((t) => t.id === Number(orderForm.test_type_id));
    const mapped = test?.doctors || [];
    return mapped.length ? mapped : doctors;
  }, [orderForm.booking_type, orderForm.test_type_id, packageTests, types, doctors]);

  const loadCatalog = useCallback(async (companyId) => {
    const params = companyId ? { company_id: companyId } : {};
    const pkgParams = { active_only: true, ...(companyId ? { company_id: companyId } : {}) };
    const [catRes, typeRes, pkgRes] = await Promise.all([
      getDiagnosticCategories(params),
      getDiagnosticTypes(params),
      getDiagnosticPackages(pkgParams),
    ]);
    setCategories(catRes.data);
    setTypes(typeRes.data);
    setPackages(pkgRes.data || []);
    return { categories: catRes.data, types: typeRes.data, packages: pkgRes.data };
  }, []);

  const loadOrders = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await getDiagnosticOrders({
        status: statusFilter || undefined,
        category_id: categoryFilter || undefined,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
        branch_id: branchFilter || undefined,
      });
      setOrders(data.data);
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to load orders."));
    } finally {
      setLoading(false);
    }
  }, [statusFilter, categoryFilter, dateFrom, dateTo, branchFilter]);

  useEffect(() => {
    loadOrders();
    loadCatalog().catch(() => {});
  }, [loadOrders, loadCatalog]);

  const testsByCategory = useMemo(() => {
    const map = new Map();
    for (const cat of categories) {
      map.set(cat.id, { category: cat, tests: [] });
    }
    for (const test of types) {
      const key = test.category_id;
      if (!map.has(key)) {
        map.set(key, {
          category: test.category || { id: key, name: "Uncategorized" },
          tests: [],
        });
      }
      map.get(key).tests.push(test);
    }
    return [...map.values()].sort(
      (a, b) => (a.category.sort_order ?? 0) - (b.category.sort_order ?? 0)
        || String(a.category.name).localeCompare(String(b.category.name))
    );
  }, [categories, types]);

  const loadCreatePatients = async (companyId = "") => {
    try {
      const params = { per_page: 500, ...(companyId ? { company_id: companyId } : {}) };
      const { data } = await getPatients(params);
      setPatients(data.data || data);
    } catch {
      setPatients([]);
    }
  };

  const openCreate = async () => {
    setPatients([]);
    setOrderForm({
      company_id: "", patient_id: "", branch_id: "", booking_type: "test",
      test_type_id: "", package_id: "", doctor_id: "",
      referral_partner_id: "", deduct_commission_from_bill: false,
      priority: "routine", clinical_notes: "", notes: "",
      paid_amount: "", payment_method: "cash",
    });
    setCreateOpen(true);
    await Promise.allSettled([loadCreatePatients(""), loadCatalog(), loadDoctors(), loadReferralPartners()]);
  };

  const handleOrderCompanyChange = async (e) => {
    const cid = e.target.value;
    setOrderForm((p) => ({
      ...p,
      company_id: cid,
      patient_id: "",
      branch_id: "",
      booking_type: "test",
      test_type_id: "",
      package_id: "",
      doctor_id: "",
      referral_partner_id: "",
      deduct_commission_from_bill: false,
    }));
    setPatients([]);
    await Promise.allSettled([loadCreatePatients(cid), loadCatalog(cid), loadDoctors(cid), loadReferralPartners(cid)]);
  };

  const handleBookingTypeChange = (bookingType) => {
    setOrderForm((p) => ({
      ...p,
      booking_type: bookingType,
      test_type_id: "",
      package_id: "",
      doctor_id: "",
      paid_amount: "",
    }));
  };

  const handleTestTypeChange = (e) => {
    const testTypeId = e.target.value;
    setOrderForm((p) => {
      const test = types.find((t) => t.id === Number(testTypeId));
      const partner = referralPartners.find((r) => r.id === Number(p.referral_partner_id));
      const mapped = test?.doctors || [];
      const doctorStillValid = mapped.length
        ? mapped.some((d) => String(d.id) === String(p.doctor_id))
        : doctors.some((d) => String(d.id) === String(p.doctor_id));
      const net = test
        ? calcReferralBill(test.price, test.referral_commission, partner, p.deduct_commission_from_bill).net
        : 0;
      return {
        ...p,
        test_type_id: testTypeId,
        doctor_id: doctorStillValid ? p.doctor_id : "",
        paid_amount: test ? String(net) : "",
      };
    });
  };

  const handlePackageChange = (e) => {
    const packageId = e.target.value;
    const pkg = packages.find((p) => p.id === Number(packageId));
    const tests = (pkg?.test_ids || []).map((id) => types.find((t) => t.id === Number(id))).filter(Boolean);
    const partner = referralPartners.find((r) => r.id === Number(orderForm.referral_partner_id));
    const net = pkg
      ? calcPackageBill(tests, pkg.offer_percentage, partner, orderForm.deduct_commission_from_bill).net
      : 0;
    setOrderForm((p) => ({
      ...p,
      package_id: packageId,
      doctor_id: "",
      paid_amount: pkg ? String(net) : "",
    }));
  };

  const handleOpenBill = async (order) => {
    setError("");
    try {
      await openDiagnosticInvoice(order.id);
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to open bill."));
    }
  };

  const handleCreateOrder = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const payload = {
        ...orderForm,
        test_type_id: orderForm.booking_type === "test" ? orderForm.test_type_id : undefined,
        package_id: orderForm.booking_type === "package" ? orderForm.package_id : undefined,
        referral_partner_id: orderForm.referral_partner_id || undefined,
        deduct_commission_from_bill: Boolean(orderForm.referral_partner_id && orderForm.deduct_commission_from_bill),
        paid_amount: Number(orderForm.paid_amount) || 0,
        payment_method: Number(orderForm.paid_amount) > 0 ? orderForm.payment_method : undefined,
      };
      delete payload.booking_type;
      const { data } = await createDiagnosticOrder(payload);
      setCreateOpen(false);
      await loadOrders();
      if (data.orders?.length) {
        for (const order of data.orders) {
          await openDiagnosticInvoice(order.id);
        }
      } else {
        await openDiagnosticInvoice(data.id);
      }
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to create order."));
    } finally {
      setSaving(false);
    }
  };

  const openDetail = async (order) => {
    setDetailOpen(true);
    try {
      const { data } = await getDiagnosticOrder(order.id);
      setDetailOrder(data);
    } catch {
      setDetailOrder(order);
    }
  };

  const openSchedule = (order) => {
    setDetailOrder(order);
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    setScheduleForm({ scheduled_at: now.toISOString().slice(0, 16) });
    setScheduleOpen(true);
  };

  const handleSchedule = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await scheduleDiagnosticOrder(detailOrder.id, scheduleForm);
      setScheduleOpen(false);
      await loadOrders();
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to schedule."));
    } finally {
      setSaving(false);
    }
  };

  const handleStart = async (order) => {
    if (!window.confirm("Mark as in progress?")) return;
    try {
      await startDiagnosticOrder(order.id);
      await loadOrders();
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to start."));
    }
  };

  const openPrescription = async (order) => {
    try {
      const { data } = await getDiagnosticOrder(order.id);
      setRxOrder(data);
      setRxOpen(true);
    } catch {
      setRxOrder(order);
      setRxOpen(true);
    }
  };

  const handleSavePrescription = async (payload, order) => {
    setRxSaving(true);
    setError("");
    try {
      await saveDiagnosticPrescription(order.id, payload);
      await loadOrders();
      const { data } = await getDiagnosticOrder(order.id);
      setRxOrder(data);
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to save prescription."));
      throw err;
    } finally {
      setRxSaving(false);
    }
  };

  const handlePrintPrescription = async (order) => {
    setError("");
    try {
      await openDiagnosticPrescription(order.id);
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to open prescription."));
    }
  };

  const handleApprove = async (order) => {
    if (!window.confirm("Approve this diagnostic report?")) return;
    try {
      await approveDiagnosticReport(order.id);
      await loadOrders();
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to approve."));
    }
  };

  const handleCancel = async (order) => {
    if (!window.confirm(`Cancel order ${order.order_number}?`)) return;
    try {
      await cancelDiagnosticOrder(order.id);
      await loadOrders();
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to cancel."));
    }
  };

  const openPaymentModal = async (order) => {
    try {
      const { data } = await getDiagnosticOrder(order.id);
      setPaymentOrder(data);
    } catch {
      setPaymentOrder(order);
    }
    setPaymentForm({
      amount: String(Number(order.due_amount || 0) || ""),
      payment_method: "cash",
      reference: "",
      notes: "",
    });
    setPaymentOpen(true);
  };

  const handleRecordPayment = async (e) => {
    e.preventDefault();
    if (!paymentOrder) return;
    setSaving(true);
    setError("");
    try {
      await recordDiagnosticPayment(paymentOrder.id, {
        ...paymentForm,
        amount: Number(paymentForm.amount),
      });
      setPaymentOpen(false);
      setPaymentOrder(null);
      await loadOrders();
      if (detailOpen && detailOrder?.id === paymentOrder.id) {
        const { data } = await getDiagnosticOrder(paymentOrder.id);
        setDetailOrder(data);
      }
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to record payment."));
    } finally {
      setSaving(false);
    }
  };

  const refundableAmount = (payment) =>
    Math.max(0, Number(payment.amount || 0) - Number(payment.refunded_amount || 0));

  const openRefundModal = (payment) => {
    const max = refundableAmount(payment);
    setRefundPayment(payment);
    setRefundForm({
      amount: String(max || ""),
      refund_method: "wallet",
      reference: "",
      notes: "",
    });
    setRefundOpen(true);
  };

  const handleProcessRefund = async (e) => {
    e.preventDefault();
    if (!detailOrder || !refundPayment) return;
    setSaving(true);
    setError("");
    try {
      const { data } = await processDiagnosticRefund(detailOrder.id, {
        payment_id: refundPayment.id,
        amount: Number(refundForm.amount),
        refund_method: refundForm.refund_method,
        reference: refundForm.reference || undefined,
        notes: refundForm.notes || undefined,
      });
      setRefundOpen(false);
      setRefundPayment(null);
      setDetailOrder(data.order);
      await loadOrders();
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to process refund."));
    } finally {
      setSaving(false);
    }
  };

  const walletBalance = (order) => Number(order?.patient?.wallet?.balance ?? 0);

  const formatDate = (iso) => (iso ? new Date(iso).toLocaleDateString("en-IN") : "—");

  const renderTestSelectOptions = () => {
    const active = types.filter((t) => t.is_active);
    if (!active.length) {
      return (
        <option value="">No tests — add categories & tests first</option>
      );
    }
    return (
      <>
        <option value="">Select test</option>
        {testsByCategory.map(({ category, tests }) => {
          const group = tests.filter((t) => t.is_active);
          if (!group.length) return null;
          return (
            <optgroup key={category.id} label={category.name}>
              {group.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} — ₹{Number(t.price).toLocaleString("en-IN")}
                </option>
              ))}
            </optgroup>
          );
        })}
      </>
    );
  };

  return (
    <section className="page-card dgn-page">
      <div className="page-card-header">
        <h2>Diagnostic Orders</h2>
        <p>Book, schedule, and manage diagnostic test orders for patients.</p>
      </div>

      {error && <div className="crud-alert crud-alert--error">{error}</div>}

      <div className="crud-toolbar lab-orders-toolbar">
        <div className="lab-orders-filters">
          <select className="crud-btn crud-btn--ghost" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">All statuses</option>
            {Object.entries(STATUS_META).map(([v, m]) => <option key={v} value={v}>{m.label}</option>)}
          </select>
          <select className="crud-btn crud-btn--ghost" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
            <option value="">All categories</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} aria-label="From" />
          <span>–</span>
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} aria-label="To" />
          <BranchSelect value={branchFilter} onChange={(e) => setBranchFilter(e.target.value)} allLabel="All branches" id="dgn_branch_filter" name="dgn_branch_filter" />
        </div>
        {!isDoctor && (
          <button type="button" className="crud-btn crud-btn--primary" onClick={openCreate}>New order</button>
        )}
      </div>

      <div className="crud-table-wrap">
        <table className="crud-table">
          <thead>
            <tr><th>Order #</th><th>Patient</th><th>Test</th><th>Payable</th><th>Paid</th><th>Due</th><th>Payment</th><th>Status</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {!loading && orders.length === 0 && (
              <tr><td colSpan={9} className="crud-empty">No diagnostic orders found.</td></tr>
            )}
            {orders.map((order) => (
              <tr key={order.id}>
                <td><strong className="lab-order-num">{order.order_number}</strong></td>
                <td>{order.patient?.name || "—"}</td>
                <td>
                  <strong>{order.test_type?.name || "—"}</strong>
                  {order.package_id && (
                    <div className="company-modules-hint">Package: {order.package?.package_name || `#${order.package_id}`}</div>
                  )}
                </td>
                <td>{money(order.net_amount ?? order.amount)}</td>
                <td>{money(order.paid_amount)}</td>
                <td className={Number(order.due_amount) > 0 ? "dgn-due-cell" : ""}>{money(order.due_amount)}</td>
                <td><PaymentBadge status={order.payment_status} /></td>
                <td><StatusBadge status={order.status} /></td>
                <td>
                  <div className="crud-actions">
                    <button type="button" className="crud-btn crud-btn--ghost crud-btn--sm" onClick={() => openDetail(order)}>View</button>
                    <button type="button" className="crud-btn crud-btn--ghost crud-btn--sm" onClick={() => handleOpenBill(order)}>Bill</button>
                    {Number(order.due_amount) > 0 && order.status !== "cancelled" && (
                      <button type="button" className="crud-btn crud-btn--primary crud-btn--sm" onClick={() => openPaymentModal(order)}>Pay</button>
                    )}
                    {order.status === "booked" && <button type="button" className="crud-btn crud-btn--primary crud-btn--sm" onClick={() => openSchedule(order)}>Schedule</button>}
                    {order.status === "scheduled" && <button type="button" className="crud-btn crud-btn--primary crud-btn--sm" onClick={() => handleStart(order)}>Start</button>}
                    {order.status === "in_progress" && (
                      <button type="button" className="crud-btn crud-btn--primary crud-btn--sm" onClick={() => openPrescription(order)}>Write Rx</button>
                    )}
                    {order.report && (
                      <button type="button" className="crud-btn crud-btn--ghost crud-btn--sm" onClick={() => handlePrintPrescription(order)}>Print Rx</button>
                    )}
                    {order.status === "completed" && !order.report?.approved_at && <button type="button" className="crud-btn crud-btn--primary crud-btn--sm" onClick={() => handleApprove(order)}>Approve</button>}
                    {!["completed", "cancelled"].includes(order.status) && <button type="button" className="crud-btn crud-btn--danger crud-btn--sm" onClick={() => handleCancel(order)}>Cancel</button>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal title="New diagnostic order" open={createOpen} onClose={() => setCreateOpen(false)}>
        <form onSubmit={handleCreateOrder}>
          <div className="crud-form-grid">
            {isSuperAdmin && (
              <CompanySelect id="do_company" label="Company *" value={orderForm.company_id} onChange={handleOrderCompanyChange} required />
            )}
            <div className="crud-field crud-field--full">
              <label htmlFor="do_patient">Patient *</label>
              <select id="do_patient" value={orderForm.patient_id} onChange={(e) => setOrderForm((p) => ({ ...p, patient_id: e.target.value }))} required>
                <option value="">Select patient</option>
                {patients.map((p) => <option key={p.id} value={p.id}>{p.name}{p.phone ? ` — ${p.phone}` : ""}</option>)}
              </select>
            </div>
            <div className="crud-field crud-field--full">
              <label>Booking type</label>
              <div className="crud-inline-tabs">
                <button
                  type="button"
                  className={`crud-btn crud-btn--sm ${orderForm.booking_type === "test" ? "crud-btn--primary" : "crud-btn--ghost"}`}
                  onClick={() => handleBookingTypeChange("test")}
                >
                  Single test
                </button>
                <button
                  type="button"
                  className={`crud-btn crud-btn--sm ${orderForm.booking_type === "package" ? "crud-btn--primary" : "crud-btn--ghost"}`}
                  onClick={() => handleBookingTypeChange("package")}
                >
                  Package
                </button>
              </div>
            </div>
            {orderForm.booking_type === "test" ? (
              <div className="crud-field crud-field--full">
                <label htmlFor="do_type">Test *</label>
                <select id="do_type" value={orderForm.test_type_id} onChange={handleTestTypeChange} required>
                  {renderTestSelectOptions()}
                </select>
              </div>
            ) : (
              <div className="crud-field crud-field--full">
                <label htmlFor="do_package">Package *</label>
                <select id="do_package" value={orderForm.package_id} onChange={handlePackageChange} required>
                  <option value="">Select package</option>
                  {packages.filter((p) => p.is_active).map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.package_name}
                      {Number(p.offer_percentage) > 0 ? ` — ${p.offer_percentage}% off` : ""}
                      {p.list_price != null ? ` — ${money(p.package_price ?? p.list_price)}` : ""}
                    </option>
                  ))}
                </select>
                {selectedPackage && packageTests.length > 0 && (
                  <p className="company-modules-hint">
                    Includes {packageTests.length} test{packageTests.length !== 1 ? "s" : ""}: {packageTests.map((t) => t.name).join(", ")}
                  </p>
                )}
              </div>
            )}
            <div className="crud-field crud-field--full">
              <label htmlFor="do_doctor">Doctor</label>
              <select
                id="do_doctor"
                value={orderForm.doctor_id}
                onChange={(e) => setOrderForm((p) => ({ ...p, doctor_id: e.target.value }))}
              >
                <option value="">Select doctor (optional)</option>
                {orderDoctorOptions.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.user?.name || `Doctor #${d.id}`}
                    {d.department?.name ? ` — ${d.department.name}` : ""}
                  </option>
                ))}
              </select>
              {orderForm.booking_type === "test" && orderForm.test_type_id && (() => {
                const test = types.find((t) => t.id === Number(orderForm.test_type_id));
                if ((test?.doctors || []).length) {
                  return <p className="company-modules-hint">Only doctors assigned to this test are listed.</p>;
                }
                return null;
              })()}
              {orderForm.booking_type === "package" && packageTests.length > 0 && (
                <p className="company-modules-hint">Doctor must be assigned to all tests in the package.</p>
              )}
            </div>
            <div className="crud-field">
              <label>Branch</label>
              <BranchSelect id="do_branch" name="branch_id" value={orderForm.branch_id} onChange={(e) => setOrderForm((p) => ({ ...p, branch_id: e.target.value }))} allLabel="Any branch" />
            </div>
            <div className="crud-field">
              <label htmlFor="do_priority">Priority</label>
              <select id="do_priority" value={orderForm.priority} onChange={(e) => setOrderForm((p) => ({ ...p, priority: e.target.value }))}>
                {PRIORITIES.map((p) => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
              </select>
            </div>
            <SearchableSelect
              id="do_referral"
              label="Referral By"
              options={referralPartners}
              value={orderForm.referral_partner_id}
              onChange={(id) => setOrderForm((p) => ({
                ...p,
                referral_partner_id: id,
                deduct_commission_from_bill: id ? p.deduct_commission_from_bill : false,
              }))}
              placeholder="Search referral partner…"
              emptyLabel="No referral partners found"
              getOptionLabel={(p) => `${p.name}${p.mobile ? ` — ${p.mobile}` : ""} (${p.type})`}
              hint={referralPartners.length ? "Optional — select who referred this patient." : "Add partners under Referral By master first."}
            />
            {selectedPartner && (
              <>
                <div className="crud-field ref-readonly-field">
                  <label>Referral mobile</label>
                  <input readOnly value={selectedPartner.mobile || "—"} />
                </div>
                <div className="crud-field crud-field--full ref-readonly-field">
                  <label>Referral address</label>
                  <textarea readOnly rows={2} value={selectedPartner.address || "—"} />
                </div>
                <div className="crud-field crud-field--full">
                  <label className="crud-checkbox">
                    <input
                      type="checkbox"
                      checked={orderForm.deduct_commission_from_bill}
                      onChange={(e) => setOrderForm((p) => ({ ...p, deduct_commission_from_bill: e.target.checked }))}
                    />
                    Deduct Referral Commission from Bill
                  </label>
                  {billPreview.totalCommission > 0 && (
                    <p className="ref-bill-note">
                      Partner commission: ₹{(billPreview.normalCommission ?? billPreview.totalCommission).toLocaleString("en-IN")} normal
                      {(billPreview.extraCommission ?? 0) > 0 && (
                        <> + ₹{billPreview.extraCommission.toLocaleString("en-IN")} extra</>
                      )}
                      {" "}= ₹{billPreview.totalCommission.toLocaleString("en-IN")}
                      {!orderForm.deduct_commission_from_bill && " (not deducted from bill)"}
                    </p>
                  )}
                </div>
              </>
            )}
            {(selectedTest || selectedPackage) && (
              <div className="crud-field crud-field--full">
                <div className="lo-bill-panel">
                  <div className="lo-bill-title">Invoice</div>
                  {orderForm.booking_type === "package" && packageTests.length > 0 ? (
                    <>
                      {packageTests.map((test, index) => {
                        const line = billPreview.lines?.[index] || calcPackageTestBill(
                          test.price,
                          test.referral_commission,
                          selectedPackage.offer_percentage,
                          selectedPartner,
                          orderForm.deduct_commission_from_bill
                        );
                        return (
                          <div key={test.id} className="lo-bill-row">
                            <span>
                              {test.category?.name ? `${test.category.name} — ` : ""}{test.name}
                              {line.packageDiscount > 0 && (
                                <small style={{ color: "var(--me-success)", marginLeft: 6 }}>
                                  −{selectedPackage.offer_percentage}% (−₹{line.packageDiscount.toLocaleString("en-IN")})
                                </small>
                              )}
                            </span>
                            <span>₹{line.net.toLocaleString("en-IN")}</span>
                          </div>
                        );
                      })}
                      <div className="lo-bill-divider" />
                      <div className="lo-bill-row lo-bill-subtotal">
                        <span>Original total</span>
                        <span>₹{billPreview.grossAmount.toLocaleString("en-IN")}</span>
                      </div>
                      {billPreview.packageDiscount > 0 && (
                        <div className="lo-bill-row" style={{ color: "var(--me-success)" }}>
                          <span>Package discount ({selectedPackage.package_name})</span>
                          <span>−₹{billPreview.packageDiscount.toLocaleString("en-IN")}</span>
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      <div className="lo-bill-row">
                        <span>{selectedTest.category?.name} — {selectedTest.name}</span>
                        <span>₹{billPreview.grossAmount.toLocaleString("en-IN")}</span>
                      </div>
                      <div className="lo-bill-divider" />
                      <div className="lo-bill-row lo-bill-subtotal">
                        <span>Original total</span>
                        <span>₹{billPreview.grossAmount.toLocaleString("en-IN")}</span>
                      </div>
                    </>
                  )}
                  {billPreview.discount > 0 && (
                    <div className="lo-bill-row" style={{ color: "var(--me-success)" }}>
                      <span>Referral discount</span>
                      <span>−₹{(billPreview.referralDiscount ?? billPreview.discount).toLocaleString("en-IN")}</span>
                    </div>
                  )}
                  {!orderForm.deduct_commission_from_bill && billPreview.totalCommission > 0 && (
                    <p className="ref-bill-note" style={{ marginTop: 8 }}>
                      Patient pays full amount — commission recorded for partner payout.
                    </p>
                  )}
                  <div className="lo-bill-divider" />
                  <div className="lo-bill-row lo-bill-net">
                    <span>Final payable</span>
                    <span>₹{billNet.toLocaleString("en-IN")}</span>
                  </div>
                  <div className="lo-bill-divider" />
                  <div className="lo-bill-row">
                    <span>Amount paying now</span>
                    <span>₹{(Number(orderForm.paid_amount) || 0).toLocaleString("en-IN")}</span>
                  </div>
                  <div className="lo-bill-row lo-bill-due">
                    <span>Due after order</span>
                    <span>₹{createDuePreview.toLocaleString("en-IN")}</span>
                  </div>
                  {orderForm.booking_type === "package" && packageTests.length > 1 && (
                    <p className="company-modules-hint" style={{ marginTop: 8 }}>
                      Creates {packageTests.length} separate orders (one per test), linked to this package.
                    </p>
                  )}
                </div>
              </div>
            )}
            {(selectedTest || selectedPackage) && (
              <>
                <div className="crud-field">
                  <label htmlFor="do_paid">Paid amount (₹)</label>
                  <input
                    id="do_paid"
                    type="number"
                    min="0"
                    step="0.01"
                    max={billNet}
                    value={orderForm.paid_amount}
                    onChange={(e) => setOrderForm((p) => ({ ...p, paid_amount: e.target.value }))}
                    placeholder="0 for full due later"
                  />
                  <p className="company-modules-hint">Enter partial payment now — balance can be collected later.</p>
                </div>
                <div className="crud-field">
                  <label htmlFor="do_pay_method">Payment method</label>
                  <select
                    id="do_pay_method"
                    value={orderForm.payment_method}
                    onChange={(e) => setOrderForm((p) => ({ ...p, payment_method: e.target.value }))}
                  >
                    {PAYMENT_METHODS.map((m) => (
                      <option key={m.value} value={m.value}>{m.label}</option>
                    ))}
                  </select>
                </div>
              </>
            )}
            <div className="crud-field">
              <label htmlFor="do_clinical">Clinical notes</label>
              <input id="do_clinical" value={orderForm.clinical_notes} onChange={(e) => setOrderForm((p) => ({ ...p, clinical_notes: e.target.value }))} />
            </div>
            <div className="crud-field crud-field--full">
              <label htmlFor="do_notes">Notes</label>
              <textarea id="do_notes" rows={2} value={orderForm.notes} onChange={(e) => setOrderForm((p) => ({ ...p, notes: e.target.value }))} />
            </div>
          </div>
          <div className="crud-modal-actions">
            <button type="button" className="crud-btn crud-btn--ghost" onClick={() => setCreateOpen(false)}>Cancel</button>
            <button type="submit" className="crud-btn crud-btn--primary" disabled={saving}>{saving ? "Creating…" : "Create order & bill"}</button>
          </div>
        </form>
      </Modal>

      <Modal title={`Schedule — ${detailOrder?.order_number || ""}`} open={scheduleOpen} onClose={() => setScheduleOpen(false)}>
        <form onSubmit={handleSchedule}>
          <div className="crud-field crud-field--full">
            <label htmlFor="sch_at">Scheduled date & time *</label>
            <input id="sch_at" type="datetime-local" required value={scheduleForm.scheduled_at} onChange={(e) => setScheduleForm({ scheduled_at: e.target.value })} />
          </div>
          <div className="crud-modal-actions">
            <button type="button" className="crud-btn crud-btn--ghost" onClick={() => setScheduleOpen(false)}>Cancel</button>
            <button type="submit" className="crud-btn crud-btn--primary" disabled={saving}>{saving ? "Saving…" : "Confirm"}</button>
          </div>
        </form>
      </Modal>

      <DiagnosticPrescriptionModal
        open={rxOpen}
        onClose={() => setRxOpen(false)}
        order={rxOrder}
        onSave={handleSavePrescription}
        onPrint={handlePrintPrescription}
        saving={rxSaving}
      />

      <Modal
        title={`Order — ${detailOrder?.order_number || ""}`}
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        wide
        className="crud-modal--order-detail dgn-order-detail-modal"
      >
        {detailOrder && (
          <div className="lab-detail">
            <dl className="lab-detail-grid">
              <div><dt>Patient</dt><dd>{detailOrder.patient?.name || "—"}</dd></div>
              <div><dt>Doctor</dt><dd>{detailOrder.doctor?.user?.name || "—"}</dd></div>
              <div><dt>Category</dt><dd>{detailOrder.test_type?.category?.name || "—"}</dd></div>
              <div><dt>Test</dt><dd>{detailOrder.test_type?.name || "—"}</dd></div>
              {detailOrder.package_id && (
                <div><dt>Package</dt><dd>{detailOrder.package?.package_name || `#${detailOrder.package_id}`}</dd></div>
              )}
              <div><dt>Status</dt><dd><StatusBadge status={detailOrder.status} /></dd></div>
              {detailOrder.referral_partner_name && (
                <>
                  <div><dt>Referral by</dt><dd>{detailOrder.referral_partner_name} ({detailOrder.referral_partner_type})</dd></div>
                  <div><dt>Referral mobile</dt><dd>{detailOrder.referral_partner_mobile || "—"}</dd></div>
                </>
              )}
              <div><dt>Original total</dt><dd>₹{Number(detailOrder.gross_amount ?? detailOrder.amount ?? 0).toLocaleString("en-IN")}</dd></div>
              {Number(detailOrder.package_discount) > 0 && (
                <div><dt>Package discount</dt><dd>−₹{Number(detailOrder.package_discount).toLocaleString("en-IN")}</dd></div>
              )}
              {Number(detailOrder.referral_discount) > 0 && (
                <div><dt>Referral discount</dt><dd>−₹{Number(detailOrder.referral_discount).toLocaleString("en-IN")}</dd></div>
              )}
              {Number(detailOrder.surcharge_amount) > 0 && (
                <div><dt>Extra commission</dt><dd>₹{Number(detailOrder.surcharge_amount).toLocaleString("en-IN")}</dd></div>
              )}
              {Number(detailOrder.referral_commission_amount) > 0 && (
                <div><dt>Total partner commission</dt><dd>₹{Number(detailOrder.referral_commission_amount).toLocaleString("en-IN")}</dd></div>
              )}
              <div><dt>Final payable</dt><dd><strong>{money(detailOrder.net_amount ?? detailOrder.amount)}</strong></dd></div>
              <div><dt>Paid</dt><dd>{money(detailOrder.paid_amount)}</dd></div>
              <div><dt>Due</dt><dd><strong className={Number(detailOrder.due_amount) > 0 ? "dgn-due-cell" : ""}>{money(detailOrder.due_amount)}</strong></dd></div>
              <div><dt>Payment status</dt><dd><PaymentBadge status={detailOrder.payment_status} /></dd></div>
            </dl>
            {detailOrder.payments?.length > 0 && (
              <div className="dgn-payment-history">
                <h4>Payment history</h4>
                <div className="dgn-payment-history-table-wrap">
                  <table className="crud-table dgn-payment-history-table">
                    <thead>
                      <tr><th>Date</th><th>Amount</th><th>Refunded</th><th>Method</th><th>Reference</th><th>Recorded by</th><th></th></tr>
                    </thead>
                    <tbody>
                      {detailOrder.payments.map((p) => (
                        <tr key={p.id}>
                          <td>{p.paid_at ? new Date(p.paid_at).toLocaleString("en-IN") : "—"}</td>
                          <td>{money(p.amount)}</td>
                          <td>{Number(p.refunded_amount) > 0 ? money(p.refunded_amount) : "—"}</td>
                          <td>{p.payment_method || "—"}</td>
                          <td>{p.reference || "—"}</td>
                          <td>{p.recorder?.name || "—"}</td>
                          <td>
                            {refundableAmount(p) > 0 && (
                              <button type="button" className="crud-btn crud-btn--danger crud-btn--sm" onClick={() => openRefundModal(p)}>
                                Refund
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            {detailOrder.refunds?.length > 0 && (
              <div className="dgn-payment-history">
                <h4>Refund history</h4>
                <div className="dgn-payment-history-table-wrap">
                  <table className="crud-table dgn-payment-history-table">
                    <thead>
                      <tr><th>Date</th><th>Amount</th><th>Method</th><th>Reference</th><th>Notes</th><th>Processed by</th></tr>
                    </thead>
                    <tbody>
                      {detailOrder.refunds.map((r) => (
                        <tr key={r.id}>
                          <td>{r.refunded_at ? new Date(r.refunded_at).toLocaleString("en-IN") : "—"}</td>
                          <td>{money(r.amount)}</td>
                          <td>{r.refund_method}</td>
                          <td>{r.reference || "—"}</td>
                          <td>{r.notes || "—"}</td>
                          <td>{r.recorder?.name || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            {detailOrder.patient?.wallet && (
              <p className="company-modules-hint">
                Patient wallet balance: <strong>₹{Number(detailOrder.patient.wallet.balance || 0).toLocaleString("en-IN")}</strong>
              </p>
            )}
          </div>
        )}
        <div className="crud-modal-actions">
          {detailOrder && Number(detailOrder.due_amount) > 0 && detailOrder.status !== "cancelled" && (
            <button type="button" className="crud-btn crud-btn--primary" onClick={() => openPaymentModal(detailOrder)}>Record payment</button>
          )}
          <button type="button" className="crud-btn crud-btn--ghost" onClick={() => detailOrder && handleOpenBill(detailOrder)}>Print bill</button>
          <button type="button" className="crud-btn crud-btn--ghost" onClick={() => detailOrder && handlePrintPrescription(detailOrder)}>Print Rx</button>
          <button type="button" className="crud-btn crud-btn--ghost" onClick={() => detailOrder && openPrescription(detailOrder)}>Edit Rx</button>
          <button type="button" className="crud-btn crud-btn--primary" onClick={() => setDetailOpen(false)}>Close</button>
        </div>
      </Modal>

      <Modal
        title={`Record payment — ${paymentOrder?.order_number || ""}`}
        open={paymentOpen}
        onClose={() => setPaymentOpen(false)}
        elevated
      >
        {paymentOrder && (
          <form onSubmit={handleRecordPayment}>
            <div className="dgn-payment-summary">
              <span>Payable: <strong>{money(paymentOrder.net_amount ?? paymentOrder.amount)}</strong></span>
              <span>Paid: <strong>{money(paymentOrder.paid_amount)}</strong></span>
              <span>Due: <strong className="dgn-due-cell">{money(paymentOrder.due_amount)}</strong></span>
              {walletBalance(paymentOrder) > 0 && (
                <span>Wallet: <strong>₹{walletBalance(paymentOrder).toLocaleString("en-IN")}</strong></span>
              )}
            </div>
            <div className="crud-form-grid">
              <div className="crud-field">
                <label htmlFor="pay_amount">Amount (₹) *</label>
                <input
                  id="pay_amount"
                  type="number"
                  min="0.01"
                  step="0.01"
                  max={Number(paymentOrder.due_amount) || undefined}
                  value={paymentForm.amount}
                  onChange={(e) => setPaymentForm((p) => ({ ...p, amount: e.target.value }))}
                  required
                />
              </div>
              <div className="crud-field">
                <label htmlFor="pay_method">Method</label>
                <select
                  id="pay_method"
                  value={paymentForm.payment_method}
                  onChange={(e) => setPaymentForm((p) => ({ ...p, payment_method: e.target.value }))}
                >
                  {PAYMENT_METHODS.map((m) => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
                {paymentForm.payment_method === "wallet" && (
                  <p className="company-modules-hint">
                    Available wallet balance: ₹{walletBalance(paymentOrder).toLocaleString("en-IN")}
                  </p>
                )}
              </div>
              <div className="crud-field crud-field--full">
                <label htmlFor="pay_ref">Reference / UTR</label>
                <input id="pay_ref" value={paymentForm.reference} onChange={(e) => setPaymentForm((p) => ({ ...p, reference: e.target.value }))} />
              </div>
              <div className="crud-field crud-field--full">
                <label htmlFor="pay_notes">Notes</label>
                <textarea id="pay_notes" rows={2} value={paymentForm.notes} onChange={(e) => setPaymentForm((p) => ({ ...p, notes: e.target.value }))} />
              </div>
            </div>
            <div className="crud-modal-actions">
              <button type="button" className="crud-btn crud-btn--ghost" onClick={() => setPaymentOpen(false)}>Cancel</button>
              <button type="submit" className="crud-btn crud-btn--primary" disabled={saving}>{saving ? "Saving…" : "Record payment"}</button>
            </div>
          </form>
        )}
      </Modal>

      <Modal title="Process refund" open={refundOpen} onClose={() => setRefundOpen(false)} elevated>
        {refundPayment && (
          <form onSubmit={handleProcessRefund}>
            <p className="company-modules-hint">
              Refunding payment of {money(refundPayment.amount)} ({refundPayment.payment_method || "—"}).
              Max refundable: {money(refundableAmount(refundPayment))}.
            </p>
            <div className="crud-form-grid">
              <div className="crud-field">
                <label htmlFor="refund_amount">Refund amount (₹)</label>
                <input
                  id="refund_amount"
                  type="number"
                  min="0.01"
                  step="0.01"
                  max={refundableAmount(refundPayment) || undefined}
                  value={refundForm.amount}
                  onChange={(e) => setRefundForm((p) => ({ ...p, amount: e.target.value }))}
                  required
                />
              </div>
              <div className="crud-field">
                <label htmlFor="refund_method">Refund via</label>
                <select
                  id="refund_method"
                  value={refundForm.refund_method}
                  onChange={(e) => setRefundForm((p) => ({ ...p, refund_method: e.target.value }))}
                >
                  {REFUND_METHODS.map((m) => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
              </div>
              <div className="crud-field crud-field--full">
                <label htmlFor="refund_ref">
                  Reference / UTR {refundForm.refund_method === "online" ? "(required)" : "(optional)"}
                </label>
                <input
                  id="refund_ref"
                  value={refundForm.reference}
                  onChange={(e) => setRefundForm((p) => ({ ...p, reference: e.target.value }))}
                  required={refundForm.refund_method === "online"}
                />
              </div>
              <div className="crud-field crud-field--full">
                <label htmlFor="refund_notes">Notes</label>
                <textarea id="refund_notes" rows={2} value={refundForm.notes} onChange={(e) => setRefundForm((p) => ({ ...p, notes: e.target.value }))} />
              </div>
            </div>
            <div className="crud-modal-actions">
              <button type="button" className="crud-btn crud-btn--ghost" onClick={() => setRefundOpen(false)}>Cancel</button>
              <button type="submit" className="crud-btn crud-btn--danger" disabled={saving}>{saving ? "Processing…" : "Process refund"}</button>
            </div>
          </form>
        )}
      </Modal>
    </section>
  );
}

export default DiagnosticOrders;
