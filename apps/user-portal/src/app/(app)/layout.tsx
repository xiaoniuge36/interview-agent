// RequireAuth 可能在任意受保护路由上渲染登录/访问屏，
// 因此 auth 域样式必须挂在路由组布局层，而不能只挂在根落地页。
import '../styles/auth.css';
import '../styles/auth-refinement.css';
import '../styles/consumer-auth.css';
import { RequireAuth } from '@/components/auth/RequireAuth';
import { UserShell } from '@/components/UserShell';
import { WorkspaceProvider } from '@/components/workspace/WorkspaceProvider';

export default function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireAuth>
      <WorkspaceProvider>
        <UserShell>{children}</UserShell>
      </WorkspaceProvider>
    </RequireAuth>
  );
}
