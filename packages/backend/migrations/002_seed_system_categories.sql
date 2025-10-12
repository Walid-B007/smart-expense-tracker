-- Insert system categories (available to all users)
-- Expense categories
INSERT INTO categories (id, name, category_type, icon, color, is_system) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Food & Dining', 'expense', '🍔', '#FF6B6B', true),
  ('00000000-0000-0000-0000-000000000002', 'Transportation', 'expense', '🚗', '#4ECDC4', true),
  ('00000000-0000-0000-0000-000000000003', 'Shopping', 'expense', '🛍️', '#45B7D1', true),
  ('00000000-0000-0000-0000-000000000004', 'Entertainment', 'expense', '🎬', '#96CEB4', true),
  ('00000000-0000-0000-0000-000000000005', 'Bills & Utilities', 'expense', '💡', '#FFEAA7', true),
  ('00000000-0000-0000-0000-000000000006', 'Healthcare', 'expense', '🏥', '#DFE6E9', true),
  ('00000000-0000-0000-0000-000000000007', 'Travel', 'expense', '✈️', '#74B9FF', true),
  ('00000000-0000-0000-0000-000000000008', 'Education', 'expense', '📚', '#A29BFE', true),
  ('00000000-0000-0000-0000-000000000009', 'Personal Care', 'expense', '💅', '#FD79A8', true),
  ('00000000-0000-0000-0000-000000000010', 'Housing', 'expense', '🏠', '#FAB1A0', true),
  ('00000000-0000-0000-0000-000000000011', 'Insurance', 'expense', '🛡️', '#B2BEC3', true),
  ('00000000-0000-0000-0000-000000000012', 'Subscriptions', 'expense', '📱', '#6C5CE7', true),
  ('00000000-0000-0000-0000-000000000013', 'Gifts & Donations', 'expense', '🎁', '#FF7675', true),
  ('00000000-0000-0000-0000-000000000014', 'Taxes', 'expense', '📄', '#636E72', true),
  ('00000000-0000-0000-0000-000000000015', 'Other Expenses', 'expense', '📊', '#B2BEC3', true);

-- Income categories
INSERT INTO categories (id, name, category_type, icon, color, is_system) VALUES
  ('00000000-0000-0000-0000-000000000101', 'Salary', 'income', '💰', '#00B894', true),
  ('00000000-0000-0000-0000-000000000102', 'Business Income', 'income', '💼', '#00CEC9', true),
  ('00000000-0000-0000-0000-000000000103', 'Investment Income', 'income', '📈', '#81ECEC', true),
  ('00000000-0000-0000-0000-000000000104', 'Refunds', 'income', '↩️', '#55EFC4', true),
  ('00000000-0000-0000-0000-000000000105', 'Gifts Received', 'income', '🎉', '#A8E6CF', true),
  ('00000000-0000-0000-0000-000000000106', 'Other Income', 'income', '💵', '#FFEAA7', true);

-- Transfer category
INSERT INTO categories (id, name, category_type, icon, color, is_system) VALUES
  ('00000000-0000-0000-0000-000000000201', 'Transfer', 'transfer', '🔄', '#74B9FF', true);

-- Subcategories for Food & Dining
INSERT INTO categories (id, name, parent_id, category_type, icon, color, is_system) VALUES
  ('00000000-0000-0000-0000-000000000021', 'Restaurants', '00000000-0000-0000-0000-000000000001', 'expense', '🍽️', '#FF6B6B', true),
  ('00000000-0000-0000-0000-000000000022', 'Groceries', '00000000-0000-0000-0000-000000000001', 'expense', '🛒', '#FF6B6B', true),
  ('00000000-0000-0000-0000-000000000023', 'Coffee & Tea', '00000000-0000-0000-0000-000000000001', 'expense', '☕', '#FF6B6B', true),
  ('00000000-0000-0000-0000-000000000024', 'Fast Food', '00000000-0000-0000-0000-000000000001', 'expense', '🍕', '#FF6B6B', true);

-- Subcategories for Transportation
INSERT INTO categories (id, name, parent_id, category_type, icon, color, is_system) VALUES
  ('00000000-0000-0000-0000-000000000031', 'Gas & Fuel', '00000000-0000-0000-0000-000000000002', 'expense', '⛽', '#4ECDC4', true),
  ('00000000-0000-0000-0000-000000000032', 'Public Transit', '00000000-0000-0000-0000-000000000002', 'expense', '🚇', '#4ECDC4', true),
  ('00000000-0000-0000-0000-000000000033', 'Parking', '00000000-0000-0000-0000-000000000002', 'expense', '🅿️', '#4ECDC4', true),
  ('00000000-0000-0000-0000-000000000034', 'Ride Share', '00000000-0000-0000-0000-000000000002', 'expense', '🚕', '#4ECDC4', true);

-- Subcategories for Bills & Utilities
INSERT INTO categories (id, name, parent_id, category_type, icon, color, is_system) VALUES
  ('00000000-0000-0000-0000-000000000051', 'Electricity', '00000000-0000-0000-0000-000000000005', 'expense', '⚡', '#FFEAA7', true),
  ('00000000-0000-0000-0000-000000000052', 'Water', '00000000-0000-0000-0000-000000000005', 'expense', '💧', '#FFEAA7', true),
  ('00000000-0000-0000-0000-000000000053', 'Internet', '00000000-0000-0000-0000-000000000005', 'expense', '🌐', '#FFEAA7', true),
  ('00000000-0000-0000-0000-000000000054', 'Phone', '00000000-0000-0000-0000-000000000005', 'expense', '📞', '#FFEAA7', true);
