import type { CreateJobIntentInput } from '@interview-agent/contracts';
import { roleInputFor } from '@/lib/interview-roles';

export const DEFAULT_JOB_FORM: CreateJobIntentInput = roleInputFor('全栈开发工程师');
