import test from 'node:test';
import assert from 'node:assert/strict';
import { messages } from './i18n.js';

test('both languages define the same keys', () => {
  const zh = new Set(Object.keys(messages.zh));
  const en = new Set(Object.keys(messages.en));

  const missingInZh = [...en].filter((key) => !zh.has(key));
  const missingInEn = [...zh].filter((key) => !en.has(key));

  assert.deepEqual(missingInZh, [], 'keys missing from zh');
  assert.deepEqual(missingInEn, [], 'keys missing from en');
});

test('no entry is left empty', () => {
  for (const [language, table] of Object.entries(messages)) {
    for (const [key, value] of Object.entries(table)) {
      assert.equal(typeof value, 'string', `${language}.${key} should be a string`);
      assert.ok(value.trim().length > 0, `${language}.${key} is empty`);
    }
  }
});
