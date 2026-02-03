import React from 'react';

export const Skeleton: React.FC<{ className?: string }> = ({ className }) => (
  <div className={`animate-pulse bg-gray-200 rounded ${className}`}></div>
);

export const DashboardSkeleton: React.FC = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 pb-12">
      {/* KPI Cards */}
      {[...Array(4)].map((_, i) => (
        <div key={i} className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 h-40 flex flex-col justify-between">
           <div>
             <Skeleton className="h-4 w-24 mb-2" />
             <Skeleton className="h-8 w-32" />
           </div>
           <Skeleton className="h-10 w-full mt-4" />
        </div>
      ))}
      
      {/* Charts */}
      <div className="col-span-1 md:col-span-2 xl:col-span-1 bg-white p-6 rounded-lg h-80">
        <Skeleton className="h-6 w-48 mb-6" />
        <Skeleton className="h-full w-full rounded" />
      </div>
      <div className="col-span-1 md:col-span-2 xl:col-span-2 bg-white p-6 rounded-lg h-80">
        <Skeleton className="h-6 w-48 mb-6" />
        <Skeleton className="h-full w-full rounded" />
      </div>
      <div className="col-span-1 md:col-span-2 xl:col-span-1 bg-white p-6 rounded-lg h-80">
        <Skeleton className="h-6 w-48 mb-6" />
        <Skeleton className="h-full w-full rounded" />
      </div>
    </div>
  );
};
