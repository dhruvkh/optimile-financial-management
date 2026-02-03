import React, { useState } from 'react';
import { useApp } from '../App';
import { UserRole } from '../types';

const AuditLogViewer: React.FC = () => {
  const { state } = useApp();
  const [filterUser, setFilterUser] = useState('All');
  const [filterType, setFilterType] = useState('All');

  const filteredLogs = state.auditLogs.filter(log => {
    if (filterUser !== 'All' && log.userName !== filterUser) return false;
    if (filterType !== 'All' && log.entityType !== filterType) return false;
    return true;
  }).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  // Unique users for filter
  const users = Array.from(new Set(state.auditLogs.map(l => l.userName)));

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium text-gray-900">Immutable Audit Trail</h3>
        <div className="flex space-x-2">
           <select 
             className="border border-gray-300 rounded text-sm p-2"
             value={filterUser}
             onChange={e => setFilterUser(e.target.value)}
           >
             <option value="All">All Users</option>
             {users.map(u => <option key={u} value={u}>{u}</option>)}
           </select>
           <select 
             className="border border-gray-300 rounded text-sm p-2"
             value={filterType}
             onChange={e => setFilterType(e.target.value)}
           >
             <option value="All">All Entities</option>
             <option value="Invoice">Invoice</option>
             <option value="Payment">Payment</option>
             <option value="Expense">Expense</option>
             <option value="System">System</option>
           </select>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-200">
            <tr>
              <th className="px-6 py-3">Timestamp</th>
              <th className="px-6 py-3">User</th>
              <th className="px-6 py-3">Role</th>
              <th className="px-6 py-3">Action</th>
              <th className="px-6 py-3">Entity</th>
              <th className="px-6 py-3">Details</th>
              <th className="px-6 py-3">Change</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredLogs.map(log => (
              <tr key={log.id} className="hover:bg-gray-50">
                <td className="px-6 py-3 text-gray-500 font-mono text-xs">
                  {new Date(log.timestamp).toLocaleString()}
                </td>
                <td className="px-6 py-3 font-medium text-gray-900">{log.userName}</td>
                <td className="px-6 py-3">
                  <span className="px-2 py-0.5 bg-gray-100 rounded text-xs text-gray-600">{log.userRole}</span>
                </td>
                <td className="px-6 py-3">
                  <span className={`font-semibold ${
                    log.action === 'Delete' ? 'text-red-600' : 
                    log.action === 'Create' ? 'text-green-600' : 'text-blue-600'
                  }`}>
                    {log.action}
                  </span>
                </td>
                <td className="px-6 py-3 text-gray-600">{log.entityType} ({log.entityId})</td>
                <td className="px-6 py-3 text-gray-500">{log.details}</td>
                <td className="px-6 py-3 text-xs text-gray-500">
                  {log.oldValue && log.newValue ? (
                    <div className="flex flex-col">
                      <span className="text-red-400 line-through">{log.oldValue}</span>
                      <span className="text-green-600">→ {log.newValue}</span>
                    </div>
                  ) : '-'}
                </td>
              </tr>
            ))}
            {filteredLogs.length === 0 && (
              <tr><td colSpan={7} className="p-8 text-center text-gray-400">No logs found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AuditLogViewer;
