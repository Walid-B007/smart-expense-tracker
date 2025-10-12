import { useEffect, useState } from 'react';
import { transactions } from '../lib/api';
import { Card, Button } from '../components/ui';
import { SparklesIcon, CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';

export default function Classify() {
  const [uncategorized, setUncategorized] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [classifying, setClassifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    loadUncategorized();
  }, []);

  const loadUncategorized = async () => {
    setLoading(true);
    try {
      const response = await transactions.getAll({ limit: 100 });
      const uncat = response.data.transactions.filter((tx: any) => !tx.category_id);
      setUncategorized(uncat);
    } catch (error: any) {
      console.error('Failed to load transactions:', error);
      setError(error.response?.data?.error || 'Failed to load transactions');
    } finally {
      setLoading(false);
    }
  };

  const handleClassifyAll = async () => {
    if (uncategorized.length === 0) return;

    setClassifying(true);
    setError(null);
    setSuccess(null);

    const ids = uncategorized.map(tx => tx.id);

    try {
      console.log('🤖 Starting AI classification for', ids.length, 'transactions...');
      const response = await transactions.classifyBatch(ids);

      console.log('✅ Classification response:', response.data);

      setSuccess(`Successfully classified ${response.data.count || ids.length} transactions! Refreshing...`);

      // Wait 2 seconds then reload
      setTimeout(() => {
        loadUncategorized();
        setSuccess(null);
      }, 2000);

    } catch (error: any) {
      console.error('❌ Classification failed:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Classification failed';
      setError(`Classification failed: ${errorMessage}`);
    } finally {
      setClassifying(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary-600 to-primary-800 bg-clip-text text-transparent">
            AI Classification
          </h1>
          <p className="text-gray-600 mt-1">
            {uncategorized.length} transaction{uncategorized.length !== 1 ? 's' : ''} need categorization
          </p>
        </div>
        {uncategorized.length > 0 && (
          <Button
            variant="primary"
            size="lg"
            onClick={handleClassifyAll}
            loading={classifying}
            disabled={classifying}
          >
            <SparklesIcon className="h-5 w-5 mr-2" />
            {classifying ? 'Classifying...' : 'Classify All with AI'}
          </Button>
        )}
      </div>

      {/* Success Message */}
      {success && (
        <Card className="bg-green-50 border-green-200">
          <div className="flex items-center gap-3 text-green-800 p-4">
            <CheckCircleIcon className="h-6 w-6" />
            <p className="font-medium">{success}</p>
          </div>
        </Card>
      )}

      {/* Error Message */}
      {error && (
        <Card className="bg-red-50 border-red-200">
          <div className="flex items-center gap-3 text-red-800 p-4">
            <XCircleIcon className="h-6 w-6" />
            <div>
              <p className="font-medium">Classification Error</p>
              <p className="text-sm mt-1">{error}</p>
            </div>
          </div>
        </Card>
      )}

      {/* Processing Indicator */}
      {classifying && (
        <Card className="bg-blue-50 border-blue-200">
          <div className="flex items-center gap-3 text-blue-800 p-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <p className="font-medium">
              AI is analyzing {uncategorized.length} transactions with DeepSeek...
            </p>
          </div>
        </Card>
      )}

      {/* Transactions List */}
      <Card hover padding="lg">
        {uncategorized.length === 0 ? (
          <div className="text-center py-12">
            <CheckCircleIcon className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              All transactions are categorized!
            </h3>
            <p className="text-gray-600">
              Great job! All your transactions have been assigned to categories.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {uncategorized.slice(0, 20).map((tx) => (
              <div
                key={tx.id}
                className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex-1">
                  <p className="font-medium text-gray-900">
                    {tx.merchant_name || tx.description}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    {new Date(tx.transaction_date).toLocaleDateString()} •
                    <span className="font-semibold ml-1">
                      {tx.amount} {tx.currency}
                    </span>
                  </p>
                </div>
              </div>
            ))}
            {uncategorized.length > 20 && (
              <p className="text-center text-sm text-gray-500 pt-4">
                ... and {uncategorized.length - 20} more
              </p>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}
