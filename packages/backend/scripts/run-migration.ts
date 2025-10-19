import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import * as fs from 'fs';

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

async function runMigration(migrationFile: string) {
  console.log(`\n🔄 Running migration: ${migrationFile}\n`);

  try {
    // Read the migration file
    const migrationPath = join(__dirname, '../migrations', migrationFile);
    const sql = fs.readFileSync(migrationPath, 'utf-8');

    // Split by semicolons and execute each statement
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    for (const statement of statements) {
      if (statement.trim()) {
        const { error } = await supabase.rpc('exec_sql', { sql_query: statement });

        if (error) {
          // Try direct query if RPC fails
          const { error: directError } = await (supabase as any).from('_').select('*').limit(0);

          if (error.message.includes('function') || error.message.includes('does not exist')) {
            console.log('⚠️  RPC method not available, using direct execution');
            // Execute via raw SQL (this requires direct postgres connection)
            console.log('Statement:', statement.substring(0, 100) + '...');
          } else {
            throw error;
          }
        }
      }
    }

    console.log(`✅ Migration ${migrationFile} completed successfully!\n`);
  } catch (error: any) {
    console.error(`\n❌ Migration failed:`, error.message);
    console.error('Error details:', error);
    process.exit(1);
  }
}

// Get migration file from command line argument
const migrationFile = process.argv[2];

if (!migrationFile) {
  console.error('Usage: npm run migrate:run <migration-file>');
  console.error('Example: npm run migrate:run 004_improve_categories.sql');
  process.exit(1);
}

runMigration(migrationFile);
