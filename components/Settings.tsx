import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useApp } from '../App';
import AuditLogViewer from './AuditLogViewer';

// --- Schema ---
const profileSchema = yup.object({
  companyName: yup.string().required('Company Name is required'),
  taxId: yup.string().required('Tax ID is required'),
  address: yup.string().required('Address is required'),
}).required();

// --- Components ---

const ProfileTab: React.FC = () => {
  const { state, dispatch } = useApp();
  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: state.userProfile,
    resolver: yupResolver(profileSchema)
  });

  const onSubmit = (data: any) => {
    dispatch({ type: 'UPDATE_PROFILE', payload: data });
    alert("Profile Updated Successfully!");
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="max-w-2xl space-y-6">
       <div>
         <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
         <input {...register("companyName")} className="w-full border-gray-300 rounded-md shadow-sm p-2" />
         <p className="text-red-500 text-xs mt-1">{errors.companyName?.message}</p>
       </div>
       <div>
         <label className="block text-sm font-medium text-gray-700 mb-1">Tax ID / GSTIN</label>
         <input {...register("taxId")} className="w-full border-gray-300 rounded-md shadow-sm p-2" />
         <p className="text-red-500 text-xs mt-1">{errors.taxId?.message}</p>
       </div>
       <div>
         <label className="block text-sm font-medium text-gray-700 mb-1">Registered Address</label>
         <textarea {...register("address")} className="w-full border-gray-300 rounded-md shadow-sm p-2 h-24" />
         <p className="text-red-500 text-xs mt-1">{errors.address?.message}</p>
       </div>
       <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Company Logo</label>
          <div className="flex items-center space-x-4">
            <div className="h-16 w-16 bg-gray-200 rounded-full flex items-center justify-center text-gray-500">
               <span className="material-icons">image</span>
            </div>
            <button type="button" className="text-sm text-primary font-medium hover:underline">Upload New</button>
          </div>
       </div>
       <div className="pt-4">
         <button type="submit" className="bg-primary text-white px-6 py-2 rounded shadow-sm hover:bg-blue-700 font-medium">
           Save Changes
         </button>
       </div>
    </form>
  );
};

const IntegrationsTab: React.FC = () => {
  const [toggles, setToggles] = useState({ qb: false, stripe: true, factoring: false });

  const toggle = (key: keyof typeof toggles) => setToggles(p => ({ ...p, [key]: !p[key] }));

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
         <div className="flex items-center">
            <div className="h-10 w-10 bg-green-100 rounded-full flex items-center justify-center text-green-600 font-bold mr-4">QB</div>
            <div>
              <h4 className="font-bold text-gray-800">QuickBooks Sync</h4>
              <p className="text-sm text-gray-500">Automatically sync invoices and expenses daily.</p>
            </div>
         </div>
         <div 
           onClick={() => toggle('qb')}
           className={`w-12 h-6 rounded-full p-1 cursor-pointer transition-colors ${toggles.qb ? 'bg-primary' : 'bg-gray-300'}`}
         >
           <div className={`w-4 h-4 rounded-full bg-white shadow transform transition-transform ${toggles.qb ? 'translate-x-6' : ''}`} />
         </div>
      </div>

      <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
         <div className="flex items-center">
            <div className="h-10 w-10 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 font-bold mr-4">S</div>
            <div>
              <h4 className="font-bold text-gray-800">Stripe Payments</h4>
              <p className="text-sm text-gray-500">Allow customers to pay invoices via Credit Card.</p>
            </div>
         </div>
         <div 
           onClick={() => toggle('stripe')}
           className={`w-12 h-6 rounded-full p-1 cursor-pointer transition-colors ${toggles.stripe ? 'bg-primary' : 'bg-gray-300'}`}
         >
           <div className={`w-4 h-4 rounded-full bg-white shadow transform transition-transform ${toggles.stripe ? 'translate-x-6' : ''}`} />
         </div>
      </div>
    </div>
  );
};

const UsersTab: React.FC = () => {
  const { state } = useApp();
  
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-medium text-gray-900">User Management</h3>
        <button className="text-sm text-primary font-medium hover:underline">+ Invite User</button>
      </div>
      <table className="w-full text-left text-sm">
        <thead className="bg-gray-50 text-gray-500 border-b border-gray-200">
          <tr>
            <th className="px-4 py-2">Name</th>
            <th className="px-4 py-2">Email</th>
            <th className="px-4 py-2">Role</th>
            <th className="px-4 py-2">Status</th>
            <th className="px-4 py-2"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
           {state.users.map(u => (
             <tr key={u.id}>
               <td className="px-4 py-3 font-medium">{u.name}</td>
               <td className="px-4 py-3 text-gray-500">{u.email}</td>
               <td className="px-4 py-3">{u.role}</td>
               <td className="px-4 py-3">
                 <span className={`px-2 py-0.5 rounded text-xs ${u.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                   {u.status}
                 </span>
               </td>
               <td className="px-4 py-3 text-right text-gray-400 cursor-pointer hover:text-gray-600">Edit</td>
             </tr>
           ))}
        </tbody>
      </table>
    </div>
  );
};

// --- Main Page ---

const Settings: React.FC = () => {
  const [activeTab, setActiveTab] = useState('profile');

  const tabs = [
    { id: 'profile', label: 'Company Profile', icon: 'business' },
    { id: 'audit', label: 'Audit Trail', icon: 'history_edu' }, // Added
    { id: 'integrations', label: 'Integrations', icon: 'hub' },
    { id: 'users', label: 'Users & Roles', icon: 'group' },
  ];

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 min-h-[600px] flex flex-col md:flex-row">
       {/* Sidebar Tabs */}
       <div className="w-full md:w-64 border-b md:border-b-0 md:border-r border-gray-200 bg-gray-50">
          <div className="p-6">
             <h2 className="text-xl font-bold text-gray-900">Settings</h2>
          </div>
          <nav className="flex flex-col">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center px-6 py-4 text-sm font-medium transition-colors ${
                  activeTab === tab.id 
                    ? 'bg-white text-primary border-l-4 border-primary shadow-sm' 
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <span className="material-icons mr-3 text-gray-400">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </nav>
       </div>

       {/* Content Area */}
       <div className="flex-1 p-8">
          {activeTab === 'profile' && <ProfileTab />}
          {activeTab === 'audit' && <AuditLogViewer />}
          {activeTab === 'integrations' && <IntegrationsTab />}
          {activeTab === 'users' && <UsersTab />}
       </div>
    </div>
  );
};

export default Settings;
