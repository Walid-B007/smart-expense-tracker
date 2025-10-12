-- Common merchant normalizations
INSERT INTO merchant_normalization (raw_merchant_name, normalized_name, category_id, merchant_category_code, confidence_score, source) VALUES
  -- Food & Dining
  ('MCDONALD''S', 'McDonald''s', '00000000-0000-0000-0000-000000000024', '5814', 0.95, 'system'),
  ('MCD ', 'McDonald''s', '00000000-0000-0000-0000-000000000024', '5814', 0.90, 'system'),
  ('STARBUCKS', 'Starbucks', '00000000-0000-0000-0000-000000000023', '5814', 0.95, 'system'),
  ('SBUX', 'Starbucks', '00000000-0000-0000-0000-000000000023', '5814', 0.90, 'system'),
  ('WHOLE FOODS', 'Whole Foods Market', '00000000-0000-0000-0000-000000000022', '5411', 0.95, 'system'),
  ('WFM ', 'Whole Foods Market', '00000000-0000-0000-0000-000000000022', '5411', 0.90, 'system'),
  ('WALMART', 'Walmart', '00000000-0000-0000-0000-000000000022', '5411', 0.95, 'system'),
  ('WAL-MART', 'Walmart', '00000000-0000-0000-0000-000000000022', '5411', 0.95, 'system'),
  ('TARGET', 'Target', '00000000-0000-0000-0000-000000000003', '5411', 0.95, 'system'),
  ('TGT ', 'Target', '00000000-0000-0000-0000-000000000003', '5411', 0.90, 'system'),

  -- Transportation
  ('SHELL', 'Shell', '00000000-0000-0000-0000-000000000031', '5541', 0.95, 'system'),
  ('CHEVRON', 'Chevron', '00000000-0000-0000-0000-000000000031', '5541', 0.95, 'system'),
  ('BP ', 'BP', '00000000-0000-0000-0000-000000000031', '5541', 0.95, 'system'),
  ('EXXON', 'ExxonMobil', '00000000-0000-0000-0000-000000000031', '5541', 0.95, 'system'),
  ('UBER', 'Uber', '00000000-0000-0000-0000-000000000034', '4121', 0.95, 'system'),
  ('LYFT', 'Lyft', '00000000-0000-0000-0000-000000000034', '4121', 0.95, 'system'),

  -- Subscriptions
  ('NETFLIX', 'Netflix', '00000000-0000-0000-0000-000000000012', '5968', 0.95, 'system'),
  ('SPOTIFY', 'Spotify', '00000000-0000-0000-0000-000000000012', '5735', 0.95, 'system'),
  ('AMAZON PRIME', 'Amazon Prime', '00000000-0000-0000-0000-000000000012', '5968', 0.95, 'system'),
  ('APPLE.COM/BILL', 'Apple', '00000000-0000-0000-0000-000000000012', '5732', 0.90, 'system'),

  -- Shopping
  ('AMAZON.COM', 'Amazon', '00000000-0000-0000-0000-000000000003', '5942', 0.95, 'system'),
  ('AMZN', 'Amazon', '00000000-0000-0000-0000-000000000003', '5942', 0.90, 'system'),
  ('BEST BUY', 'Best Buy', '00000000-0000-0000-0000-000000000003', '5732', 0.95, 'system'),

  -- Entertainment
  ('AMC THEATRES', 'AMC Theatres', '00000000-0000-0000-0000-000000000004', '7832', 0.95, 'system'),
  ('REGAL CINEMA', 'Regal Cinemas', '00000000-0000-0000-0000-000000000004', '7832', 0.95, 'system'),

  -- Utilities
  ('AT&T', 'AT&T', '00000000-0000-0000-0000-000000000054', '4814', 0.95, 'system'),
  ('VERIZON', 'Verizon', '00000000-0000-0000-0000-000000000054', '4814', 0.95, 'system'),
  ('COMCAST', 'Comcast', '00000000-0000-0000-0000-000000000053', '4899', 0.95, 'system')
ON CONFLICT DO NOTHING;
