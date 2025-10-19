-- Migration: Improve category structure
-- This migration:
-- 1. Adds subcategories to existing categories
-- 2. Adds new main categories (Pets, Family, Business)
-- 3. Reorganizes Bills & Utilities
-- 4. Fixes color scheme duplicates

-- ============================================================================
-- PART 1: Fix color scheme for existing categories
-- ============================================================================

-- Update colors to ensure uniqueness and better visual distinction
UPDATE categories SET color = '#E17055' WHERE id = '00000000-0000-0000-0000-000000000011'; -- Insurance
UPDATE categories SET color = '#95A5A6' WHERE id = '00000000-0000-0000-0000-000000000015'; -- Other Expenses

-- ============================================================================
-- PART 2: Add new main categories
-- ============================================================================

-- Pets category
INSERT INTO categories (id, name, category_type, icon, color, is_system) VALUES
  ('00000000-0000-0000-0000-000000000016', 'Pets', 'expense', '🐾', '#FF9FF3', true);

-- Family & Children category
INSERT INTO categories (id, name, category_type, icon, color, is_system) VALUES
  ('00000000-0000-0000-0000-000000000017', 'Family & Children', 'expense', '👨‍👩‍👧‍👦', '#FDCB6E', true);

-- Business Expenses category
INSERT INTO categories (id, name, category_type, icon, color, is_system) VALUES
  ('00000000-0000-0000-0000-000000000018', 'Business Expenses', 'expense', '💼', '#0984E3', true);

-- Utilities (split from Bills & Utilities)
INSERT INTO categories (id, name, category_type, icon, color, is_system) VALUES
  ('00000000-0000-0000-0000-000000000019', 'Utilities', 'expense', '💡', '#FFEAA7', true);

-- Communications (split from Bills & Utilities)
INSERT INTO categories (id, name, category_type, icon, color, is_system) VALUES
  ('00000000-0000-0000-0000-000000000020', 'Communications', 'expense', '📡', '#00B894', true);

-- ============================================================================
-- PART 3: Add new income categories
-- ============================================================================

INSERT INTO categories (id, name, category_type, icon, color, is_system) VALUES
  ('00000000-0000-0000-0000-000000000107', 'Freelance Income', 'income', '💻', '#00D2D3', true),
  ('00000000-0000-0000-0000-000000000108', 'Rental Income', 'income', '🏘️', '#55EFC4', true),
  ('00000000-0000-0000-0000-000000000109', 'Interest & Dividends', 'income', '💹', '#81ECEC', true),
  ('00000000-0000-0000-0000-000000000110', 'Bonuses & Commissions', 'income', '🎯', '#00B894', true);

-- ============================================================================
-- PART 4: Add subcategories for Shopping
-- ============================================================================

INSERT INTO categories (id, name, parent_id, category_type, icon, color, is_system) VALUES
  ('00000000-0000-0000-0000-000000000041', 'Online Shopping', '00000000-0000-0000-0000-000000000003', 'expense', '🛒', '#45B7D1', true),
  ('00000000-0000-0000-0000-000000000042', 'Clothing & Accessories', '00000000-0000-0000-0000-000000000003', 'expense', '👕', '#45B7D1', true),
  ('00000000-0000-0000-0000-000000000043', 'General Merchandise', '00000000-0000-0000-0000-000000000003', 'expense', '📦', '#45B7D1', true),
  ('00000000-0000-0000-0000-000000000044', 'Home & Garden', '00000000-0000-0000-0000-000000000003', 'expense', '🏡', '#45B7D1', true),
  ('00000000-0000-0000-0000-000000000045', 'Electronics', '00000000-0000-0000-0000-000000000003', 'expense', '💻', '#45B7D1', true);

-- ============================================================================
-- PART 5: Add subcategories for Entertainment
-- ============================================================================

INSERT INTO categories (id, name, parent_id, category_type, icon, color, is_system) VALUES
  ('00000000-0000-0000-0000-000000000061', 'Movies & Streaming', '00000000-0000-0000-0000-000000000004', 'expense', '🎬', '#96CEB4', true),
  ('00000000-0000-0000-0000-000000000062', 'Gaming', '00000000-0000-0000-0000-000000000004', 'expense', '🎮', '#96CEB4', true),
  ('00000000-0000-0000-0000-000000000063', 'Music & Concerts', '00000000-0000-0000-0000-000000000004', 'expense', '🎵', '#96CEB4', true),
  ('00000000-0000-0000-0000-000000000064', 'Sports & Recreation', '00000000-0000-0000-0000-000000000004', 'expense', '🏃', '#96CEB4', true),
  ('00000000-0000-0000-0000-000000000065', 'Books & Magazines', '00000000-0000-0000-0000-000000000004', 'expense', '📖', '#96CEB4', true);

-- ============================================================================
-- PART 6: Add subcategories for Healthcare
-- ============================================================================

INSERT INTO categories (id, name, parent_id, category_type, icon, color, is_system) VALUES
  ('00000000-0000-0000-0000-000000000071', 'Pharmacy & Medications', '00000000-0000-0000-0000-000000000006', 'expense', '💊', '#DFE6E9', true),
  ('00000000-0000-0000-0000-000000000072', 'Doctor Visits', '00000000-0000-0000-0000-000000000006', 'expense', '👨‍⚕️', '#DFE6E9', true),
  ('00000000-0000-0000-0000-000000000073', 'Dental', '00000000-0000-0000-0000-000000000006', 'expense', '🦷', '#DFE6E9', true),
  ('00000000-0000-0000-0000-000000000074', 'Vision', '00000000-0000-0000-0000-000000000006', 'expense', '👓', '#DFE6E9', true),
  ('00000000-0000-0000-0000-000000000075', 'Fitness & Wellness', '00000000-0000-0000-0000-000000000006', 'expense', '🧘', '#DFE6E9', true);

-- ============================================================================
-- PART 7: Add subcategories for Travel
-- ============================================================================

INSERT INTO categories (id, name, parent_id, category_type, icon, color, is_system) VALUES
  ('00000000-0000-0000-0000-000000000081', 'Flights', '00000000-0000-0000-0000-000000000007', 'expense', '✈️', '#74B9FF', true),
  ('00000000-0000-0000-0000-000000000082', 'Hotels & Lodging', '00000000-0000-0000-0000-000000000007', 'expense', '🏨', '#74B9FF', true),
  ('00000000-0000-0000-0000-000000000083', 'Car Rental', '00000000-0000-0000-0000-000000000007', 'expense', '🚗', '#74B9FF', true),
  ('00000000-0000-0000-0000-000000000084', 'Activities & Tours', '00000000-0000-0000-0000-000000000007', 'expense', '🎫', '#74B9FF', true);

-- ============================================================================
-- PART 8: Add subcategories for Housing
-- ============================================================================

INSERT INTO categories (id, name, parent_id, category_type, icon, color, is_system) VALUES
  ('00000000-0000-0000-0000-000000000091', 'Rent/Mortgage', '00000000-0000-0000-0000-000000000010', 'expense', '🏠', '#FAB1A0', true),
  ('00000000-0000-0000-0000-000000000092', 'Maintenance & Repairs', '00000000-0000-0000-0000-000000000010', 'expense', '🔧', '#FAB1A0', true),
  ('00000000-0000-0000-0000-000000000093', 'Furniture', '00000000-0000-0000-0000-000000000010', 'expense', '🪑', '#FAB1A0', true),
  ('00000000-0000-0000-0000-000000000094', 'Cleaning Supplies', '00000000-0000-0000-0000-000000000010', 'expense', '🧹', '#FAB1A0', true);

-- ============================================================================
-- PART 9: Add subcategories for Personal Care
-- ============================================================================

INSERT INTO categories (id, name, parent_id, category_type, icon, color, is_system) VALUES
  ('00000000-0000-0000-0000-000000000095', 'Hair & Salon', '00000000-0000-0000-0000-000000000009', 'expense', '💇', '#FD79A8', true),
  ('00000000-0000-0000-0000-000000000096', 'Toiletries & Cosmetics', '00000000-0000-0000-0000-000000000009', 'expense', '🧴', '#FD79A8', true),
  ('00000000-0000-0000-0000-000000000097', 'Gym Membership', '00000000-0000-0000-0000-000000000009', 'expense', '🏋️', '#FD79A8', true),
  ('00000000-0000-0000-0000-000000000098', 'Spa & Massage', '00000000-0000-0000-0000-000000000009', 'expense', '💆', '#FD79A8', true);

-- ============================================================================
-- PART 10: Add subcategories for Subscriptions
-- ============================================================================

INSERT INTO categories (id, name, parent_id, category_type, icon, color, is_system) VALUES
  ('00000000-0000-0000-0000-000000000099', 'Streaming Services', '00000000-0000-0000-0000-000000000012', 'expense', '📺', '#6C5CE7', true),
  ('00000000-0000-0000-0000-000000000100', 'News & Media', '00000000-0000-0000-0000-000000000012', 'expense', '📰', '#6C5CE7', true),
  ('00000000-0000-0000-0000-000000000111', 'Software & Cloud Services', '00000000-0000-0000-0000-000000000012', 'expense', '☁️', '#6C5CE7', true),
  ('00000000-0000-0000-0000-000000000112', 'Music Subscriptions', '00000000-0000-0000-0000-000000000012', 'expense', '🎵', '#6C5CE7', true);

-- ============================================================================
-- PART 11: Add subcategories for Pets
-- ============================================================================

INSERT INTO categories (id, name, parent_id, category_type, icon, color, is_system) VALUES
  ('00000000-0000-0000-0000-000000000113', 'Pet Food', '00000000-0000-0000-0000-000000000016', 'expense', '🥫', '#FF9FF3', true),
  ('00000000-0000-0000-0000-000000000114', 'Veterinary', '00000000-0000-0000-0000-000000000016', 'expense', '🏥', '#FF9FF3', true),
  ('00000000-0000-0000-0000-000000000115', 'Pet Supplies', '00000000-0000-0000-0000-000000000016', 'expense', '🧸', '#FF9FF3', true),
  ('00000000-0000-0000-0000-000000000116', 'Pet Boarding/Grooming', '00000000-0000-0000-0000-000000000016', 'expense', '🏨', '#FF9FF3', true);

-- ============================================================================
-- PART 12: Add subcategories for Family & Children
-- ============================================================================

INSERT INTO categories (id, name, parent_id, category_type, icon, color, is_system) VALUES
  ('00000000-0000-0000-0000-000000000117', 'Childcare', '00000000-0000-0000-0000-000000000017', 'expense', '🍼', '#FDCB6E', true),
  ('00000000-0000-0000-0000-000000000118', 'Baby Supplies', '00000000-0000-0000-0000-000000000017', 'expense', '👶', '#FDCB6E', true),
  ('00000000-0000-0000-0000-000000000119', 'School Expenses', '00000000-0000-0000-0000-000000000017', 'expense', '🎓', '#FDCB6E', true),
  ('00000000-0000-0000-0000-000000000120', 'Child Support/Alimony', '00000000-0000-0000-0000-000000000017', 'expense', '👨‍👩‍👧', '#FDCB6E', true);

-- ============================================================================
-- PART 13: Add subcategories for Business Expenses
-- ============================================================================

INSERT INTO categories (id, name, parent_id, category_type, icon, color, is_system) VALUES
  ('00000000-0000-0000-0000-000000000121', 'Office Supplies', '00000000-0000-0000-0000-000000000018', 'expense', '📄', '#0984E3', true),
  ('00000000-0000-0000-0000-000000000122', 'Client Meetings', '00000000-0000-0000-0000-000000000018', 'expense', '🤝', '#0984E3', true),
  ('00000000-0000-0000-0000-000000000123', 'Business Services', '00000000-0000-0000-0000-000000000018', 'expense', '📱', '#0984E3', true),
  ('00000000-0000-0000-0000-000000000124', 'Business Travel', '00000000-0000-0000-0000-000000000018', 'expense', '🚗', '#0984E3', true);

-- ============================================================================
-- PART 14: Reorganize Bills & Utilities
-- ============================================================================

-- Update the old "Bills & Utilities" to be deprecated (we'll keep it for backwards compatibility)
UPDATE categories
SET name = 'Bills & Utilities (Legacy)',
    color = '#F0F0F0'
WHERE id = '00000000-0000-0000-0000-000000000005';

-- Move existing subcategories to new parent categories
-- Move Electricity and Water to Utilities
UPDATE categories SET parent_id = '00000000-0000-0000-0000-000000000019'
WHERE id IN ('00000000-0000-0000-0000-000000000051', '00000000-0000-0000-0000-000000000052');

-- Move Internet and Phone to Communications
UPDATE categories SET parent_id = '00000000-0000-0000-0000-000000000020'
WHERE id IN ('00000000-0000-0000-0000-000000000053', '00000000-0000-0000-0000-000000000054');

-- Add new utility subcategories
INSERT INTO categories (id, name, parent_id, category_type, icon, color, is_system) VALUES
  ('00000000-0000-0000-0000-000000000125', 'Gas', '00000000-0000-0000-0000-000000000019', 'expense', '🔥', '#FFEAA7', true),
  ('00000000-0000-0000-0000-000000000126', 'Trash & Recycling', '00000000-0000-0000-0000-000000000019', 'expense', '🗑️', '#FFEAA7', true);

-- Add new communication subcategories
INSERT INTO categories (id, name, parent_id, category_type, icon, color, is_system) VALUES
  ('00000000-0000-0000-0000-000000000127', 'Cable & Satellite', '00000000-0000-0000-0000-000000000020', 'expense', '📡', '#00B894', true),
  ('00000000-0000-0000-0000-000000000128', 'Mobile Data', '00000000-0000-0000-0000-000000000020', 'expense', '📱', '#00B894', true);

-- Migration complete
