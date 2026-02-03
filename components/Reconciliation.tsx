import React, { useState, useMemo } from 'react';
import { useApp, formatINR } from '../App';
import { BankTransaction } from '../types';

const Reconciliation: React.FC = () => {
  const { state, dispatch } = useApp();
  const [selectedBankTx, setSelectedBankTx] = useState<BankTransaction | null>(null);

  // Filter only unmatched transactions
  const unmatchedBankTx = state.bankFeed.filter(bt => bt.status === 'unmatched');

  // Suggested Matches Logic
  const suggestedMatches = useMemo(() => {
    if (!selectedBankTx) return [];

    if (selectedBankTx.type === 'credit') {
      // Look for invoices with similar amount (+/- 1%)
      return state.invoices.filter(inv => {
        const diff = Math.abs(inv.amount - selectedBankTx.amount);
        return diff < (selectedBankTx.amount * 0.01);
      }).map(inv => ({
        id: inv.id,
        date: inv.date,
        description: `Invoice #${inv.invoiceNumber} - ${inv.customerName}`,
        amount: inv.amount,
        type: 'Invoice'
      }));
    } else {
      // Look for expenses
      return state.expenses.filter(exp => {
        const diff = Math.abs(exp.amount - selectedBankTx.amount);
        return diff < (selectedBankTx.amount * 0.01);
      }).map(exp => ({
        id: exp.id,
        date: exp.date,
        description: `${exp.category} - ${exp.vendor}`,
        amount: exp.amount,
        type: 'Expense'
      }));
    }
  }, [selectedBankTx, state.invoices, state.expenses]);

  const handleMatch = () => {
    if (selectedBankTx) {
      dispatch({ type: 'MATCH_BANK_TRANSACTION', payload: selectedBankTx.id });
      setSelectedBankTx(null);
    }
  };

  return (
    <div className="space-y-6 h-[calc(100vh-100px)] flex flex-col">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Bank Reconciliation</h1>
        <button className="bg-primary text-white px-4 py-2 rounded-lg shadow-sm hover:bg-blue-700 text-sm font-medium">
          Sync All Banks
        </button>
      </div>

      {/* Bank Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {state.bankAccounts.map(account => (
          <div key={account.id} className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-gray-500 font-medium">{account.bankName}</p>
                <p className="text-xs text-gray-400">{account.accountNumber}</p>
              </div>
              <span className="material-icons text-blue-600">account_balance</span>
            </div>
            <p className="text-xl font-bold text-gray-900 mt-2">{formatINR(account.balance)}</p>
            <p className="text-xs text-green-600 mt-1 flex items-center">
              <span className="material-icons text-xs mr-1">check_circle</span>
              Synced {new Date(account.lastSynced).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
            </p>
          </div>
        ))}
      </div>

      {/* Split Screen Matcher */}
      <div className="flex-1 flex flex-col md:flex-row gap-4 min-h-0">
        
        {/* Left: Bank Feed */}
        <div className="flex-1 bg-white rounded-lg shadow-sm border border-gray-200 flex flex-col overflow-hidden">
          <div className="p-4 border-b border-gray-100 bg-gray-50">
            <h3 className="font-semibold text-gray-800">Bank Feed ({unmatchedBankTx.length})</h3>
          </div>
          <div className="flex-1 overflow-y-auto">
            {unmatchedBankTx.length === 0 ? (
               <div className="p-8 text-center text-gray-500 flex flex-col items-center">
                 <span className="material-icons text-4xl text-green-400 mb-2">task_alt</span>
                 <p>All transactions matched!</p>
               </div>
            ) : (
              <ul className="divide-y divide-gray-100">
                {unmatchedBankTx.map(tx => (
                  <li 
                    key={tx.id} 
                    onClick={() => setSelectedBankTx(tx)}
                    className={`p-4 cursor-pointer hover:bg-blue-50 transition-colors ${selectedBankTx?.id === tx.id ? 'bg-blue-50 border-l-4 border-primary' : ''}`}
                  >
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs text-gray-500">{tx.date}</span>
                      <span className={`text-sm font-bold ${tx.type === 'credit' ? 'text-green-600' : 'text-gray-900'}`}>
                        {tx.type === 'credit' ? '+' : '-'}{formatINR(tx.amount)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 truncate">{tx.description}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Right: System Matches */}
        <div className="flex-1 bg-white rounded-lg shadow-sm border border-gray-200 flex flex-col overflow-hidden relative">
          <div className="p-4 border-b border-gray-100 bg-gray-50">
            <h3 className="font-semibold text-gray-800">System Suggestions</h3>
          </div>
          
          {!selectedBankTx ? (
             <div className="flex-1 flex items-center justify-center text-gray-400 p-8 text-center">
               <div>
                 <span className="material-icons text-4xl mb-2">touch_app</span>
                 <p>Select a bank transaction to find matches.</p>
               </div>
             </div>
          ) : (
             <>
               <div className="flex-1 overflow-y-auto p-4 space-y-3">
                 <div className="bg-blue-50 p-3 rounded text-sm text-blue-800 mb-4 border border-blue-100">
                    Showing potential matches for <strong>{formatINR(selectedBankTx.amount)}</strong> on {selectedBankTx.date}.
                 </div>

                 {suggestedMatches.length === 0 ? (
                   <div className="text-center text-gray-500 mt-10">
                     <p>No direct matches found.</p>
                     <button className="mt-2 text-primary text-sm font-medium">Create New Entry</button>
                   </div>
                 ) : (
                   suggestedMatches.map((match, idx) => (
                     <div key={idx} className="border border-green-200 bg-green-50 rounded-lg p-4 flex justify-between items-center">
                        <div>
                          <div className="flex items-center space-x-2">
                             <span className="text-xs font-bold uppercase bg-white border px-1 rounded">{match.type}</span>
                             <span className="font-medium text-gray-900">{formatINR(match.amount)}</span>
                          </div>
                          <p className="text-sm text-gray-600 mt-1">{match.description}</p>
                          <p className="text-xs text-gray-400">{match.date}</p>
                        </div>
                        <button 
                          onClick={handleMatch}
                          className="bg-green-600 hover:bg-green-700 text-white p-2 rounded-full shadow-sm" title="Confirm Match"
                        >
                          <span className="material-icons">link</span>
                        </button>
                     </div>
                   ))
                 )}
               </div>
               
               {/* Footer Action */}
               <div className="p-4 border-t border-gray-100 bg-gray-50">
                 <button className="w-full border border-gray-300 bg-white text-gray-700 py-2 rounded-lg hover:bg-gray-100 text-sm font-medium">
                   Find Match Manually
                 </button>
               </div>
             </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Reconciliation;
