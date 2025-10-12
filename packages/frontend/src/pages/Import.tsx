import { useState, useEffect } from 'react';
import { imports, accounts as accountsApi, fx } from '../lib/api';
import { CloudArrowUpIcon, CheckCircleIcon } from '@heroicons/react/24/outline';

export default function Import() {
  const [step, setStep] = useState<'upload' | 'mapping' | 'preview' | 'complete'>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [jobData, setJobData] = useState<any>(null);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [currencies, setCurrencies] = useState<any[]>([]);
  const [selectedAccount, setSelectedAccount] = useState('');
  const [selectedCurrency, setSelectedCurrency] = useState('');
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadCurrencies();
  }, []);

  const loadCurrencies = async () => {
    try {
      const response = await fx.getCurrencies();
      setCurrencies(response.data.currencies || []);
    } catch (error) {
      console.error('Failed to load currencies:', error);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    const validTypes = ['text/csv', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
    if (!validTypes.includes(selectedFile.type) && !selectedFile.name.match(/\.(csv|xlsx)$/)) {
      setError('Please upload a CSV or XLSX file');
      return;
    }

    setFile(selectedFile);
    setError('');
  };

  const handleUpload = async () => {
    if (!file) return;

    setLoading(true);
    setError('');

    try {
      const response = await imports.upload(file);
      const { job, headers, preview, suggestions } = response.data;

      setJobData({ job, headers, preview });

      // Apply suggested mappings
      const suggestedMapping: Record<string, string> = {};
      suggestions.forEach((s: any) => {
        suggestedMapping[s.targetField] = s.sourceColumn;
      });
      setMapping(suggestedMapping);

      // Load accounts
      const accountsRes = await accountsApi.getAll();
      setAccounts(accountsRes.data.accounts);

      setStep('mapping');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Upload failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSetMapping = async () => {
    setLoading(true);
    try {
      // Add currency as a static value to mapping
      const mappingWithCurrency = {
        ...mapping,
        currency: `__STATIC__${selectedCurrency}` // Use special prefix to indicate static value
      };
      await imports.setMapping(jobData.job.id, mappingWithCurrency);
      setStep('preview');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to set mapping');
    } finally {
      setLoading(false);
    }
  };

  const handleExecute = async () => {
    if (!selectedAccount) {
      setError('Please select an account');
      return;
    }

    setLoading(true);
    try {
      await imports.execute(jobData.job.id, selectedAccount);
      setStep('complete');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Import failed');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setStep('upload');
    setFile(null);
    setJobData(null);
    setMapping({});
    setSelectedAccount('');
    setSelectedCurrency('');
    setError('');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <h1 className="text-3xl font-bold text-gray-900">Import Transactions</h1>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {/* Upload Step */}
      {step === 'upload' && (
        <div className="card">
          <div className="text-center">
            <CloudArrowUpIcon className="mx-auto h-16 w-16 text-gray-400" />
            <h3 className="mt-4 text-lg font-medium text-gray-900">
              Upload Transaction File
            </h3>
            <p className="mt-2 text-sm text-gray-500">
              Supported formats: CSV, XLSX
            </p>

            <div className="mt-6">
              <input
                type="file"
                accept=".csv,.xlsx"
                onChange={handleFileSelect}
                className="hidden"
                id="file-upload"
              />
              <label
                htmlFor="file-upload"
                className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-lg text-white bg-primary-600 hover:bg-primary-700 cursor-pointer"
              >
                Select File
              </label>
            </div>

            {file && (
              <div className="mt-4 text-sm text-gray-700">
                Selected: <span className="font-medium">{file.name}</span>
              </div>
            )}

            {file && (
              <button
                onClick={handleUpload}
                disabled={loading}
                className="mt-4 btn btn-primary"
              >
                {loading ? 'Uploading...' : 'Upload & Continue'}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Mapping Step */}
      {step === 'mapping' && jobData && (
        <div className="space-y-6">
          <div className="card">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Map Columns
            </h3>
            <p className="text-sm text-gray-600 mb-6">
              Match your file columns to transaction fields. We've suggested mappings based on column names.
            </p>

            <div className="space-y-4">
              {['date', 'description', 'amount', 'transaction_type', 'reference'].map((field) => (
                <div key={field} className="grid grid-cols-2 gap-4">
                  <label className="flex items-center text-sm font-medium text-gray-700">
                    {field.charAt(0).toUpperCase() + field.slice(1).replace('_', ' ')}
                    {['date', 'description', 'amount'].includes(field) && (
                      <span className="ml-1 text-red-500">*</span>
                    )}
                  </label>
                  <select
                    value={mapping[field] || ''}
                    onChange={(e) => setMapping({ ...mapping, [field]: e.target.value })}
                    className="input"
                  >
                    <option value="">-- Select Column --</option>
                    {jobData.headers.map((header: string) => (
                      <option key={header} value={header}>
                        {header}
                      </option>
                    ))}
                  </select>
                </div>
              ))}

              {/* Currency - Mandatory Dropdown */}
              <div className="grid grid-cols-2 gap-4">
                <label className="flex items-center text-sm font-medium text-gray-700">
                  Currency
                  <span className="ml-1 text-red-500">*</span>
                </label>
                <select
                  value={selectedCurrency}
                  onChange={(e) => setSelectedCurrency(e.target.value)}
                  className="input"
                >
                  <option value="">-- Select Currency --</option>
                  {currencies.map((curr) => (
                    <option key={curr.code} value={curr.code}>
                      {curr.code} - {curr.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-6 flex justify-end space-x-4">
              <button onClick={handleReset} className="btn btn-secondary">
                Cancel
              </button>
              <button
                onClick={handleSetMapping}
                disabled={loading || !mapping.date || !mapping.description || !mapping.amount || !selectedCurrency}
                className="btn btn-primary"
              >
                {loading ? 'Validating...' : 'Validate & Continue'}
              </button>
            </div>
          </div>

          {/* Preview */}
          <div className="card">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Preview (First 5 Rows)
            </h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    {jobData.headers.map((header: string) => (
                      <th key={header} className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {jobData.preview.slice(0, 5).map((row: any, idx: number) => (
                    <tr key={idx}>
                      {jobData.headers.map((header: string) => (
                        <td key={header} className="px-4 py-2 text-sm text-gray-900">
                          {row[header]}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Preview Step */}
      {step === 'preview' && (
        <div className="card">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Select Account
          </h3>
          <p className="text-sm text-gray-600 mb-6">
            Choose which account these transactions belong to.
          </p>

          <select
            value={selectedAccount}
            onChange={(e) => setSelectedAccount(e.target.value)}
            className="input mb-6"
          >
            <option value="">-- Select Account --</option>
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name} ({account.currency})
              </option>
            ))}
          </select>

          <div className="flex justify-end space-x-4">
            <button onClick={handleReset} className="btn btn-secondary">
              Cancel
            </button>
            <button
              onClick={handleExecute}
              disabled={loading || !selectedAccount}
              className="btn btn-primary"
            >
              {loading ? 'Importing...' : `Import ${jobData.job.total_rows} Transactions`}
            </button>
          </div>
        </div>
      )}

      {/* Complete Step */}
      {step === 'complete' && (
        <div className="space-y-6">
          <div className="card text-center">
            <CheckCircleIcon className="mx-auto h-16 w-16 text-green-500" />
            <h3 className="mt-4 text-lg font-medium text-gray-900">
              Import Successful!
            </h3>
            <p className="mt-2 text-sm text-gray-600">
              {jobData.job.total_rows} transactions have been imported successfully.
            </p>
            <button onClick={handleReset} className="mt-6 btn btn-primary">
              Import Another File
            </button>
          </div>

          {/* AI Classification Info */}
          <div className="card bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
              </div>
              <div className="flex-1">
                <h4 className="text-lg font-semibold text-gray-900 mb-2">
                  🤖 AI Classification in Progress
                </h4>
                <p className="text-sm text-gray-700 mb-3">
                  DeepSeek AI is analyzing your transactions to automatically assign categories.
                  High-confidence categories (≥80%) will be applied automatically.
                </p>
                <div className="bg-white/50 rounded-lg p-3 border border-blue-200">
                  <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                    <span>Analyzing transactions with DeepSeek AI...</span>
                  </div>
                  <p className="text-xs text-gray-500">
                    This happens in the background. You can view categorized transactions on the Transactions page.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div className="grid grid-cols-2 gap-4">
            <a
              href="/transactions"
              className="card hover:shadow-lg transition-shadow text-center py-6 cursor-pointer"
            >
              <div className="text-primary-600 font-semibold mb-1">View Transactions</div>
              <div className="text-sm text-gray-500">See your imported data</div>
            </a>
            <a
              href="/classify"
              className="card hover:shadow-lg transition-shadow text-center py-6 cursor-pointer"
            >
              <div className="text-purple-600 font-semibold mb-1">Review Classifications</div>
              <div className="text-sm text-gray-500">Check AI suggestions</div>
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
