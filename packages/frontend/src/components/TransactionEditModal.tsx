import { useState, useEffect } from 'react';
import { Modal, ModalFooter, Button, Input, Select } from './ui';
import { transactions, accounts, categories } from '../lib/api';

interface TransactionEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: any;
  onUpdate: () => void;
}

export function TransactionEditModal({
  isOpen,
  onClose,
  transaction,
  onUpdate,
}: TransactionEditModalProps) {
  const [formData, setFormData] = useState({
    transaction_date: '',
    amount: 0,
    description: '',
    category_id: '',
    account_id: '',
    currency: 'USD',
    merchant_name: '',
    notes: '',
  });
  const [loading, setLoading] = useState(false);
  const [accountsList, setAccountsList] = useState([]);
  const [categoriesList, setCategoriesList] = useState<{ value: string; label: string }[]>([]);

  useEffect(() => {
    if (transaction) {
      setFormData({
        transaction_date: transaction.transaction_date || '',
        amount: transaction.amount || 0,
        description: transaction.description || '',
        category_id: transaction.category_id || '',
        account_id: transaction.account_id || '',
        currency: transaction.currency || 'USD',
        merchant_name: transaction.merchant_name || '',
        notes: transaction.notes || '',
      });
    }
  }, [transaction]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [accts, cats] = await Promise.all([
        accounts.getAll(),
        categories.getAll(),
      ]);
      setAccountsList(accts.data.accounts);

      // Flatten hierarchical categories
      const flatCats = cats.data.categories.flatMap((cat: any) => [
        { value: cat.id, label: cat.name },
        ...(cat.children?.map((child: any) => ({
          value: child.id,
          label: `  ${child.name}`,
        })) || []),
      ]);
      setCategoriesList(flatCats);
    } catch (error) {
      console.error('Failed to load data:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await transactions.update(transaction.id, formData);
      onUpdate();
      onClose();
    } catch (error) {
      console.error('Failed to update transaction:', error);
      alert('Failed to update transaction');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Transaction" size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Date"
            type="date"
            required
            value={formData.transaction_date}
            onChange={(e) =>
              setFormData({ ...formData, transaction_date: e.target.value })
            }
          />
          <Input
            label="Amount"
            type="number"
            step="0.01"
            required
            value={formData.amount}
            onChange={(e) =>
              setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })
            }
          />
        </div>

        <Input
          label="Description"
          type="text"
          required
          value={formData.description}
          onChange={(e) =>
            setFormData({ ...formData, description: e.target.value })
          }
        />

        <div className="grid grid-cols-2 gap-4">
          <Select
            label="Account"
            options={[
              { value: '', label: 'Select account...' },
              ...accountsList.map((acc: any) => ({
                value: acc.id,
                label: `${acc.name} (${acc.account_type})`,
              })),
            ]}
            value={formData.account_id}
            onChange={(e) =>
              setFormData({ ...formData, account_id: e.target.value })
            }
          />
          <Select
            label="Category"
            options={[
              { value: '', label: 'Select category...' },
              ...categoriesList,
            ]}
            value={formData.category_id}
            onChange={(e) =>
              setFormData({ ...formData, category_id: e.target.value })
            }
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Select
            label="Currency"
            options={[
              { value: 'USD', label: 'USD' },
              { value: 'EUR', label: 'EUR' },
              { value: 'GBP', label: 'GBP' },
              { value: 'AUD', label: 'AUD' },
            ]}
            value={formData.currency}
            onChange={(e) =>
              setFormData({ ...formData, currency: e.target.value })
            }
          />
          <Input
            label="Merchant"
            type="text"
            value={formData.merchant_name}
            onChange={(e) =>
              setFormData({ ...formData, merchant_name: e.target.value })
            }
          />
        </div>

        <Input
          label="Notes"
          type="text"
          value={formData.notes}
          onChange={(e) =>
            setFormData({ ...formData, notes: e.target.value })
          }
        />

        <ModalFooter>
          <Button variant="ghost" onClick={onClose} type="button">
            Cancel
          </Button>
          <Button variant="primary" type="submit" loading={loading}>
            Save Changes
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
