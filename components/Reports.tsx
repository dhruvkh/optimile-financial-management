import React, { useState, useMemo } from 'react';
import { useApp, formatINR } from '../App';

type ReportType = 'pl' | 'aging' | 'custom';

interface ColumnDef {
  id: string;
  label: string;
  accessor: (item: any) => any;
}

const Reports: React.FC = () => {
  const { state } = useApp();
  const [reportType, setReportType] = useState<ReportType>('pl');
  const [dateRange, setDateRange] = useState('this_year');

  // Custom Report State
  const [selectedColumns, setSelectedColumns] = useState<Set<string>>(new Set(['date', 'description', 'amount']));

  const customColumns: ColumnDef[] = [
    { id: 'date', label: 'Date', accessor: (i: any) => i.date },
    { id: 'type', label: 'Type', accessor: (i: any) => i.type },
    { id: 'description', label: 'Description', accessor: (i: any) => i.description },
    { id: 'amount', label: 'Amount', accessor: (i: any) => formatINR(i.amount) },
    { id: 'status', label: 'Status', accessor: (i: any) => i.status || (i.matched ? 'Matched' : 'Pending') },
  ];

  const toggleColumn = (id: string) => {
    const next = new Set(selectedColumns);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedColumns(next);
  };

  // --- Report Generation Logic ---
  
  const reportData = useMemo(() => {
    // P&L Logic
    if (reportType === 'pl') {
      // Group by Month (Mock simple aggregation)
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return months.map(m => {
        // Randomize mock data roughly based on state for demo visuals
        const revenue = state.invoices.reduce((acc, inv) => acc + (Math.random() > 0.9 ? inv.amount/10 : 0), 0); 
        const cogs = revenue * 0.6;
        const opex = revenue * 0.2;
        return {
          label: `${m} 2023`,
          revenue: Math.floor(revenue * 10),
          cogs: Math.floor(cogs * 10),
          grossProfit: Math.floor((revenue - cogs) * 10),
          opex: Math.floor(opex * 10),
          netIncome: Math.floor((revenue - cogs - opex) * 10)
        };
      });
    }
    
    // Aging Logic
    if (reportType === 'aging') {
      const buckets = { '0-30': 0, '31-60': 0, '61-90': 0, '90+': 0 };
      const today = new Date();
      
      state.invoices.filter(i => i.status !== 'paid').forEach(inv => {
        const due = new Date(inv.dueDate);
        const diff = Math.ceil((today.getTime() - due.getTime()) / (1000 * 3600 * 24));
        if (diff <= 30) buckets['0-30'] += inv.amount;
        else if (diff <= 60) buckets['31-60'] += inv.amount;
        else if (diff <= 90) buckets['61-90'] += inv.amount;
        else buckets['90+'] += inv.amount;
      });

      return Object.entries(buckets).map(([range, amount]) => ({
        label: `${range} Days`,
        amount: amount,
        count: Math.floor(amount / 15000) // Mock count
      }));
    }

    // Custom Report Logic - Flatten Invoices & Transactions
    if (reportType === 'custom') {
      const allEvents = [
        ...state.invoices.map(i => ({
          date: i.date,
          type: 'Invoice',
          description: `Inv #${i.invoiceNumber} - ${i.customerName}`,
          amount: i.amount,
          status: i.status
        })),
        ...state.transactions.map(t => ({
          date: t.date,
          type: 'Transaction',
          description: t.description,
          amount: t.amount,
          status: t.matched ? 'Reconciled' : 'Unreconciled'
        }))
      ].sort((a,b) => b.date.localeCompare(a.date));
      
      return allEvents;
    }

    return [];
  }, [reportType, state.invoices, state.transactions]);

  // --- Export Logic ---
  const handleExport = () => {
    if (!reportData.length) return;
    
    // For custom report, only export selected columns
    let headers: string[];
    let rows: string[];

    if (reportType === 'custom') {
      const activeCols = customColumns.filter(c => selectedColumns.has(c.id));
      headers = activeCols.map(c => c.label);
      rows = reportData.map((row: any) => activeCols.map(c => row[c.id]).join(','));
    } else {
      headers = Object.keys(reportData[0]);
      rows = reportData.map(row => Object.values(row).join(','));
    }

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${reportType}_report.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Financial Reports</h1>
        <div className="flex space-x-2">
           <button onClick={handleExport} className="border border-gray-300 bg-white text-gray-700 px-4 py-2 rounded shadow-sm hover:bg-gray-50 flex items-center">
             <span className="material-icons text-sm mr-2">download</span> Export CSV
           </button>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
         {/* Controls */}
         <div className="flex flex-col md:flex-row gap-4 mb-8 pb-6 border-b border-gray-100">
           <div className="w-full md:w-64">
             <label className="block text-sm font-medium text-gray-700 mb-1">Report Type</label>
             <select 
               value={reportType} 
               onChange={(e) => setReportType(e.target.value as ReportType)}
               className="w-full border-gray-300 rounded-md shadow-sm p-2"
             >
               <option value="pl">Profit & Loss (P&L)</option>
               <option value="aging">A/R Aging Summary</option>
               <option value="custom">Custom Transaction Report</option>
             </select>
           </div>
           
           {reportType !== 'custom' && (
             <div className="w-full md:w-64">
               <label className="block text-sm font-medium text-gray-700 mb-1">Date Range</label>
               <select 
                 value={dateRange} 
                 onChange={(e) => setDateRange(e.target.value)}
                 className="w-full border-gray-300 rounded-md shadow-sm p-2"
               >
                 <option value="this_month">This Month</option>
                 <option value="this_quarter">This Quarter</option>
                 <option value="this_year">This Fiscal Year</option>
               </select>
             </div>
           )}
         </div>

         {/* Custom Report Configuration */}
         {reportType === 'custom' && (
           <div className="mb-6 bg-gray-50 p-4 rounded-lg border border-gray-200">
             <h4 className="text-sm font-semibold text-gray-700 mb-3">Select Columns</h4>
             <div className="flex flex-wrap gap-4">
               {customColumns.map(col => (
                 <label key={col.id} className="inline-flex items-center">
                   <input 
                     type="checkbox" 
                     className="rounded border-gray-300 text-primary shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50"
                     checked={selectedColumns.has(col.id)}
                     onChange={() => toggleColumn(col.id)}
                   />
                   <span className="ml-2 text-sm text-gray-700">{col.label}</span>
                 </label>
               ))}
             </div>
           </div>
         )}

         {/* Report View */}
         <div className="overflow-x-auto">
           {reportType === 'pl' && (
             <table className="w-full text-sm text-left">
               <thead className="bg-gray-50 text-gray-600 font-bold uppercase">
                 <tr>
                   <th className="px-6 py-3">Period</th>
                   <th className="px-6 py-3 text-right">Revenue</th>
                   <th className="px-6 py-3 text-right">COGS</th>
                   <th className="px-6 py-3 text-right">Gross Profit</th>
                   <th className="px-6 py-3 text-right">OpEx</th>
                   <th className="px-6 py-3 text-right text-blue-700">Net Income</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-gray-100">
                 {reportData.map((row: any, i: number) => (
                   <tr key={i} className="hover:bg-gray-50">
                     <td className="px-6 py-4 font-medium">{row.label}</td>
                     <td className="px-6 py-4 text-right">{formatINR(row.revenue)}</td>
                     <td className="px-6 py-4 text-right text-red-500">({formatINR(row.cogs)})</td>
                     <td className="px-6 py-4 text-right font-medium">{formatINR(row.grossProfit)}</td>
                     <td className="px-6 py-4 text-right text-red-500">({formatINR(row.opex)})</td>
                     <td className="px-6 py-4 text-right font-bold text-blue-700">{formatINR(row.netIncome)}</td>
                   </tr>
                 ))}
                 <tr className="bg-gray-50 font-bold border-t-2 border-gray-200">
                    <td className="px-6 py-4">Total</td>
                    <td className="px-6 py-4 text-right">{formatINR(reportData.reduce((a:any,b:any)=>a+b.revenue,0))}</td>
                    <td className="px-6 py-4 text-right"></td>
                    <td className="px-6 py-4 text-right"></td>
                    <td className="px-6 py-4 text-right"></td>
                    <td className="px-6 py-4 text-right text-blue-800">{formatINR(reportData.reduce((a:any,b:any)=>a+b.netIncome,0))}</td>
                 </tr>
               </tbody>
             </table>
           )}

           {reportType === 'aging' && (
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 text-gray-600 font-bold uppercase">
                  <tr>
                    <th className="px-6 py-3">Days Overdue</th>
                    <th className="px-6 py-3 text-right">Invoice Count</th>
                    <th className="px-6 py-3 text-right">Total Outstanding</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                   {reportData.map((row: any, i: number) => (
                     <tr key={i} className="hover:bg-gray-50">
                       <td className="px-6 py-4 font-medium">
                         <span className={`px-2 py-1 rounded text-xs ${i===3 ? 'bg-red-100 text-red-800' : 'bg-gray-100'}`}>
                           {row.label}
                         </span>
                       </td>
                       <td className="px-6 py-4 text-right">{row.count}</td>
                       <td className="px-6 py-4 text-right font-bold">{formatINR(row.amount)}</td>
                     </tr>
                   ))}
                </tbody>
              </table>
           )}

           {reportType === 'custom' && (
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 text-gray-600 font-bold uppercase">
                  <tr>
                    {customColumns.filter(c => selectedColumns.has(c.id)).map(col => (
                      <th key={col.id} className="px-6 py-3">{col.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {reportData.map((row: any, i: number) => (
                    <tr key={i} className="hover:bg-gray-50">
                      {customColumns.filter(c => selectedColumns.has(c.id)).map(col => (
                        <td key={col.id} className="px-6 py-4">
                          {/* Accessor logic is applied here in render, usually better to pre-calc but this is fine for mock */}
                          {col.id === 'amount' ? formatINR(row.amount) : row[col.id]} 
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
           )}
         </div>
      </div>
    </div>
  );
};

export default Reports;
