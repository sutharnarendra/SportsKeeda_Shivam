-- Add slug column
ALTER TABLE products ADD COLUMN IF NOT EXISTS slug VARCHAR(255);

-- Backfill slugs from product names
UPDATE products 
SET slug = LOWER(
  REGEXP_REPLACE(
    REGEXP_REPLACE(
      TRIM(name), 
      '[^a-zA-Z0-9\s-]', '', 'g'
    ), 
    '\s+', '-', 'g'
  )
)
WHERE slug IS NULL OR slug = '';

-- Handle any duplicate slugs by appending the id
UPDATE products p1
SET slug = p1.slug || '-' || p1.id
WHERE (
  SELECT COUNT(*) FROM products p2 WHERE p2.slug = p1.slug
) > 1;

-- Make slug required and unique
ALTER TABLE products ALTER COLUMN slug SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_products_slug ON products(slug);
