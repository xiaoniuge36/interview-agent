'use client';

import { AdminAccess } from '@/components/auth/AdminAccess';
import { AdminDashboard } from '@/components/dashboard/AdminDashboard';

export default function AdminPage() {
  return (
    <AdminAccess>
      <AdminDashboard />
    </AdminAccess>
  );
}
