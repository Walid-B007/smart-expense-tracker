import { useEffect, useState } from 'react';
import { transfers } from '../lib/api';

export default function Transfers() {
  const [transferList, setTransferList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTransfers();
  }, []);

  const loadTransfers = async () => {
    try {
      const response = await transfers.getAll();
      setTransferList(response.data.transfers);
    } catch (error) {
      console.error('Failed to load transfers:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-12">Loading...</div>;
  }

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold text-gray-900">Transfers</h1>

      <div className="card">
        {transferList.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            No transfers found. Create transfers to link transactions between accounts.
          </div>
        ) : (
          <div className="space-y-4">
            {transferList.map((transfer) => (
              <div key={transfer.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">
                    {transfer.from_account?.name} → {transfer.to_account?.name}
                  </p>
                  <p className="text-sm text-gray-500">
                    {new Date(transfer.transfer_date).toLocaleDateString()} •
                    {transfer.amount} {transfer.currency}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
