
import React, { useState, useMemo, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useLocation } from 'react-router-dom';
import { useApp, formatINR } from '../App';
import { Expense } from '../types';

// --- Validation Schema ---
const expenseSchema = yup.object({
  vehicleId: yup.string().required('Vehicle is required'),
  category: yup.string().oneOf(['Fuel', 'Maintenance', 'Insurance', 'Toll', 'Driver', 'EMI']).required('Category is required'),
  amount: yup.number().positive().required('Amount is required'),
  vendor: yup.string().required('Vendor is required'),
  odometer: yup.number().positive().required('Odometer reading is required')
    .test('is-greater', 'Must be greater than previous reading', function(value) {
       // We can't easily access state here for dynamic validation in simple yup schema without context.
       // We will handle logic in component but keep basic number check here.
       return true; 
    }),
  liters: yup.number().when('category', {
    is: 'Fuel',
    then: (schema) => schema.positive().required('Liters is required for Fuel'),
    otherwise: (schema) => schema.notRequired()
  })
}).required();

// --- Components ---

const AddExpenseModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { state, dispatch } = useApp();
  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm({
    resolver: yupResolver(expenseSchema),
    defaultValues: {
      category: 'Fuel'
    }
  });
  const [filePreview, setFilePreview] = useState<string | null>(null);

  const selectedVehicleId = watch('vehicleId');
  const selectedCategory = watch('category');
  const currentOdometer = watch('odometer');
  const liters = watch('liters');

  const selectedVehicle = useMemo(() => state.vehicles.find(v => v.id === selectedVehicleId), [state.vehicles, selectedVehicleId]);
  
  // Smart Calculations
  const prevMileage = selectedVehicle?.mileage || 0;
  const distanceRun = currentOdometer && currentOdometer > prevMileage ? currentOdometer - prevMileage : 0;
  
  const fuelEfficiency = (selectedCategory === 'Fuel' && liters && distanceRun > 0) 
    ? (distanceRun / liters).toFixed(2) 
    : null;

  useEffect(() => {
    // Auto-set Odometer min value to current mileage
    if (selectedVehicle) {
      setValue('odometer', selectedVehicle.mileage);
    }
  }, [selectedVehicle, setValue]);

  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      const url = URL.createObjectURL(file);
      setFilePreview(url);
    }
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
       const url = URL.createObjectURL(e.target.files[0]);
       setFilePreview(url);
    }
  };

  const onSubmit = (data: any) => {
    if (data.odometer < prevMileage) {
      alert(`Odometer reading cannot be less than previous reading (${prevMileage} km)`);
      return;
    }

    const newExpense: any = {
      id: Math.random().toString(36).substr(2, 9),
      vehicleId: data.vehicleId,
      category: data.category,
      amount: data.amount,
      vendor: data.vendor,
      date: new Date().toISOString().split('T')[0],
      costPerKm: distanceRun > 0 ? data.amount / distanceRun : 0,
      odometer: data.odometer,
      receiptUrl: filePreview || undefined
    };
    
    dispatch({ type: 'ADD_EXPENSE', payload: newExpense });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg border border-gray-200">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50 rounded-t-lg">
          <h2 className="text-xl font-bold text-gray-900">Add Vehicle Expense</h2>
          <button onClick={onClose}><span className="material-icons text-gray-400 hover:text-gray-600">close</span></button>
        </div>
        
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle</label>
            <select {...register("vehicleId")} className="w-full border-gray-300 rounded-md shadow-sm p-2 focus:ring-primary focus:border-primary">
              <option value="">Select Vehicle</option>
              {state.vehicles.map(v => (
                <option key={v.id} value={v.id}>{v.regNumber} - {v.model}</option>
              ))}
            </select>
            <p className="text-red-500 text-xs mt-1">{errors.vehicleId?.message as string}</p>
          </div>

          {selectedVehicle && (
             <div className="bg-blue-50 p-3 rounded text-sm text-blue-800 flex justify-between">
                <span>Current Odometer: <strong>{prevMileage.toLocaleString()} km</strong></span>
                <span>Status: <strong className="uppercase">{selectedVehicle.status}</strong></span>
             </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select {...register("category")} className="w-full border-gray-300 rounded-md shadow-sm p-2">
                <option value="Fuel">Fuel</option>
                <option value="Maintenance">Maintenance</option>
                <option value="Toll">Toll</option>
                <option value="Insurance">Insurance</option>
                <option value="Driver">Driver Salary/Allowance</option>
                <option value="EMI">Vehicle EMI</option>
              </select>
              <p className="text-red-500 text-xs mt-1">{errors.category?.message as string}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Amount (₹)</label>
              <input type="number" {...register("amount")} className="w-full border-gray-300 rounded-md shadow-sm p-2" />
              <p className="text-red-500 text-xs mt-1">{errors.amount?.message as string}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
             <div>
               <label className="block text-sm font-medium text-gray-700 mb-1">Current Odometer (km)</label>
               <input type="number" {...register("odometer")} className="w-full border-gray-300 rounded-md shadow-sm p-2" />
               <p className="text-red-500 text-xs mt-1">{errors.odometer?.message as string}</p>
             </div>
             
             {selectedCategory === 'Fuel' && (
                <div>
                   <label className="block text-sm font-medium text-gray-700 mb-1">Fuel Volume (Liters)</label>
                   <input type="number" step="0.1" {...register("liters")} className="w-full border-gray-300 rounded-md shadow-sm p-2" />
                   <p className="text-red-500 text-xs mt-1">{errors.liters?.message as string}</p>
                </div>
             )}
          </div>

          {/* Smart Calc Preview */}
          {distanceRun > 0 && (
            <div className="bg-green-50 p-3 rounded border border-green-100 grid grid-cols-2 gap-2 text-sm">
               <div>
                  <span className="block text-xs text-green-600 uppercase font-bold">Distance Run</span>
                  <span className="font-medium text-gray-900">{distanceRun} km</span>
               </div>
               {fuelEfficiency && (
                 <div className="text-right">
                    <span className="block text-xs text-green-600 uppercase font-bold">Fuel Efficiency</span>
                    <span className="font-bold text-gray-900 text-lg">{fuelEfficiency} km/L</span>
                 </div>
               )}
            </div>
          )}
          
          <div className="text-xs text-gray-500 bg-yellow-50 p-2 rounded border border-yellow-100">
             <span className="font-bold text-yellow-700">Policy:</span> Expenses over ₹50,000 require approval from a Finance Manager.
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Vendor / Payee</label>
            <input type="text" {...register("vendor")} className="w-full border-gray-300 rounded-md shadow-sm p-2" placeholder="e.g., Indian Oil" />
            <p className="text-red-500 text-xs mt-1">{errors.vendor?.message as string}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Upload Receipt</label>
            <div 
              className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:bg-gray-50 transition-colors cursor-pointer relative"
              onDragOver={e => e.preventDefault()}
              onDrop={onDrop}
            >
              <input type="file" accept="image/*" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={onFileChange} />
              {filePreview ? (
                <div className="flex flex-col items-center">
                  <img src={filePreview} alt="Preview" className="h-20 object-contain mb-2 rounded shadow-sm" />
                  <p className="text-green-600 text-sm font-medium">File Uploaded</p>
                </div>
              ) : (
                <>
                  <span className="material-icons text-gray-400 text-3xl">cloud_upload</span>
                  <p className="text-sm text-gray-500 mt-2">Drag and drop or click to upload</p>
                </>
              )}
            </div>
          </div>

          <div className="pt-4 flex justify-end space-x-3">
             <button type="button" onClick={onClose} className="px-4 py-2 border rounded text-gray-700 hover:bg-gray-50">Cancel</button>
             <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 shadow-sm">Save Expense</button>
          </div>
        </form>
      </div>
    </div>
  );
};

// --- Helper Functions ---

const formatPnL = (amount: number) => {
  if (amount === 0) return <span className="text-gray-300">-</span>;
  const isNeg = amount < 0;
  return (
    <span className={isNeg ? 'text-red-600 font-medium' : 'text-gray-900 font-medium'}>
      {isNeg ? `(${formatINR(Math.abs(amount))})` : formatINR(amount)}
    </span>
  );
};

const FleetLedger: React.FC = () => {
  const { state, dispatch } = useApp();
  const location = useLocation();
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM

  useEffect(() => {
    if (location.state && (location.state as any).searchQuery) {
      dispatch({ type: 'SET_SEARCH_QUERY', payload: (location.state as any).searchQuery });
    }
  }, [location.state, dispatch]);

  // --- Financial Aggregation Logic ---
  const fleetFinancials = useMemo(() => {
    // 1. Filter period
    // Filter expenses in period
    const periodExpenses = state.expenses.filter(e => e.date.startsWith(selectedMonth));
    
    // Filter bookings completed in period (TMS Revenue Integration)
    const periodBookings = state.bookings.filter(b => 
      b.completedDate.startsWith(selectedMonth) || b.bookedDate.startsWith(selectedMonth)
    );

    // 2. Aggregate per Vehicle
    const vehicleStats = state.vehicles.map(vehicle => {
      // Revenue (A) - TMS Integration
      const vehicleBookings = periodBookings.filter(b => b.vehicleId === vehicle.id);
      const revenue = vehicleBookings.reduce((sum, b) => sum + b.amount, 0);
      const tripCount = vehicleBookings.length;
      
      // Calculate Total KMs for Month (Cost per KM Tracking)
      const totalDistance = vehicleBookings.reduce((sum, b) => sum + b.distance, 0);

      // Costs
      const vehicleExpenses = periodExpenses.filter(e => e.vehicleId === vehicle.id);
      
      // Direct Costs (B): Fuel, Tolls, Driver
      const directCosts = vehicleExpenses
        .filter(e => ['Fuel', 'Toll', 'Driver'].includes(e.category))
        .reduce((sum, e) => sum + e.amount, 0);

      // Indirect/Fixed Costs (C): Maintenance, Insurance, EMI
      const indirectCosts = vehicleExpenses
        .filter(e => ['Maintenance', 'Insurance', 'EMI'].includes(e.category))
        .reduce((sum, e) => sum + e.amount, 0);

      // Calculations
      const operatingMargin = revenue - directCosts;
      const netProfit = operatingMargin - indirectCosts;
      const profitMargin = revenue > 0 ? (netProfit / revenue) * 100 : 0;
      
      // Cost per KM (Direct Costs / Total KM)
      const costPerKm = totalDistance > 0 ? directCosts / totalDistance : 0;

      return {
        ...vehicle,
        tripCount,
        revenue,
        directCosts,
        indirectCosts,
        operatingMargin,
        netProfit,
        profitMargin,
        totalDistance,
        costPerKm
      };
    });

    // 3. Filter by search
    if (state.searchQuery) {
      const q = state.searchQuery.toLowerCase();
      return vehicleStats.filter(v => 
        v.regNumber.toLowerCase().includes(q) || 
        v.model.toLowerCase().includes(q)
      );
    }

    return vehicleStats;
  }, [state.vehicles, state.expenses, state.bookings, selectedMonth, state.searchQuery]);

  // --- Fleet Level Summary ---
  const summary = useMemo(() => {
    const totalVehicles = state.vehicles.length;
    const activeVehicles = state.vehicles.filter(v => v.status === 'active').length;
    const utilization = totalVehicles > 0 ? (activeVehicles / totalVehicles) * 100 : 0;

    const totalProfit = fleetFinancials.reduce((acc, v) => acc + v.netProfit, 0);
    const avgProfit = totalVehicles > 0 ? totalProfit / totalVehicles : 0;

    // Top Expense Category
    const periodExpenses = state.expenses.filter(e => e.date.startsWith(selectedMonth));
    const expByCategory: Record<string, number> = {};
    let totalExp = 0;
    periodExpenses.forEach(e => {
      expByCategory[e.category] = (expByCategory[e.category] || 0) + e.amount;
      totalExp += e.amount;
    });
    
    let topCategory = 'None';
    let topCategoryAmount = 0;
    Object.entries(expByCategory).forEach(([cat, amt]) => {
      if (amt > topCategoryAmount) {
        topCategory = cat;
        topCategoryAmount = amt;
      }
    });
    const topCategoryPct = totalExp > 0 ? (topCategoryAmount / totalExp) * 100 : 0;

    return { utilization, avgProfit, topCategory, topCategoryPct };
  }, [fleetFinancials, state.vehicles, state.expenses, selectedMonth]);

  return (
    <div className="space-y-6">
      {/* Title & Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Vehicle Profitability (P&L)</h1>
          <p className="text-sm text-gray-500">Real-time financial performance per asset.</p>
        </div>
        <div className="flex space-x-3 mt-4 sm:mt-0 items-center">
          <input 
            type="month" 
            value={selectedMonth} 
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="border-gray-300 rounded-md shadow-sm text-sm p-2 focus:ring-primary focus:border-primary"
          />
          <button 
            onClick={() => setShowAddModal(true)}
            className="bg-primary text-white px-4 py-2 rounded-lg shadow-sm hover:bg-blue-700 flex items-center font-medium transition-colors"
          >
            <span className="material-icons text-sm mr-2">add</span>
            Add Expense
          </button>
        </div>
      </div>

      {showAddModal && <AddExpenseModal onClose={() => setShowAddModal(false)} />}

      {/* Summary Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
         <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 border-l-4 border-l-blue-500">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Fleet Utilization</p>
            <div className="flex items-end justify-between mt-2">
               <span className="text-2xl font-bold text-gray-900">{summary.utilization.toFixed(0)}%</span>
               <span className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">{state.vehicles.filter(v=>v.status === 'active').length} Active</span>
            </div>
         </div>
         <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 border-l-4 border-l-green-500">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Avg. Profit per Vehicle</p>
            <div className="flex items-end justify-between mt-2">
               <span className="text-2xl font-bold text-gray-900">{formatINR(summary.avgProfit)}</span>
               <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded">Net / Unit</span>
            </div>
         </div>
         <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 border-l-4 border-l-orange-500">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Top Expense Category</p>
            <div className="flex items-end justify-between mt-2">
               <span className="text-xl font-bold text-gray-900 truncate">{summary.topCategory}</span>
               <span className="text-xs text-orange-600 bg-orange-50 px-2 py-1 rounded">{summary.topCategoryPct.toFixed(0)}% of Costs</span>
            </div>
         </div>
      </div>

      {/* P&L Data Grid */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
         <div className="overflow-x-auto">
           <table className="w-full text-left text-sm whitespace-nowrap">
             <thead className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-200">
               <tr>
                 <th className="px-4 py-3 sticky left-0 bg-gray-50 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">Vehicle No</th>
                 <th className="px-4 py-3 text-center">Trips</th>
                 <th className="px-4 py-3 text-right bg-blue-50 text-blue-800">Revenue (A)</th>
                 <th className="px-4 py-3 text-right text-gray-500">Direct Costs (B)</th>
                 <th className="px-4 py-3 text-right font-bold" title="Revenue - Direct Costs">Op. Margin</th>
                 <th className="px-4 py-3 text-right text-gray-500">Indirect Costs (C)</th>
                 <th className="px-4 py-3 text-right bg-green-50 text-green-800 border-l border-green-100">Net Profit</th>
                 <th className="px-4 py-3 text-right">Margin %</th>
                 <th className="px-4 py-3 text-right" title="Direct Cost / Total KM">CPKM</th>
               </tr>
             </thead>
             <tbody className="divide-y divide-gray-100">
               {fleetFinancials.length === 0 ? (
                 <tr>
                   <td colSpan={10} className="px-6 py-12 text-center text-gray-500">
                     No vehicle data found for {selectedMonth}.
                   </td>
                 </tr>
               ) : (
                 fleetFinancials.map(v => (
                   <tr key={v.id} className="hover:bg-gray-50 transition-colors group">
                     {/* Sticky Vehicle Column */}
                     <td className="px-4 py-3 sticky left-0 bg-white group-hover:bg-gray-50 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                       <div className="flex items-center">
                         <div className="w-8 h-8 rounded bg-gray-100 flex items-center justify-center text-gray-500 mr-3">
                           <span className="material-icons text-sm">local_shipping</span>
                         </div>
                         <div>
                           <p className="font-bold text-gray-900">{v.regNumber}</p>
                           <p className="text-xs text-gray-500 truncate max-w-[100px]">{v.model}</p>
                         </div>
                       </div>
                     </td>
                     
                     <td className="px-4 py-3 text-center">
                       {v.tripCount > 0 ? (
                         <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                           {v.tripCount}
                         </span>
                       ) : (
                         <span className="text-gray-300">-</span>
                       )}
                     </td>

                     <td className="px-4 py-3 text-right font-medium text-gray-900 bg-blue-50/30">
                       {v.revenue > 0 ? formatINR(v.revenue) : '-'}
                     </td>

                     <td className="px-4 py-3 text-right text-red-500">
                       {v.directCosts > 0 ? `(${formatINR(v.directCosts)})` : '-'}
                     </td>

                     <td className="px-4 py-3 text-right font-medium">
                       {formatPnL(v.operatingMargin)}
                     </td>

                     <td className="px-4 py-3 text-right text-orange-500">
                       {v.indirectCosts > 0 ? `(${formatINR(v.indirectCosts)})` : '-'}
                     </td>

                     <td className="px-4 py-3 text-right font-bold bg-green-50/30 border-l border-gray-100">
                       {formatPnL(v.netProfit)}
                     </td>

                     <td className="px-4 py-3 text-right">
                       {v.revenue > 0 ? (
                         <span className={`text-xs font-bold px-2 py-1 rounded ${v.profitMargin > 15 ? 'bg-green-100 text-green-700' : v.profitMargin > 0 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                           {v.profitMargin.toFixed(1)}%
                         </span>
                       ) : '-'}
                     </td>

                     <td className="px-4 py-3 text-right font-mono text-xs">
                        {v.totalDistance > 0 ? `₹${v.costPerKm.toFixed(2)}` : '-'}
                     </td>
                   </tr>
                 ))
               )}
             </tbody>
             {fleetFinancials.length > 0 && (
               <tfoot className="bg-gray-50 font-bold border-t border-gray-200">
                 <tr>
                   <td className="px-4 py-3 sticky left-0 bg-gray-50 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">Total Fleet</td>
                   <td className="px-4 py-3 text-center">{fleetFinancials.reduce((a,b)=>a+b.tripCount,0)}</td>
                   <td className="px-4 py-3 text-right text-blue-800">{formatINR(fleetFinancials.reduce((a,b)=>a+b.revenue,0))}</td>
                   <td className="px-4 py-3 text-right text-red-600">({formatINR(fleetFinancials.reduce((a,b)=>a+b.directCosts,0))})</td>
                   <td className="px-4 py-3 text-right">{formatINR(fleetFinancials.reduce((a,b)=>a+b.operatingMargin,0))}</td>
                   <td className="px-4 py-3 text-right text-orange-600">({formatINR(fleetFinancials.reduce((a,b)=>a+b.indirectCosts,0))})</td>
                   <td className="px-4 py-3 text-right text-green-800 border-l border-gray-200">{formatINR(fleetFinancials.reduce((a,b)=>a+b.netProfit,0))}</td>
                   <td className="px-4 py-3"></td>
                   <td className="px-4 py-3"></td>
                 </tr>
               </tfoot>
             )}
           </table>
         </div>
      </div>
    </div>
  );
};

export default FleetLedger;
