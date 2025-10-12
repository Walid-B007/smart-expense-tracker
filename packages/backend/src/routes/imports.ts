import { FastifyPluginAsync } from 'fastify';
import { supabase } from '../db/supabase';
import { authMiddleware } from '../middleware/auth';
import { fileParser } from '../services/file-parser';
import { classifier } from '../services/llm/classifier';

export const importRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('onRequest', authMiddleware);

  // Upload file and create import job
  fastify.post('/upload', async (request, reply) => {
    const data = await request.file();

    if (!data) {
      return reply.status(400).send({ error: 'No file uploaded' });
    }

    const buffer = await data.toBuffer();
    const filename = data.filename;
    const fileType = filename.endsWith('.csv') ? 'csv' : filename.endsWith('.xlsx') ? 'xlsx' : null;

    if (!fileType) {
      return reply.status(400).send({ error: 'Unsupported file type. Use CSV or XLSX.' });
    }

    try {
      // Parse file
      const parseResult = await fileParser.parse(buffer, fileType);

      // Create import job
      const { data: job, error } = await supabase
        .from('import_jobs')
        .insert({
          user_id: request.user!.id,
          filename,
          file_type: fileType,
          status: 'mapping',
          total_rows: parseResult.totalRows,
        })
        .select()
        .single();

      if (error) {
        return reply.status(500).send({ error: error.message });
      }

      // Save raw rows
      const rowsToInsert = parseResult.rows.map((row, idx) => ({
        import_job_id: job.id,
        row_number: idx + 1,
        raw_data: row,
        validation_status: 'pending',
      }));

      const { error: rowsError } = await supabase
        .from('import_rows')
        .insert(rowsToInsert);

      if (rowsError) {
        console.error('Failed to save import rows:', rowsError);
      }

      // Get column suggestions
      const suggestions = fileParser.suggestColumnMapping(parseResult.headers);

      return {
        job,
        headers: parseResult.headers,
        preview: parseResult.rows.slice(0, 10),
        suggestions,
      };
    } catch (error: any) {
      return reply.status(500).send({ error: error.message });
    }
  });

  // Set column mapping
  fastify.post('/:id/mapping', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { mapping } = request.body as { mapping: Record<string, string> };

    const { data: job, error } = await supabase
      .from('import_jobs')
      .update({
        column_mapping: mapping,
        status: 'validating',
      })
      .eq('id', id)
      .eq('user_id', request.user!.id)
      .select()
      .single();

    if (error || !job) {
      return reply.status(404).send({ error: 'Import job not found' });
    }

    // Validate rows
    const { data: rows } = await supabase
      .from('import_rows')
      .select('*')
      .eq('import_job_id', id);

    if (rows) {
      const validationResults = rows.map((row) => {
        const validation = fileParser.validateRow(row.raw_data, mapping);
        return {
          id: row.id,
          validation_status: validation.isValid ? 'valid' : validation.warnings.length > 0 ? 'warning' : 'invalid',
          validation_errors: [...validation.errors, ...validation.warnings],
        };
      });

      // Update rows with validation results
      for (const result of validationResults) {
        await supabase
          .from('import_rows')
          .update({
            validation_status: result.validation_status,
            validation_errors: result.validation_errors,
          })
          .eq('id', result.id);
      }
    }

    return { job };
  });

  // Execute import
  fastify.post('/:id/execute', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { account_id } = request.body as { account_id: string };

    // Get job and rows
    const { data: job } = await supabase
      .from('import_jobs')
      .select('*')
      .eq('id', id)
      .eq('user_id', request.user!.id)
      .single();

    if (!job) {
      return reply.status(404).send({ error: 'Import job not found' });
    }

    const { data: rows } = await supabase
      .from('import_rows')
      .select('*')
      .eq('import_job_id', id)
      .eq('validation_status', 'valid');

    if (!rows || rows.length === 0) {
      return reply.status(400).send({ error: 'No valid rows to import' });
    }

    // Import transactions
    const mapping = job.column_mapping as Record<string, string>;
    const transactions = rows.map((row) => {
      const rawData = row.raw_data;
      const amount = fileParser.parseAmount(rawData[mapping.amount]);
      const date = fileParser.parseDate(rawData[mapping.date]);

      // Handle static currency value (prefixed with __STATIC__)
      let currency = 'USD';
      if (mapping.currency) {
        if (mapping.currency.startsWith('__STATIC__')) {
          // Extract static value
          currency = mapping.currency.replace('__STATIC__', '');
        } else {
          // Use column value
          currency = rawData[mapping.currency] || 'USD';
        }
      }

      return {
        user_id: request.user!.id,
        account_id,
        transaction_date: date?.toISOString().split('T')[0] || new Date().toISOString().split('T')[0],
        description: rawData[mapping.description] || 'Imported transaction',
        amount: Math.abs(amount),
        currency,
        transaction_type: amount < 0 ? 'debit' : 'credit',
        merchant_name: rawData[mapping.description],
        reference_number: mapping.reference ? rawData[mapping.reference] : undefined,
        import_job_id: job.id,
      };
    });

    const { data: imported, error } = await supabase
      .from('transactions')
      .insert(transactions)
      .select();

    if (error) {
      await supabase
        .from('import_jobs')
        .update({ status: 'failed', validation_errors: [error.message] })
        .eq('id', id);

      return reply.status(500).send({ error: error.message });
    }

    // Update job status
    await supabase
      .from('import_jobs')
      .update({
        status: 'completed',
        imported_rows: imported?.length || 0,
        account_id,
      })
      .eq('id', id);

    // 🤖 Automatically classify imported transactions with AI
    if (imported && imported.length > 0) {
      console.log(`🤖 [Auto-Classification] Starting AI classification for ${imported.length} imported transactions...`);

      // Trigger async classification (don't wait for it to complete)
      classifier.classifyBatch(imported)
        .then((suggestions) => {
          console.log(`✅ [Auto-Classification] Successfully classified ${suggestions.length} transactions`);

          // Auto-apply high-confidence suggestions (>= 0.8)
          return classifier.autoApplySuggestions(request.user!.id, 0.8);
        })
        .then((appliedCount) => {
          console.log(`✅ [Auto-Classification] Auto-applied ${appliedCount} high-confidence categories`);
        })
        .catch((error) => {
          console.error('❌ [Auto-Classification] Failed:', error);
        });
    }

    return {
      message: 'Import completed successfully',
      imported_count: imported?.length || 0,
      classification_started: true,
    };
  });

  // Get import jobs
  fastify.get('/', async (request, reply) => {
    const { data, error } = await supabase
      .from('import_jobs')
      .select('*')
      .eq('user_id', request.user!.id)
      .order('created_at', { ascending: false });

    if (error) {
      return reply.status(500).send({ error: error.message });
    }

    return { jobs: data };
  });
};
