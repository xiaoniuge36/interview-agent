'use client';

import { AuthGate } from '@interview-agent/auth-client';
import { AdminDashboard } from '@/components/dashboard/AdminDashboard';

export default function AdminPage() {
  return (
    <AuthGate applicationName="Interview Agent 治理后台">
      <AdminDashboard />
    </AuthGate>
  );
}
