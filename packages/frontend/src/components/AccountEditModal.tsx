import { useState, useEffect } from 'react';
import { Modal, ModalFooter, Button, Input, Select } from './ui';
import { accounts } from '../lib/api';

interface AccountEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  account: any;
  onUpdate: () => void;
}

export function AccountEditModal({
  isOpen,
  onClose,
  account,
  onUpdate,
}: AccountEditModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    account_type: 'checking',
    currency: 'USD',
    initial_balance: 0,
    institution: '',
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (account) {
      setFormData({
        name: account.name || '',
        account_type: account.account_type || 'checking',
        currency: account.currency || 'USD',
        initial_balance: account.initial_balance || 0,
        institution: account.institution || '',
      });
    }
  }, [account]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await accounts.update(account.id, formData);
      onUpdate();
      onClose();
    } catch (error) {
      console.error('Failed to update account:', error);
      alert('Failed to update account');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Account" size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Account Name"
          type="text"
          required
          value={formData.name}
          onChange={(e) =>
            setFormData({ ...formData, name: e.target.value })
          }
          placeholder="e.g., Chase Checking"
        />

        <div className="grid grid-cols-2 gap-4">
          <Select
            label="Account Type"
            options={[
              { value: 'checking', label: 'Checking' },
              { value: 'savings', label: 'Savings' },
              { value: 'credit_card', label: 'Credit Card' },
              { value: 'investment', label: 'Investment' },
              { value: 'loan', label: 'Loan' },
              { value: 'other', label: 'Other' },
            ]}
            value={formData.account_type}
            onChange={(e) =>
              setFormData({ ...formData, account_type: e.target.value })
            }
          />

          <Select
            label="Currency"
            options={[
              { value: 'USD', label: 'USD - US Dollar' },
              { value: 'EUR', label: 'EUR - Euro' },
              { value: 'GBP', label: 'GBP - British Pound' },
              { value: 'AUD', label: 'AUD - Australian Dollar' },
              { value: 'CAD', label: 'CAD - Canadian Dollar' },
              { value: 'JPY', label: 'JPY - Japanese Yen' },
            ]}
            value={formData.currency}
            onChange={(e) =>
              setFormData({ ...formData, currency: e.target.value })
            }
          />
        </div>

        <Input
          label="Initial Balance"
          type="number"
          step="0.01"
          required
          value={formData.initial_balance}
          onChange={(e) =>
            setFormData({
              ...formData,
              initial_balance: parseFloat(e.target.value) || 0,
            })
          }
          placeholder="0.00"
        />

        <Input
          label="Institution (Optional)"
          type="text"
          value={formData.institution}
          onChange={(e) =>
            setFormData({ ...formData, institution: e.target.value })
          }
          placeholder="e.g., Chase Bank"
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
