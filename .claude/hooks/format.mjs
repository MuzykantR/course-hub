// PostToolUse hook: formats the file Claude just edited with Prettier.
import { execFileSync } from 'node:child_process';

let input = '';
process.stdin.on('data', (chunk) => (input += chunk));
process.stdin.on('end', () => {
  try {
    const file = JSON.parse(input)?.tool_input?.file_path;
    if (!file || !/\.(ts|tsx|mts|mjs|js|json|css|md)$/.test(file) || file.includes('node_modules'))
      return;
    execFileSync(
      process.execPath,
      ['node_modules/prettier/bin/prettier.cjs', '--write', '--log-level', 'silent', file],
      {
        stdio: 'ignore',
      },
    );
  } catch {
    // Formatting is best-effort; never block the edit.
  }
});
