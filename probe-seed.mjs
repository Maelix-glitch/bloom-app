import { PGlite } from '@electric-sql/pglite';
import { seedBaseDb } from './src/lib/vitalis/db/harness.ts';
import { fileURLToPath } from 'url';
const { join } = require('path');
// Can't import TS via require; use vitest instead.
