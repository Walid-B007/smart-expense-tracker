import { useState, useEffect } from 'react';
import { Modal, ModalFooter, Button, Input, Select } from './ui';
import { accounts } from '../lib/api';
import { TrashIcon } from '@heroicons/react/24/outline';

interface AccountEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  account: any;
  onUpdate: () => void;
  onDelete?: () => void;
}

export function AccountEditModal({
  isOpen,
  onClose,
  account,
  onUpdate,
  onDelete,
}: AccountEditModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    account_type: 'checking',
    currency: 'USD',
    initial_balance: 0,
    institution: '',
  });
  const [loading, setLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

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

  const handleDelete = async () => {
    setLoading(true);
    try {
      await accounts.delete(account.id);
      if (onDelete) {
        onDelete();
      }
      onUpdate();
      onClose();
      setShowDeleteConfirm(false);
    } catch (error) {
      console.error('Failed to delete account:', error);
      alert('Failed to delete account. It may have associated transactions.');
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
          <div className="flex items-center justify-between w-full">
            <div>
              {!showDeleteConfirm ? (
                <Button
                  variant="ghost"
                  onClick={() => setShowDeleteConfirm(true)}
                  type="button"
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <TrashIcon className="h-4 w-4 mr-2" />
                  Delete Account
                </Button>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-red-600 font-medium">Are you sure?</span>
                  <Button
                    variant="ghost"
                    onClick={handleDelete}
                    type="button"
                    loading={loading}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    Yes, Delete
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => setShowDeleteConfirm(false)}
                    type="button"
                    className="text-gray-600"
                  >
                    Cancel
                  </Button>
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={onClose} type="button" disabled={loading}>
                Close
              </Button>
              <Button variant="primary" type="submit" loading={loading}>
                Save Changes
              </Button>
            </div>
          </div>
        </ModalFooter>
      </form>
    </Modal>
  );
}
