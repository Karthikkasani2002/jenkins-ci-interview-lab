import assert from 'node:assert/strict';
import { test } from 'node:test';
import { normalizeJUnit } from '../scripts/junit-to-suite.js';

test('normalizes Node test reporter XML for Jenkins JUnit parsing', () => {
  const input = [
    '<?xml version="1.0" encoding="utf-8"?>',
    '<testsuites>',
    '<testcase name="passed"/>',
    '<testcase name="failed"><failure message="assertion"/></testcase>',
    '<!-- tests 2 -->',
    '</testsuites>',
  ].join('\n');

  const report = normalizeJUnit(input);
  assert.match(report, /<testsuites tests="2" failures="1" errors="0" skipped="0">/);
  assert.match(report, /<testsuite name="Node test runner"/);
  assert.equal((report.match(/<testcase\b/g) ?? []).length, 2);
});

test('rejects empty and malformed Node reporter XML', () => {
  assert.throws(() => normalizeJUnit('<testsuites></testsuites>'), /does not contain test cases/);
  assert.throws(() => normalizeJUnit('<not-xml/>'), /not Node test runner JUnit XML/);
});
