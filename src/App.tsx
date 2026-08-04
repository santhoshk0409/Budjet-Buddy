import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import type { ViewTab, Wallet, Expense, ExpenseType } from './types';
import { SplashScreen } from './components/auth/SplashScreen';
import { LoginView } from './components/auth/LoginView';
import { SignUpView } from './components/auth/SignUpView';
import { BottomNavigation } from './components/layout/BottomNavigation';
import { HomeView } from './views/HomeView';
import { HistoryView } from './views/HistoryView';
import { AnalyticsView } from './views/AnalyticsView';
import { ReportsView } from './views/ReportsView';
import { SettingsView } from './views/SettingsView';
import { AddExpenseModal } from './components/expense/AddExpenseModal';
import { WalletModal } from './components/wallet/WalletModal';
import { ExpenseTypeModal } from './components/category/ExpenseTypeModal';
import { ExpenseDetailModal } from './components/expense/ExpenseDetailModal';
import { NewMonthResetModal } from './components/budget/NewMonthResetModal';
import { deleteExpense } from './db/database';
import { format } from 'date-fns';

const MainAppContent: React.FC = () => {
  const { currentUser, isLoading } = useAuth();
  const [authView, setAuthView] = useState<'login' | 'signup'>('login');
  const [currentTab, setCurrentTab] = useState<ViewTab>('home');
  const [selectedMonth, setSelectedMonth] = useState<string>(
    format(new Date(), 'yyyy-MM')
  );

  // Modals
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | undefined>(undefined);

  const [walletModalOpen, setWalletModalOpen] = useState(false);
  const [editingWallet, setEditingWallet] = useState<Wallet | undefined>(undefined);

  const [typeModalOpen, setTypeModalOpen] = useState(false);
  const [editingType, setEditingType] = useState<ExpenseType | undefined>(undefined);

  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [detailExpense, setDetailExpense] = useState<Expense | null>(null);
  const [detailWallet, setDetailWallet] = useState<Wallet | undefined>(undefined);
  const [detailType, setDetailType] = useState<ExpenseType | undefined>(undefined);

  if (isLoading) {
    return <SplashScreen />;
  }

  // Not logged in -> Show Auth Screens
  if (!currentUser) {
    return authView === 'login' ? (
      <LoginView onSwitchToSignUp={() => setAuthView('signup')} />
    ) : (
      <SignUpView onSwitchToLogin={() => setAuthView('login')} />
    );
  }

  // Open Expense Details Modal
  const handleOpenExpenseDetail = (expense: Expense, wallet?: Wallet, type?: ExpenseType) => {
    setDetailExpense(expense);
    setDetailWallet(wallet);
    setDetailType(type);
    setDetailModalOpen(true);
  };

  // Delete Expense handler from detail modal
  const handleDeleteExpenseFromDetail = async (expenseId: string) => {
    await deleteExpense(expenseId);
  };

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans antialiased selection:bg-blue-500 selection:text-white">
      {/* Main Tab Content */}
      <main className="min-h-screen">
        {currentTab === 'home' && (
          <HomeView
            selectedMonth={selectedMonth}
            onSelectMonth={setSelectedMonth}
            onOpenAddExpense={() => {
              setEditingExpense(undefined);
              setIsAddExpenseOpen(true);
            }}
            onOpenWalletModal={(wallet) => {
              setEditingWallet(wallet);
              setWalletModalOpen(true);
            }}
            onOpenExpenseDetail={handleOpenExpenseDetail}
            onNavigateToHistory={() => setCurrentTab('history')}
          />
        )}

        {currentTab === 'history' && (
          <HistoryView
            selectedMonth={selectedMonth}
            onSelectMonth={setSelectedMonth}
            onOpenExpenseDetail={handleOpenExpenseDetail}
            onEditExpense={(expense) => {
              setEditingExpense(expense);
              setIsAddExpenseOpen(true);
            }}
          />
        )}

        {currentTab === 'analytics' && (
          <AnalyticsView
            selectedMonth={selectedMonth}
            onSelectMonth={setSelectedMonth}
          />
        )}

        {currentTab === 'reports' && (
          <ReportsView
            selectedMonth={selectedMonth}
            onSelectMonth={setSelectedMonth}
          />
        )}

        {currentTab === 'settings' && (
          <SettingsView
            onOpenWalletModal={() => {
              setEditingWallet(undefined);
              setWalletModalOpen(true);
            }}
            onOpenTypeModal={() => {
              setEditingType(undefined);
              setTypeModalOpen(true);
            }}
          />
        )}
      </main>

      {/* MD3 Bottom Navigation Bar */}
      <BottomNavigation
        currentTab={currentTab}
        onSelectTab={(tab) => setCurrentTab(tab)}
        onOpenAddExpense={() => {
          setEditingExpense(undefined);
          setIsAddExpenseOpen(true);
        }}
      />

      {/* Add / Edit Expense Drawer Modal */}
      <AddExpenseModal
        isOpen={isAddExpenseOpen}
        onClose={() => setIsAddExpenseOpen(false)}
        initialExpense={editingExpense}
      />

      {/* Wallet Management Modal */}
      <WalletModal
        isOpen={walletModalOpen}
        onClose={() => setWalletModalOpen(false)}
        walletToEdit={editingWallet}
      />

      {/* Expense Type Management Modal */}
      <ExpenseTypeModal
        isOpen={typeModalOpen}
        onClose={() => setTypeModalOpen(false)}
        typeToEdit={editingType}
      />

      {/* Expense Details & Actions Modal */}
      <ExpenseDetailModal
        isOpen={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        expense={detailExpense}
        wallet={detailWallet}
        expenseType={detailType}
        onEdit={(exp) => {
          setEditingExpense(exp);
          setIsAddExpenseOpen(true);
        }}
        onDelete={handleDeleteExpenseFromDetail}
      />

      {/* New Month Budget Reset Prompt Modal */}
      <NewMonthResetModal
        onOpenWalletManagement={() => {
          setEditingWallet(undefined);
          setWalletModalOpen(true);
        }}
      />
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <MainAppContent />
    </AuthProvider>
  );
}
