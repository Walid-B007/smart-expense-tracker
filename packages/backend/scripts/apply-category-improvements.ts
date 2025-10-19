import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function applyMigration() {
  console.log('🔄 Applying category improvements migration...\n');

  try {
    // Step 1: Fix color scheme
    console.log('1. Fixing color scheme...');
    await supabase.from('categories').update({ color: '#E17055' }).eq('id', '00000000-0000-0000-0000-000000000011');
    await supabase.from('categories').update({ color: '#95A5A6' }).eq('id', '00000000-0000-0000-0000-000000000015');
    console.log('   ✓ Color scheme updated\n');

    // Step 2: Add new main categories
    console.log('2. Adding new main categories...');
    const newMainCategories = [
      { id: '00000000-0000-0000-0000-000000000016', name: 'Pets', category_type: 'expense', icon: '🐾', color: '#FF9FF3', is_system: true },
      { id: '00000000-0000-0000-0000-000000000017', name: 'Family & Children', category_type: 'expense', icon: '👨‍👩‍👧‍👦', color: '#FDCB6E', is_system: true },
      { id: '00000000-0000-0000-0000-000000000018', name: 'Business Expenses', category_type: 'expense', icon: '💼', color: '#0984E3', is_system: true },
      { id: '00000000-0000-0000-0000-000000000019', name: 'Utilities', category_type: 'expense', icon: '💡', color: '#FFEAA7', is_system: true },
      { id: '00000000-0000-0000-0000-000000000020', name: 'Communications', category_type: 'expense', icon: '📡', color: '#00B894', is_system: true },
    ];

    for (const cat of newMainCategories) {
      await supabase.from('categories').upsert(cat);
      console.log(`   ✓ ${cat.name}`);
    }
    console.log('');

    // Step 3: Add new income categories
    console.log('3. Adding new income categories...');
    const newIncomeCategories = [
      { id: '00000000-0000-0000-0000-000000000107', name: 'Freelance Income', category_type: 'income', icon: '💻', color: '#00D2D3', is_system: true },
      { id: '00000000-0000-0000-0000-000000000108', name: 'Rental Income', category_type: 'income', icon: '🏘️', color: '#55EFC4', is_system: true },
      { id: '00000000-0000-0000-0000-000000000109', name: 'Interest & Dividends', category_type: 'income', icon: '💹', color: '#81ECEC', is_system: true },
      { id: '00000000-0000-0000-0000-000000000110', name: 'Bonuses & Commissions', category_type: 'income', icon: '🎯', color: '#00B894', is_system: true },
    ];

    for (const cat of newIncomeCategories) {
      await supabase.from('categories').upsert(cat);
      console.log(`   ✓ ${cat.name}`);
    }
    console.log('');

    // Step 4-13: Add all subcategories
    console.log('4. Adding subcategories...');

    const subcategories = [
      // Shopping subcategories
      { id: '00000000-0000-0000-0000-000000000041', name: 'Online Shopping', parent_id: '00000000-0000-0000-0000-000000000003', category_type: 'expense', icon: '🛒', color: '#45B7D1', is_system: true },
      { id: '00000000-0000-0000-0000-000000000042', name: 'Clothing & Accessories', parent_id: '00000000-0000-0000-0000-000000000003', category_type: 'expense', icon: '👕', color: '#45B7D1', is_system: true },
      { id: '00000000-0000-0000-0000-000000000043', name: 'General Merchandise', parent_id: '00000000-0000-0000-0000-000000000003', category_type: 'expense', icon: '📦', color: '#45B7D1', is_system: true },
      { id: '00000000-0000-0000-0000-000000000044', name: 'Home & Garden', parent_id: '00000000-0000-0000-0000-000000000003', category_type: 'expense', icon: '🏡', color: '#45B7D1', is_system: true },
      { id: '00000000-0000-0000-0000-000000000045', name: 'Electronics', parent_id: '00000000-0000-0000-0000-000000000003', category_type: 'expense', icon: '💻', color: '#45B7D1', is_system: true },

      // Entertainment subcategories
      { id: '00000000-0000-0000-0000-000000000061', name: 'Movies & Streaming', parent_id: '00000000-0000-0000-0000-000000000004', category_type: 'expense', icon: '🎬', color: '#96CEB4', is_system: true },
      { id: '00000000-0000-0000-0000-000000000062', name: 'Gaming', parent_id: '00000000-0000-0000-0000-000000000004', category_type: 'expense', icon: '🎮', color: '#96CEB4', is_system: true },
      { id: '00000000-0000-0000-0000-000000000063', name: 'Music & Concerts', parent_id: '00000000-0000-0000-0000-000000000004', category_type: 'expense', icon: '🎵', color: '#96CEB4', is_system: true },
      { id: '00000000-0000-0000-0000-000000000064', name: 'Sports & Recreation', parent_id: '00000000-0000-0000-0000-000000000004', category_type: 'expense', icon: '🏃', color: '#96CEB4', is_system: true },
      { id: '00000000-0000-0000-0000-000000000065', name: 'Books & Magazines', parent_id: '00000000-0000-0000-0000-000000000004', category_type: 'expense', icon: '📖', color: '#96CEB4', is_system: true },

      // Healthcare subcategories
      { id: '00000000-0000-0000-0000-000000000071', name: 'Pharmacy & Medications', parent_id: '00000000-0000-0000-0000-000000000006', category_type: 'expense', icon: '💊', color: '#DFE6E9', is_system: true },
      { id: '00000000-0000-0000-0000-000000000072', name: 'Doctor Visits', parent_id: '00000000-0000-0000-0000-000000000006', category_type: 'expense', icon: '👨‍⚕️', color: '#DFE6E9', is_system: true },
      { id: '00000000-0000-0000-0000-000000000073', name: 'Dental', parent_id: '00000000-0000-0000-0000-000000000006', category_type: 'expense', icon: '🦷', color: '#DFE6E9', is_system: true },
      { id: '00000000-0000-0000-0000-000000000074', name: 'Vision', parent_id: '00000000-0000-0000-0000-000000000006', category_type: 'expense', icon: '👓', color: '#DFE6E9', is_system: true },
      { id: '00000000-0000-0000-0000-000000000075', name: 'Fitness & Wellness', parent_id: '00000000-0000-0000-0000-000000000006', category_type: 'expense', icon: '🧘', color: '#DFE6E9', is_system: true },

      // Travel subcategories
      { id: '00000000-0000-0000-0000-000000000081', name: 'Flights', parent_id: '00000000-0000-0000-0000-000000000007', category_type: 'expense', icon: '✈️', color: '#74B9FF', is_system: true },
      { id: '00000000-0000-0000-0000-000000000082', name: 'Hotels & Lodging', parent_id: '00000000-0000-0000-0000-000000000007', category_type: 'expense', icon: '🏨', color: '#74B9FF', is_system: true },
      { id: '00000000-0000-0000-0000-000000000083', name: 'Car Rental', parent_id: '00000000-0000-0000-0000-000000000007', category_type: 'expense', icon: '🚗', color: '#74B9FF', is_system: true },
      { id: '00000000-0000-0000-0000-000000000084', name: 'Activities & Tours', parent_id: '00000000-0000-0000-0000-000000000007', category_type: 'expense', icon: '🎫', color: '#74B9FF', is_system: true },

      // Housing subcategories
      { id: '00000000-0000-0000-0000-000000000091', name: 'Rent/Mortgage', parent_id: '00000000-0000-0000-0000-000000000010', category_type: 'expense', icon: '🏠', color: '#FAB1A0', is_system: true },
      { id: '00000000-0000-0000-0000-000000000092', name: 'Maintenance & Repairs', parent_id: '00000000-0000-0000-0000-000000000010', category_type: 'expense', icon: '🔧', color: '#FAB1A0', is_system: true },
      { id: '00000000-0000-0000-0000-000000000093', name: 'Furniture', parent_id: '00000000-0000-0000-0000-000000000010', category_type: 'expense', icon: '🪑', color: '#FAB1A0', is_system: true },
      { id: '00000000-0000-0000-0000-000000000094', name: 'Cleaning Supplies', parent_id: '00000000-0000-0000-0000-000000000010', category_type: 'expense', icon: '🧹', color: '#FAB1A0', is_system: true },

      // Personal Care subcategories
      { id: '00000000-0000-0000-0000-000000000095', name: 'Hair & Salon', parent_id: '00000000-0000-0000-0000-000000000009', category_type: 'expense', icon: '💇', color: '#FD79A8', is_system: true },
      { id: '00000000-0000-0000-0000-000000000096', name: 'Toiletries & Cosmetics', parent_id: '00000000-0000-0000-0000-000000000009', category_type: 'expense', icon: '🧴', color: '#FD79A8', is_system: true },
      { id: '00000000-0000-0000-0000-000000000097', name: 'Gym Membership', parent_id: '00000000-0000-0000-0000-000000000009', category_type: 'expense', icon: '🏋️', color: '#FD79A8', is_system: true },
      { id: '00000000-0000-0000-0000-000000000098', name: 'Spa & Massage', parent_id: '00000000-0000-0000-0000-000000000009', category_type: 'expense', icon: '💆', color: '#FD79A8', is_system: true },

      // Subscriptions subcategories
      { id: '00000000-0000-0000-0000-000000000099', name: 'Streaming Services', parent_id: '00000000-0000-0000-0000-000000000012', category_type: 'expense', icon: '📺', color: '#6C5CE7', is_system: true },
      { id: '00000000-0000-0000-0000-000000000100', name: 'News & Media', parent_id: '00000000-0000-0000-0000-000000000012', category_type: 'expense', icon: '📰', color: '#6C5CE7', is_system: true },
      { id: '00000000-0000-0000-0000-000000000111', name: 'Software & Cloud Services', parent_id: '00000000-0000-0000-0000-000000000012', category_type: 'expense', icon: '☁️', color: '#6C5CE7', is_system: true },
      { id: '00000000-0000-0000-0000-000000000112', name: 'Music Subscriptions', parent_id: '00000000-0000-0000-0000-000000000012', category_type: 'expense', icon: '🎵', color: '#6C5CE7', is_system: true },

      // Pets subcategories
      { id: '00000000-0000-0000-0000-000000000113', name: 'Pet Food', parent_id: '00000000-0000-0000-0000-000000000016', category_type: 'expense', icon: '🥫', color: '#FF9FF3', is_system: true },
      { id: '00000000-0000-0000-0000-000000000114', name: 'Veterinary', parent_id: '00000000-0000-0000-0000-000000000016', category_type: 'expense', icon: '🏥', color: '#FF9FF3', is_system: true },
      { id: '00000000-0000-0000-0000-000000000115', name: 'Pet Supplies', parent_id: '00000000-0000-0000-0000-000000000016', category_type: 'expense', icon: '🧸', color: '#FF9FF3', is_system: true },
      { id: '00000000-0000-0000-0000-000000000116', name: 'Pet Boarding/Grooming', parent_id: '00000000-0000-0000-0000-000000000016', category_type: 'expense', icon: '🏨', color: '#FF9FF3', is_system: true },

      // Family & Children subcategories
      { id: '00000000-0000-0000-0000-000000000117', name: 'Childcare', parent_id: '00000000-0000-0000-0000-000000000017', category_type: 'expense', icon: '🍼', color: '#FDCB6E', is_system: true },
      { id: '00000000-0000-0000-0000-000000000118', name: 'Baby Supplies', parent_id: '00000000-0000-0000-0000-000000000017', category_type: 'expense', icon: '👶', color: '#FDCB6E', is_system: true },
      { id: '00000000-0000-0000-0000-000000000119', name: 'School Expenses', parent_id: '00000000-0000-0000-0000-000000000017', category_type: 'expense', icon: '🎓', color: '#FDCB6E', is_system: true },
      { id: '00000000-0000-0000-0000-000000000120', name: 'Child Support/Alimony', parent_id: '00000000-0000-0000-0000-000000000017', category_type: 'expense', icon: '👨‍👩‍👧', color: '#FDCB6E', is_system: true },

      // Business Expenses subcategories
      { id: '00000000-0000-0000-0000-000000000121', name: 'Office Supplies', parent_id: '00000000-0000-0000-0000-000000000018', category_type: 'expense', icon: '📄', color: '#0984E3', is_system: true },
      { id: '00000000-0000-0000-0000-000000000122', name: 'Client Meetings', parent_id: '00000000-0000-0000-0000-000000000018', category_type: 'expense', icon: '🤝', color: '#0984E3', is_system: true },
      { id: '00000000-0000-0000-0000-000000000123', name: 'Business Services', parent_id: '00000000-0000-0000-0000-000000000018', category_type: 'expense', icon: '📱', color: '#0984E3', is_system: true },
      { id: '00000000-0000-0000-0000-000000000124', name: 'Business Travel', parent_id: '00000000-0000-0000-0000-000000000018', category_type: 'expense', icon: '🚗', color: '#0984E3', is_system: true },

      // Utilities subcategories
      { id: '00000000-0000-0000-0000-000000000125', name: 'Gas', parent_id: '00000000-0000-0000-0000-000000000019', category_type: 'expense', icon: '🔥', color: '#FFEAA7', is_system: true },
      { id: '00000000-0000-0000-0000-000000000126', name: 'Trash & Recycling', parent_id: '00000000-0000-0000-0000-000000000019', category_type: 'expense', icon: '🗑️', color: '#FFEAA7', is_system: true },

      // Communications subcategories
      { id: '00000000-0000-0000-0000-000000000127', name: 'Cable & Satellite', parent_id: '00000000-0000-0000-0000-000000000020', category_type: 'expense', icon: '📡', color: '#00B894', is_system: true },
      { id: '00000000-0000-0000-0000-000000000128', name: 'Mobile Data', parent_id: '00000000-0000-0000-0000-000000000020', category_type: 'expense', icon: '📱', color: '#00B894', is_system: true },
    ];

    for (const cat of subcategories) {
      await supabase.from('categories').upsert(cat);
    }
    console.log(`   ✓ Added ${subcategories.length} subcategories\n`);

    // Step 14: Reorganize Bills & Utilities
    console.log('5. Reorganizing Bills & Utilities...');
    await supabase.from('categories').update({
      name: 'Bills & Utilities (Legacy)',
      color: '#F0F0F0'
    }).eq('id', '00000000-0000-0000-0000-000000000005');

    // Move existing subcategories
    await supabase.from('categories').update({ parent_id: '00000000-0000-0000-0000-000000000019' })
      .in('id', ['00000000-0000-0000-0000-000000000051', '00000000-0000-0000-0000-000000000052']);

    await supabase.from('categories').update({ parent_id: '00000000-0000-0000-0000-000000000020' })
      .in('id', ['00000000-0000-0000-0000-000000000053', '00000000-0000-0000-0000-000000000054']);

    console.log('   ✓ Bills & Utilities reorganized\n');

    console.log('✅ Migration completed successfully!\n');
    console.log('Summary:');
    console.log('  - Fixed color duplicates');
    console.log('  - Added 5 new main categories');
    console.log('  - Added 4 new income categories');
    console.log(`  - Added ${subcategories.length} new subcategories`);
    console.log('  - Reorganized Bills & Utilities into Utilities and Communications\n');

  } catch (error: any) {
    console.error('\n❌ Migration failed:', error.message);
    console.error('Error details:', error);
    process.exit(1);
  }
}

applyMigration();
