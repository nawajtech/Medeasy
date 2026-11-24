--
-- PostgreSQL database dump
--

-- Dumped from database version 16.9
-- Dumped by pg_dump version 16.9

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: app_notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.app_notifications (
    id bigint NOT NULL,
    user_id bigint NOT NULL,
    title character varying(255) NOT NULL,
    body text,
    data json,
    read_at timestamp(0) without time zone,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);


--
-- Name: app_notifications_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.app_notifications_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: app_notifications_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.app_notifications_id_seq OWNED BY public.app_notifications.id;


--
-- Name: appointment_vitals; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.appointment_vitals (
    id bigint NOT NULL,
    appointment_id bigint NOT NULL,
    blood_pressure character varying(255),
    heart_rate smallint,
    body_temperature numeric(4,1),
    oxygen_saturation numeric(5,2),
    respiratory_rate smallint,
    blood_sugar numeric(6,2),
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);


--
-- Name: appointment_vitals_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.appointment_vitals_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: appointment_vitals_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.appointment_vitals_id_seq OWNED BY public.appointment_vitals.id;


--
-- Name: appointments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.appointments (
    id bigint NOT NULL,
    patient_id bigint NOT NULL,
    doctor_id bigint NOT NULL,
    appointment_date timestamp(0) without time zone NOT NULL,
    duration_minutes smallint DEFAULT '30'::smallint NOT NULL,
    status character varying(30) DEFAULT 'booked'::character varying NOT NULL,
    reason character varying(255),
    notes text,
    deleted_at timestamp(0) without time zone,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone,
    prescription text,
    company_id bigint NOT NULL,
    branch_id bigint,
    prescription_type character varying(20) DEFAULT 'handwritten'::character varying NOT NULL,
    prescription_file character varying(255),
    prescription_data json,
    CONSTRAINT appointments_status_check CHECK (((status)::text = ANY ((ARRAY['booked'::character varying, 'ongoing'::character varying, 'completed'::character varying, 'cancelled'::character varying])::text[])))
);


--
-- Name: appointments_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.appointments_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: appointments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.appointments_id_seq OWNED BY public.appointments.id;


--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_logs (
    id bigint NOT NULL,
    company_id bigint,
    branch_id bigint,
    user_id bigint,
    user_name character varying(255),
    user_email character varying(255),
    action character varying(40) NOT NULL,
    module character varying(60) NOT NULL,
    auditable_type character varying(80),
    auditable_id bigint,
    auditable_label character varying(255),
    old_values json,
    new_values json,
    metadata json,
    ip_address character varying(45),
    user_agent text,
    device character varying(80),
    browser character varying(80),
    url character varying(500),
    created_at timestamp(0) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: audit_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.audit_logs_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: audit_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.audit_logs_id_seq OWNED BY public.audit_logs.id;


--
-- Name: billings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.billings (
    id bigint NOT NULL,
    patient_id bigint NOT NULL,
    appointment_id bigint,
    invoice_number character varying(255) NOT NULL,
    status character varying(255) DEFAULT 'pending'::character varying NOT NULL,
    payment_method character varying(255),
    billed_at date NOT NULL,
    paid_at date,
    notes text,
    deleted_at timestamp(0) without time zone,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone,
    previous_due numeric(10,2) DEFAULT '0'::numeric NOT NULL,
    charge_amount numeric(10,2) DEFAULT '0'::numeric NOT NULL,
    paid_amount numeric(10,2) DEFAULT '0'::numeric NOT NULL,
    total_amount numeric(10,2) DEFAULT '0'::numeric NOT NULL,
    due_amount numeric(10,2) DEFAULT '0'::numeric NOT NULL,
    company_id bigint NOT NULL,
    CONSTRAINT billings_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'partial'::character varying, 'paid'::character varying, 'overdue'::character varying, 'cancelled'::character varying])::text[])))
);


--
-- Name: billings_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.billings_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: billings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.billings_id_seq OWNED BY public.billings.id;


--
-- Name: branches; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.branches (
    id bigint NOT NULL,
    company_id bigint NOT NULL,
    name character varying(255) NOT NULL,
    code character varying(255),
    address character varying(255),
    city character varying(255),
    phone character varying(255),
    email character varying(255),
    is_main boolean DEFAULT false NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone,
    deleted_at timestamp(0) without time zone
);


--
-- Name: branches_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.branches_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: branches_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.branches_id_seq OWNED BY public.branches.id;


--
-- Name: cache; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cache (
    key character varying(255) NOT NULL,
    value text NOT NULL,
    expiration integer NOT NULL
);


--
-- Name: cache_locks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cache_locks (
    key character varying(255) NOT NULL,
    owner character varying(255) NOT NULL,
    expiration integer NOT NULL
);


--
-- Name: center_chat_presences; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.center_chat_presences (
    id bigint NOT NULL,
    actor_type character varying(20) NOT NULL,
    actor_id bigint NOT NULL,
    company_id bigint,
    last_seen_at timestamp(0) without time zone NOT NULL,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);


--
-- Name: center_chat_presences_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.center_chat_presences_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: center_chat_presences_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.center_chat_presences_id_seq OWNED BY public.center_chat_presences.id;


--
-- Name: center_conversations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.center_conversations (
    id bigint NOT NULL,
    company_id bigint NOT NULL,
    patient_id bigint NOT NULL,
    last_message_at timestamp(0) without time zone,
    last_message_preview character varying(180),
    patient_read_message_id bigint,
    staff_read_message_id bigint,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone,
    deleted_at timestamp(0) without time zone
);


--
-- Name: center_conversations_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.center_conversations_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: center_conversations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.center_conversations_id_seq OWNED BY public.center_conversations.id;


--
-- Name: center_messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.center_messages (
    id bigint NOT NULL,
    conversation_id bigint NOT NULL,
    sender_type character varying(20) NOT NULL,
    sender_user_id bigint,
    body text NOT NULL,
    created_at timestamp(0) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    message_type character varying(20) DEFAULT 'text'::character varying NOT NULL,
    image_path character varying(500)
);


--
-- Name: center_messages_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.center_messages_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: center_messages_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.center_messages_id_seq OWNED BY public.center_messages.id;


--
-- Name: companies; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.companies (
    id bigint NOT NULL,
    name character varying(255) NOT NULL,
    code character varying(255),
    phone character varying(255),
    email character varying(255),
    address character varying(255),
    city character varying(255),
    state character varying(255),
    country character varying(255),
    website character varying(255),
    description text,
    is_active boolean DEFAULT true NOT NULL,
    deleted_at timestamp(0) without time zone,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone,
    type character varying(255) DEFAULT 'clinic'::character varying NOT NULL,
    logo_url character varying(255),
    gst_number character varying(255),
    registration_number character varying(255),
    currency character varying(10) DEFAULT 'INR'::character varying NOT NULL,
    modules json,
    primary_admin_id bigint,
    partner_discovery_enabled boolean DEFAULT true NOT NULL
);


--
-- Name: companies_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.companies_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: companies_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.companies_id_seq OWNED BY public.companies.id;


--
-- Name: subscriptions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.subscriptions (
    id bigint NOT NULL,
    company_id bigint NOT NULL,
    plan_id bigint NOT NULL,
    status character varying(255) DEFAULT 'active'::character varying NOT NULL,
    starts_at timestamp(0) without time zone,
    expires_at timestamp(0) without time zone,
    meta json,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone,
    trial_ends_at timestamp(0) without time zone,
    renewal_date timestamp(0) without time zone,
    auto_renewal boolean DEFAULT true NOT NULL,
    billing_cycle character varying(20) DEFAULT 'monthly'::character varying NOT NULL,
    cancelled_at timestamp(0) without time zone,
    suspended_at timestamp(0) without time zone
);


--
-- Name: company_subscriptions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.company_subscriptions_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: company_subscriptions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.company_subscriptions_id_seq OWNED BY public.subscriptions.id;


--
-- Name: departments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.departments (
    id bigint NOT NULL,
    name character varying(255) NOT NULL,
    code character varying(255),
    description text,
    is_active boolean DEFAULT true NOT NULL,
    deleted_at timestamp(0) without time zone,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone,
    company_id bigint NOT NULL
);


--
-- Name: departments_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.departments_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: departments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.departments_id_seq OWNED BY public.departments.id;


--
-- Name: diagnostic_categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.diagnostic_categories (
    id bigint NOT NULL,
    company_id bigint NOT NULL,
    name character varying(255) NOT NULL,
    description character varying(255),
    sort_order integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone,
    deleted_at timestamp(0) without time zone
);


--
-- Name: diagnostic_categories_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.diagnostic_categories_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: diagnostic_categories_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.diagnostic_categories_id_seq OWNED BY public.diagnostic_categories.id;


--
-- Name: diagnostic_order_payments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.diagnostic_order_payments (
    id bigint NOT NULL,
    diagnostic_order_id bigint NOT NULL,
    company_id bigint NOT NULL,
    amount numeric(12,2) NOT NULL,
    payment_method character varying(40),
    reference character varying(80),
    notes text,
    recorded_by bigint,
    paid_at timestamp(0) without time zone NOT NULL,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone,
    refunded_amount numeric(12,2) DEFAULT '0'::numeric NOT NULL
);


--
-- Name: diagnostic_order_payments_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.diagnostic_order_payments_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: diagnostic_order_payments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.diagnostic_order_payments_id_seq OWNED BY public.diagnostic_order_payments.id;


--
-- Name: diagnostic_order_refunds; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.diagnostic_order_refunds (
    id bigint NOT NULL,
    company_id bigint NOT NULL,
    diagnostic_order_id bigint NOT NULL,
    diagnostic_order_payment_id bigint,
    patient_id bigint NOT NULL,
    amount numeric(12,2) NOT NULL,
    refund_method character varying(20) NOT NULL,
    reference character varying(120),
    notes text,
    recorded_by bigint,
    refunded_at timestamp(0) without time zone NOT NULL,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);


--
-- Name: diagnostic_order_refunds_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.diagnostic_order_refunds_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: diagnostic_order_refunds_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.diagnostic_order_refunds_id_seq OWNED BY public.diagnostic_order_refunds.id;


--
-- Name: diagnostic_orders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.diagnostic_orders (
    id bigint NOT NULL,
    company_id bigint NOT NULL,
    patient_id bigint NOT NULL,
    doctor_id bigint,
    test_type_id bigint NOT NULL,
    order_number character varying(255) NOT NULL,
    status character varying(255) DEFAULT 'booked'::character varying NOT NULL,
    technician_id bigint,
    scheduled_at timestamp(0) without time zone,
    amount numeric(10,2) DEFAULT '0'::numeric NOT NULL,
    priority character varying(255) DEFAULT 'routine'::character varying NOT NULL,
    clinical_notes text,
    notes text,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone,
    deleted_at timestamp(0) without time zone,
    branch_id bigint,
    queue_serial smallint,
    referral_partner_id bigint,
    referral_partner_name character varying(255),
    referral_partner_mobile character varying(20),
    referral_partner_address text,
    referral_partner_type character varying(20),
    deduct_commission_from_bill boolean DEFAULT false NOT NULL,
    gross_amount numeric(10,2) DEFAULT '0'::numeric NOT NULL,
    referral_commission_amount numeric(10,2) DEFAULT '0'::numeric NOT NULL,
    referral_discount numeric(10,2) DEFAULT '0'::numeric NOT NULL,
    surcharge_amount numeric(10,2) DEFAULT '0'::numeric NOT NULL,
    net_amount numeric(10,2) DEFAULT '0'::numeric NOT NULL,
    doctor_commission_amount numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    paid_amount numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    due_amount numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    payment_status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    payment_method character varying(40),
    package_id bigint,
    package_discount numeric(10,2) DEFAULT '0'::numeric NOT NULL,
    tax_enabled boolean DEFAULT false NOT NULL,
    tax_mode character varying(20),
    tax_rate numeric(5,2) DEFAULT '0'::numeric NOT NULL,
    tax_inclusive boolean DEFAULT false NOT NULL,
    taxable_amount numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    cgst_rate numeric(5,2) DEFAULT '0'::numeric NOT NULL,
    sgst_rate numeric(5,2) DEFAULT '0'::numeric NOT NULL,
    igst_rate numeric(5,2) DEFAULT '0'::numeric NOT NULL,
    cgst_amount numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    sgst_amount numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    igst_amount numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    tax_amount numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    grand_total numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    extra_discount numeric(10,2) DEFAULT '0'::numeric NOT NULL,
    share_token character varying(32)
);


--
-- Name: diagnostic_orders_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.diagnostic_orders_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: diagnostic_orders_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.diagnostic_orders_id_seq OWNED BY public.diagnostic_orders.id;


--
-- Name: diagnostic_reports; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.diagnostic_reports (
    id bigint NOT NULL,
    order_id bigint NOT NULL,
    company_id bigint NOT NULL,
    file_path character varying(255),
    file_name character varying(255),
    file_type character varying(255),
    findings text,
    impression text,
    recommendations text,
    reported_by bigint,
    approved_by bigint,
    approved_at timestamp(0) without time zone,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone,
    report_emailed_at timestamp(0) without time zone
);


--
-- Name: diagnostic_reports_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.diagnostic_reports_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: diagnostic_reports_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.diagnostic_reports_id_seq OWNED BY public.diagnostic_reports.id;


--
-- Name: diagnostic_test_type_doctor; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.diagnostic_test_type_doctor (
    id bigint NOT NULL,
    diagnostic_test_type_id bigint NOT NULL,
    doctor_id bigint NOT NULL,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);


--
-- Name: diagnostic_test_type_doctor_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.diagnostic_test_type_doctor_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: diagnostic_test_type_doctor_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.diagnostic_test_type_doctor_id_seq OWNED BY public.diagnostic_test_type_doctor.id;


--
-- Name: diagnostic_test_types; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.diagnostic_test_types (
    id bigint NOT NULL,
    company_id bigint NOT NULL,
    name character varying(255) NOT NULL,
    code character varying(255),
    modality character varying(255) NOT NULL,
    description text,
    preparation_instructions text,
    price numeric(10,2) DEFAULT '0'::numeric NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone,
    deleted_at timestamp(0) without time zone,
    category_id bigint,
    referral_commission numeric(10,2) DEFAULT '0'::numeric NOT NULL,
    doctor_commission numeric(12,2) DEFAULT '0'::numeric NOT NULL
);


--
-- Name: diagnostic_test_types_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.diagnostic_test_types_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: diagnostic_test_types_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.diagnostic_test_types_id_seq OWNED BY public.diagnostic_test_types.id;


--
-- Name: diago_package; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.diago_package (
    id bigint NOT NULL,
    company_id bigint NOT NULL,
    package_name character varying(50) NOT NULL,
    test_ids json NOT NULL,
    description text,
    offer_percentage numeric(5,2) DEFAULT '0'::numeric NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone,
    deleted_at timestamp(0) without time zone
);


--
-- Name: diago_package_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.diago_package_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: diago_package_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.diago_package_id_seq OWNED BY public.diago_package.id;


--
-- Name: doctor_availabilities; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.doctor_availabilities (
    id bigint NOT NULL,
    company_id bigint NOT NULL,
    doctor_id bigint NOT NULL,
    day_of_week smallint NOT NULL,
    start_time time(0) without time zone NOT NULL,
    end_time time(0) without time zone NOT NULL,
    slot_duration smallint DEFAULT '30'::smallint NOT NULL,
    max_patients smallint DEFAULT '10'::smallint NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);


--
-- Name: doctor_availabilities_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.doctor_availabilities_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: doctor_availabilities_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.doctor_availabilities_id_seq OWNED BY public.doctor_availabilities.id;


--
-- Name: doctors; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.doctors (
    id bigint NOT NULL,
    user_id bigint NOT NULL,
    doctor_code character varying(255) NOT NULL,
    qualification character varying(255),
    experience_years integer,
    license_number character varying(255),
    consultation_fee numeric(10,2),
    bio text,
    deleted_at timestamp(0) without time zone,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone,
    department_id bigint,
    company_id bigint NOT NULL,
    branch_id bigint,
    doctor_type character varying(20) DEFAULT 'clinic'::character varying NOT NULL
);


--
-- Name: doctors_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.doctors_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: doctors_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.doctors_id_seq OWNED BY public.doctors.id;


--
-- Name: expenses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.expenses (
    id bigint NOT NULL,
    company_id bigint NOT NULL,
    category character varying(80) NOT NULL,
    description character varying(255),
    amount numeric(12,2) NOT NULL,
    expense_date date NOT NULL,
    payment_method character varying(40),
    notes text,
    recorded_by bigint,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone,
    branch_id bigint
);


--
-- Name: expenses_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.expenses_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: expenses_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.expenses_id_seq OWNED BY public.expenses.id;


--
-- Name: failed_jobs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.failed_jobs (
    id bigint NOT NULL,
    uuid character varying(255) NOT NULL,
    connection text NOT NULL,
    queue text NOT NULL,
    payload text NOT NULL,
    exception text NOT NULL,
    failed_at timestamp(0) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: failed_jobs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.failed_jobs_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: failed_jobs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.failed_jobs_id_seq OWNED BY public.failed_jobs.id;


--
-- Name: fcm_tokens; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.fcm_tokens (
    id bigint NOT NULL,
    user_id bigint NOT NULL,
    token character varying(512) NOT NULL,
    device_name character varying(255),
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);


--
-- Name: fcm_tokens_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.fcm_tokens_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: fcm_tokens_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.fcm_tokens_id_seq OWNED BY public.fcm_tokens.id;


--
-- Name: features; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.features (
    id bigint NOT NULL,
    key character varying(255) NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    category character varying(255),
    is_active boolean DEFAULT true NOT NULL,
    display_order smallint DEFAULT '0'::smallint NOT NULL,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);


--
-- Name: features_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.features_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: features_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.features_id_seq OWNED BY public.features.id;


--
-- Name: job_batches; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.job_batches (
    id character varying(255) NOT NULL,
    name character varying(255) NOT NULL,
    total_jobs integer NOT NULL,
    pending_jobs integer NOT NULL,
    failed_jobs integer NOT NULL,
    failed_job_ids text NOT NULL,
    options text,
    cancelled_at integer,
    created_at integer NOT NULL,
    finished_at integer
);


--
-- Name: jobs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.jobs (
    id bigint NOT NULL,
    queue character varying(255) NOT NULL,
    payload text NOT NULL,
    attempts smallint NOT NULL,
    reserved_at integer,
    available_at integer NOT NULL,
    created_at integer NOT NULL
);


--
-- Name: jobs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.jobs_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: jobs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.jobs_id_seq OWNED BY public.jobs.id;


--
-- Name: lab_order_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lab_order_items (
    id bigint NOT NULL,
    order_id bigint NOT NULL,
    test_id bigint,
    package_id bigint,
    price numeric(10,2) DEFAULT '0'::numeric NOT NULL,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);


--
-- Name: lab_order_items_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.lab_order_items_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: lab_order_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.lab_order_items_id_seq OWNED BY public.lab_order_items.id;


--
-- Name: lab_orders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lab_orders (
    id bigint NOT NULL,
    company_id bigint NOT NULL,
    patient_id bigint NOT NULL,
    doctor_id bigint,
    order_number character varying(255) NOT NULL,
    status character varying(255) DEFAULT 'pending'::character varying NOT NULL,
    collection_type character varying(255) DEFAULT 'walk_in'::character varying NOT NULL,
    home_address character varying(255),
    collection_scheduled_at timestamp(0) without time zone,
    gross_amount numeric(10,2) DEFAULT '0'::numeric NOT NULL,
    discount numeric(10,2) DEFAULT '0'::numeric NOT NULL,
    net_amount numeric(10,2) DEFAULT '0'::numeric NOT NULL,
    notes text,
    ordered_at timestamp(0) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone,
    deleted_at timestamp(0) without time zone,
    branch_id bigint
);


--
-- Name: lab_orders_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.lab_orders_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: lab_orders_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.lab_orders_id_seq OWNED BY public.lab_orders.id;


--
-- Name: lab_package_tests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lab_package_tests (
    id bigint NOT NULL,
    package_id bigint NOT NULL,
    test_id bigint NOT NULL
);


--
-- Name: lab_package_tests_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.lab_package_tests_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: lab_package_tests_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.lab_package_tests_id_seq OWNED BY public.lab_package_tests.id;


--
-- Name: lab_results; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lab_results (
    id bigint NOT NULL,
    order_id bigint NOT NULL,
    order_item_id bigint NOT NULL,
    test_id bigint NOT NULL,
    value character varying(255),
    unit character varying(255),
    ref_range character varying(255),
    flag character varying(255),
    notes text,
    entered_by bigint,
    verified_by bigint,
    verified_at timestamp(0) without time zone,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);


--
-- Name: lab_results_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.lab_results_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: lab_results_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.lab_results_id_seq OWNED BY public.lab_results.id;


--
-- Name: lab_samples; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lab_samples (
    id bigint NOT NULL,
    order_id bigint NOT NULL,
    company_id bigint NOT NULL,
    sample_id character varying(255) NOT NULL,
    sample_type character varying(255) NOT NULL,
    status character varying(255) DEFAULT 'pending'::character varying NOT NULL,
    collection_method character varying(255) DEFAULT 'walk_in'::character varying NOT NULL,
    collected_by bigint,
    collected_at timestamp(0) without time zone,
    notes text,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);


--
-- Name: lab_samples_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.lab_samples_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: lab_samples_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.lab_samples_id_seq OWNED BY public.lab_samples.id;


--
-- Name: lab_test_categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lab_test_categories (
    id bigint NOT NULL,
    company_id bigint NOT NULL,
    name character varying(255) NOT NULL,
    description character varying(255),
    sort_order integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone,
    deleted_at timestamp(0) without time zone
);


--
-- Name: lab_test_categories_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.lab_test_categories_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: lab_test_categories_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.lab_test_categories_id_seq OWNED BY public.lab_test_categories.id;


--
-- Name: lab_test_packages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lab_test_packages (
    id bigint NOT NULL,
    company_id bigint NOT NULL,
    name character varying(255) NOT NULL,
    code character varying(255),
    description text,
    price numeric(10,2) DEFAULT '0'::numeric NOT NULL,
    turnaround_hours integer DEFAULT 24 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone,
    deleted_at timestamp(0) without time zone
);


--
-- Name: lab_test_packages_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.lab_test_packages_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: lab_test_packages_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.lab_test_packages_id_seq OWNED BY public.lab_test_packages.id;


--
-- Name: lab_tests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lab_tests (
    id bigint NOT NULL,
    company_id bigint NOT NULL,
    category_id bigint NOT NULL,
    name character varying(255) NOT NULL,
    code character varying(255),
    sample_type character varying(255) DEFAULT 'blood'::character varying NOT NULL,
    price numeric(10,2) DEFAULT '0'::numeric NOT NULL,
    turnaround_hours integer DEFAULT 24 NOT NULL,
    unit character varying(255),
    ref_range_male character varying(255),
    ref_range_female character varying(255),
    ref_range_child character varying(255),
    method character varying(255),
    description text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone,
    deleted_at timestamp(0) without time zone
);


--
-- Name: lab_tests_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.lab_tests_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: lab_tests_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.lab_tests_id_seq OWNED BY public.lab_tests.id;


--
-- Name: medicines; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.medicines (
    id bigint NOT NULL,
    name character varying(255) NOT NULL,
    manufacturer_name character varying(255),
    composition text,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone,
    deleted_at timestamp(0) without time zone
);


--
-- Name: medicines_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.medicines_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: medicines_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.medicines_id_seq OWNED BY public.medicines.id;


--
-- Name: migrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.migrations (
    id integer NOT NULL,
    migration character varying(255) NOT NULL,
    batch integer NOT NULL
);


--
-- Name: migrations_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.migrations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: migrations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.migrations_id_seq OWNED BY public.migrations.id;


--
-- Name: model_has_permissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.model_has_permissions (
    permission_id bigint NOT NULL,
    model_type character varying(255) NOT NULL,
    model_id bigint NOT NULL
);


--
-- Name: model_has_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.model_has_roles (
    role_id bigint NOT NULL,
    model_type character varying(255) NOT NULL,
    model_id bigint NOT NULL
);


--
-- Name: partner_centre_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.partner_centre_requests (
    id bigint NOT NULL,
    partner_id bigint NOT NULL,
    company_id bigint NOT NULL,
    message text,
    status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    reviewed_by bigint,
    reviewed_at timestamp(0) without time zone,
    review_notes text,
    referral_partner_id bigint,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);


--
-- Name: partner_centre_requests_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.partner_centre_requests_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: partner_centre_requests_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.partner_centre_requests_id_seq OWNED BY public.partner_centre_requests.id;


--
-- Name: partner_otps; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.partner_otps (
    id bigint NOT NULL,
    phone character varying(20) NOT NULL,
    purpose character varying(40) DEFAULT 'register'::character varying NOT NULL,
    code_hash character varying(255) NOT NULL,
    attempts smallint DEFAULT '0'::smallint NOT NULL,
    expires_at timestamp(0) without time zone NOT NULL,
    verified_at timestamp(0) without time zone,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);


--
-- Name: partner_otps_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.partner_otps_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: partner_otps_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.partner_otps_id_seq OWNED BY public.partner_otps.id;


--
-- Name: partners; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.partners (
    id bigint NOT NULL,
    name character varying(255) NOT NULL,
    type character varying(255) DEFAULT 'doctor'::character varying NOT NULL,
    phone character varying(20) NOT NULL,
    email character varying(255) NOT NULL,
    password character varying(255) NOT NULL,
    address text,
    city character varying(100),
    state character varying(100),
    professional_details text,
    phone_verified_at timestamp(0) without time zone,
    status boolean DEFAULT true NOT NULL,
    remember_token character varying(100),
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone,
    deleted_at timestamp(0) without time zone,
    CONSTRAINT partners_type_check CHECK (((type)::text = ANY ((ARRAY['doctor'::character varying, 'clinic'::character varying, 'hospital'::character varying, 'agent'::character varying])::text[])))
);


--
-- Name: partners_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.partners_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: partners_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.partners_id_seq OWNED BY public.partners.id;


--
-- Name: password_reset_otps; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.password_reset_otps (
    id bigint NOT NULL,
    email character varying(255) NOT NULL,
    code_hash character varying(255) NOT NULL,
    attempts smallint DEFAULT '0'::smallint NOT NULL,
    expires_at timestamp(0) without time zone NOT NULL,
    verified_at timestamp(0) without time zone,
    reset_token_hash character varying(255),
    reset_expires_at timestamp(0) without time zone,
    used_at timestamp(0) without time zone,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);


--
-- Name: password_reset_otps_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.password_reset_otps_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: password_reset_otps_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.password_reset_otps_id_seq OWNED BY public.password_reset_otps.id;


--
-- Name: password_reset_tokens; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.password_reset_tokens (
    email character varying(255) NOT NULL,
    token character varying(255) NOT NULL,
    created_at timestamp(0) without time zone
);


--
-- Name: patient_wallet_transactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.patient_wallet_transactions (
    id bigint NOT NULL,
    company_id bigint NOT NULL,
    patient_id bigint NOT NULL,
    wallet_id bigint NOT NULL,
    type character varying(30) NOT NULL,
    amount numeric(12,2) NOT NULL,
    balance_after numeric(12,2) NOT NULL,
    method character varying(40),
    reference character varying(120),
    notes text,
    related_type character varying(80),
    related_id bigint,
    recorded_by bigint,
    transacted_at timestamp(0) without time zone NOT NULL,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);


--
-- Name: patient_wallet_transactions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.patient_wallet_transactions_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: patient_wallet_transactions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.patient_wallet_transactions_id_seq OWNED BY public.patient_wallet_transactions.id;


--
-- Name: patient_wallets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.patient_wallets (
    id bigint NOT NULL,
    company_id bigint NOT NULL,
    patient_id bigint NOT NULL,
    balance numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);


--
-- Name: patient_wallets_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.patient_wallets_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: patient_wallets_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.patient_wallets_id_seq OWNED BY public.patient_wallets.id;


--
-- Name: patients; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.patients (
    id bigint NOT NULL,
    patient_code character varying(255) NOT NULL,
    name character varying(255) NOT NULL,
    email character varying(255),
    phone character varying(255),
    password character varying(255) NOT NULL,
    status boolean DEFAULT true NOT NULL,
    gender character varying(255),
    date_of_birth date,
    blood_group character varying(255),
    height numeric(5,2),
    weight numeric(5,2),
    address text,
    emergency_contact_name character varying(255),
    emergency_contact_phone character varying(255),
    allergies text,
    medical_history text,
    deleted_at timestamp(0) without time zone,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone,
    company_id bigint,
    original_password character varying(255),
    CONSTRAINT patients_gender_check CHECK (((gender)::text = ANY ((ARRAY['male'::character varying, 'female'::character varying, 'other'::character varying])::text[])))
);


--
-- Name: patients_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.patients_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: patients_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.patients_id_seq OWNED BY public.patients.id;


--
-- Name: permissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.permissions (
    id bigint NOT NULL,
    name character varying(255) NOT NULL,
    guard_name character varying(255) NOT NULL,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone,
    module character varying(255),
    label character varying(255)
);


--
-- Name: permissions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.permissions_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: permissions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.permissions_id_seq OWNED BY public.permissions.id;


--
-- Name: personal_access_tokens; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.personal_access_tokens (
    id bigint NOT NULL,
    tokenable_type character varying(255) NOT NULL,
    tokenable_id bigint NOT NULL,
    name text NOT NULL,
    token character varying(64) NOT NULL,
    abilities text,
    last_used_at timestamp(0) without time zone,
    expires_at timestamp(0) without time zone,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);


--
-- Name: personal_access_tokens_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.personal_access_tokens_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: personal_access_tokens_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.personal_access_tokens_id_seq OWNED BY public.personal_access_tokens.id;


--
-- Name: plan_features; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.plan_features (
    id bigint NOT NULL,
    plan_id bigint NOT NULL,
    feature_id bigint NOT NULL,
    is_enabled boolean DEFAULT true NOT NULL,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);


--
-- Name: plan_features_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.plan_features_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: plan_features_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.plan_features_id_seq OWNED BY public.plan_features.id;


--
-- Name: plan_limits; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.plan_limits (
    id bigint NOT NULL,
    plan_id bigint NOT NULL,
    limit_key character varying(255) NOT NULL,
    limit_value bigint,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);


--
-- Name: plan_limits_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.plan_limits_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: plan_limits_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.plan_limits_id_seq OWNED BY public.plan_limits.id;


--
-- Name: plans; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.plans (
    id bigint NOT NULL,
    name character varying(255) NOT NULL,
    code character varying(255) NOT NULL,
    description text,
    monthly_price numeric(10,2) DEFAULT '0'::numeric NOT NULL,
    yearly_price numeric(10,2) DEFAULT '0'::numeric NOT NULL,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone,
    currency character varying(10) DEFAULT 'INR'::character varying NOT NULL,
    trial_days smallint DEFAULT '0'::smallint NOT NULL,
    status character varying(20) DEFAULT 'active'::character varying NOT NULL,
    display_order smallint DEFAULT '0'::smallint NOT NULL,
    discount_percent smallint DEFAULT '0'::smallint NOT NULL,
    tax_enabled boolean DEFAULT true NOT NULL,
    tax_mode character varying(20) DEFAULT 'igst'::character varying NOT NULL,
    tax_rate numeric(5,2) DEFAULT '18'::numeric NOT NULL,
    tax_inclusive boolean DEFAULT false NOT NULL,
    availability character varying(32) DEFAULT 'available'::character varying NOT NULL,
    availability_note character varying(255)
);


--
-- Name: platform_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.platform_settings (
    id bigint NOT NULL,
    "values" json,
    updated_by bigint,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);


--
-- Name: platform_settings_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.platform_settings_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: platform_settings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.platform_settings_id_seq OWNED BY public.platform_settings.id;


--
-- Name: referral_commission_payouts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.referral_commission_payouts (
    id bigint NOT NULL,
    company_id bigint NOT NULL,
    referral_partner_id bigint NOT NULL,
    amount numeric(10,2) NOT NULL,
    paid_at timestamp(0) without time zone NOT NULL,
    method character varying(30) DEFAULT 'cash'::character varying NOT NULL,
    reference character varying(255),
    notes text,
    recorded_by bigint,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);


--
-- Name: referral_commission_payouts_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.referral_commission_payouts_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: referral_commission_payouts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.referral_commission_payouts_id_seq OWNED BY public.referral_commission_payouts.id;


--
-- Name: referral_partners; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.referral_partners (
    id bigint NOT NULL,
    company_id bigint NOT NULL,
    name character varying(255) NOT NULL,
    phone character varying(20),
    address text,
    type character varying(255) DEFAULT 'doctor'::character varying NOT NULL,
    referral_code character varying(50),
    surcharge_type character varying(255),
    surcharge_value numeric(10,2) DEFAULT '0'::numeric NOT NULL,
    status character varying(20) DEFAULT 'active'::character varying NOT NULL,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone,
    deleted_at timestamp(0) without time zone,
    partner_account_id bigint,
    CONSTRAINT referral_partners_surcharge_type_check CHECK (((surcharge_type)::text = ANY ((ARRAY['fixed'::character varying, 'percentage'::character varying])::text[]))),
    CONSTRAINT referral_partners_type_check CHECK (((type)::text = ANY ((ARRAY['doctor'::character varying, 'clinic'::character varying, 'hospital'::character varying, 'agent'::character varying])::text[])))
);


--
-- Name: referral_partners_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.referral_partners_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: referral_partners_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.referral_partners_id_seq OWNED BY public.referral_partners.id;


--
-- Name: reports; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.reports (
    id bigint NOT NULL,
    title character varying(255) NOT NULL,
    report_type character varying(255) DEFAULT 'custom'::character varying NOT NULL,
    period_start date,
    period_end date,
    summary text,
    status character varying(255) DEFAULT 'draft'::character varying NOT NULL,
    generated_at timestamp(0) without time zone,
    deleted_at timestamp(0) without time zone,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone,
    company_id bigint NOT NULL,
    CONSTRAINT reports_report_type_check CHECK (((report_type)::text = ANY ((ARRAY['appointments'::character varying, 'billing'::character varying, 'patients'::character varying, 'doctors'::character varying, 'custom'::character varying])::text[]))),
    CONSTRAINT reports_status_check CHECK (((status)::text = ANY ((ARRAY['draft'::character varying, 'published'::character varying])::text[])))
);


--
-- Name: reports_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.reports_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: reports_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.reports_id_seq OWNED BY public.reports.id;


--
-- Name: role_has_permissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.role_has_permissions (
    permission_id bigint NOT NULL,
    role_id bigint NOT NULL
);


--
-- Name: roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.roles (
    id bigint NOT NULL,
    name character varying(255) NOT NULL,
    guard_name character varying(255) NOT NULL,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone,
    description character varying(255),
    is_system boolean DEFAULT false NOT NULL,
    company_id bigint
);


--
-- Name: roles_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.roles_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: roles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.roles_id_seq OWNED BY public.roles.id;


--
-- Name: sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sessions (
    id character varying(255) NOT NULL,
    user_id bigint,
    ip_address character varying(45),
    user_agent text,
    payload text NOT NULL,
    last_activity integer NOT NULL
);


--
-- Name: settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.settings (
    id bigint NOT NULL,
    key character varying(255) NOT NULL,
    value text,
    label character varying(255),
    "group" character varying(255) DEFAULT 'general'::character varying NOT NULL,
    deleted_at timestamp(0) without time zone,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone,
    company_id bigint NOT NULL
);


--
-- Name: settings_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.settings_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: settings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.settings_id_seq OWNED BY public.settings.id;


--
-- Name: subscription_payments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.subscription_payments (
    id bigint NOT NULL,
    subscription_id bigint NOT NULL,
    invoice_number character varying(255) NOT NULL,
    payment_date timestamp(0) without time zone,
    amount numeric(10,2) NOT NULL,
    currency character varying(10) DEFAULT 'INR'::character varying NOT NULL,
    payment_status character varying(40) DEFAULT 'pending'::character varying NOT NULL,
    payment_method character varying(255),
    transaction_reference character varying(255),
    notes text,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone,
    subtotal numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    tax_enabled boolean DEFAULT false NOT NULL,
    tax_mode character varying(20),
    tax_rate numeric(5,2) DEFAULT '0'::numeric NOT NULL,
    cgst_rate numeric(5,2) DEFAULT '0'::numeric NOT NULL,
    sgst_rate numeric(5,2) DEFAULT '0'::numeric NOT NULL,
    igst_rate numeric(5,2) DEFAULT '0'::numeric NOT NULL,
    cgst_amount numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    sgst_amount numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    igst_amount numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    tax_amount numeric(12,2) DEFAULT '0'::numeric NOT NULL
);


--
-- Name: subscription_payments_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.subscription_payments_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: subscription_payments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.subscription_payments_id_seq OWNED BY public.subscription_payments.id;


--
-- Name: subscription_plans_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.subscription_plans_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: subscription_plans_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.subscription_plans_id_seq OWNED BY public.plans.id;


--
-- Name: subscription_tax_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.subscription_tax_settings (
    id bigint NOT NULL,
    enabled boolean DEFAULT true NOT NULL,
    mode character varying(20) DEFAULT 'igst'::character varying NOT NULL,
    rate numeric(5,2) DEFAULT '18'::numeric NOT NULL,
    inclusive boolean DEFAULT false NOT NULL,
    updated_by bigint,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);


--
-- Name: subscription_tax_settings_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.subscription_tax_settings_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: subscription_tax_settings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.subscription_tax_settings_id_seq OWNED BY public.subscription_tax_settings.id;


--
-- Name: theme_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.theme_settings (
    id bigint NOT NULL,
    colors json,
    updated_by bigint,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);


--
-- Name: theme_settings_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.theme_settings_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: theme_settings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.theme_settings_id_seq OWNED BY public.theme_settings.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id bigint NOT NULL,
    name character varying(255) NOT NULL,
    email character varying(255) NOT NULL,
    email_verified_at timestamp(0) without time zone,
    password character varying(255) NOT NULL,
    remember_token character varying(100),
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone,
    phone character varying(255),
    role character varying(255) NOT NULL,
    status boolean DEFAULT true NOT NULL,
    last_login_at timestamp(0) without time zone,
    deleted_at timestamp(0) without time zone,
    company_id bigint,
    branch_id bigint,
    user_code character varying(50)
);


--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.users_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: app_notifications id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.app_notifications ALTER COLUMN id SET DEFAULT nextval('public.app_notifications_id_seq'::regclass);


--
-- Name: appointment_vitals id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appointment_vitals ALTER COLUMN id SET DEFAULT nextval('public.appointment_vitals_id_seq'::regclass);


--
-- Name: appointments id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appointments ALTER COLUMN id SET DEFAULT nextval('public.appointments_id_seq'::regclass);


--
-- Name: audit_logs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs ALTER COLUMN id SET DEFAULT nextval('public.audit_logs_id_seq'::regclass);


--
-- Name: billings id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.billings ALTER COLUMN id SET DEFAULT nextval('public.billings_id_seq'::regclass);


--
-- Name: branches id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.branches ALTER COLUMN id SET DEFAULT nextval('public.branches_id_seq'::regclass);


--
-- Name: center_chat_presences id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.center_chat_presences ALTER COLUMN id SET DEFAULT nextval('public.center_chat_presences_id_seq'::regclass);


--
-- Name: center_conversations id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.center_conversations ALTER COLUMN id SET DEFAULT nextval('public.center_conversations_id_seq'::regclass);


--
-- Name: center_messages id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.center_messages ALTER COLUMN id SET DEFAULT nextval('public.center_messages_id_seq'::regclass);


--
-- Name: companies id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.companies ALTER COLUMN id SET DEFAULT nextval('public.companies_id_seq'::regclass);


--
-- Name: departments id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.departments ALTER COLUMN id SET DEFAULT nextval('public.departments_id_seq'::regclass);


--
-- Name: diagnostic_categories id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.diagnostic_categories ALTER COLUMN id SET DEFAULT nextval('public.diagnostic_categories_id_seq'::regclass);


--
-- Name: diagnostic_order_payments id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.diagnostic_order_payments ALTER COLUMN id SET DEFAULT nextval('public.diagnostic_order_payments_id_seq'::regclass);


--
-- Name: diagnostic_order_refunds id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.diagnostic_order_refunds ALTER COLUMN id SET DEFAULT nextval('public.diagnostic_order_refunds_id_seq'::regclass);


--
-- Name: diagnostic_orders id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.diagnostic_orders ALTER COLUMN id SET DEFAULT nextval('public.diagnostic_orders_id_seq'::regclass);


--
-- Name: diagnostic_reports id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.diagnostic_reports ALTER COLUMN id SET DEFAULT nextval('public.diagnostic_reports_id_seq'::regclass);


--
-- Name: diagnostic_test_type_doctor id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.diagnostic_test_type_doctor ALTER COLUMN id SET DEFAULT nextval('public.diagnostic_test_type_doctor_id_seq'::regclass);


--
-- Name: diagnostic_test_types id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.diagnostic_test_types ALTER COLUMN id SET DEFAULT nextval('public.diagnostic_test_types_id_seq'::regclass);


--
-- Name: diago_package id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.diago_package ALTER COLUMN id SET DEFAULT nextval('public.diago_package_id_seq'::regclass);


--
-- Name: doctor_availabilities id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.doctor_availabilities ALTER COLUMN id SET DEFAULT nextval('public.doctor_availabilities_id_seq'::regclass);


--
-- Name: doctors id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.doctors ALTER COLUMN id SET DEFAULT nextval('public.doctors_id_seq'::regclass);


--
-- Name: expenses id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expenses ALTER COLUMN id SET DEFAULT nextval('public.expenses_id_seq'::regclass);


--
-- Name: failed_jobs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.failed_jobs ALTER COLUMN id SET DEFAULT nextval('public.failed_jobs_id_seq'::regclass);


--
-- Name: fcm_tokens id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fcm_tokens ALTER COLUMN id SET DEFAULT nextval('public.fcm_tokens_id_seq'::regclass);


--
-- Name: features id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.features ALTER COLUMN id SET DEFAULT nextval('public.features_id_seq'::regclass);


--
-- Name: jobs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jobs ALTER COLUMN id SET DEFAULT nextval('public.jobs_id_seq'::regclass);


--
-- Name: lab_order_items id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lab_order_items ALTER COLUMN id SET DEFAULT nextval('public.lab_order_items_id_seq'::regclass);


--
-- Name: lab_orders id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lab_orders ALTER COLUMN id SET DEFAULT nextval('public.lab_orders_id_seq'::regclass);


--
-- Name: lab_package_tests id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lab_package_tests ALTER COLUMN id SET DEFAULT nextval('public.lab_package_tests_id_seq'::regclass);


--
-- Name: lab_results id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lab_results ALTER COLUMN id SET DEFAULT nextval('public.lab_results_id_seq'::regclass);


--
-- Name: lab_samples id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lab_samples ALTER COLUMN id SET DEFAULT nextval('public.lab_samples_id_seq'::regclass);


--
-- Name: lab_test_categories id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lab_test_categories ALTER COLUMN id SET DEFAULT nextval('public.lab_test_categories_id_seq'::regclass);


--
-- Name: lab_test_packages id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lab_test_packages ALTER COLUMN id SET DEFAULT nextval('public.lab_test_packages_id_seq'::regclass);


--
-- Name: lab_tests id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lab_tests ALTER COLUMN id SET DEFAULT nextval('public.lab_tests_id_seq'::regclass);


--
-- Name: medicines id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.medicines ALTER COLUMN id SET DEFAULT nextval('public.medicines_id_seq'::regclass);


--
-- Name: migrations id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.migrations ALTER COLUMN id SET DEFAULT nextval('public.migrations_id_seq'::regclass);


--
-- Name: partner_centre_requests id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.partner_centre_requests ALTER COLUMN id SET DEFAULT nextval('public.partner_centre_requests_id_seq'::regclass);


--
-- Name: partner_otps id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.partner_otps ALTER COLUMN id SET DEFAULT nextval('public.partner_otps_id_seq'::regclass);


--
-- Name: partners id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.partners ALTER COLUMN id SET DEFAULT nextval('public.partners_id_seq'::regclass);


--
-- Name: password_reset_otps id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.password_reset_otps ALTER COLUMN id SET DEFAULT nextval('public.password_reset_otps_id_seq'::regclass);


--
-- Name: patient_wallet_transactions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patient_wallet_transactions ALTER COLUMN id SET DEFAULT nextval('public.patient_wallet_transactions_id_seq'::regclass);


--
-- Name: patient_wallets id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patient_wallets ALTER COLUMN id SET DEFAULT nextval('public.patient_wallets_id_seq'::regclass);


--
-- Name: patients id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patients ALTER COLUMN id SET DEFAULT nextval('public.patients_id_seq'::regclass);


--
-- Name: permissions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.permissions ALTER COLUMN id SET DEFAULT nextval('public.permissions_id_seq'::regclass);


--
-- Name: personal_access_tokens id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.personal_access_tokens ALTER COLUMN id SET DEFAULT nextval('public.personal_access_tokens_id_seq'::regclass);


--
-- Name: plan_features id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plan_features ALTER COLUMN id SET DEFAULT nextval('public.plan_features_id_seq'::regclass);


--
-- Name: plan_limits id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plan_limits ALTER COLUMN id SET DEFAULT nextval('public.plan_limits_id_seq'::regclass);


--
-- Name: plans id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plans ALTER COLUMN id SET DEFAULT nextval('public.subscription_plans_id_seq'::regclass);


--
-- Name: platform_settings id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.platform_settings ALTER COLUMN id SET DEFAULT nextval('public.platform_settings_id_seq'::regclass);


--
-- Name: referral_commission_payouts id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.referral_commission_payouts ALTER COLUMN id SET DEFAULT nextval('public.referral_commission_payouts_id_seq'::regclass);


--
-- Name: referral_partners id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.referral_partners ALTER COLUMN id SET DEFAULT nextval('public.referral_partners_id_seq'::regclass);


--
-- Name: reports id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reports ALTER COLUMN id SET DEFAULT nextval('public.reports_id_seq'::regclass);


--
-- Name: roles id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roles ALTER COLUMN id SET DEFAULT nextval('public.roles_id_seq'::regclass);


--
-- Name: settings id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.settings ALTER COLUMN id SET DEFAULT nextval('public.settings_id_seq'::regclass);


--
-- Name: subscription_payments id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscription_payments ALTER COLUMN id SET DEFAULT nextval('public.subscription_payments_id_seq'::regclass);


--
-- Name: subscription_tax_settings id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscription_tax_settings ALTER COLUMN id SET DEFAULT nextval('public.subscription_tax_settings_id_seq'::regclass);


--
-- Name: subscriptions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscriptions ALTER COLUMN id SET DEFAULT nextval('public.company_subscriptions_id_seq'::regclass);


--
-- Name: theme_settings id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.theme_settings ALTER COLUMN id SET DEFAULT nextval('public.theme_settings_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Name: app_notifications app_notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.app_notifications
    ADD CONSTRAINT app_notifications_pkey PRIMARY KEY (id);


--
-- Name: appointment_vitals appointment_vitals_appointment_id_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appointment_vitals
    ADD CONSTRAINT appointment_vitals_appointment_id_unique UNIQUE (appointment_id);


--
-- Name: appointment_vitals appointment_vitals_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appointment_vitals
    ADD CONSTRAINT appointment_vitals_pkey PRIMARY KEY (id);


--
-- Name: appointments appointments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appointments
    ADD CONSTRAINT appointments_pkey PRIMARY KEY (id);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- Name: billings billings_invoice_number_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.billings
    ADD CONSTRAINT billings_invoice_number_unique UNIQUE (invoice_number);


--
-- Name: billings billings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.billings
    ADD CONSTRAINT billings_pkey PRIMARY KEY (id);


--
-- Name: branches branches_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.branches
    ADD CONSTRAINT branches_pkey PRIMARY KEY (id);


--
-- Name: cache_locks cache_locks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cache_locks
    ADD CONSTRAINT cache_locks_pkey PRIMARY KEY (key);


--
-- Name: cache cache_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cache
    ADD CONSTRAINT cache_pkey PRIMARY KEY (key);


--
-- Name: center_chat_presences center_chat_presences_actor_type_actor_id_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.center_chat_presences
    ADD CONSTRAINT center_chat_presences_actor_type_actor_id_unique UNIQUE (actor_type, actor_id);


--
-- Name: center_chat_presences center_chat_presences_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.center_chat_presences
    ADD CONSTRAINT center_chat_presences_pkey PRIMARY KEY (id);


--
-- Name: center_conversations center_conversations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.center_conversations
    ADD CONSTRAINT center_conversations_pkey PRIMARY KEY (id);


--
-- Name: center_messages center_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.center_messages
    ADD CONSTRAINT center_messages_pkey PRIMARY KEY (id);


--
-- Name: companies companies_code_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.companies
    ADD CONSTRAINT companies_code_unique UNIQUE (code);


--
-- Name: companies companies_name_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.companies
    ADD CONSTRAINT companies_name_unique UNIQUE (name);


--
-- Name: companies companies_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.companies
    ADD CONSTRAINT companies_pkey PRIMARY KEY (id);


--
-- Name: subscriptions company_subscriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT company_subscriptions_pkey PRIMARY KEY (id);


--
-- Name: departments departments_company_id_code_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.departments
    ADD CONSTRAINT departments_company_id_code_unique UNIQUE (company_id, code);


--
-- Name: departments departments_company_id_name_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.departments
    ADD CONSTRAINT departments_company_id_name_unique UNIQUE (company_id, name);


--
-- Name: departments departments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.departments
    ADD CONSTRAINT departments_pkey PRIMARY KEY (id);


--
-- Name: diagnostic_test_type_doctor diag_test_doctor_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.diagnostic_test_type_doctor
    ADD CONSTRAINT diag_test_doctor_unique UNIQUE (diagnostic_test_type_id, doctor_id);


--
-- Name: diagnostic_categories diagnostic_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.diagnostic_categories
    ADD CONSTRAINT diagnostic_categories_pkey PRIMARY KEY (id);


--
-- Name: diagnostic_order_payments diagnostic_order_payments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.diagnostic_order_payments
    ADD CONSTRAINT diagnostic_order_payments_pkey PRIMARY KEY (id);


--
-- Name: diagnostic_order_refunds diagnostic_order_refunds_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.diagnostic_order_refunds
    ADD CONSTRAINT diagnostic_order_refunds_pkey PRIMARY KEY (id);


--
-- Name: diagnostic_orders diagnostic_orders_order_number_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.diagnostic_orders
    ADD CONSTRAINT diagnostic_orders_order_number_unique UNIQUE (order_number);


--
-- Name: diagnostic_orders diagnostic_orders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.diagnostic_orders
    ADD CONSTRAINT diagnostic_orders_pkey PRIMARY KEY (id);


--
-- Name: diagnostic_orders diagnostic_orders_share_token_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.diagnostic_orders
    ADD CONSTRAINT diagnostic_orders_share_token_unique UNIQUE (share_token);


--
-- Name: diagnostic_reports diagnostic_reports_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.diagnostic_reports
    ADD CONSTRAINT diagnostic_reports_pkey PRIMARY KEY (id);


--
-- Name: diagnostic_test_type_doctor diagnostic_test_type_doctor_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.diagnostic_test_type_doctor
    ADD CONSTRAINT diagnostic_test_type_doctor_pkey PRIMARY KEY (id);


--
-- Name: diagnostic_test_types diagnostic_test_types_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.diagnostic_test_types
    ADD CONSTRAINT diagnostic_test_types_pkey PRIMARY KEY (id);


--
-- Name: diago_package diago_package_company_id_package_name_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.diago_package
    ADD CONSTRAINT diago_package_company_id_package_name_unique UNIQUE (company_id, package_name);


--
-- Name: diago_package diago_package_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.diago_package
    ADD CONSTRAINT diago_package_pkey PRIMARY KEY (id);


--
-- Name: doctor_availabilities doctor_availabilities_doctor_id_day_of_week_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.doctor_availabilities
    ADD CONSTRAINT doctor_availabilities_doctor_id_day_of_week_unique UNIQUE (doctor_id, day_of_week);


--
-- Name: doctor_availabilities doctor_availabilities_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.doctor_availabilities
    ADD CONSTRAINT doctor_availabilities_pkey PRIMARY KEY (id);


--
-- Name: doctors doctors_company_id_doctor_code_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.doctors
    ADD CONSTRAINT doctors_company_id_doctor_code_unique UNIQUE (company_id, doctor_code);


--
-- Name: doctors doctors_license_number_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.doctors
    ADD CONSTRAINT doctors_license_number_unique UNIQUE (license_number);


--
-- Name: doctors doctors_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.doctors
    ADD CONSTRAINT doctors_pkey PRIMARY KEY (id);


--
-- Name: expenses expenses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_pkey PRIMARY KEY (id);


--
-- Name: failed_jobs failed_jobs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.failed_jobs
    ADD CONSTRAINT failed_jobs_pkey PRIMARY KEY (id);


--
-- Name: failed_jobs failed_jobs_uuid_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.failed_jobs
    ADD CONSTRAINT failed_jobs_uuid_unique UNIQUE (uuid);


--
-- Name: fcm_tokens fcm_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fcm_tokens
    ADD CONSTRAINT fcm_tokens_pkey PRIMARY KEY (id);


--
-- Name: fcm_tokens fcm_tokens_token_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fcm_tokens
    ADD CONSTRAINT fcm_tokens_token_unique UNIQUE (token);


--
-- Name: features features_key_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.features
    ADD CONSTRAINT features_key_unique UNIQUE (key);


--
-- Name: features features_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.features
    ADD CONSTRAINT features_pkey PRIMARY KEY (id);


--
-- Name: job_batches job_batches_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.job_batches
    ADD CONSTRAINT job_batches_pkey PRIMARY KEY (id);


--
-- Name: jobs jobs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jobs
    ADD CONSTRAINT jobs_pkey PRIMARY KEY (id);


--
-- Name: lab_order_items lab_order_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lab_order_items
    ADD CONSTRAINT lab_order_items_pkey PRIMARY KEY (id);


--
-- Name: lab_orders lab_orders_order_number_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lab_orders
    ADD CONSTRAINT lab_orders_order_number_unique UNIQUE (order_number);


--
-- Name: lab_orders lab_orders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lab_orders
    ADD CONSTRAINT lab_orders_pkey PRIMARY KEY (id);


--
-- Name: lab_package_tests lab_package_tests_package_id_test_id_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lab_package_tests
    ADD CONSTRAINT lab_package_tests_package_id_test_id_unique UNIQUE (package_id, test_id);


--
-- Name: lab_package_tests lab_package_tests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lab_package_tests
    ADD CONSTRAINT lab_package_tests_pkey PRIMARY KEY (id);


--
-- Name: lab_results lab_results_order_item_id_test_id_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lab_results
    ADD CONSTRAINT lab_results_order_item_id_test_id_unique UNIQUE (order_item_id, test_id);


--
-- Name: lab_results lab_results_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lab_results
    ADD CONSTRAINT lab_results_pkey PRIMARY KEY (id);


--
-- Name: lab_samples lab_samples_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lab_samples
    ADD CONSTRAINT lab_samples_pkey PRIMARY KEY (id);


--
-- Name: lab_samples lab_samples_sample_id_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lab_samples
    ADD CONSTRAINT lab_samples_sample_id_unique UNIQUE (sample_id);


--
-- Name: lab_test_categories lab_test_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lab_test_categories
    ADD CONSTRAINT lab_test_categories_pkey PRIMARY KEY (id);


--
-- Name: lab_test_packages lab_test_packages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lab_test_packages
    ADD CONSTRAINT lab_test_packages_pkey PRIMARY KEY (id);


--
-- Name: lab_tests lab_tests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lab_tests
    ADD CONSTRAINT lab_tests_pkey PRIMARY KEY (id);


--
-- Name: medicines medicines_name_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.medicines
    ADD CONSTRAINT medicines_name_unique UNIQUE (name);


--
-- Name: medicines medicines_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.medicines
    ADD CONSTRAINT medicines_pkey PRIMARY KEY (id);


--
-- Name: migrations migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.migrations
    ADD CONSTRAINT migrations_pkey PRIMARY KEY (id);


--
-- Name: model_has_permissions model_has_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.model_has_permissions
    ADD CONSTRAINT model_has_permissions_pkey PRIMARY KEY (permission_id, model_id, model_type);


--
-- Name: model_has_roles model_has_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.model_has_roles
    ADD CONSTRAINT model_has_roles_pkey PRIMARY KEY (role_id, model_id, model_type);


--
-- Name: partner_centre_requests partner_centre_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.partner_centre_requests
    ADD CONSTRAINT partner_centre_requests_pkey PRIMARY KEY (id);


--
-- Name: partner_otps partner_otps_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.partner_otps
    ADD CONSTRAINT partner_otps_pkey PRIMARY KEY (id);


--
-- Name: partners partners_email_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.partners
    ADD CONSTRAINT partners_email_unique UNIQUE (email);


--
-- Name: partners partners_phone_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.partners
    ADD CONSTRAINT partners_phone_unique UNIQUE (phone);


--
-- Name: partners partners_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.partners
    ADD CONSTRAINT partners_pkey PRIMARY KEY (id);


--
-- Name: password_reset_otps password_reset_otps_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.password_reset_otps
    ADD CONSTRAINT password_reset_otps_pkey PRIMARY KEY (id);


--
-- Name: password_reset_tokens password_reset_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_pkey PRIMARY KEY (email);


--
-- Name: patient_wallet_transactions patient_wallet_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patient_wallet_transactions
    ADD CONSTRAINT patient_wallet_transactions_pkey PRIMARY KEY (id);


--
-- Name: patient_wallets patient_wallets_patient_id_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patient_wallets
    ADD CONSTRAINT patient_wallets_patient_id_unique UNIQUE (patient_id);


--
-- Name: patient_wallets patient_wallets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patient_wallets
    ADD CONSTRAINT patient_wallets_pkey PRIMARY KEY (id);


--
-- Name: patients patients_company_id_email_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patients
    ADD CONSTRAINT patients_company_id_email_unique UNIQUE (company_id, email);


--
-- Name: patients patients_company_id_patient_code_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patients
    ADD CONSTRAINT patients_company_id_patient_code_unique UNIQUE (company_id, patient_code);


--
-- Name: patients patients_company_id_phone_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patients
    ADD CONSTRAINT patients_company_id_phone_unique UNIQUE (company_id, phone);


--
-- Name: patients patients_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patients
    ADD CONSTRAINT patients_pkey PRIMARY KEY (id);


--
-- Name: permissions permissions_name_guard_name_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.permissions
    ADD CONSTRAINT permissions_name_guard_name_unique UNIQUE (name, guard_name);


--
-- Name: permissions permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.permissions
    ADD CONSTRAINT permissions_pkey PRIMARY KEY (id);


--
-- Name: personal_access_tokens personal_access_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.personal_access_tokens
    ADD CONSTRAINT personal_access_tokens_pkey PRIMARY KEY (id);


--
-- Name: personal_access_tokens personal_access_tokens_token_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.personal_access_tokens
    ADD CONSTRAINT personal_access_tokens_token_unique UNIQUE (token);


--
-- Name: plan_features plan_features_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plan_features
    ADD CONSTRAINT plan_features_pkey PRIMARY KEY (id);


--
-- Name: plan_features plan_features_plan_id_feature_id_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plan_features
    ADD CONSTRAINT plan_features_plan_id_feature_id_unique UNIQUE (plan_id, feature_id);


--
-- Name: plan_limits plan_limits_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plan_limits
    ADD CONSTRAINT plan_limits_pkey PRIMARY KEY (id);


--
-- Name: plan_limits plan_limits_plan_id_limit_key_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plan_limits
    ADD CONSTRAINT plan_limits_plan_id_limit_key_unique UNIQUE (plan_id, limit_key);


--
-- Name: platform_settings platform_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.platform_settings
    ADD CONSTRAINT platform_settings_pkey PRIMARY KEY (id);


--
-- Name: referral_commission_payouts referral_commission_payouts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.referral_commission_payouts
    ADD CONSTRAINT referral_commission_payouts_pkey PRIMARY KEY (id);


--
-- Name: referral_partners referral_partners_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.referral_partners
    ADD CONSTRAINT referral_partners_pkey PRIMARY KEY (id);


--
-- Name: referral_partners referral_partners_referral_code_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.referral_partners
    ADD CONSTRAINT referral_partners_referral_code_unique UNIQUE (referral_code);


--
-- Name: reports reports_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reports
    ADD CONSTRAINT reports_pkey PRIMARY KEY (id);


--
-- Name: role_has_permissions role_has_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role_has_permissions
    ADD CONSTRAINT role_has_permissions_pkey PRIMARY KEY (permission_id, role_id);


--
-- Name: roles roles_company_id_name_guard_name_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_company_id_name_guard_name_unique UNIQUE (company_id, name, guard_name);


--
-- Name: roles roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (id);


--
-- Name: sessions sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_pkey PRIMARY KEY (id);


--
-- Name: settings settings_company_id_key_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.settings
    ADD CONSTRAINT settings_company_id_key_unique UNIQUE (company_id, key);


--
-- Name: settings settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.settings
    ADD CONSTRAINT settings_pkey PRIMARY KEY (id);


--
-- Name: subscription_payments subscription_payments_invoice_number_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscription_payments
    ADD CONSTRAINT subscription_payments_invoice_number_unique UNIQUE (invoice_number);


--
-- Name: subscription_payments subscription_payments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscription_payments
    ADD CONSTRAINT subscription_payments_pkey PRIMARY KEY (id);


--
-- Name: plans subscription_plans_code_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plans
    ADD CONSTRAINT subscription_plans_code_unique UNIQUE (code);


--
-- Name: plans subscription_plans_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plans
    ADD CONSTRAINT subscription_plans_pkey PRIMARY KEY (id);


--
-- Name: subscription_tax_settings subscription_tax_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscription_tax_settings
    ADD CONSTRAINT subscription_tax_settings_pkey PRIMARY KEY (id);


--
-- Name: theme_settings theme_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.theme_settings
    ADD CONSTRAINT theme_settings_pkey PRIMARY KEY (id);


--
-- Name: users users_company_id_user_code_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_company_id_user_code_unique UNIQUE (company_id, user_code);


--
-- Name: users users_email_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_unique UNIQUE (email);


--
-- Name: users users_phone_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_phone_unique UNIQUE (phone);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: app_notifications_user_id_read_at_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX app_notifications_user_id_read_at_index ON public.app_notifications USING btree (user_id, read_at);


--
-- Name: audit_logs_action_created_at_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_logs_action_created_at_index ON public.audit_logs USING btree (action, created_at);


--
-- Name: audit_logs_auditable_type_auditable_id_created_at_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_logs_auditable_type_auditable_id_created_at_index ON public.audit_logs USING btree (auditable_type, auditable_id, created_at);


--
-- Name: audit_logs_company_id_created_at_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_logs_company_id_created_at_index ON public.audit_logs USING btree (company_id, created_at);


--
-- Name: audit_logs_company_id_module_created_at_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_logs_company_id_module_created_at_index ON public.audit_logs USING btree (company_id, module, created_at);


--
-- Name: audit_logs_company_id_user_id_created_at_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_logs_company_id_user_id_created_at_index ON public.audit_logs USING btree (company_id, user_id, created_at);


--
-- Name: branches_company_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX branches_company_id_index ON public.branches USING btree (company_id);


--
-- Name: cache_expiration_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX cache_expiration_index ON public.cache USING btree (expiration);


--
-- Name: cache_locks_expiration_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX cache_locks_expiration_index ON public.cache_locks USING btree (expiration);


--
-- Name: center_chat_presences_company_id_actor_type_last_seen_at_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX center_chat_presences_company_id_actor_type_last_seen_at_index ON public.center_chat_presences USING btree (company_id, actor_type, last_seen_at);


--
-- Name: center_conversations_company_patient_active_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX center_conversations_company_patient_active_unique ON public.center_conversations USING btree (company_id, patient_id) WHERE (deleted_at IS NULL);


--
-- Name: center_conversations_patient_id_last_message_at_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX center_conversations_patient_id_last_message_at_index ON public.center_conversations USING btree (patient_id, last_message_at);


--
-- Name: center_messages_conversation_id_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX center_messages_conversation_id_id_index ON public.center_messages USING btree (conversation_id, id);


--
-- Name: center_messages_conversation_id_sender_type_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX center_messages_conversation_id_sender_type_index ON public.center_messages USING btree (conversation_id, sender_type);


--
-- Name: company_subscriptions_company_id_status_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX company_subscriptions_company_id_status_index ON public.subscriptions USING btree (company_id, status);


--
-- Name: diag_orders_doctor_day_serial; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX diag_orders_doctor_day_serial ON public.diagnostic_orders USING btree (doctor_id, scheduled_at, queue_serial);


--
-- Name: diagnostic_categories_company_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX diagnostic_categories_company_id_index ON public.diagnostic_categories USING btree (company_id);


--
-- Name: diagnostic_order_payments_diagnostic_order_id_paid_at_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX diagnostic_order_payments_diagnostic_order_id_paid_at_index ON public.diagnostic_order_payments USING btree (diagnostic_order_id, paid_at);


--
-- Name: diagnostic_orders_company_id_patient_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX diagnostic_orders_company_id_patient_id_index ON public.diagnostic_orders USING btree (company_id, patient_id);


--
-- Name: diagnostic_orders_company_id_status_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX diagnostic_orders_company_id_status_index ON public.diagnostic_orders USING btree (company_id, status);


--
-- Name: diagnostic_reports_order_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX diagnostic_reports_order_id_index ON public.diagnostic_reports USING btree (order_id);


--
-- Name: diagnostic_test_types_company_id_modality_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX diagnostic_test_types_company_id_modality_index ON public.diagnostic_test_types USING btree (company_id, modality);


--
-- Name: diago_package_company_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX diago_package_company_id_index ON public.diago_package USING btree (company_id);


--
-- Name: doctor_availabilities_company_id_doctor_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX doctor_availabilities_company_id_doctor_id_index ON public.doctor_availabilities USING btree (company_id, doctor_id);


--
-- Name: doctors_company_id_doctor_type_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX doctors_company_id_doctor_type_index ON public.doctors USING btree (company_id, doctor_type);


--
-- Name: expenses_company_id_expense_date_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX expenses_company_id_expense_date_index ON public.expenses USING btree (company_id, expense_date);


--
-- Name: fcm_tokens_user_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX fcm_tokens_user_id_index ON public.fcm_tokens USING btree (user_id);


--
-- Name: jobs_queue_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX jobs_queue_index ON public.jobs USING btree (queue);


--
-- Name: lab_orders_company_id_patient_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX lab_orders_company_id_patient_id_index ON public.lab_orders USING btree (company_id, patient_id);


--
-- Name: lab_orders_company_id_status_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX lab_orders_company_id_status_index ON public.lab_orders USING btree (company_id, status);


--
-- Name: lab_results_order_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX lab_results_order_id_index ON public.lab_results USING btree (order_id);


--
-- Name: lab_samples_company_id_status_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX lab_samples_company_id_status_index ON public.lab_samples USING btree (company_id, status);


--
-- Name: lab_test_categories_company_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX lab_test_categories_company_id_index ON public.lab_test_categories USING btree (company_id);


--
-- Name: lab_test_packages_company_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX lab_test_packages_company_id_index ON public.lab_test_packages USING btree (company_id);


--
-- Name: lab_tests_company_id_category_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX lab_tests_company_id_category_id_index ON public.lab_tests USING btree (company_id, category_id);


--
-- Name: model_has_permissions_model_id_model_type_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX model_has_permissions_model_id_model_type_index ON public.model_has_permissions USING btree (model_id, model_type);


--
-- Name: model_has_roles_model_id_model_type_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX model_has_roles_model_id_model_type_index ON public.model_has_roles USING btree (model_id, model_type);


--
-- Name: partner_centre_requests_company_id_status_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX partner_centre_requests_company_id_status_index ON public.partner_centre_requests USING btree (company_id, status);


--
-- Name: partner_centre_requests_partner_id_company_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX partner_centre_requests_partner_id_company_id_index ON public.partner_centre_requests USING btree (partner_id, company_id);


--
-- Name: partner_centre_requests_partner_id_status_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX partner_centre_requests_partner_id_status_index ON public.partner_centre_requests USING btree (partner_id, status);


--
-- Name: partner_otps_phone_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX partner_otps_phone_index ON public.partner_otps USING btree (phone);


--
-- Name: password_reset_otps_email_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX password_reset_otps_email_index ON public.password_reset_otps USING btree (email);


--
-- Name: patient_wallet_transactions_patient_id_transacted_at_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX patient_wallet_transactions_patient_id_transacted_at_index ON public.patient_wallet_transactions USING btree (patient_id, transacted_at);


--
-- Name: personal_access_tokens_expires_at_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX personal_access_tokens_expires_at_index ON public.personal_access_tokens USING btree (expires_at);


--
-- Name: personal_access_tokens_tokenable_type_tokenable_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX personal_access_tokens_tokenable_type_tokenable_id_index ON public.personal_access_tokens USING btree (tokenable_type, tokenable_id);


--
-- Name: referral_commission_payouts_referral_partner_id_paid_at_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX referral_commission_payouts_referral_partner_id_paid_at_index ON public.referral_commission_payouts USING btree (referral_partner_id, paid_at);


--
-- Name: referral_partners_company_id_status_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX referral_partners_company_id_status_index ON public.referral_partners USING btree (company_id, status);


--
-- Name: referral_partners_partner_account_id_status_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX referral_partners_partner_account_id_status_index ON public.referral_partners USING btree (partner_account_id, status);


--
-- Name: sessions_last_activity_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sessions_last_activity_index ON public.sessions USING btree (last_activity);


--
-- Name: sessions_user_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sessions_user_id_index ON public.sessions USING btree (user_id);


--
-- Name: subscription_payments_subscription_id_payment_status_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX subscription_payments_subscription_id_payment_status_index ON public.subscription_payments USING btree (subscription_id, payment_status);


--
-- Name: app_notifications app_notifications_user_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.app_notifications
    ADD CONSTRAINT app_notifications_user_id_foreign FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: appointment_vitals appointment_vitals_appointment_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appointment_vitals
    ADD CONSTRAINT appointment_vitals_appointment_id_foreign FOREIGN KEY (appointment_id) REFERENCES public.appointments(id) ON DELETE CASCADE;


--
-- Name: appointments appointments_branch_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appointments
    ADD CONSTRAINT appointments_branch_id_foreign FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE SET NULL;


--
-- Name: appointments appointments_company_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appointments
    ADD CONSTRAINT appointments_company_id_foreign FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: appointments appointments_doctor_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appointments
    ADD CONSTRAINT appointments_doctor_id_foreign FOREIGN KEY (doctor_id) REFERENCES public.doctors(id) ON DELETE CASCADE;


--
-- Name: appointments appointments_patient_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appointments
    ADD CONSTRAINT appointments_patient_id_foreign FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE CASCADE;


--
-- Name: audit_logs audit_logs_branch_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_branch_id_foreign FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE SET NULL;


--
-- Name: audit_logs audit_logs_company_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_company_id_foreign FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE SET NULL;


--
-- Name: audit_logs audit_logs_user_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_user_id_foreign FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: billings billings_appointment_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.billings
    ADD CONSTRAINT billings_appointment_id_foreign FOREIGN KEY (appointment_id) REFERENCES public.appointments(id) ON DELETE SET NULL;


--
-- Name: billings billings_company_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.billings
    ADD CONSTRAINT billings_company_id_foreign FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: billings billings_patient_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.billings
    ADD CONSTRAINT billings_patient_id_foreign FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE CASCADE;


--
-- Name: branches branches_company_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.branches
    ADD CONSTRAINT branches_company_id_foreign FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: center_chat_presences center_chat_presences_company_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.center_chat_presences
    ADD CONSTRAINT center_chat_presences_company_id_foreign FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: center_conversations center_conversations_company_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.center_conversations
    ADD CONSTRAINT center_conversations_company_id_foreign FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: center_conversations center_conversations_patient_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.center_conversations
    ADD CONSTRAINT center_conversations_patient_id_foreign FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE CASCADE;


--
-- Name: center_messages center_messages_conversation_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.center_messages
    ADD CONSTRAINT center_messages_conversation_id_foreign FOREIGN KEY (conversation_id) REFERENCES public.center_conversations(id) ON DELETE CASCADE;


--
-- Name: center_messages center_messages_sender_user_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.center_messages
    ADD CONSTRAINT center_messages_sender_user_id_foreign FOREIGN KEY (sender_user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: companies companies_primary_admin_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.companies
    ADD CONSTRAINT companies_primary_admin_id_foreign FOREIGN KEY (primary_admin_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: subscriptions company_subscriptions_company_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT company_subscriptions_company_id_foreign FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: subscriptions company_subscriptions_plan_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT company_subscriptions_plan_id_foreign FOREIGN KEY (plan_id) REFERENCES public.plans(id);


--
-- Name: departments departments_company_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.departments
    ADD CONSTRAINT departments_company_id_foreign FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: diagnostic_categories diagnostic_categories_company_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.diagnostic_categories
    ADD CONSTRAINT diagnostic_categories_company_id_foreign FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: diagnostic_order_payments diagnostic_order_payments_company_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.diagnostic_order_payments
    ADD CONSTRAINT diagnostic_order_payments_company_id_foreign FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: diagnostic_order_payments diagnostic_order_payments_diagnostic_order_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.diagnostic_order_payments
    ADD CONSTRAINT diagnostic_order_payments_diagnostic_order_id_foreign FOREIGN KEY (diagnostic_order_id) REFERENCES public.diagnostic_orders(id) ON DELETE CASCADE;


--
-- Name: diagnostic_order_payments diagnostic_order_payments_recorded_by_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.diagnostic_order_payments
    ADD CONSTRAINT diagnostic_order_payments_recorded_by_foreign FOREIGN KEY (recorded_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: diagnostic_order_refunds diagnostic_order_refunds_company_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.diagnostic_order_refunds
    ADD CONSTRAINT diagnostic_order_refunds_company_id_foreign FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: diagnostic_order_refunds diagnostic_order_refunds_diagnostic_order_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.diagnostic_order_refunds
    ADD CONSTRAINT diagnostic_order_refunds_diagnostic_order_id_foreign FOREIGN KEY (diagnostic_order_id) REFERENCES public.diagnostic_orders(id) ON DELETE CASCADE;


--
-- Name: diagnostic_order_refunds diagnostic_order_refunds_diagnostic_order_payment_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.diagnostic_order_refunds
    ADD CONSTRAINT diagnostic_order_refunds_diagnostic_order_payment_id_foreign FOREIGN KEY (diagnostic_order_payment_id) REFERENCES public.diagnostic_order_payments(id) ON DELETE SET NULL;


--
-- Name: diagnostic_order_refunds diagnostic_order_refunds_patient_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.diagnostic_order_refunds
    ADD CONSTRAINT diagnostic_order_refunds_patient_id_foreign FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE CASCADE;


--
-- Name: diagnostic_order_refunds diagnostic_order_refunds_recorded_by_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.diagnostic_order_refunds
    ADD CONSTRAINT diagnostic_order_refunds_recorded_by_foreign FOREIGN KEY (recorded_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: diagnostic_orders diagnostic_orders_branch_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.diagnostic_orders
    ADD CONSTRAINT diagnostic_orders_branch_id_foreign FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE SET NULL;


--
-- Name: diagnostic_orders diagnostic_orders_company_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.diagnostic_orders
    ADD CONSTRAINT diagnostic_orders_company_id_foreign FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: diagnostic_orders diagnostic_orders_doctor_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.diagnostic_orders
    ADD CONSTRAINT diagnostic_orders_doctor_id_foreign FOREIGN KEY (doctor_id) REFERENCES public.doctors(id) ON DELETE SET NULL;


--
-- Name: diagnostic_orders diagnostic_orders_package_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.diagnostic_orders
    ADD CONSTRAINT diagnostic_orders_package_id_foreign FOREIGN KEY (package_id) REFERENCES public.diago_package(id) ON DELETE SET NULL;


--
-- Name: diagnostic_orders diagnostic_orders_patient_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.diagnostic_orders
    ADD CONSTRAINT diagnostic_orders_patient_id_foreign FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE CASCADE;


--
-- Name: diagnostic_orders diagnostic_orders_referral_partner_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.diagnostic_orders
    ADD CONSTRAINT diagnostic_orders_referral_partner_id_foreign FOREIGN KEY (referral_partner_id) REFERENCES public.referral_partners(id) ON DELETE SET NULL;


--
-- Name: diagnostic_orders diagnostic_orders_technician_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.diagnostic_orders
    ADD CONSTRAINT diagnostic_orders_technician_id_foreign FOREIGN KEY (technician_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: diagnostic_orders diagnostic_orders_test_type_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.diagnostic_orders
    ADD CONSTRAINT diagnostic_orders_test_type_id_foreign FOREIGN KEY (test_type_id) REFERENCES public.diagnostic_test_types(id);


--
-- Name: diagnostic_reports diagnostic_reports_approved_by_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.diagnostic_reports
    ADD CONSTRAINT diagnostic_reports_approved_by_foreign FOREIGN KEY (approved_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: diagnostic_reports diagnostic_reports_company_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.diagnostic_reports
    ADD CONSTRAINT diagnostic_reports_company_id_foreign FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: diagnostic_reports diagnostic_reports_order_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.diagnostic_reports
    ADD CONSTRAINT diagnostic_reports_order_id_foreign FOREIGN KEY (order_id) REFERENCES public.diagnostic_orders(id) ON DELETE CASCADE;


--
-- Name: diagnostic_reports diagnostic_reports_reported_by_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.diagnostic_reports
    ADD CONSTRAINT diagnostic_reports_reported_by_foreign FOREIGN KEY (reported_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: diagnostic_test_type_doctor diagnostic_test_type_doctor_diagnostic_test_type_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.diagnostic_test_type_doctor
    ADD CONSTRAINT diagnostic_test_type_doctor_diagnostic_test_type_id_foreign FOREIGN KEY (diagnostic_test_type_id) REFERENCES public.diagnostic_test_types(id) ON DELETE CASCADE;


--
-- Name: diagnostic_test_type_doctor diagnostic_test_type_doctor_doctor_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.diagnostic_test_type_doctor
    ADD CONSTRAINT diagnostic_test_type_doctor_doctor_id_foreign FOREIGN KEY (doctor_id) REFERENCES public.doctors(id) ON DELETE CASCADE;


--
-- Name: diagnostic_test_types diagnostic_test_types_category_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.diagnostic_test_types
    ADD CONSTRAINT diagnostic_test_types_category_id_foreign FOREIGN KEY (category_id) REFERENCES public.diagnostic_categories(id) ON DELETE SET NULL;


--
-- Name: diagnostic_test_types diagnostic_test_types_company_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.diagnostic_test_types
    ADD CONSTRAINT diagnostic_test_types_company_id_foreign FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: diago_package diago_package_company_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.diago_package
    ADD CONSTRAINT diago_package_company_id_foreign FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: doctor_availabilities doctor_availabilities_company_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.doctor_availabilities
    ADD CONSTRAINT doctor_availabilities_company_id_foreign FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: doctor_availabilities doctor_availabilities_doctor_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.doctor_availabilities
    ADD CONSTRAINT doctor_availabilities_doctor_id_foreign FOREIGN KEY (doctor_id) REFERENCES public.doctors(id) ON DELETE CASCADE;


--
-- Name: doctors doctors_branch_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.doctors
    ADD CONSTRAINT doctors_branch_id_foreign FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE SET NULL;


--
-- Name: doctors doctors_company_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.doctors
    ADD CONSTRAINT doctors_company_id_foreign FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: doctors doctors_department_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.doctors
    ADD CONSTRAINT doctors_department_id_foreign FOREIGN KEY (department_id) REFERENCES public.departments(id) ON DELETE SET NULL;


--
-- Name: doctors doctors_user_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.doctors
    ADD CONSTRAINT doctors_user_id_foreign FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: expenses expenses_branch_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_branch_id_foreign FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE SET NULL;


--
-- Name: expenses expenses_company_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_company_id_foreign FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: expenses expenses_recorded_by_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_recorded_by_foreign FOREIGN KEY (recorded_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: fcm_tokens fcm_tokens_user_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fcm_tokens
    ADD CONSTRAINT fcm_tokens_user_id_foreign FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: lab_order_items lab_order_items_order_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lab_order_items
    ADD CONSTRAINT lab_order_items_order_id_foreign FOREIGN KEY (order_id) REFERENCES public.lab_orders(id) ON DELETE CASCADE;


--
-- Name: lab_order_items lab_order_items_package_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lab_order_items
    ADD CONSTRAINT lab_order_items_package_id_foreign FOREIGN KEY (package_id) REFERENCES public.lab_test_packages(id) ON DELETE SET NULL;


--
-- Name: lab_order_items lab_order_items_test_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lab_order_items
    ADD CONSTRAINT lab_order_items_test_id_foreign FOREIGN KEY (test_id) REFERENCES public.lab_tests(id) ON DELETE SET NULL;


--
-- Name: lab_orders lab_orders_branch_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lab_orders
    ADD CONSTRAINT lab_orders_branch_id_foreign FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE SET NULL;


--
-- Name: lab_orders lab_orders_company_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lab_orders
    ADD CONSTRAINT lab_orders_company_id_foreign FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: lab_orders lab_orders_doctor_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lab_orders
    ADD CONSTRAINT lab_orders_doctor_id_foreign FOREIGN KEY (doctor_id) REFERENCES public.doctors(id) ON DELETE SET NULL;


--
-- Name: lab_orders lab_orders_patient_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lab_orders
    ADD CONSTRAINT lab_orders_patient_id_foreign FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE CASCADE;


--
-- Name: lab_package_tests lab_package_tests_package_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lab_package_tests
    ADD CONSTRAINT lab_package_tests_package_id_foreign FOREIGN KEY (package_id) REFERENCES public.lab_test_packages(id) ON DELETE CASCADE;


--
-- Name: lab_package_tests lab_package_tests_test_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lab_package_tests
    ADD CONSTRAINT lab_package_tests_test_id_foreign FOREIGN KEY (test_id) REFERENCES public.lab_tests(id) ON DELETE CASCADE;


--
-- Name: lab_results lab_results_entered_by_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lab_results
    ADD CONSTRAINT lab_results_entered_by_foreign FOREIGN KEY (entered_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: lab_results lab_results_order_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lab_results
    ADD CONSTRAINT lab_results_order_id_foreign FOREIGN KEY (order_id) REFERENCES public.lab_orders(id) ON DELETE CASCADE;


--
-- Name: lab_results lab_results_order_item_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lab_results
    ADD CONSTRAINT lab_results_order_item_id_foreign FOREIGN KEY (order_item_id) REFERENCES public.lab_order_items(id) ON DELETE CASCADE;


--
-- Name: lab_results lab_results_test_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lab_results
    ADD CONSTRAINT lab_results_test_id_foreign FOREIGN KEY (test_id) REFERENCES public.lab_tests(id) ON DELETE CASCADE;


--
-- Name: lab_results lab_results_verified_by_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lab_results
    ADD CONSTRAINT lab_results_verified_by_foreign FOREIGN KEY (verified_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: lab_samples lab_samples_collected_by_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lab_samples
    ADD CONSTRAINT lab_samples_collected_by_foreign FOREIGN KEY (collected_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: lab_samples lab_samples_company_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lab_samples
    ADD CONSTRAINT lab_samples_company_id_foreign FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: lab_samples lab_samples_order_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lab_samples
    ADD CONSTRAINT lab_samples_order_id_foreign FOREIGN KEY (order_id) REFERENCES public.lab_orders(id) ON DELETE CASCADE;


--
-- Name: lab_test_categories lab_test_categories_company_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lab_test_categories
    ADD CONSTRAINT lab_test_categories_company_id_foreign FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: lab_test_packages lab_test_packages_company_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lab_test_packages
    ADD CONSTRAINT lab_test_packages_company_id_foreign FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: lab_tests lab_tests_category_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lab_tests
    ADD CONSTRAINT lab_tests_category_id_foreign FOREIGN KEY (category_id) REFERENCES public.lab_test_categories(id) ON DELETE CASCADE;


--
-- Name: lab_tests lab_tests_company_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lab_tests
    ADD CONSTRAINT lab_tests_company_id_foreign FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: model_has_permissions model_has_permissions_permission_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.model_has_permissions
    ADD CONSTRAINT model_has_permissions_permission_id_foreign FOREIGN KEY (permission_id) REFERENCES public.permissions(id) ON DELETE CASCADE;


--
-- Name: model_has_roles model_has_roles_role_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.model_has_roles
    ADD CONSTRAINT model_has_roles_role_id_foreign FOREIGN KEY (role_id) REFERENCES public.roles(id) ON DELETE CASCADE;


--
-- Name: partner_centre_requests partner_centre_requests_company_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.partner_centre_requests
    ADD CONSTRAINT partner_centre_requests_company_id_foreign FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: partner_centre_requests partner_centre_requests_partner_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.partner_centre_requests
    ADD CONSTRAINT partner_centre_requests_partner_id_foreign FOREIGN KEY (partner_id) REFERENCES public.partners(id) ON DELETE CASCADE;


--
-- Name: partner_centre_requests partner_centre_requests_referral_partner_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.partner_centre_requests
    ADD CONSTRAINT partner_centre_requests_referral_partner_id_foreign FOREIGN KEY (referral_partner_id) REFERENCES public.referral_partners(id) ON DELETE SET NULL;


--
-- Name: partner_centre_requests partner_centre_requests_reviewed_by_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.partner_centre_requests
    ADD CONSTRAINT partner_centre_requests_reviewed_by_foreign FOREIGN KEY (reviewed_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: patient_wallet_transactions patient_wallet_transactions_company_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patient_wallet_transactions
    ADD CONSTRAINT patient_wallet_transactions_company_id_foreign FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: patient_wallet_transactions patient_wallet_transactions_patient_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patient_wallet_transactions
    ADD CONSTRAINT patient_wallet_transactions_patient_id_foreign FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE CASCADE;


--
-- Name: patient_wallet_transactions patient_wallet_transactions_recorded_by_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patient_wallet_transactions
    ADD CONSTRAINT patient_wallet_transactions_recorded_by_foreign FOREIGN KEY (recorded_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: patient_wallet_transactions patient_wallet_transactions_wallet_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patient_wallet_transactions
    ADD CONSTRAINT patient_wallet_transactions_wallet_id_foreign FOREIGN KEY (wallet_id) REFERENCES public.patient_wallets(id) ON DELETE CASCADE;


--
-- Name: patient_wallets patient_wallets_company_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patient_wallets
    ADD CONSTRAINT patient_wallets_company_id_foreign FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: patient_wallets patient_wallets_patient_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patient_wallets
    ADD CONSTRAINT patient_wallets_patient_id_foreign FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE CASCADE;


--
-- Name: patients patients_company_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patients
    ADD CONSTRAINT patients_company_id_foreign FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: plan_features plan_features_feature_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plan_features
    ADD CONSTRAINT plan_features_feature_id_foreign FOREIGN KEY (feature_id) REFERENCES public.features(id) ON DELETE CASCADE;


--
-- Name: plan_features plan_features_plan_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plan_features
    ADD CONSTRAINT plan_features_plan_id_foreign FOREIGN KEY (plan_id) REFERENCES public.plans(id) ON DELETE CASCADE;


--
-- Name: plan_limits plan_limits_plan_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plan_limits
    ADD CONSTRAINT plan_limits_plan_id_foreign FOREIGN KEY (plan_id) REFERENCES public.plans(id) ON DELETE CASCADE;


--
-- Name: referral_commission_payouts referral_commission_payouts_company_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.referral_commission_payouts
    ADD CONSTRAINT referral_commission_payouts_company_id_foreign FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: referral_commission_payouts referral_commission_payouts_recorded_by_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.referral_commission_payouts
    ADD CONSTRAINT referral_commission_payouts_recorded_by_foreign FOREIGN KEY (recorded_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: referral_commission_payouts referral_commission_payouts_referral_partner_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.referral_commission_payouts
    ADD CONSTRAINT referral_commission_payouts_referral_partner_id_foreign FOREIGN KEY (referral_partner_id) REFERENCES public.referral_partners(id) ON DELETE CASCADE;


--
-- Name: referral_partners referral_partners_company_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.referral_partners
    ADD CONSTRAINT referral_partners_company_id_foreign FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: referral_partners referral_partners_partner_account_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.referral_partners
    ADD CONSTRAINT referral_partners_partner_account_id_foreign FOREIGN KEY (partner_account_id) REFERENCES public.partners(id) ON DELETE SET NULL;


--
-- Name: reports reports_company_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reports
    ADD CONSTRAINT reports_company_id_foreign FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: role_has_permissions role_has_permissions_permission_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role_has_permissions
    ADD CONSTRAINT role_has_permissions_permission_id_foreign FOREIGN KEY (permission_id) REFERENCES public.permissions(id) ON DELETE CASCADE;


--
-- Name: role_has_permissions role_has_permissions_role_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role_has_permissions
    ADD CONSTRAINT role_has_permissions_role_id_foreign FOREIGN KEY (role_id) REFERENCES public.roles(id) ON DELETE CASCADE;


--
-- Name: roles roles_company_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_company_id_foreign FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE SET NULL;


--
-- Name: settings settings_company_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.settings
    ADD CONSTRAINT settings_company_id_foreign FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: subscription_payments subscription_payments_subscription_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscription_payments
    ADD CONSTRAINT subscription_payments_subscription_id_foreign FOREIGN KEY (subscription_id) REFERENCES public.subscriptions(id) ON DELETE CASCADE;


--
-- Name: users users_branch_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_branch_id_foreign FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE SET NULL;


--
-- Name: users users_company_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_company_id_foreign FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE SET NULL;


--
-- PostgreSQL database dump complete
--

--
-- PostgreSQL database dump
--

-- Dumped from database version 16.9
-- Dumped by pg_dump version 16.9

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Data for Name: migrations; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.migrations (id, migration, batch) FROM stdin;
1	0001_01_01_000000_create_users_table	1
2	0001_01_01_000001_create_cache_table	1
3	0001_01_01_000002_create_jobs_table	1
4	2026_05_24_064321_create_doctors_table	1
5	2026_05_24_064408_create_patients_table	1
6	2026_05_24_064858_add_extra_fields_to_users_table	1
7	2026_05_24_100001_create_appointments_table	1
8	2026_05_24_100002_create_billings_table	1
9	2026_05_24_100003_create_reports_table	1
10	2026_05_24_100004_create_settings_table	1
11	2026_05_24_110000_separate_patients_from_users	1
12	2026_05_24_120000_add_billing_fields_to_appointments_table	1
13	2026_05_24_130000_restructure_billings_table	1
14	2026_05_24_130001_remove_billing_fields_from_appointments	1
15	2026_05_24_140000_add_partial_status_to_billings_table	1
16	2026_05_24_150000_create_departments_table	1
17	2026_05_24_150001_add_department_id_to_doctors_table	1
18	2026_05_24_160000_create_appointment_vitals_table	1
19	2026_05_24_180000_create_companies_table	1
20	2026_05_25_000000_add_saas_company_tenancy	1
21	2026_05_25_174546_create_personal_access_tokens_table	1
22	2026_05_26_000000_create_doctor_availabilities_table	1
23	2026_05_26_000001_upgrade_doctor_availabilities_for_saas	1
24	2026_06_03_000001_expand_companies_add_branches_subscriptions	1
25	2026_06_03_000002_create_lab_module_tables	1
26	2026_06_03_000003_create_diagnostic_module_tables	1
27	2026_06_03_000004_add_branch_id_to_operational_tables	1
28	2026_06_17_000000_create_fcm_tokens_table	1
29	2026_06_17_020000_create_app_notifications_table	1
30	2026_06_18_000000_update_appointments_status_and_prescription	1
31	2026_06_18_100000_create_medicines_table	1
32	2026_06_18_110000_make_medicines_global_master	1
33	2026_06_19_000000_add_prescription_data_to_appointments	1
35	2026_06_22_144910_create_permission_tables	2
36	2026_06_22_145000_add_metadata_to_permission_tables	2
37	2026_06_22_170000_normalize_permission_guards_to_web	2
38	2026_06_22_180000_add_modules_to_companies_table	2
39	2026_06_22_190000_add_primary_admin_id_to_companies_table	2
40	2026_06_23_100000_add_company_id_to_roles_table	2
41	2026_06_23_120000_add_diagnostic_categories_table	2
42	2026_06_26_120000_create_diagnostic_test_type_doctor_table	2
43	2026_06_26_140000_add_queue_serial_to_diagnostic_orders	2
44	2026_06_27_100000_create_referral_module_tables	2
45	2026_06_27_230000_align_simple_referral_schema	2
46	2026_06_27_240000_create_referral_commission_payouts_table	2
47	2026_06_27_250000_rename_clinic_settings_to_organisation	2
48	2026_06_27_260000_create_finance_module_tables	2
49	2026_06_27_270000_add_branch_id_to_expenses	2
50	2026_06_27_280000_add_diagnostic_order_payments	2
51	2026_06_27_290000_create_patient_wallet_tables	2
52	2026_07_09_000000_create_diagnostic_package_tables	2
53	2026_07_09_100000_consolidate_diago_package_single_table	2
54	2026_07_09_110000_rename_package_code_to_package_name	2
55	2026_07_09_120000_create_subscription_model	2
56	2026_07_09_130000_add_discount_percent_to_plans	2
57	2026_07_09_140000_add_package_id_to_diagnostic_orders	2
58	2026_07_10_122122_drop_ai_keywords_table	2
59	2026_07_10_130000_create_theme_settings_table	2
60	2026_07_10_160000_add_tax_to_diagnostic_orders	2
61	2026_07_10_160100_add_tax_to_subscription_payments	2
62	2026_07_10_170000_create_subscription_tax_settings_table	2
63	2026_07_10_170100_add_tax_to_plans_table	2
64	2026_07_10_180000_remove_pharmacy_from_company_modules	2
65	2026_07_12_000000_create_audit_logs_table	2
66	2026_07_23_220000_create_platform_settings_table	2
67	2026_07_27_220000_make_patient_email_nullable	2
68	2026_07_27_221000_align_referral_partners_phone_status_code	2
69	2026_08_01_000000_add_user_code_to_users_table	2
70	2026_08_01_100000_add_doctor_type_to_doctors_table	2
71	2026_08_08_100000_add_extra_discount_to_diagnostic_orders	2
72	2026_08_09_200000_add_share_token_to_diagnostic_orders	2
73	2026_08_11_160000_make_patients_company_id_nullable_for_portal	2
74	2026_08_12_154600_add_original_password_to_patients_table	2
75	2026_08_17_230000_add_report_emailed_at_to_diagnostic_reports	2
76	2026_09_27_210000_create_center_chat_tables	3
77	2026_09_28_173000_add_image_fields_to_center_messages	4
78	2026_10_20_100000_soft_delete_center_conversations	5
79	2026_10_20_194500_add_availability_to_plans_table	5
80	2026_10_20_201600_widen_subscription_payment_status	5
81	2026_10_31_193000_create_password_reset_otps_table	5
82	2026_11_11_220000_create_partner_portal_tables	5
\.


--
-- Name: migrations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.migrations_id_seq', 82, true);


--
-- PostgreSQL database dump complete
--

