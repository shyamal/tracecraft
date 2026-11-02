import { slug } from './slug.mjs';
try {
  if (process.argv.length !== 3) throw new Error('Usage: node src/cli.mjs "Your label"');
  process.stdout.write(slug(process.argv[2]) + '\n');
} catch (error) {
  process.stderr.write(error.message + '\n');
  process.exitCode = 1;
}
