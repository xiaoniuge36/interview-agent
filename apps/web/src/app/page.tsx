import { AuthGate } from '@interview-agent/auth-client';
import { HomePageContent } from '@/components/home/HomePageContent';
import { UserShell } from '@/components/UserShell';

export default function HomePage() {
  return (
    <AuthGate applicationName="Interview Agent">
      <UserShell>
        <HomePageContent />
      </UserShell>
    </AuthGate>
  );
}
