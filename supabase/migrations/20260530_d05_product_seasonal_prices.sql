CREATE TABLE IF NOT EXISTS product_seasonal_prices (
  id serial PRIMARY KEY,
  "branchId" integer NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  name text NOT NULL,
  "productIds" integer[] NOT NULL DEFAULT '{}',
  "productNames" text[] NOT NULL DEFAULT '{}',
  "primaryProductId" integer REFERENCES products(id) ON DELETE SET NULL,
  "primaryProductName" text,
  "originalPrice" numeric(12, 0) NOT NULL DEFAULT 0,
  "discountedPrice" numeric(12, 0) NOT NULL DEFAULT 0,
  "discountRate" numeric(5, 2) NOT NULL DEFAULT 0,
  "discountType" text NOT NULL DEFAULT 'fixed_price',
  "discountValue" numeric(12, 2) NOT NULL DEFAULT 0,
  "startDate" date NOT NULL,
  "endDate" date NOT NULL,
  "isActive" boolean NOT NULL DEFAULT true,
  "endedAt" timestamp without time zone,
  "createdBy" text,
  "createdAt" timestamp without time zone NOT NULL DEFAULT now(),
  "updatedAt" timestamp without time zone NOT NULL DEFAULT now(),
  CONSTRAINT product_seasonal_prices_date_check CHECK ("startDate" <= "endDate"),
  CONSTRAINT product_seasonal_prices_discount_type_check CHECK ("discountType" IN ('fixed_price', 'fixed_amount', 'percentage')),
  CONSTRAINT product_seasonal_prices_products_check CHECK (array_length("productIds", 1) IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_product_seasonal_prices_branch ON product_seasonal_prices("branchId");
CREATE INDEX IF NOT EXISTS idx_product_seasonal_prices_period ON product_seasonal_prices("branchId", "startDate", "endDate");
CREATE INDEX IF NOT EXISTS idx_product_seasonal_prices_active ON product_seasonal_prices("branchId", "isActive");

CREATE OR REPLACE FUNCTION set_product_seasonal_prices_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW."updatedAt" = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_product_seasonal_prices_updated_at ON product_seasonal_prices;
CREATE TRIGGER trg_product_seasonal_prices_updated_at
BEFORE UPDATE ON product_seasonal_prices
FOR EACH ROW
EXECUTE FUNCTION set_product_seasonal_prices_updated_at();

GRANT SELECT, INSERT, UPDATE, DELETE ON product_seasonal_prices TO anon, authenticated;
GRANT USAGE, SELECT ON SEQUENCE product_seasonal_prices_id_seq TO anon, authenticated;
