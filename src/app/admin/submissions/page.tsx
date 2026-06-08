import ProjectSubmissionsAdminDashboard from '@/components/admin/ProjectSubmissionsAdminDashboard';

export const dynamic = 'force-dynamic';

export default function AdminSubmissionsPage() {
  return (
    <div className="container mx-auto">
      <ProjectSubmissionsAdminDashboard />
    </div>
  );
}
