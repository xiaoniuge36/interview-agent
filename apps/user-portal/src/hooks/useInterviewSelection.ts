'use client';

import { useEffect, useMemo, useState } from 'react';
import type { JobIntentPayload } from '@interview-agent/contracts';
import { preferredJobIntentId } from '@/lib/job-handoff';

export function useSelectedInterviewJob(jobs: JobIntentPayload[], selectedJobId: string) {
  return useMemo(() => jobs.find((job) => job.intent.id === selectedJobId), [jobs, selectedJobId]);
}

export function useSelectedJob(jobs: JobIntentPayload[], requestedJobId: string | null) {
  const [selectedJobId, setSelectedJobId] = useState(() =>
    preferredJobIntentId(jobs, requestedJobId),
  );
  useEffect(() => {
    setSelectedJobId((current) =>
      jobs.some((job) => job.intent.id === current)
        ? current
        : preferredJobIntentId(jobs, requestedJobId),
    );
  }, [jobs, requestedJobId]);
  return [selectedJobId, setSelectedJobId] as const;
}
