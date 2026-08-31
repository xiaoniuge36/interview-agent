import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { generateInterviewSchema } from './runtime-schema-interview';
import { generatePracticeReportSchema } from './runtime-schema-practice-report';

const CHECK_ARGUMENT = '--check';
const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const runtimeSchemasDirectory = resolve(scriptDirectory, '../../../apps/agent-runtime/app/schemas');

type GeneratedFile = { path: string; content: string };

function generatedFiles(): GeneratedFile[] {
  return [
    { path: resolve(runtimeSchemasDirectory, 'interview.py'), content: generateInterviewSchema() },
    {
      path: resolve(runtimeSchemasDirectory, 'practice_report.py'),
      content: generatePracticeReportSchema(),
    },
  ];
}

function main(): void {
  const files = generatedFiles();
  if (process.argv.includes(CHECK_ARGUMENT)) {
    for (const file of files) {
      const current = readFileSync(file.path, 'utf8');
      if (current !== file.content) throw new Error(`Runtime schema drift detected: ${file.path}`);
    }
    return;
  }
  for (const file of files) {
    writeFileSync(file.path, file.content, 'utf8');
  }
}

main();
