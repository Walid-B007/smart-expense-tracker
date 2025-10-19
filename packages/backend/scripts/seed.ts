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

async function seed() {
  console.log('🌱 Starting database seed...\n');

  try {
    // 1. Get or create demo user
    console.log('Checking for demo user...');
    let userId: string;

    // First try to find existing user
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const existingDemoUser = existingUsers?.users.find(u => u.email === 'demo@example.com');

    if (existingDemoUser) {
      console.log('✓ Demo user already exists');
      console.log(`  Email: demo@example.com`);
      console.log(`  User ID: ${existingDemoUser.id}`);
      userId = existingDemoUser.id;
    } else {
      // Create new user if not exists
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: 'demo@example.com',
        password: 'demo123456',
        email_confirm: true,
      });

      if (authError) {
        throw authError;
      }

      console.log('✓ Demo user created');
      console.log(`  Email: demo@example.com`);
      console.log(`  Password: demo123456`);
      console.log(`  User ID: ${authData.user.id}\n`);
      userId = authData.user.id;
    }

    // userId is already set above

    // 2. Create sample accounts
    console.log('\nCreating sample accounts...');
    const accounts = [
      {
        user_id: userId,
        name: 'Chase Checking',
        account_type: 'checking',
        currency: 'USD',
        initial_balance: 2500.00,
        current_balance: 2500.00,
        institution: 'Chase Bank',
      },
      {
        user_id: userId,
        name: 'Amex Blue Cash',
        account_type: 'credit_card',
        currency: 'USD',
        initial_balance: 0.00,
        current_balance: -850.50,
        institution: 'American Express',
      },
      {
        user_id: userId,
        name: 'Vanguard Savings',
        account_type: 'savings',
        currency: 'USD',
        initial_balance: 15000.00,
        current_balance: 15000.00,
        institution: 'Vanguard',
      },
    ];

    for (const account of accounts) {
      const { error } = await supabase.from('accounts').upsert(account, {
        onConflict: 'user_id,name',
      });

      if (error && !error.message.includes('duplicate')) {
        console.error(`  ✗ Failed to create ${account.name}:`, error.message);
      } else {
        console.log(`  ✓ ${account.name}`);
      }
    }

    // 3. Get account IDs for transactions
    const { data: createdAccounts } = await supabase
      .from('accounts')
      .select('id, name')
      .eq('user_id', userId);

    if (!createdAccounts || createdAccounts.length === 0) {
      throw new Error('No accounts found');
    }

    const checkingAccount = createdAccounts.find(a => a.name === 'Chase Checking');
    const creditAccount = createdAccounts.find(a => a.name === 'Amex Blue Cash');

    // 4. Get some categories to use
    const { data: categories } = await supabase
      .from('categories')
      .select('id, name')
      .limit(10);

    // 5. Create sample transactions
    console.log('\nCreating sample transactions...');
    const transactions = [
      {
        user_id: userId,
        account_id: checkingAccount?.id,
        transaction_date: '2025-10-15',
        description: 'Whole Foods Market',
        amount: -125.43,
        transaction_type: 'debit',
        merchant_name: 'Whole Foods',
        category_id: categories?.find(c => c.name === 'Groceries')?.id || null,
      },
      {
        user_id: userId,
        account_id: checkingAccount?.id,
        transaction_date: '2025-10-14',
        description: 'Shell Gas Station',
        amount: -52.00,
        transaction_type: 'debit',
        merchant_name: 'Shell',
        category_id: categories?.find(c => c.name === 'Transportation')?.id || null,
      },
      {
        user_id: userId,
        account_id: creditAccount?.id,
        transaction_date: '2025-10-13',
        description: 'Amazon.com',
        amount: -89.99,
        transaction_type: 'debit',
        merchant_name: 'Amazon',
        category_id: categories?.find(c => c.name === 'Shopping')?.id || null,
      },
      {
        user_id: userId,
        account_id: checkingAccount?.id,
        transaction_date: '2025-10-12',
        description: 'Salary Deposit',
        amount: 3500.00,
        transaction_type: 'credit',
        merchant_name: 'Employer',
        category_id: categories?.find(c => c.name === 'Salary')?.id || null,
      },
      {
        user_id: userId,
        account_id: creditAccount?.id,
        transaction_date: '2025-10-11',
        description: 'Netflix Subscription',
        amount: -15.99,
        transaction_type: 'debit',
        merchant_name: 'Netflix',
        category_id: categories?.find(c => c.name === 'Entertainment')?.id || null,
      },
    ];

    for (const transaction of transactions) {
      const { error } = await supabase.from('transactions').insert(transaction);

      if (error) {
        console.error(`  ✗ Failed to create transaction:`, error.message);
      } else {
        console.log(`  ✓ ${transaction.description} ($${Math.abs(transaction.amount)})`);
      }
    }

    console.log('\n✅ Database seeding completed successfully!\n');
    console.log('You can now log in with:');
    console.log('  Email: demo@example.com');
    console.log('  Password: demo123456\n');

  } catch (error: any) {
    console.error('\n❌ Seeding failed:', error.message);
    process.exit(1);
  }
}

seed();
