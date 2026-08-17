import { PageMotion } from '@/components/motion/PageMotion';

export default function AuthenticatedRouteTemplate({ children }: { children: React.ReactNode }) {
  return <PageMotion>{children}</PageMotion>;
}
