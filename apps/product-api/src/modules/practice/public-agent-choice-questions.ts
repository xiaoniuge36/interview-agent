import { PUBLIC_AGENT_MULTIPLE_CHOICE_QUESTIONS } from './public-agent-multiple-choice-questions';
import { PUBLIC_AGENT_SINGLE_CHOICE_QUESTIONS } from './public-agent-single-choice-questions';

export const PUBLIC_AGENT_CHOICE_QUESTIONS = [
  ...PUBLIC_AGENT_SINGLE_CHOICE_QUESTIONS,
  ...PUBLIC_AGENT_MULTIPLE_CHOICE_QUESTIONS,
];
