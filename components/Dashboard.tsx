import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../App';
import {
  LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Legend, Cell, PieChart, Pie, ReferenceLine, ComposedChart
} from 'recharts';
import { Vehicle, Booking } from '../types';
import { DashboardSkeleton } from './Skeleton';

// Helper for formatting
const formatINR = (amount: number) => 
  amount.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });

const formatCompactINR = (amount: number) => 
  Intl.NumberFormat('en-IN', { notation: "compact", style: "currency", currency: "INR" }).format(amount);

// --- Row 1: KPI Cards ---

const KPICard: React.FC<{ 
  title: string; 
  value: string; 
  subValue?: React.ReactNode; 
  chart?: React.ReactNode 
}> = ({ title, value, subValue, chart }) => (
  <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 flex flex-col justify-between h-40 transition-shadow hover:shadow-md">
    <div>
      <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">{title}</h3>
      <div className="mt-2 text-2xl font-bold text-gray-900">{value}</div>
      {subValue && <div className="mt-1 text-sm">{subValue}</div>}
    </div>
    <div className="flex-1 mt-2 min-h-[40px] relative">
      {chart}
    </div>
  </div>
);

// --- Row 2: Profitability Analytics ---

const CostPerMileChart: React.FC<{ vehicles: Vehicle[], expenses: any[] }> = ({ vehicles, expenses }) => {
  const navigate = useNavigate();

  const data = useMemo(() => {
    return vehicles.slice(0, 10).map(v => {
      const vExpenses = expenses.filter((e: any) => e.vehicleId === v.id).reduce((acc: number, cur: any) => acc + cur.amount, 0);
      const cpm = v.mileage > 0 ? vExpenses / (v.mileage / 10) : 0; // Simulated normalized CPM
      return { name: v.regNumber, cpm: cpm, id: v.regNumber }; // using regNumber as ID for search
    }).sort((a, b) => b.cpm - a.cpm);
  }, [vehicles, expenses]);

  const handleClick = (data: any) => {
    if (data && data.activePayload && data.activePayload.length > 0) {
      const vehicleReg = data.activePayload[0].payload.name;
      navigate('/fleet', { state: { searchQuery: vehicleReg } });
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">Cost Efficiency (Cost/km) <span className="text-xs font-normal text-gray-400 ml-2">(Click bar to view vehicle)</span></h3>
      <div className="h-64 cursor-pointer">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart layout="vertical" data={data} margin={{ left: 20 }} onClick={handleClick}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
            <XAxis type="number" hide />
            <YAxis dataKey="name" type="category" width={100} tick={{fontSize: 10}} />
            <Tooltip formatter={(val: number) => `₹${val.toFixed(2)} /km`} />
            <ReferenceLine x={4} stroke="red" label="Benchmark" strokeDasharray="3 3" />
            <Bar dataKey="cpm" radius={[0, 4, 4, 0]} barSize={20}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.cpm > 4 ? '#ef4444' : '#22c55e'} className="hover:opacity-80 transition-opacity" />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

const RevVsCostChart: React.FC<{ invoices: any[], expenses: any[] }> = ({ invoices, expenses }) => {
  const data = useMemo(() => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    return months.map(m => ({
      name: m,
      revenue: Math.floor(Math.random() * 500000) + 200000,
      cost: Math.floor(Math.random() * 300000) + 100000,
    }));
  }, []);

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">Revenue vs Costs (90 Days)</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="name" tick={{fontSize: 12}} />
            <YAxis tickFormatter={(val) => `₹${val/1000}k`} tick={{fontSize: 12}} />
            <Tooltip formatter={(val: number) => formatCompactINR(val)} />
            <Legend />
            <Area type="monotone" dataKey="revenue" fill="#e0f2fe" stroke="none" />
            <Line type="monotone" dataKey="revenue" stroke="#1976d2" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="cost" stroke="#ef4444" strokeWidth={2} dot={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

const CustomerProfitabilityChart: React.FC<{ customers: any[], invoices: any[] }> = ({ customers, invoices }) => {
  const data = useMemo(() => {
    return customers.slice(0, 15).map(c => {
      const rev = invoices.filter(i => i.customerId === c.id).reduce((acc, cur) => acc + cur.amount, 0);
      const cost = rev * (0.6 + Math.random() * 0.3); // Simulate cost
      return { name: c.name.split(' ')[0], revenue: rev, cost: cost };
    }).sort((a, b) => b.revenue - a.revenue);
  }, [customers, invoices]);

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">Customer Profitability</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="name" tick={{fontSize: 10}} />
            <YAxis hide />
            <Tooltip cursor={{fill: 'transparent'}} formatter={(val: number) => formatCompactINR(val)} />
            <Bar dataKey="revenue" stackId="a" fill="#1976d2" />
            <Bar dataKey="cost" stackId="a" fill="#f59e0b" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

// --- Row 3: Predictive Cash Flow ---

const CashFlowWidget: React.FC = () => {
  const [collectionRate, setCollectionRate] = useState(90);
  const [expenseVar, setExpenseVar] = useState(0);

  const data = useMemo(() => {
    let balance = 1200000;
    const days = [];
    for (let i = 0; i < 90; i+=5) {
      const baseInflow = 50000;
      const baseOutflow = 30000;
      const inflow = baseInflow * (collectionRate / 100);
      const outflow = baseOutflow * (1 + expenseVar / 100);
      balance = balance + inflow - outflow;
      
      days.push({
        day: `Day ${i}`,
        expected: balance,
        optimistic: balance * 1.1,
        pessimistic: balance * 0.85
      });
    }
    return days;
  }, [collectionRate, expenseVar]);

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 col-span-1 md:col-span-2 xl:col-span-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-800">90-Day Cash Flow Forecast</h3>
          <p className="text-sm text-gray-500">Adjust parameters to simulate future scenarios.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-6 mt-4 md:mt-0 w-full md:w-auto">
           <div className="w-full sm:w-48">
             <label className="flex justify-between text-xs font-semibold text-gray-500 uppercase mb-2">
               <span>Collection Rate</span>
               <span className="text-primary">{collectionRate}%</span>
             </label>
             <input 
               type="range" min="70" max="100" value={collectionRate} 
               onChange={(e) => setCollectionRate(Number(e.target.value))}
               className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary"
             />
           </div>
           <div className="w-full sm:w-48">
             <label className="flex justify-between text-xs font-semibold text-gray-500 uppercase mb-2">
                <span>Expense Var</span>
                <span className={expenseVar > 0 ? "text-red-500" : "text-green-500"}>{expenseVar > 0 ? '+' : ''}{expenseVar}%</span>
             </label>
             <input 
               type="range" min="-20" max="20" value={expenseVar} 
               onChange={(e) => setExpenseVar(Number(e.target.value))}
               className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary"
             />
           </div>
        </div>
      </div>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="colorExp" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#1976d2" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#1976d2" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="day" />
            <YAxis tickFormatter={(val) => `₹${val/100000}L`} />
            <Tooltip formatter={(val: number) => formatINR(val)} />
            <Area type="monotone" dataKey="optimistic" stackId="1" stroke="#4caf50" fill="#e8f5e9" strokeDasharray="5 5" />
            <Area type="monotone" dataKey="expected" stackId="2" stroke="#1976d2" fill="url(#colorExp)" strokeWidth={3} />
            <Area type="monotone" dataKey="pessimistic" stackId="3" stroke="#f44336" fill="#ffebee" strokeDasharray="5 5" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

// --- Row 4: Breakeven Widgets ---

const BreakevenSection: React.FC<{ shipments: any[] }> = ({ shipments }) => {
  const totalRevenue = 4500000;
  const breakevenTarget = 3800000;
  const progress = (totalRevenue / breakevenTarget) * 100;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 col-span-1 md:col-span-2 xl:col-span-4">
      {/* Shipment Table */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Shipment Breakeven Analysis</h3>
        <div className="overflow-x-auto max-h-60 overflow-y-auto">
          <table className="w-full text-sm text-left">
             <thead className="bg-gray-50 text-gray-600 sticky top-0">
               <tr>
                 <th className="px-4 py-2">Route</th>
                 <th className="px-4 py-2 text-right">Current Rate</th>
                 <th className="px-4 py-2 text-right">Breakeven</th>
                 <th className="px-4 py-2">Status</th>
               </tr>
             </thead>
             <tbody className="divide-y divide-gray-100">
               {shipments.map(s => {
                 const isLoss = s.currentRate < s.breakevenRate;
                 return (
                   <tr key={s.id} className={isLoss ? 'bg-red-50' : ''}>
                     <td className="px-4 py-2 font-medium">{s.route}</td>
                     <td className="px-4 py-2 text-right">{formatINR(s.currentRate)}</td>
                     <td className="px-4 py-2 text-right text-gray-500">{formatINR(s.breakevenRate)}</td>
                     <td className="px-4 py-2">
                       <span className={`text-xs font-bold px-2 py-0.5 rounded ${isLoss ? 'text-red-700 bg-red-100' : 'text-green-700 bg-green-100'}`}>
                         {isLoss ? 'LOSS' : 'PROFIT'}
                       </span>
                     </td>
                   </tr>
                 );
               })}
             </tbody>
          </table>
        </div>
      </div>

      {/* Fleet Breakeven Progress */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 flex flex-col justify-center">
        <h3 className="text-lg font-semibold text-gray-800 mb-2">Fleet Monthly Breakeven</h3>
        <p className="text-sm text-gray-500 mb-6">Revenue required to cover fixed + variable costs.</p>
        
        <div className="relative pt-1">
          <div className="flex mb-2 items-center justify-between">
            <div>
              <span className="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-blue-600 bg-blue-200">
                Current Revenue
              </span>
            </div>
            <div className="text-right">
              <span className="text-xs font-semibold inline-block text-blue-600">
                {Math.round(progress)}%
              </span>
            </div>
          </div>
          <div className="overflow-hidden h-4 mb-4 text-xs flex rounded bg-blue-100 relative">
            <div style={{ width: `${Math.min(progress, 100)}%` }} className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-blue-500 transition-all duration-1000"></div>
            {/* Target Line */}
            <div className="absolute top-0 bottom-0 border-r-2 border-gray-800 z-10" style={{ left: '85%' }}></div>
          </div>
          <div className="flex justify-between text-xs text-gray-600 font-medium">
             <span>₹0</span>
             <span className="pl-16">Target: {formatCompactINR(breakevenTarget)}</span>
             <span>Max</span>
          </div>
          <div className="mt-4 text-center">
            <p className="text-2xl font-bold text-gray-800">{formatINR(totalRevenue)}</p>
            <p className="text-sm text-green-600 font-medium">+₹{(totalRevenue - breakevenTarget).toLocaleString()} above breakeven</p>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Row 5: Customer Intelligence ---

const CustomerIntelligence: React.FC<{ bookings: Booking[] }> = ({ bookings }) => {
  const stats = useMemo(() => {
    const map: Record<string, { id: string, name: string, revenue: number, expense: number }> = {};
    bookings.forEach(b => {
      if (!map[b.customerId]) map[b.customerId] = { id: b.customerId, name: b.customerName, revenue: 0, expense: 0 };
      map[b.customerId].revenue += b.amount;
      map[b.customerId].expense += b.expense;
    });

    const list = Object.values(map).map(c => ({
      ...c,
      margin: c.revenue > 0 ? ((c.revenue - c.expense) / c.revenue) * 100 : 0
    })).sort((a, b) => b.margin - a.margin);

    return {
      top: list.slice(0, 5),
      bottom: list.slice(-5).reverse() // Worst first
    };
  }, [bookings]);

  const RenderTable = ({ data, type }: { data: typeof stats.top, type: 'good' | 'bad' }) => (
    <div className="overflow-x-auto">
      <table className="w-full text-sm text-left">
        <thead className="bg-gray-50 text-gray-600">
           <tr>
             <th className="px-4 py-2">Customer</th>
             <th className="px-4 py-2 text-right">Revenue</th>
             <th className="px-4 py-2 text-right">Margin %</th>
           </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
           {data.map((c, i) => (
             <tr key={i} className={type === 'bad' && c.margin < 0 ? 'bg-red-50' : ''}>
               <td className="px-4 py-2 font-medium truncate max-w-[150px]" title={c.name}>{c.name}</td>
               <td className="px-4 py-2 text-right text-gray-500">{formatCompactINR(c.revenue)}</td>
               <td className="px-4 py-2 text-right">
                 <div className="flex items-center justify-end">
                    {type === 'bad' && c.margin < 10 && <span className="material-icons text-red-500 text-xs mr-1">warning</span>}
                    <span className={`font-bold ${c.margin < 0 ? 'text-red-600' : c.margin < 10 ? 'text-yellow-600' : 'text-green-600'}`}>
                      {c.margin.toFixed(1)}%
                    </span>
                 </div>
               </td>
             </tr>
           ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 col-span-1 md:col-span-2 xl:col-span-4">
       <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
         <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
            <span className="material-icons text-green-500 mr-2">trending_up</span>
            Top 5 Profitable Customers
         </h3>
         <RenderTable data={stats.top} type="good" />
       </div>
       <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
         <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
            <span className="material-icons text-red-500 mr-2">trending_down</span>
            Bottom 5 Margin Drainers
         </h3>
         <RenderTable data={stats.bottom} type="bad" />
       </div>
    </div>
  );
};

// --- Row 6: Lane & Alert Intelligence ---

const LaneIntelligence: React.FC<{ bookings: Booking[] }> = ({ bookings }) => {
  const [selectedLane, setSelectedLane] = useState<any>(null);

  const { lanes, avgCPKM } = useMemo(() => {
    const map: Record<string, { route: string, expense: number, distance: number }> = {};
    bookings.forEach(b => {
      const route = `${b.origin} - ${b.destination}`;
      if (!map[route]) map[route] = { route, expense: 0, distance: 0 };
      map[route].expense += b.expense;
      map[route].distance += b.distance;
    });

    const totalExp = bookings.reduce((a, b) => a + b.expense, 0);
    const totalDist = bookings.reduce((a, b) => a + b.distance, 0);
    const avg = totalDist ? totalExp / totalDist : 0;

    const list = Object.values(map).map(l => ({
      ...l,
      cpkm: l.distance ? l.expense / l.distance : 0,
    })).sort((a, b) => b.cpkm - a.cpkm).slice(0, 10); // Top 10 expensive

    return { lanes: list, avgCPKM: avg };
  }, [bookings]);

  const breakdownData = useMemo(() => {
     if(!selectedLane) return [];
     // Mock breakdown simulation
     return [
       { name: 'Fuel', value: 50 + Math.random() * 10, fill: '#ef4444' },
       { name: 'Driver', value: 20 + Math.random() * 5, fill: '#3b82f6' },
       { name: 'Tolls', value: 15 + Math.random() * 5, fill: '#f59e0b' },
       { name: 'Maint', value: 10, fill: '#10b981' }
     ];
  }, [selectedLane]);

  return (
    <div className="col-span-1 md:col-span-2 xl:col-span-2 bg-white p-6 rounded-lg shadow-sm border border-gray-100 relative">
      <h3 className="text-lg font-semibold text-gray-800 mb-2">High-Cost Lane Tracker</h3>
      <p className="text-xs text-gray-500 mb-4">Top 10 lanes by Cost per KM vs Fleet Average (₹{avgCPKM.toFixed(2)})</p>
      
      {/* Modal / Overlay for Drilldown */}
      {selectedLane && (
        <div className="absolute inset-0 z-10 bg-white/95 flex flex-col items-center justify-center p-6 rounded-lg animate-fade-in text-center">
           <h4 className="text-xl font-bold text-gray-800 mb-2">{selectedLane.route}</h4>
           <p className="text-sm text-gray-500 mb-6">Cost per KM: <span className="font-bold text-red-600">₹{selectedLane.cpkm.toFixed(2)}</span></p>
           
           <div className="h-48 w-full max-w-xs">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                   <Pie data={breakdownData} dataKey="value" nameKey="name" outerRadius={60} innerRadius={30} label>
                     {breakdownData.map((e,i) => <Cell key={i} fill={e.fill} />)}
                   </Pie>
                   <Tooltip />
                   <Legend />
                </PieChart>
              </ResponsiveContainer>
           </div>
           
           <button 
             onClick={() => setSelectedLane(null)} 
             className="mt-6 text-sm text-gray-600 hover:text-gray-900 underline"
           >
             Close Breakdown
           </button>
        </div>
      )}

      <div className="h-64 cursor-pointer">
        <ResponsiveContainer width="100%" height="100%">
           <BarChart data={lanes} layout="vertical" onClick={(data) => data?.activePayload && setSelectedLane(data.activePayload[0].payload)}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" hide />
              <YAxis dataKey="route" type="category" width={110} tick={{fontSize: 10}} />
              <Tooltip formatter={(val: number) => `₹${val.toFixed(2)} /km`} />
              <ReferenceLine x={avgCPKM} stroke="blue" strokeDasharray="3 3" label={{ value: "Avg", fontSize: 10, position: 'insideBottomRight' }} />
              <Bar dataKey="cpkm" barSize={15} radius={[0, 4, 4, 0]}>
                 {lanes.map((entry, index) => (
                    <Cell key={index} fill={entry.cpkm > avgCPKM * 1.2 ? '#ef4444' : '#f59e0b'} />
                 ))}
              </Bar>
           </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

const LiveLossAlert: React.FC<{ bookings: Booking[] }> = ({ bookings }) => {
  const alerts = useMemo(() => {
    return bookings.filter(b => b.status === 'pending' && b.expense > b.amount);
  }, [bookings]);

  return (
    <div className="col-span-1 md:col-span-2 xl:col-span-2 bg-white p-6 rounded-lg shadow-sm border border-gray-100 flex flex-col">
       <div className="flex items-center justify-between mb-4">
         <h3 className="text-lg font-semibold text-gray-800">Live Loss Alerts</h3>
         <span className={`px-2 py-1 rounded-full text-xs font-bold ${alerts.length > 0 ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-green-100 text-green-600'}`}>
           {alerts.length > 0 ? `${alerts.length} Critical` : 'All Good'}
         </span>
       </div>
       
       <div className="flex-1 overflow-y-auto pr-2">
         {alerts.length === 0 ? (
           <div className="h-full flex flex-col items-center justify-center text-gray-400">
              <span className="material-icons text-4xl mb-2 text-green-300">verified_user</span>
              <p>No projected losses in pending trips.</p>
           </div>
         ) : (
           <div className="space-y-3">
             {alerts.map(b => (
               <div key={b.id} className="p-3 border-l-4 border-red-500 bg-red-50 rounded-r-md">
                  <div className="flex justify-between items-start">
                     <div>
                       <p className="font-bold text-red-900 text-sm">Trip #{b.id}</p>
                       <p className="text-xs text-red-700">{b.origin} → {b.destination}</p>
                     </div>
                     <div className="text-right">
                       <p className="font-bold text-red-600 text-sm">-{formatINR(b.expense - b.amount)}</p>
                       <p className="text-[10px] text-red-500">Rev: {formatCompactINR(b.amount)} | Cost: {formatCompactINR(b.expense)}</p>
                     </div>
                  </div>
                  <div className="mt-2 text-xs text-red-800 flex items-center">
                     <span className="material-icons text-[12px] mr-1">warning</span>
                     Action: Review expense report before invoicing.
                  </div>
               </div>
             ))}
           </div>
         )}
       </div>
    </div>
  );
};

// --- Main Dashboard Component ---

const Dashboard: React.FC = () => {
  const { state } = useApp();
  const navigate = useNavigate();

  const isOpsManager = state.currentUser.role === 'Operations Manager';

  // Use Skeleton Loader
  if (state.isLoading) return <DashboardSkeleton />;

  // Data Aggregation for KPI Cards
  const totalBalance = state.invoices.filter(i => i.status === 'paid').reduce((a, b) => a + b.amount, 0) - 
                       state.expenses.reduce((a, b) => a + b.amount, 0);

  const receivables = state.invoices.filter(i => i.status === 'sent' || i.status === 'overdue').reduce((a, b) => a + b.amount, 0);
  const receivablesData = [
    { name: '0-30', value: receivables * 0.5, color: '#4caf50', minDays: 0 },
    { name: '31-60', value: receivables * 0.3, color: '#ff9800', minDays: 31 },
    { name: '90+', value: receivables * 0.2, color: '#f44336', minDays: 90 },
  ];

  const payables = state.expenses.reduce((a, b) => a + b.amount, 0) * 0.15; // Simulated
  const monthlyExpenses = state.expenses.reduce((a, b) => a + b.amount, 0) / 12; // Simulated monthly avg

  const expensePieData = [
    { name: 'Fuel', value: 65, color: '#ef4444' },
    { name: 'Maint', value: 25, color: '#3b82f6' },
    { name: 'Other', value: 10, color: '#9ca3af' },
  ];

  // Dummy Sparkline Data
  const sparkData = Array.from({length: 7}).map((_, i) => ({ val: Math.random() * 100 }));

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 pb-12">
      
      {/* Row 1: KPI Cards - Hidden for Ops Manager */}
      {!isOpsManager && (
        <>
          <KPICard 
            title="Total Balance" 
            value={formatCompactINR(totalBalance)}
            subValue={<span className="text-green-600 font-medium text-xs">↑ 12% vs last month</span>}
            chart={
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={sparkData}>
                  <Line type="monotone" dataKey="val" stroke="#1976d2" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            }
          />
          
          <KPICard 
            title="Receivables" 
            value={formatCompactINR(receivables)}
            subValue={<span className="text-gray-500 text-xs">Aging Breakdown (Click to filter)</span>}
            chart={
              <div className="flex h-4 mt-4 w-full rounded overflow-hidden">
                {receivablesData.map((d, i) => (
                  <div 
                    key={i} 
                    style={{ width: `${(d.value / receivables) * 100}%`, backgroundColor: d.color }} 
                    title={`${d.name}: ${formatCompactINR(d.value)}`} 
                    className="cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => navigate('/customers', { state: { minOverdueDays: d.minDays, statusFilter: 'overdue' } })}
                  />
                ))}
              </div>
            }
          />
          
          <KPICard 
            title="Payables" 
            value={formatCompactINR(payables)} 
            subValue={
              <div className="flex justify-between text-xs mt-1">
                <span className="text-red-500 font-medium">Overdue: ₹1.2L</span>
                <span className="text-gray-500">Due 7d: ₹45k</span>
              </div>
            }
            chart={<div className="bg-gray-100 h-1.5 rounded-full mt-6 w-full"><div className="bg-red-500 h-1.5 rounded-full w-2/3"></div></div>}
          />
        </>
      )}
      
      {/* Ops Manager always sees Fleet Expenses */}
      <KPICard 
        title="Fleet Expenses (Mo)" 
        value={formatCompactINR(monthlyExpenses)}
        chart={
          <div className="flex items-center">
            <div className="h-16 w-16 relative">
              <ResponsiveContainer>
                <PieChart>
                  <Tooltip />
                  <Pie data={expensePieData} dataKey="value" innerRadius={15} outerRadius={30} paddingAngle={2}>
                    {expensePieData.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="text-xs ml-2 space-y-1">
              <div className="flex items-center"><span className="w-2 h-2 rounded-full bg-red-500 mr-1"></span>Fuel</div>
              <div className="flex items-center"><span className="w-2 h-2 rounded-full bg-blue-500 mr-1"></span>Maint</div>
            </div>
          </div>
        }
      />

      {/* Row 2: Analytics */}
      <div className="col-span-1 md:col-span-2 xl:col-span-1">
        <CostPerMileChart vehicles={state.vehicles} expenses={state.expenses} />
      </div>
      
      {!isOpsManager && (
        <>
          <div className="col-span-1 md:col-span-2 xl:col-span-2">
            <RevVsCostChart invoices={state.invoices} expenses={state.expenses} />
          </div>
          <div className="col-span-1 md:col-span-2 xl:col-span-1">
            <CustomerProfitabilityChart customers={state.customers} invoices={state.invoices} />
          </div>
          
          {/* Row 3 & 4 */}
          <CashFlowWidget />
          <BreakevenSection shipments={state.shipments} />
          
          {/* Row 5: Customer Intelligence */}
          <CustomerIntelligence bookings={state.bookings} />

          {/* Row 6: Lane & Alert Intelligence */}
          <LaneIntelligence bookings={state.bookings} />
          <LiveLossAlert bookings={state.bookings} />
        </>
      )}

      {/* Ops Manager sees specific detailed widgets instead of Cash Flow */}
      {isOpsManager && (
         <div className="col-span-1 md:col-span-2 xl:col-span-3 bg-blue-50 p-6 rounded-lg border border-blue-100 flex items-center justify-center text-blue-800">
            <p>Operational Metrics: Maintenance Scheduling & Route Optimization Views (Placeholder)</p>
         </div>
      )}

    </div>
  );
};

export default Dashboard;