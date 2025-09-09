-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.ClientGroups (
  name character varying NOT NULL,
  group_id integer NOT NULL DEFAULT nextval('clientgroups_group_id_seq'::regclass),
  CONSTRAINT ClientGroups_pkey PRIMARY KEY (group_id)
);
CREATE TABLE public.ClientInvoices (
  total_price numeric,
  client_id integer,
  products ARRAY,
  remaining_amount numeric,
  order_number text,
  payment_term text,
  delivery_date timestamp with time zone,
  shipping_fee numeric NOT NULL,
  quotation_id bigint UNIQUE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  files ARRAY DEFAULT '{}'::text[],
  include_vat boolean DEFAULT false,
  vat_amount numeric DEFAULT '0'::numeric,
  discounts jsonb DEFAULT '{}'::jsonb,
  type text DEFAULT 'regular'::text CHECK (type = ANY (ARRAY['regular'::text, 'return'::text])),
  currency text DEFAULT 'usd'::text CHECK (currency = ANY (ARRAY['usd'::text, 'euro'::text])),
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  payment_info text NOT NULL DEFAULT 'frisson_llc'::text,
  shipping_status text DEFAULT 'unshipped'::text CHECK (shipping_status = ANY (ARRAY['unshipped'::text, 'partially_shipped'::text, 'fully_shipped'::text])),
  CONSTRAINT ClientInvoices_pkey PRIMARY KEY (id),
  CONSTRAINT ClientInvoices_quotation_id_fkey FOREIGN KEY (quotation_id) REFERENCES public.Quotations(id),
  CONSTRAINT ClientInvoices_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.Clients(client_id)
);
CREATE TABLE public.ClientReceipts (
  invoice_id bigint,
  amount numeric,
  client_id integer,
  paid_at timestamp with time zone NOT NULL DEFAULT now(),
  files ARRAY DEFAULT '{}'::text[],
  currency text DEFAULT 'usd'::text CHECK (currency = ANY (ARRAY['usd'::text, 'euro'::text])),
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  CONSTRAINT ClientReceipts_pkey PRIMARY KEY (id),
  CONSTRAINT ClientReceipts_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES public.ClientInvoices(id),
  CONSTRAINT ClientReceipts_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.Clients(client_id)
);
CREATE TABLE public.ClientShippingInvoices (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  invoice_id bigint NOT NULL,
  client_id integer NOT NULL,
  shipping_number text NOT NULL UNIQUE,
  products jsonb NOT NULL,
  tracking_number text,
  carrier text,
  shipping_method text,
  shipping_address text,
  notes text,
  delivered_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  shipped_at timestamp with time zone NOT NULL DEFAULT now(),
  shipping_cost numeric DEFAULT 0,
  files ARRAY DEFAULT '{}'::text[],
  status text DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'shipped'::text, 'delivered'::text, 'cancelled'::text])),
  CONSTRAINT ClientShippingInvoices_pkey PRIMARY KEY (id),
  CONSTRAINT ClientShippingInvoices_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.Clients(client_id),
  CONSTRAINT ClientShippingInvoices_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES public.ClientInvoices(id)
);
CREATE TABLE public.Clients (
  name character varying NOT NULL,
  email character varying,
  phone character varying,
  address text,
  group_id integer,
  tax_number text,
  company_id integer,
  balance numeric NOT NULL DEFAULT 0,
  client_id integer NOT NULL DEFAULT nextval('clients_client_id_seq'::regclass),
  CONSTRAINT Clients_pkey PRIMARY KEY (client_id),
  CONSTRAINT Clients_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id),
  CONSTRAINT Clients_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.ClientGroups(group_id)
);
CREATE TABLE public.ProductHistory (
  product_id uuid NOT NULL,
  variant_id uuid,
  change_type text NOT NULL,
  field_name text,
  old_value text,
  new_value text,
  quantity_change integer,
  source_type text NOT NULL,
  source_id text,
  source_reference text,
  notes text,
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT ProductHistory_pkey PRIMARY KEY (id),
  CONSTRAINT producthistory_variant_id_fkey FOREIGN KEY (variant_id) REFERENCES public.ProductVariants(id),
  CONSTRAINT producthistory_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.Products(id)
);
CREATE TABLE public.ProductVariants (
  product_id uuid,
  size character varying,
  color character varying,
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  quantity integer NOT NULL DEFAULT 0,
  CONSTRAINT ProductVariants_pkey PRIMARY KEY (id),
  CONSTRAINT ProductVariants_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.Products(id)
);
CREATE TABLE public.Products (
  name character varying NOT NULL,
  photo character varying,
  price integer NOT NULL,
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  cost integer DEFAULT 0,
  type text DEFAULT 'Stock'::text,
  description text DEFAULT ''::text,
  CONSTRAINT Products_pkey PRIMARY KEY (id)
);
CREATE TABLE public.Quotations (
  total_price numeric,
  client_id integer,
  products ARRAY,
  status text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  note text DEFAULT ''::text,
  include_vat boolean DEFAULT false,
  vat_amount numeric DEFAULT '0'::numeric,
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  discounts jsonb,
  currency text,
  payment_term text,
  delivery_date timestamp with time zone,
  order_number text DEFAULT '0'::text,
  shipping_fee integer NOT NULL DEFAULT 0,
  payment_info text DEFAULT 'frisson_llc'::text,
  CONSTRAINT Quotations_pkey PRIMARY KEY (id),
  CONSTRAINT Quotations_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.Clients(client_id)
);
CREATE TABLE public.SupplierInvoices (
  total_price numeric,
  products ARRAY,
  supplier_id uuid,
  remaining_amount numeric,
  order_number text,
  payment_term text,
  delivery_date timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  files ARRAY DEFAULT '{}'::text[],
  include_vat boolean DEFAULT false,
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  vat_amount numeric DEFAULT '0'::numeric,
  discounts jsonb DEFAULT '{}'::jsonb,
  currency text DEFAULT 'usd'::text CHECK (currency = ANY (ARRAY['usd'::text, 'euro'::text])),
  payment_info text NOT NULL DEFAULT 'frisson_llc'::text,
  shipping_fee integer NOT NULL DEFAULT 0,
  shipping_status text DEFAULT 'unshipped'::text CHECK (shipping_status = ANY (ARRAY['unshipped'::text, 'partially_shipped'::text, 'fully_shipped'::text])),
  CONSTRAINT SupplierInvoices_pkey PRIMARY KEY (id),
  CONSTRAINT SupplierInvoices_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES public.Suppliers(id)
);
CREATE TABLE public.SupplierReceipts (
  invoice_id bigint,
  supplier_id uuid,
  paid_at timestamp with time zone NOT NULL DEFAULT now(),
  amount integer DEFAULT 0,
  files ARRAY DEFAULT '{}'::text[],
  currency text DEFAULT 'usd'::text CHECK (currency = ANY (ARRAY['usd'::text, 'euro'::text])),
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  CONSTRAINT SupplierReceipts_pkey PRIMARY KEY (id),
  CONSTRAINT SupplierReceipts_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES public.Suppliers(id),
  CONSTRAINT SupplierReceipts_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES public.SupplierInvoices(id)
);
CREATE TABLE public.SupplierShippingInvoices (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  invoice_id bigint NOT NULL,
  supplier_id uuid NOT NULL,
  shipping_number text NOT NULL UNIQUE,
  products jsonb NOT NULL,
  tracking_number text,
  carrier text,
  shipping_method text,
  shipping_address text,
  notes text,
  delivered_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  shipped_at timestamp with time zone NOT NULL DEFAULT now(),
  shipping_cost numeric DEFAULT 0,
  files ARRAY DEFAULT '{}'::text[],
  status text DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'shipped'::text, 'delivered'::text, 'cancelled'::text])),
  CONSTRAINT SupplierShippingInvoices_pkey PRIMARY KEY (id),
  CONSTRAINT SupplierShippingInvoices_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES public.Suppliers(id),
  CONSTRAINT SupplierShippingInvoices_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES public.SupplierInvoices(id)
);
CREATE TABLE public.Suppliers (
  name character varying NOT NULL,
  location character varying,
  phone character varying,
  balance numeric NOT NULL,
  company_id integer,
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  email text DEFAULT ''::text,
  CONSTRAINT Suppliers_pkey PRIMARY KEY (id),
  CONSTRAINT Suppliers_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id)
);
CREATE TABLE public.balance_discrepancy_log (
  client_id integer NOT NULL,
  calculated_balance numeric NOT NULL,
  stored_balance numeric NOT NULL,
  discrepancy numeric NOT NULL,
  logged_at timestamp with time zone DEFAULT now(),
  id integer NOT NULL DEFAULT nextval('balance_discrepancy_log_id_seq'::regclass),
  CONSTRAINT balance_discrepancy_log_pkey PRIMARY KEY (id)
);
CREATE TABLE public.companies (
  name character varying NOT NULL,
  identification_type character varying,
  identification_number character varying,
  bank_account_number character varying,
  bank_routing_number character varying,
  bank_name character varying,
  address text,
  bank_address text,
  id integer NOT NULL DEFAULT nextval('companies_id_seq'::regclass),
  CONSTRAINT companies_pkey PRIMARY KEY (id)
);