import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

export function normalizeJUnit(inputXml) {
  const start = inputXml.indexOf('<testsuites>');
  const end = inputXml.lastIndexOf('</testsuites>');
  if (start === -1 || end <= start) {
    throw new Error('Input is not Node test runner JUnit XML');
  }

  const testCases = inputXml
    .slice(start + '<testsuites>'.length, end)
    .replace(/<!--[\s\S]*?-->/g, '')
    .trim();
  const tests = (testCases.match(/<testcase\b/g) ?? []).length;
  if (tests === 0) {
    throw new Error('JUnit report does not contain test cases');
  }

  const failures = (testCases.match(/<failure\b/g) ?? []).length;
  const errors = (testCases.match(/<error\b/g) ?? []).length;
  const skipped = (testCases.match(/<(?:skipped|ignored)\b/g) ?? []).length;
  const attributes = ' tests="' + tests + '" failures="' + failures
    + '" errors="' + errors + '" skipped="' + skipped + '"';
  const indented = testCases.split('\n').map((line) => '    ' + line).join('\n');

  return '<?xml version="1.0" encoding="UTF-8"?>\n'
    + '<testsuites' + attributes + '>\n'
    + '  <testsuite name="Node test runner"' + attributes + '>\n'
    + indented + '\n'
    + '  </testsuite>\n'
    + '</testsuites>\n';
}

const scriptPath = process.argv[1] ? resolve(process.argv[1]) : '';
if (scriptPath && import.meta.url === pathToFileURL(scriptPath).href) {
  const inputPath = process.argv[2];
  const outputPath = process.argv[3];
  if (!inputPath || !outputPath) {
    throw new Error('Usage: node scripts/junit-to-suite.js input.xml output.xml');
  }
  writeFileSync(outputPath, normalizeJUnit(readFileSync(inputPath, 'utf8')));
}
