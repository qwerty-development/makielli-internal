

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


CREATE EXTENSION IF NOT EXISTS "pgsodium";






COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgjwt" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."product_condition" AS ENUM (
    'good',
    'damaged',
    'defective'
);


ALTER TYPE "public"."product_condition" OWNER TO "postgres";


CREATE TYPE "public"."return_status" AS ENUM (
    'pending',
    'approved',
    'rejected'
);


ALTER TYPE "public"."return_status" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."add_product_history"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- Only insert history for quantity changes
  IF NEW.quantity != OLD.quantity THEN
    INSERT INTO "ProductHistory" (
      product_id,
      variant_id,
      change_type,
      field_name,
      old_value,
      new_value,
      quantity_change,
      source_type,
      source_id,
      source_reference,
      notes
    ) VALUES (
      NEW.product_id,
      NEW.id,
      'inventory',
      'quantity',
      OLD.quantity::text,
      NEW.quantity::text,
      NEW.quantity - OLD.quantity,
      'trigger', -- Source type for trigger-based changes
      NULL,
      'Database trigger update',
      CASE 
        WHEN NEW.quantity = 0 THEN 'Quantity set to zero (variant preserved)'
        WHEN NEW.quantity < 0 THEN 'Negative quantity adjustment'
        WHEN NEW.quantity > OLD.quantity THEN 'Quantity increased'
        ELSE 'Quantity decreased'
      END
    );
  END IF;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."add_product_history"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."add_product_history_insert"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- Track initial inventory when a new variant is created
  INSERT INTO "ProductHistory" (
    product_id,
    variant_id,
    change_type,
    field_name,
    old_value,
    new_value,
    quantity_change,
    source_type,
    source_id,
    source_reference,
    notes
  ) VALUES (
    NEW.product_id,
    NEW.id,
    'inventory',
    'quantity',
    '0',
    NEW.quantity::text,
    NEW.quantity,
    'trigger',
    NULL,
    'Initial variant creation',
    CASE 
      WHEN NEW.quantity = 0 THEN 'New variant created with zero stock'
      WHEN NEW.quantity < 0 THEN 'New variant created with negative adjustment'
      ELSE 'New variant created with initial stock'
    END
  );
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."add_product_history_insert"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."calculate_client_balance"("client_id_param" integer) RETURNS numeric
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  calculated_balance NUMERIC := 0;
BEGIN
  SELECT COALESCE(SUM(amount), 0) INTO calculated_balance
  FROM client_financial_transactions
  WHERE client_id = client_id_param;
  
  RETURN calculated_balance;
END;
$$;


ALTER FUNCTION "public"."calculate_client_balance"("client_id_param" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_inventory_time_series"("start_date" timestamp with time zone, "end_date" timestamp with time zone, "time_interval" "text" DEFAULT 'day'::"text") RETURNS TABLE("date" "text", "sales" integer, "purchases" integer)
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  date_format text;
BEGIN
  -- Determine date format based on interval
  IF time_interval = 'day' THEN
    date_format := 'YYYY-MM-DD';
  ELSIF time_interval = 'week' THEN
    date_format := 'YYYY-"W"IW';
  ELSIF time_interval = 'month' THEN
    date_format := 'YYYY-MM';
  ELSE
    date_format := 'YYYY-MM-DD';
  END IF;

  RETURN QUERY
  WITH daily_amounts AS (
    SELECT
      to_char(created_at, date_format) as date_key,
      CASE 
        WHEN source_type = 'client_invoice' THEN ABS(quantity_change)
        ELSE 0
      END as sales_qty,
      CASE 
        WHEN source_type = 'supplier_invoice' THEN ABS(quantity_change)
        ELSE 0
      END as purchase_qty
    FROM "ProductHistory"
    WHERE created_at BETWEEN start_date AND end_date
  )
  SELECT
    date_key as date,
    SUM(sales_qty)::integer as sales,
    SUM(purchase_qty)::integer as purchases
  FROM daily_amounts
  GROUP BY date_key
  ORDER BY date_key;
END;
$$;


ALTER FUNCTION "public"."get_inventory_time_series"("start_date" timestamp with time zone, "end_date" timestamp with time zone, "time_interval" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_inventory_value_summary"() RETURNS "jsonb"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  result jsonb;
BEGIN
  WITH product_totals AS (
    SELECT
      p.id as product_id,
      p.name as product_name,
      p.price as unit_price,
      p.cost as unit_cost,
      SUM(pv.quantity) as total_quantity
    FROM
      "Products" p
      JOIN "ProductVariants" pv ON pv.product_id = p.id
    GROUP BY
      p.id, p.name, p.price, p.cost
  )
  SELECT
    jsonb_build_object(
      'total_value', COALESCE(SUM(pt.unit_price * pt.total_quantity), 0),
      'total_cost', COALESCE(SUM(pt.unit_cost * pt.total_quantity), 0),
      'total_items', COALESCE(SUM(pt.total_quantity), 0),
      'by_product', COALESCE(
        jsonb_agg(
          jsonb_build_object(
            'product_id', pt.product_id,
            'product_name', pt.product_name,
            'value', pt.unit_price * pt.total_quantity,
            'cost', pt.unit_cost * pt.total_quantity,
            'items', pt.total_quantity
          )
        ),
        '[]'::jsonb
      )
    )
  INTO result
  FROM product_totals pt;
  
  RETURN result;
END;
$$;


ALTER FUNCTION "public"."get_inventory_value_summary"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_low_stock_products"("threshold" integer DEFAULT 5) RETURNS TABLE("product_id" "uuid", "product_name" "text", "variant_id" "uuid", "size" "text", "color" "text", "quantity" integer)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    pv.product_id,
    p.name as product_name,
    pv.id as variant_id,
    pv.size,
    pv.color,
    pv.quantity
  FROM
    "ProductVariants" pv
    JOIN "Products" p ON p.id = pv.product_id
  WHERE
    pv.quantity <= threshold
  ORDER BY
    pv.quantity ASC;
END;
$$;


ALTER FUNCTION "public"."get_low_stock_products"("threshold" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_product_history_summary"("p_product_id" "uuid") RETURNS TABLE("total_sold" integer, "total_purchased" integer, "total_adjusted" integer, "unique_customers" bigint, "first_sale_date" timestamp with time zone, "last_sale_date" timestamp with time zone, "avg_sale_quantity" numeric)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(SUM(CASE WHEN ph.quantity_change < 0 THEN ABS(ph.quantity_change) ELSE 0 END)::integer, 0) as total_sold,
    COALESCE(SUM(CASE WHEN ph.quantity_change > 0 AND ph.source_type = 'supplier_invoice' THEN ph.quantity_change ELSE 0 END)::integer, 0) as total_purchased,
    COALESCE(SUM(CASE WHEN ph.source_type = 'adjustment' THEN ph.quantity_change ELSE 0 END)::integer, 0) as total_adjusted,
    COUNT(DISTINCT ci.client_id) as unique_customers,
    MIN(CASE WHEN ph.quantity_change < 0 THEN ph.created_at END) as first_sale_date,
    MAX(CASE WHEN ph.quantity_change < 0 THEN ph.created_at END) as last_sale_date,
    AVG(CASE WHEN ph.quantity_change < 0 THEN ABS(ph.quantity_change) END)::numeric(10,2) as avg_sale_quantity
  FROM "ProductHistory" ph
  LEFT JOIN "ClientInvoices" ci ON ph.source_type = 'client_invoice' AND ph.source_id::bigint = ci.id
  WHERE ph.product_id = p_product_id
    AND ph.change_type = 'inventory';
END;
$$;


ALTER FUNCTION "public"."get_product_history_summary"("p_product_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_product_sales"("start_date" timestamp with time zone, "end_date" timestamp with time zone) RETURNS TABLE("product_id" "uuid", "product_name" "text", "total_sold" bigint, "total_revenue" numeric, "variant_data" "jsonb")
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN QUERY
  WITH invoice_items AS (
    SELECT
      p.product_id,
      p.product_variant_id,
      p.quantity,
      i.created_at,
      pr.name as product_name,
      pr.price,
      pv.size,
      pv.color
    FROM
      "ClientInvoices" i,
      jsonb_to_recordset(i.products) AS p(product_id UUID, product_variant_id UUID, quantity INT)
    JOIN 
      "Products" pr ON pr.id = p.product_id
    JOIN 
      "ProductVariants" pv ON pv.id = p.product_variant_id
    WHERE
      i.created_at BETWEEN start_date AND end_date AND
      i.type = 'regular'
  )
  SELECT
    ii.product_id,
    MAX(ii.product_name) as product_name,
    SUM(ii.quantity) as total_sold,
    SUM(ii.quantity * ii.price) as total_revenue,
    jsonb_agg(
      jsonb_build_object(
        'id', ii.product_variant_id,
        'size', ii.size,
        'color', ii.color,
        'quantity_sold', SUM(ii.quantity)
      )
    ) as variant_data
  FROM
    invoice_items ii
  GROUP BY
    ii.product_id;
END;
$$;


ALTER FUNCTION "public"."get_product_sales"("start_date" timestamp with time zone, "end_date" timestamp with time zone) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_sales_kpis"("current_start" timestamp with time zone, "current_end" timestamp with time zone, "prev_start" timestamp with time zone, "prev_end" timestamp with time zone) RETURNS "jsonb"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  current_period jsonb;
  prev_period jsonb;
  result jsonb;
BEGIN
  -- Calculate current period metrics
  SELECT
    jsonb_build_object(
      'total_sales', COALESCE(SUM(total_price), 0),
      'invoice_count', COUNT(*),
      'avg_order_value', CASE WHEN COUNT(*) > 0 THEN COALESCE(SUM(total_price) / COUNT(*), 0) ELSE 0 END
    )
  INTO current_period
  FROM "ClientInvoices"
  WHERE created_at BETWEEN current_start AND current_end
    AND type = 'regular';

  -- Calculate previous period metrics
  SELECT
    jsonb_build_object(
      'total_sales', COALESCE(SUM(total_price), 0),
      'invoice_count', COUNT(*),
      'avg_order_value', CASE WHEN COUNT(*) > 0 THEN COALESCE(SUM(total_price) / COUNT(*), 0) ELSE 0 END
    )
  INTO prev_period
  FROM "ClientInvoices"
  WHERE created_at BETWEEN prev_start AND prev_end
    AND type = 'regular';

  -- Calculate period-over-period changes
  SELECT
    jsonb_build_object(
      'current_period', current_period,
      'prev_period', prev_period,
      'changes', jsonb_build_object(
        'total_sales_change', CASE 
          WHEN (prev_period->>'total_sales')::numeric > 0 
          THEN ((current_period->>'total_sales')::numeric - (prev_period->>'total_sales')::numeric) / (prev_period->>'total_sales')::numeric * 100
          ELSE 0
        END,
        'invoice_count_change', CASE 
          WHEN (prev_period->>'invoice_count')::numeric > 0 
          THEN ((current_period->>'invoice_count')::numeric - (prev_period->>'invoice_count')::numeric) / (prev_period->>'invoice_count')::numeric * 100
          ELSE 0
        END,
        'avg_order_value_change', CASE 
          WHEN (prev_period->>'avg_order_value')::numeric > 0 
          THEN ((current_period->>'avg_order_value')::numeric - (prev_period->>'avg_order_value')::numeric) / (prev_period->>'avg_order_value')::numeric * 100
          ELSE 0
        END
      )
    )
  INTO result;
  
  RETURN result;
END;
$$;


ALTER FUNCTION "public"."get_sales_kpis"("current_start" timestamp with time zone, "current_end" timestamp with time zone, "prev_start" timestamp with time zone, "prev_end" timestamp with time zone) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_top_selling_products"("start_date" timestamp with time zone, "end_date" timestamp with time zone, "items_limit" integer DEFAULT 10) RETURNS TABLE("product_id" "uuid", "product_name" "text", "quantity_sold" integer, "revenue" numeric, "product_photo" "text", "popular_variant_size" "text", "popular_variant_color" "text")
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN QUERY
  WITH product_sales AS (
    SELECT 
      p.id as product_id,
      p.name as product_name,
      p.photo as product_photo,
      p.price as price,
      inv.products as products
    FROM 
      "ClientInvoices" inv
      CROSS JOIN LATERAL jsonb_array_elements(inv.products) as prod
      JOIN "Products" p ON p.id = (prod->>'product_id')::uuid
    WHERE 
      inv.created_at BETWEEN start_date AND end_date
      AND inv.type = 'regular'
  ),
  product_quantities AS (
    SELECT 
      ps.product_id,
      ps.product_name,
      ps.product_photo,
      ps.price,
      SUM((prod->>'quantity')::integer) as total_quantity,
      jsonb_agg(jsonb_build_object(
        'product_variant_id', (prod->>'product_variant_id'),
        'quantity', (prod->>'quantity')::integer
      )) as variant_quantities
    FROM 
      product_sales ps
      CROSS JOIN LATERAL jsonb_array_elements(ps.products) as prod
    WHERE 
      (prod->>'product_id')::uuid = ps.product_id
    GROUP BY 
      ps.product_id, ps.product_name, ps.product_photo, ps.price
  ),
  variant_rankings AS (
    SELECT 
      pq.product_id,
      pq.product_name,
      pq.product_photo,
      pq.price * pq.total_quantity as revenue,
      pq.total_quantity as quantity_sold,
      (
        SELECT jsonb_build_object(
          'size', pv.size,
          'color', pv.color
        )
        FROM (
          SELECT 
            (vq->>'product_variant_id')::uuid as variant_id,
            SUM((vq->>'quantity')::integer) as qty
          FROM 
            jsonb_array_elements(pq.variant_quantities) as vq
          GROUP BY 
            variant_id
          ORDER BY 
            qty DESC
          LIMIT 1
        ) top_variant
        JOIN "ProductVariants" pv ON pv.id = top_variant.variant_id
      ) as popular_variant
    FROM 
      product_quantities pq
  )
  SELECT 
    vr.product_id,
    vr.product_name,
    vr.quantity_sold,
    vr.revenue,
    vr.product_photo,
    (vr.popular_variant->>'size')::text as popular_variant_size,
    (vr.popular_variant->>'color')::text as popular_variant_color
  FROM 
    variant_rankings vr
  ORDER BY 
    vr.quantity_sold DESC
  LIMIT items_limit;
END;
$$;


ALTER FUNCTION "public"."get_top_selling_products"("start_date" timestamp with time zone, "end_date" timestamp with time zone, "items_limit" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_variant_sales_details"("p_product_id" "uuid") RETURNS TABLE("variant_id" "uuid", "size" character varying, "color" character varying, "total_sold" integer, "current_stock" integer, "unique_customers" bigint)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pv.id as variant_id,
    pv.size,
    pv.color,
    COALESCE(SUM(CASE WHEN ph.quantity_change < 0 THEN ABS(ph.quantity_change) ELSE 0 END)::integer, 0) as total_sold,
    pv.quantity as current_stock,
    COUNT(DISTINCT ci.client_id) as unique_customers
  FROM "ProductVariants" pv
  LEFT JOIN "ProductHistory" ph ON ph.variant_id = pv.id AND ph.change_type = 'inventory'
  LEFT JOIN "ClientInvoices" ci ON ph.source_type = 'client_invoice' AND ph.source_id::bigint = ci.id
  WHERE pv.product_id = p_product_id
  GROUP BY pv.id, pv.size, pv.color, pv.quantity
  ORDER BY pv.size, pv.color;
END;
$$;


ALTER FUNCTION "public"."get_variant_sales_details"("p_product_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_entity_balance"("entity_table" "text", "entity_id" "uuid", "balance_change" numeric) RETURNS "void"
    LANGUAGE "plpgsql"
    AS $_$
BEGIN
  EXECUTE format('
    UPDATE %I
    SET balance = balance + $1
    WHERE id = $2
  ', entity_table)
  USING balance_change, entity_id;
END;
$_$;


ALTER FUNCTION "public"."update_entity_balance"("entity_table" "text", "entity_id" "uuid", "balance_change" numeric) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_product_variant_quantity"("variant_id" "uuid", "quantity_change" integer) RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  UPDATE "ProductVariants"
  SET quantity = quantity + quantity_change
  WHERE id = variant_id;
END;
$$;


ALTER FUNCTION "public"."update_product_variant_quantity"("variant_id" "uuid", "quantity_change" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."validate_balance_consistency"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  calculated_balance NUMERIC;
  stored_balance NUMERIC;
BEGIN
  -- Calculate balance from transactions
  calculated_balance := calculate_client_balance(NEW.client_id);
  
  -- Get stored balance
  SELECT balance INTO stored_balance 
  FROM "Clients" 
  WHERE client_id = NEW.client_id;
  
  -- Log discrepancy if found (you might want to raise an exception instead)
  IF ABS(calculated_balance - stored_balance) > 0.01 THEN
    INSERT INTO balance_discrepancy_log (client_id, calculated_balance, stored_balance, discrepancy, logged_at)
    VALUES (NEW.client_id, calculated_balance, stored_balance, ABS(calculated_balance - stored_balance), NOW());
  END IF;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."validate_balance_consistency"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."ClientGroups" (
    "group_id" integer NOT NULL,
    "name" character varying(100) NOT NULL
);


ALTER TABLE "public"."ClientGroups" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ClientInvoices" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "total_price" numeric,
    "client_id" integer,
    "products" "json"[],
    "files" "text"[] DEFAULT '{}'::"text"[],
    "remaining_amount" numeric,
    "order_number" "text",
    "include_vat" boolean DEFAULT false,
    "vat_amount" numeric DEFAULT '0'::numeric,
    "discounts" "jsonb" DEFAULT '{}'::"jsonb",
    "type" "text" DEFAULT 'regular'::"text",
    "currency" "text" DEFAULT 'usd'::"text",
    "payment_term" "text",
    "delivery_date" timestamp with time zone,
    "payment_info" "text" DEFAULT 'frisson_llc'::"text" NOT NULL,
    "shipping_fee" numeric NOT NULL,
    "quotation_id" bigint,
    CONSTRAINT "ClientInvoices_currency_check" CHECK (("currency" = ANY (ARRAY['usd'::"text", 'euro'::"text"]))),
    CONSTRAINT "ClientInvoices_type_check" CHECK (("type" = ANY (ARRAY['regular'::"text", 'return'::"text"])))
);


ALTER TABLE "public"."ClientInvoices" OWNER TO "postgres";


ALTER TABLE "public"."ClientInvoices" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."ClientInvoices_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."ClientReceipts" (
    "id" bigint NOT NULL,
    "paid_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "invoice_id" bigint,
    "amount" numeric,
    "client_id" integer,
    "files" "text"[] DEFAULT '{}'::"text"[],
    "currency" "text" DEFAULT 'usd'::"text",
    CONSTRAINT "ClientReceipts_currency_check" CHECK (("currency" = ANY (ARRAY['usd'::"text", 'euro'::"text"])))
);


ALTER TABLE "public"."ClientReceipts" OWNER TO "postgres";


ALTER TABLE "public"."ClientReceipts" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."ClientReceipts_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."Clients" (
    "client_id" integer NOT NULL,
    "name" character varying(100) NOT NULL,
    "email" character varying(100),
    "phone" character varying(20),
    "address" "text",
    "group_id" integer,
    "balance" numeric(10,2) DEFAULT 0 NOT NULL,
    "tax_number" "text",
    "company_id" integer
);


ALTER TABLE "public"."Clients" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ProductHistory" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "product_id" "uuid" NOT NULL,
    "variant_id" "uuid",
    "change_type" "text" NOT NULL,
    "field_name" "text",
    "old_value" "text",
    "new_value" "text",
    "quantity_change" integer,
    "source_type" "text" NOT NULL,
    "source_id" "text",
    "source_reference" "text",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."ProductHistory" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ProductVariants" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "product_id" "uuid",
    "size" character varying(50),
    "color" character varying(50),
    "quantity" integer DEFAULT 0 NOT NULL
);


ALTER TABLE "public"."ProductVariants" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."Products" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name" character varying(255) NOT NULL,
    "photo" character varying(255),
    "price" integer NOT NULL,
    "cost" integer DEFAULT 0,
    "type" "text" DEFAULT 'Stock'::"text",
    "description" "text" DEFAULT ''::"text"
);


ALTER TABLE "public"."Products" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."Quotations" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "total_price" numeric,
    "note" "text" DEFAULT ''::"text",
    "client_id" integer,
    "products" "json"[],
    "status" "text",
    "include_vat" boolean DEFAULT false,
    "vat_amount" numeric DEFAULT '0'::numeric,
    "order_number" "text" DEFAULT '0'::"text",
    "discounts" "jsonb",
    "currency" "text",
    "payment_term" "text",
    "delivery_date" timestamp with time zone,
    "shipping_fee" integer DEFAULT 0 NOT NULL,
    "payment_info" "text" DEFAULT 'frisson_llc'::"text"
);


ALTER TABLE "public"."Quotations" OWNER TO "postgres";


COMMENT ON TABLE "public"."Quotations" IS 'This is a duplicate of ClientInvoices';



ALTER TABLE "public"."Quotations" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."Quotations_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."SupplierInvoices" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "total_price" numeric,
    "products" "json"[],
    "files" "text"[] DEFAULT '{}'::"text"[],
    "supplier_id" "uuid",
    "remaining_amount" numeric,
    "order_number" "text",
    "include_vat" boolean DEFAULT false,
    "vat_amount" numeric DEFAULT '0'::numeric,
    "discounts" "jsonb" DEFAULT '{}'::"jsonb",
    "currency" "text" DEFAULT 'usd'::"text",
    "payment_term" "text",
    "delivery_date" timestamp with time zone,
    "payment_info" "text" DEFAULT 'frisson_llc'::"text" NOT NULL,
    "shipping_fee" integer DEFAULT 0 NOT NULL,
    CONSTRAINT "SupplierInvoices_currency_check" CHECK (("currency" = ANY (ARRAY['usd'::"text", 'euro'::"text"])))
);


ALTER TABLE "public"."SupplierInvoices" OWNER TO "postgres";


COMMENT ON TABLE "public"."SupplierInvoices" IS 'This is a duplicate of ClientInvoices';



ALTER TABLE "public"."SupplierInvoices" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."SupplierInvoices_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."SupplierReceipts" (
    "id" bigint NOT NULL,
    "paid_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "invoice_id" bigint,
    "amount" integer DEFAULT 0,
    "supplier_id" "uuid",
    "files" "text"[] DEFAULT '{}'::"text"[],
    "currency" "text" DEFAULT 'usd'::"text",
    CONSTRAINT "SupplierReceipts_currency_check" CHECK (("currency" = ANY (ARRAY['usd'::"text", 'euro'::"text"])))
);


ALTER TABLE "public"."SupplierReceipts" OWNER TO "postgres";


ALTER TABLE "public"."SupplierReceipts" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."SupplierReceipts_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."Suppliers" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name" character varying(255) NOT NULL,
    "location" character varying(255),
    "phone" character varying(20),
    "balance" numeric NOT NULL,
    "email" "text" DEFAULT ''::"text",
    "company_id" integer
);


ALTER TABLE "public"."Suppliers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."balance_discrepancy_log" (
    "id" integer NOT NULL,
    "client_id" integer NOT NULL,
    "calculated_balance" numeric NOT NULL,
    "stored_balance" numeric NOT NULL,
    "discrepancy" numeric NOT NULL,
    "logged_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."balance_discrepancy_log" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."balance_discrepancy_log_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE "public"."balance_discrepancy_log_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."balance_discrepancy_log_id_seq" OWNED BY "public"."balance_discrepancy_log"."id";



CREATE OR REPLACE VIEW "public"."client_balance_analysis" AS
 WITH "client_invoices" AS (
         SELECT "ClientInvoices"."client_id",
            "sum"(
                CASE
                    WHEN ("ClientInvoices"."type" = 'return'::"text") THEN (- "abs"("ClientInvoices"."total_price"))
                    ELSE "abs"("ClientInvoices"."total_price")
                END) AS "total_invoices"
           FROM "public"."ClientInvoices"
          WHERE ("ClientInvoices"."client_id" IS NOT NULL)
          GROUP BY "ClientInvoices"."client_id"
        ), "client_receipts" AS (
         SELECT "ClientReceipts"."client_id",
            "sum"("abs"("ClientReceipts"."amount")) AS "total_receipts"
           FROM "public"."ClientReceipts"
          WHERE ("ClientReceipts"."client_id" IS NOT NULL)
          GROUP BY "ClientReceipts"."client_id"
        ), "calculated_balances" AS (
         SELECT "c"."client_id",
            "c"."name",
            "c"."balance" AS "current_database_balance",
            (COALESCE("ci"."total_invoices", (0)::numeric) - COALESCE("cr"."total_receipts", (0)::numeric)) AS "calculated_balance",
            "abs"(("c"."balance" - (COALESCE("ci"."total_invoices", (0)::numeric) - COALESCE("cr"."total_receipts", (0)::numeric)))) AS "difference"
           FROM (("public"."Clients" "c"
             LEFT JOIN "client_invoices" "ci" ON (("c"."client_id" = "ci"."client_id")))
             LEFT JOIN "client_receipts" "cr" ON (("c"."client_id" = "cr"."client_id")))
        )
 SELECT "calculated_balances"."client_id",
    "calculated_balances"."name",
    "calculated_balances"."current_database_balance",
    "calculated_balances"."calculated_balance",
    "calculated_balances"."difference",
        CASE
            WHEN ("calculated_balances"."difference" > 0.01) THEN 'NEEDS UPDATE'::"text"
            ELSE 'OK'::"text"
        END AS "status"
   FROM "calculated_balances"
  ORDER BY "calculated_balances"."difference" DESC;


ALTER TABLE "public"."client_balance_analysis" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."clientgroups_group_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE "public"."clientgroups_group_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."clientgroups_group_id_seq" OWNED BY "public"."ClientGroups"."group_id";



CREATE SEQUENCE IF NOT EXISTS "public"."clients_client_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE "public"."clients_client_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."clients_client_id_seq" OWNED BY "public"."Clients"."client_id";



CREATE TABLE IF NOT EXISTS "public"."companies" (
    "id" integer NOT NULL,
    "name" character varying(255) NOT NULL,
    "identification_type" character varying(50),
    "identification_number" character varying(50),
    "bank_account_number" character varying(50),
    "bank_routing_number" character varying(50),
    "bank_name" character varying(255),
    "address" "text",
    "bank_address" "text"
);


ALTER TABLE "public"."companies" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."companies_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE "public"."companies_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."companies_id_seq" OWNED BY "public"."companies"."id";



CREATE OR REPLACE VIEW "public"."product_inventory_summary" AS
 SELECT "ph"."product_id",
    "ph"."variant_id",
    "pv"."size",
    "pv"."color",
    "p"."name" AS "product_name",
    "sum"(
        CASE
            WHEN ("ph"."quantity_change" > 0) THEN "ph"."quantity_change"
            ELSE 0
        END) AS "total_in",
    "sum"(
        CASE
            WHEN ("ph"."quantity_change" < 0) THEN "abs"("ph"."quantity_change")
            ELSE 0
        END) AS "total_out",
    "pv"."quantity" AS "current_quantity",
    "count"(*) AS "transaction_count",
    "max"("ph"."created_at") AS "last_updated"
   FROM (("public"."ProductHistory" "ph"
     JOIN "public"."Products" "p" ON (("ph"."product_id" = "p"."id")))
     LEFT JOIN "public"."ProductVariants" "pv" ON (("ph"."variant_id" = "pv"."id")))
  WHERE ("ph"."change_type" = 'inventory'::"text")
  GROUP BY "ph"."product_id", "ph"."variant_id", "pv"."size", "pv"."color", "p"."name", "pv"."quantity";


ALTER TABLE "public"."product_inventory_summary" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."product_sales_history" AS
 SELECT "ph"."id",
    "ph"."product_id",
    "ph"."variant_id",
    "ph"."quantity_change",
    "ph"."source_type",
    "ph"."source_id",
    "ph"."source_reference",
    "ph"."notes",
    "ph"."created_at",
    "p"."name" AS "product_name",
    "p"."photo" AS "product_photo",
    "p"."price" AS "product_price",
    "pv"."size",
    "pv"."color",
    "pv"."quantity" AS "current_stock",
    COALESCE("ci"."client_id", "q"."client_id") AS "client_id",
    COALESCE("ci"."order_number", "q"."order_number") AS "invoice_order_number",
    "ci"."type" AS "invoice_type",
    COALESCE("ci"."currency", "q"."currency") AS "currency",
    COALESCE("ci"."total_price", "q"."total_price") AS "invoice_total",
    "c"."name" AS "client_name",
    "c"."email" AS "client_email",
    "c"."phone" AS "client_phone",
        CASE
            WHEN ("ph"."source_type" = 'quotation'::"text") THEN ("ph"."source_id")::bigint
            WHEN ("ci"."quotation_id" IS NOT NULL) THEN "ci"."quotation_id"
            ELSE NULL::bigint
        END AS "quotation_id",
        CASE
            WHEN ("ph"."source_type" = 'quotation'::"text") THEN "q"."order_number"
            WHEN ("ci"."quotation_id" IS NOT NULL) THEN ( SELECT "Quotations"."order_number"
               FROM "public"."Quotations"
              WHERE ("Quotations"."id" = "ci"."quotation_id"))
            ELSE NULL::"text"
        END AS "quotation_order_number"
   FROM ((((("public"."ProductHistory" "ph"
     LEFT JOIN "public"."Products" "p" ON (("ph"."product_id" = "p"."id")))
     LEFT JOIN "public"."ProductVariants" "pv" ON (("ph"."variant_id" = "pv"."id")))
     LEFT JOIN "public"."ClientInvoices" "ci" ON ((("ph"."source_type" = 'client_invoice'::"text") AND (("ph"."source_id")::bigint = "ci"."id"))))
     LEFT JOIN "public"."Quotations" "q" ON ((("ph"."source_type" = 'quotation'::"text") AND (("ph"."source_id")::bigint = "q"."id"))))
     LEFT JOIN "public"."Clients" "c" ON ((COALESCE("ci"."client_id", "q"."client_id") = "c"."client_id")))
  WHERE ("ph"."change_type" = 'inventory'::"text")
  ORDER BY "ph"."created_at" DESC;


ALTER TABLE "public"."product_sales_history" OWNER TO "postgres";


ALTER TABLE ONLY "public"."ClientGroups" ALTER COLUMN "group_id" SET DEFAULT "nextval"('"public"."clientgroups_group_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."Clients" ALTER COLUMN "client_id" SET DEFAULT "nextval"('"public"."clients_client_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."balance_discrepancy_log" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."balance_discrepancy_log_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."companies" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."companies_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."ClientInvoices"
    ADD CONSTRAINT "ClientInvoices_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ClientInvoices"
    ADD CONSTRAINT "ClientInvoices_quotation_id_key" UNIQUE ("quotation_id");



ALTER TABLE ONLY "public"."ClientReceipts"
    ADD CONSTRAINT "ClientReceipts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."Quotations"
    ADD CONSTRAINT "Quotations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."SupplierInvoices"
    ADD CONSTRAINT "SupplierInvoices_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."SupplierReceipts"
    ADD CONSTRAINT "SupplierReceipts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."balance_discrepancy_log"
    ADD CONSTRAINT "balance_discrepancy_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ClientGroups"
    ADD CONSTRAINT "clientgroups_pkey" PRIMARY KEY ("group_id");



ALTER TABLE ONLY "public"."Clients"
    ADD CONSTRAINT "clients_pkey" PRIMARY KEY ("client_id");



ALTER TABLE ONLY "public"."companies"
    ADD CONSTRAINT "companies_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ProductHistory"
    ADD CONSTRAINT "producthistory_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."Products"
    ADD CONSTRAINT "products_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ProductVariants"
    ADD CONSTRAINT "productvariants_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ProductVariants"
    ADD CONSTRAINT "productvariants_product_id_size_color_key" UNIQUE ("product_id", "size", "color");



ALTER TABLE ONLY "public"."Suppliers"
    ADD CONSTRAINT "suppliers_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_client_invoices_client_id" ON "public"."ClientInvoices" USING "btree" ("client_id");



CREATE INDEX "idx_client_invoices_client_id_created_at" ON "public"."ClientInvoices" USING "btree" ("client_id", "created_at");



CREATE INDEX "idx_client_invoices_created_at" ON "public"."ClientInvoices" USING "btree" ("created_at");



CREATE INDEX "idx_client_invoices_remaining_amount" ON "public"."ClientInvoices" USING "btree" ("remaining_amount");



CREATE INDEX "idx_client_invoices_total_price" ON "public"."ClientInvoices" USING "btree" ("total_price");



CREATE INDEX "idx_client_receipts_amount" ON "public"."ClientReceipts" USING "btree" ("amount");



CREATE INDEX "idx_client_receipts_client_id" ON "public"."ClientReceipts" USING "btree" ("client_id");



CREATE INDEX "idx_client_receipts_client_id_paid_at" ON "public"."ClientReceipts" USING "btree" ("client_id", "paid_at");



CREATE INDEX "idx_client_receipts_invoice_id" ON "public"."ClientReceipts" USING "btree" ("invoice_id");



CREATE INDEX "idx_client_receipts_paid_at" ON "public"."ClientReceipts" USING "btree" ("paid_at");



CREATE INDEX "idx_clientinvoices_created_at" ON "public"."ClientInvoices" USING "btree" ("created_at");



CREATE INDEX "idx_clientinvoices_quotation_id" ON "public"."ClientInvoices" USING "btree" ("quotation_id");



CREATE INDEX "idx_clients_company_id" ON "public"."Clients" USING "btree" ("company_id");



CREATE INDEX "idx_clients_group_id" ON "public"."Clients" USING "btree" ("group_id");



CREATE INDEX "idx_clients_name" ON "public"."Clients" USING "btree" ("name");



CREATE INDEX "idx_clients_name_lower" ON "public"."Clients" USING "btree" ("lower"(("name")::"text"));



CREATE INDEX "idx_companies_name" ON "public"."companies" USING "btree" ("name");



CREATE INDEX "idx_product_history_change_type" ON "public"."ProductHistory" USING "btree" ("change_type");



CREATE INDEX "idx_product_history_created_at" ON "public"."ProductHistory" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_product_history_product_id" ON "public"."ProductHistory" USING "btree" ("product_id");



CREATE INDEX "idx_product_history_source_type" ON "public"."ProductHistory" USING "btree" ("source_type");



CREATE INDEX "idx_product_history_variant_id" ON "public"."ProductHistory" USING "btree" ("variant_id");



CREATE INDEX "idx_product_variants_product_id" ON "public"."ProductVariants" USING "btree" ("product_id");



CREATE INDEX "idx_product_variants_size_color" ON "public"."ProductVariants" USING "btree" ("size", "color");



CREATE INDEX "idx_products_name" ON "public"."Products" USING "btree" ("name");



CREATE INDEX "idx_products_name_lower" ON "public"."Products" USING "btree" ("lower"(("name")::"text"));



CREATE INDEX "idx_products_type" ON "public"."Products" USING "btree" ("type");



CREATE INDEX "idx_productvariants_quantity" ON "public"."ProductVariants" USING "btree" ("quantity");



CREATE INDEX "idx_quotations_client_id" ON "public"."Quotations" USING "btree" ("client_id");



CREATE INDEX "idx_quotations_created_at" ON "public"."Quotations" USING "btree" ("created_at");



CREATE INDEX "idx_quotations_pending" ON "public"."Quotations" USING "btree" ("client_id") WHERE ("status" = 'pending'::"text");



CREATE INDEX "idx_quotations_status" ON "public"."Quotations" USING "btree" ("status");



CREATE INDEX "idx_supplier_invoices_created_at" ON "public"."SupplierInvoices" USING "btree" ("created_at");



CREATE INDEX "idx_supplier_invoices_remaining_amount" ON "public"."SupplierInvoices" USING "btree" ("remaining_amount");



CREATE INDEX "idx_supplier_invoices_supplier_id" ON "public"."SupplierInvoices" USING "btree" ("supplier_id");



CREATE INDEX "idx_supplier_invoices_supplier_id_created_at" ON "public"."SupplierInvoices" USING "btree" ("supplier_id", "created_at");



CREATE INDEX "idx_supplier_invoices_total_price" ON "public"."SupplierInvoices" USING "btree" ("total_price");



CREATE INDEX "idx_supplier_receipts_amount" ON "public"."SupplierReceipts" USING "btree" ("amount");



CREATE INDEX "idx_supplier_receipts_invoice_id" ON "public"."SupplierReceipts" USING "btree" ("invoice_id");



CREATE INDEX "idx_supplier_receipts_paid_at" ON "public"."SupplierReceipts" USING "btree" ("paid_at");



CREATE INDEX "idx_supplier_receipts_supplier_id" ON "public"."SupplierReceipts" USING "btree" ("supplier_id");



CREATE INDEX "idx_supplier_receipts_supplier_id_paid_at" ON "public"."SupplierReceipts" USING "btree" ("supplier_id", "paid_at");



CREATE INDEX "idx_suppliers_company_id" ON "public"."Suppliers" USING "btree" ("company_id");



CREATE INDEX "idx_suppliers_name" ON "public"."Suppliers" USING "btree" ("name");



CREATE OR REPLACE TRIGGER "product_variant_history_insert_trigger" AFTER INSERT ON "public"."ProductVariants" FOR EACH ROW EXECUTE FUNCTION "public"."add_product_history_insert"();



CREATE OR REPLACE TRIGGER "product_variant_history_trigger" AFTER UPDATE ON "public"."ProductVariants" FOR EACH ROW EXECUTE FUNCTION "public"."add_product_history"();



CREATE OR REPLACE TRIGGER "product_variant_quantity_change" AFTER UPDATE OF "quantity" ON "public"."ProductVariants" FOR EACH ROW WHEN (("old"."quantity" IS DISTINCT FROM "new"."quantity")) EXECUTE FUNCTION "public"."add_product_history"();



ALTER TABLE ONLY "public"."ClientInvoices"
    ADD CONSTRAINT "ClientInvoices_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."Clients"("client_id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ClientInvoices"
    ADD CONSTRAINT "ClientInvoices_quotation_id_fkey" FOREIGN KEY ("quotation_id") REFERENCES "public"."Quotations"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."ClientReceipts"
    ADD CONSTRAINT "ClientReceipts_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."Clients"("client_id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ClientReceipts"
    ADD CONSTRAINT "ClientReceipts_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "public"."ClientInvoices"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."Clients"
    ADD CONSTRAINT "Clients_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id");



ALTER TABLE ONLY "public"."Clients"
    ADD CONSTRAINT "Clients_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "public"."ClientGroups"("group_id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ProductVariants"
    ADD CONSTRAINT "ProductVariants_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."Products"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."Quotations"
    ADD CONSTRAINT "Quotations_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."Clients"("client_id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."SupplierInvoices"
    ADD CONSTRAINT "SupplierInvoices_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "public"."Suppliers"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."SupplierReceipts"
    ADD CONSTRAINT "SupplierReceipts_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "public"."SupplierInvoices"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."SupplierReceipts"
    ADD CONSTRAINT "SupplierReceipts_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "public"."Suppliers"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."Suppliers"
    ADD CONSTRAINT "Suppliers_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ProductHistory"
    ADD CONSTRAINT "producthistory_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."Products"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ProductHistory"
    ADD CONSTRAINT "producthistory_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "public"."ProductVariants"("id") ON DELETE SET NULL;





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";




















































































































































































GRANT ALL ON FUNCTION "public"."add_product_history"() TO "anon";
GRANT ALL ON FUNCTION "public"."add_product_history"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."add_product_history"() TO "service_role";



GRANT ALL ON FUNCTION "public"."add_product_history_insert"() TO "anon";
GRANT ALL ON FUNCTION "public"."add_product_history_insert"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."add_product_history_insert"() TO "service_role";



GRANT ALL ON FUNCTION "public"."calculate_client_balance"("client_id_param" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_client_balance"("client_id_param" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_client_balance"("client_id_param" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_inventory_time_series"("start_date" timestamp with time zone, "end_date" timestamp with time zone, "time_interval" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_inventory_time_series"("start_date" timestamp with time zone, "end_date" timestamp with time zone, "time_interval" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_inventory_time_series"("start_date" timestamp with time zone, "end_date" timestamp with time zone, "time_interval" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_inventory_value_summary"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_inventory_value_summary"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_inventory_value_summary"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_low_stock_products"("threshold" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_low_stock_products"("threshold" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_low_stock_products"("threshold" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_product_history_summary"("p_product_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_product_history_summary"("p_product_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_product_history_summary"("p_product_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_product_sales"("start_date" timestamp with time zone, "end_date" timestamp with time zone) TO "anon";
GRANT ALL ON FUNCTION "public"."get_product_sales"("start_date" timestamp with time zone, "end_date" timestamp with time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_product_sales"("start_date" timestamp with time zone, "end_date" timestamp with time zone) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_sales_kpis"("current_start" timestamp with time zone, "current_end" timestamp with time zone, "prev_start" timestamp with time zone, "prev_end" timestamp with time zone) TO "anon";
GRANT ALL ON FUNCTION "public"."get_sales_kpis"("current_start" timestamp with time zone, "current_end" timestamp with time zone, "prev_start" timestamp with time zone, "prev_end" timestamp with time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_sales_kpis"("current_start" timestamp with time zone, "current_end" timestamp with time zone, "prev_start" timestamp with time zone, "prev_end" timestamp with time zone) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_top_selling_products"("start_date" timestamp with time zone, "end_date" timestamp with time zone, "items_limit" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_top_selling_products"("start_date" timestamp with time zone, "end_date" timestamp with time zone, "items_limit" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_top_selling_products"("start_date" timestamp with time zone, "end_date" timestamp with time zone, "items_limit" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_variant_sales_details"("p_product_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_variant_sales_details"("p_product_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_variant_sales_details"("p_product_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_entity_balance"("entity_table" "text", "entity_id" "uuid", "balance_change" numeric) TO "anon";
GRANT ALL ON FUNCTION "public"."update_entity_balance"("entity_table" "text", "entity_id" "uuid", "balance_change" numeric) TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_entity_balance"("entity_table" "text", "entity_id" "uuid", "balance_change" numeric) TO "service_role";



GRANT ALL ON FUNCTION "public"."update_product_variant_quantity"("variant_id" "uuid", "quantity_change" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."update_product_variant_quantity"("variant_id" "uuid", "quantity_change" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_product_variant_quantity"("variant_id" "uuid", "quantity_change" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";



GRANT ALL ON FUNCTION "public"."validate_balance_consistency"() TO "anon";
GRANT ALL ON FUNCTION "public"."validate_balance_consistency"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_balance_consistency"() TO "service_role";


















GRANT ALL ON TABLE "public"."ClientGroups" TO "anon";
GRANT ALL ON TABLE "public"."ClientGroups" TO "authenticated";
GRANT ALL ON TABLE "public"."ClientGroups" TO "service_role";



GRANT ALL ON TABLE "public"."ClientInvoices" TO "anon";
GRANT ALL ON TABLE "public"."ClientInvoices" TO "authenticated";
GRANT ALL ON TABLE "public"."ClientInvoices" TO "service_role";



GRANT ALL ON SEQUENCE "public"."ClientInvoices_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."ClientInvoices_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."ClientInvoices_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."ClientReceipts" TO "anon";
GRANT ALL ON TABLE "public"."ClientReceipts" TO "authenticated";
GRANT ALL ON TABLE "public"."ClientReceipts" TO "service_role";



GRANT ALL ON SEQUENCE "public"."ClientReceipts_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."ClientReceipts_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."ClientReceipts_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."Clients" TO "anon";
GRANT ALL ON TABLE "public"."Clients" TO "authenticated";
GRANT ALL ON TABLE "public"."Clients" TO "service_role";



GRANT ALL ON TABLE "public"."ProductHistory" TO "anon";
GRANT ALL ON TABLE "public"."ProductHistory" TO "authenticated";
GRANT ALL ON TABLE "public"."ProductHistory" TO "service_role";



GRANT ALL ON TABLE "public"."ProductVariants" TO "anon";
GRANT ALL ON TABLE "public"."ProductVariants" TO "authenticated";
GRANT ALL ON TABLE "public"."ProductVariants" TO "service_role";



GRANT ALL ON TABLE "public"."Products" TO "anon";
GRANT ALL ON TABLE "public"."Products" TO "authenticated";
GRANT ALL ON TABLE "public"."Products" TO "service_role";



GRANT ALL ON TABLE "public"."Quotations" TO "anon";
GRANT ALL ON TABLE "public"."Quotations" TO "authenticated";
GRANT ALL ON TABLE "public"."Quotations" TO "service_role";



GRANT ALL ON SEQUENCE "public"."Quotations_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."Quotations_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."Quotations_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."SupplierInvoices" TO "anon";
GRANT ALL ON TABLE "public"."SupplierInvoices" TO "authenticated";
GRANT ALL ON TABLE "public"."SupplierInvoices" TO "service_role";



GRANT ALL ON SEQUENCE "public"."SupplierInvoices_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."SupplierInvoices_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."SupplierInvoices_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."SupplierReceipts" TO "anon";
GRANT ALL ON TABLE "public"."SupplierReceipts" TO "authenticated";
GRANT ALL ON TABLE "public"."SupplierReceipts" TO "service_role";



GRANT ALL ON SEQUENCE "public"."SupplierReceipts_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."SupplierReceipts_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."SupplierReceipts_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."Suppliers" TO "anon";
GRANT ALL ON TABLE "public"."Suppliers" TO "authenticated";
GRANT ALL ON TABLE "public"."Suppliers" TO "service_role";



GRANT ALL ON TABLE "public"."balance_discrepancy_log" TO "anon";
GRANT ALL ON TABLE "public"."balance_discrepancy_log" TO "authenticated";
GRANT ALL ON TABLE "public"."balance_discrepancy_log" TO "service_role";



GRANT ALL ON SEQUENCE "public"."balance_discrepancy_log_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."balance_discrepancy_log_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."balance_discrepancy_log_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."client_balance_analysis" TO "anon";
GRANT ALL ON TABLE "public"."client_balance_analysis" TO "authenticated";
GRANT ALL ON TABLE "public"."client_balance_analysis" TO "service_role";



GRANT ALL ON SEQUENCE "public"."clientgroups_group_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."clientgroups_group_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."clientgroups_group_id_seq" TO "service_role";



GRANT ALL ON SEQUENCE "public"."clients_client_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."clients_client_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."clients_client_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."companies" TO "anon";
GRANT ALL ON TABLE "public"."companies" TO "authenticated";
GRANT ALL ON TABLE "public"."companies" TO "service_role";



GRANT ALL ON SEQUENCE "public"."companies_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."companies_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."companies_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."product_inventory_summary" TO "anon";
GRANT ALL ON TABLE "public"."product_inventory_summary" TO "authenticated";
GRANT ALL ON TABLE "public"."product_inventory_summary" TO "service_role";



GRANT ALL ON TABLE "public"."product_sales_history" TO "anon";
GRANT ALL ON TABLE "public"."product_sales_history" TO "authenticated";
GRANT ALL ON TABLE "public"."product_sales_history" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "service_role";






























RESET ALL;
