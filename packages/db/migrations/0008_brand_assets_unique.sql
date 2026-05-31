-- Add unique constraint on brand_assets.tenant_id (H3 from code audit 2026-05-31).
-- Without this, accidental duplicate rows cause findFirst() to return an arbitrary
-- row, silently serving the wrong brand data.

CREATE UNIQUE INDEX IF NOT EXISTS "brand_assets_tenant_id_uniq"
  ON "brand_assets" ("tenant_id");
