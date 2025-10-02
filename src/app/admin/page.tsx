import { AdminDashboard } from '@/components/admin/AdminDashboard';
import ClientConnectionTest from '@/components/ClientConnectionTest';

export default function AdminPage() {
  return (
    <div className="container mx-auto p-6">
      <ClientConnectionTest />
      <div className="mt-6">
        <AdminDashboard />
      </div>
    </div>
  );
}
