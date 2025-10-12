import { useEffect, useState } from 'react';
import { accounts } from '../lib/api';
import { Card, Button } from '../components/ui';
import { AccountEditModal } from '../components/AccountEditModal';
import {
  PlusIcon,
  PencilIcon,
  BanknotesIcon,
  CreditCardIcon,
  BuildingLibraryIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline';

export default function Accounts() {
  const [accountsList, setAccountsList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingAccount, setEditingAccount] = useState<any>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  useEffect(() => {
    loadAccounts();
  }, []);

  const loadAccounts = async () => {
    setLoading(true);
    try {
      const response = await accounts.getAll();
      setAccountsList(response.data.accounts);
    } catch (error) {
      console.error('Failed to load accounts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (account: any) => {
    setEditingAccount(account);
    setIsEditModalOpen(true);
  };

  const handleUpdateComplete = () => {
    loadAccounts();
  };

  const getAccountIcon = (type: string) => {
    switch (type) {
      case 'checking':
        return <BanknotesIcon className="h-8 w-8 text-white" />;
      case 'savings':
        return <BuildingLibraryIcon className="h-8 w-8 text-white" />;
      case 'credit_card':
        return <CreditCardIcon className="h-8 w-8 text-white" />;
      case 'investment':
        return <ChartBarIcon className="h-8 w-8 text-white" />;
      default:
        return <BanknotesIcon className="h-8 w-8 text-white" />;
    }
  };

  const getAccountGradient = (index: number) => {
    const gradients = [
      'from-primary-500 to-primary-600',
      'from-accent-purple to-accent-pink',
      'from-accent-green to-accent-teal',
      'from-accent-orange to-accent-red',
      'from-blue-500 to-indigo-600',
    ];
    return gradients[index % gradients.length];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  const totalBalance = accountsList.reduce((sum, acc) => {
    // Convert all to USD for simplicity (you can add real currency conversion)
    return sum + acc.current_balance;
  }, 0);

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary-600 to-primary-800 bg-clip-text text-transparent">
            Accounts
          </h1>
          <p className="text-gray-600 mt-1">Manage your financial accounts</p>
        </div>
        <Button variant="primary" size="lg">
          <PlusIcon className="h-5 w-5 mr-2" />
          Add Account
        </Button>
      </div>

      {/* Summary Card */}
      <Card hover gradient padding="lg" className="bg-gradient-to-r from-primary-50 to-purple-50">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium text-gray-600 mb-1">Total Balance</h3>
            <p className="text-4xl font-bold text-gray-900">
              {totalBalance.toFixed(2)}
            </p>
            <p className="text-sm text-gray-500 mt-1">{accountsList.length} accounts</p>
          </div>
          <div className="p-4 bg-gradient-to-br from-primary-500 to-primary-600 rounded-2xl shadow-lg">
            <BanknotesIcon className="h-12 w-12 text-white" />
          </div>
        </div>
      </Card>

      {/* Accounts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {accountsList.map((account, index) => (
          <Card
            key={account.id}
            hover
            padding="lg"
            className="animate-slide-up"
            style={{ animationDelay: `${index * 0.1}s` }}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className={`p-3 bg-gradient-to-br ${getAccountGradient(index)} rounded-xl shadow-md`}>
                  {getAccountIcon(account.account_type)}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">{account.name}</h3>
                  <span className="text-xs font-medium text-gray-500 uppercase">
                    {account.account_type.replace('_', ' ')}
                  </span>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleEdit(account)}
                className="hover:bg-primary-50"
              >
                <PencilIcon className="h-4 w-4 text-primary-600" />
              </Button>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-200">
              <p className="text-sm text-gray-600 mb-1">Current Balance</p>
              <p className="text-3xl font-bold text-gray-900">
                {account.current_balance.toFixed(2)}
              </p>
              <p className="text-sm text-gray-500 mt-1">{account.currency}</p>
            </div>

            {account.institution && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <p className="text-xs text-gray-500">Institution</p>
                <p className="text-sm font-medium text-gray-700 mt-1">{account.institution}</p>
              </div>
            )}

            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>Initial: {account.initial_balance.toFixed(2)} {account.currency}</span>
                <span>
                  {account.current_balance >= account.initial_balance ? (
                    <span className="text-green-600 font-medium">
                      +{(account.current_balance - account.initial_balance).toFixed(2)}
                    </span>
                  ) : (
                    <span className="text-red-600 font-medium">
                      {(account.current_balance - account.initial_balance).toFixed(2)}
                    </span>
                  )}
                </span>
              </div>
            </div>
          </Card>
        ))}

        {/* Add Account Card */}
        <Card
          hover
          padding="lg"
          className="border-2 border-dashed border-gray-300 bg-gray-50 hover:border-primary-400 hover:bg-primary-50 cursor-pointer transition-all duration-200 flex items-center justify-center min-h-[280px]"
        >
          <div className="text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-gradient-to-br from-gray-300 to-gray-400 flex items-center justify-center mb-4">
              <PlusIcon className="h-8 w-8 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-gray-700 mb-1">Add New Account</h3>
            <p className="text-sm text-gray-500">Create a new financial account</p>
          </div>
        </Card>
      </div>

      {/* Edit Modal */}
      <AccountEditModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingAccount(null);
        }}
        account={editingAccount}
        onUpdate={handleUpdateComplete}
      />
    </div>
  );
}
