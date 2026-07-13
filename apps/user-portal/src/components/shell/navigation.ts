export type NavigationId = 'workspace' | 'profile' | 'job-intent' | 'interview' | 'reports';
export type IconName = 'grid' | 'user' | 'target' | 'mic' | 'chart';

export type NavigationItem = { id: NavigationId; label: string; helper: string; icon: IconName };

export const NAV_ITEMS: NavigationItem[] = [
  { id: 'workspace', label: 'Training overview', helper: 'Overview', icon: 'grid' },
  { id: 'profile', label: 'Candidate profile', helper: 'Profile', icon: 'user' },
  { id: 'job-intent', label: 'Target role', helper: 'Target role', icon: 'target' },
  { id: 'interview', label: 'Mock interview', helper: 'Practice', icon: 'mic' },
  { id: 'reports', label: 'Review reports', helper: 'Review', icon: 'chart' },
];
