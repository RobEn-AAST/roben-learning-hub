import React from 'react';

interface DashboardStatsProps {
  title: string;
  value: string | number;
  icon?: React.ReactNode;
}

export function DashboardStats({ title, value, icon }: DashboardStatsProps) {
  return (
    <div className="bg-white overflow-hidden shadow rounded-lg">
      <div className="p-5">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            {icon}
          </div>
          <div className="ml-5 w-0 flex-1">
            <dl>
              <dt className="text-sm font-medium text-gray-500 truncate">
                {title}
              </dt>
              <dd className="text-lg font-medium text-gray-900">
                {value}
              </dd>
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}

export function AdminDashboard() {
  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Dashboard Overview</h2>
        <p className="text-gray-600">Welcome to your admin dashboard</p>
      </div>
      
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <DashboardStats title="Total Users" value={0} />
        <DashboardStats title="Active Sessions" value={0} />
        <DashboardStats title="System Status" value="Online" />
      </div>
    </div>
  );
}
