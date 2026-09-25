import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { loadMigrationFiles } from './migrator.js';

/**
 * Migration loading is the half of the migrator that can be tested without a
 * database, and it is the half that decides ordering and drift — the two things
 * that go wrong quietly. The apply path is covered by the integration suite,
 * which needs a real Postgres.
 */
describe('loadMigrationFiles', () => {
  let directory: string;

  beforeEach(async () => {
    directory = await mkdtemp(join(tmpdir(), 'bloom-migrations-'));
  });

  afterEach(async () => {
    await rm(directory, { recursive: true, force: true });
  });

  async function write(filename: string, sql = 'SELECT 1;'): Promise<void> {
    await writeFile(join(directory, filename), sql, 'utf8');
  }

  it('returns an empty list for an empty directory', async () => {
    expect(await loadMigrationFiles(directory)).toEqual([]);
  });

  it('parses version and name from the filename', async () => {
    await write('0001_initial_schema.sql');
    const [file] = await loadMigrationFiles(directory);

    expect(file?.version).toBe(1);
    expect(file?.name).toBe('initial_schema');
    expect(file?.filename).toBe('0001_initial_schema.sql');
  });

  /*
   * Numeric ordering, not lexicographic. Zero padding makes string sorting
   * accidentally correct today; it stops being correct the moment someone
   * writes `10_something.sql`, and the symptom is a migration applying before
   * the table it alters exists.
   */
  it('orders by version number, not by filename string', async () => {
    await write('0002_second.sql');
    await write('0010_tenth.sql');
    await write('0001_first.sql');
    await write('0009_ninth.sql');

    const versions = (await loadMigrationFiles(directory)).map((file) => file.version);
    expect(versions).toEqual([1, 2, 9, 10]);
  });

  it('ignores files that are not .sql', async () => {
    await write('0001_real.sql');
    await writeFile(join(directory, 'README.md'), '# notes', 'utf8');
    await writeFile(join(directory, '.DS_Store'), '', 'utf8');

    expect(await loadMigrationFiles(directory)).toHaveLength(1);
  });

  it('rejects a filename that does not follow the convention', async () => {
    await write('initial.sql');
    await expect(loadMigrationFiles(directory)).rejects.toThrow(
      /NNNN_snake_case_name\.sql/,
    );
  });

  /*
   * Duplicate versions mean the apply order depends on the filesystem, which is
   * a genuinely non-deterministic bug: it can work on one machine and not
   * another.
   */
  it('rejects two migrations sharing a version', async () => {
    await write('0001_first.sql');
    await write('0001_also_first.sql');

    await expect(loadMigrationFiles(directory)).rejects.toThrow(/share version 1/);
  });

  it('checksums content, so an edit to an applied migration is detectable', async () => {
    await write('0001_thing.sql', 'CREATE TABLE a (id int);');
    const [before] = await loadMigrationFiles(directory);

    await write('0001_thing.sql', 'CREATE TABLE a (id bigint);');
    const [after] = await loadMigrationFiles(directory);

    expect(before?.checksum).not.toBe(after?.checksum);
  });

  it('produces a stable checksum for unchanged content', async () => {
    await write('0001_thing.sql', 'CREATE TABLE a (id int);');
    const first = await loadMigrationFiles(directory);
    const second = await loadMigrationFiles(directory);

    expect(first[0]?.checksum).toBe(second[0]?.checksum);
  });

  it('reads the SQL body', async () => {
    await write('0001_thing.sql', 'CREATE TABLE widgets (id int);');
    const [file] = await loadMigrationFiles(directory);

    expect(file?.sql).toContain('CREATE TABLE widgets');
  });
});
