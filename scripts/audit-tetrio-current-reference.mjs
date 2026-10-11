#!/usr/bin/env node
// Audits the freshly fetched TETR.IO client against accepted Finesse geometry
// and kick tables. This is a review gate; it never promotes candidate fixtures.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { TETRIO_MATRIX_REFERENCE as ACCEPTED_MATRIX } from '../games/01/tetrio-matrix-reference-fixtures.js';
import { getSrsKicks, getTetrio180Kicks } from '../games/01/kicks.js';

const [bundlePath, candidatePath] = process.argv.slice(2);
if (!bundlePath || !candidatePath) {
  console.error('Usage: node scripts/audit-tetrio-current-reference.mjs <client-bundle> <matrix-candidate>');
  process.exit(2);
}

const bundle = await readFile(bundlePath, 'utf8');
const candidateModule = await import(new URL('file://' + candidatePath).href);
const candidateMatrix = candidateModule.TETRIO_MATRIX_REFERENCE;
const source = candidateModule.TETRIO_MATRIX_SOURCE;

const errors = [];
const changedPieces = Object.keys(ACCEPTED_MATRIX).filter((piece) =>
  JSON.stringify(candidateMatrix[piece]) !== JSON.stringify(ACCEPTED_MATRIX[piece]));
if (changedPieces.length) {
  errors.push('Matrix geometry differs from accepted fixtures for: ' + changedPieces.join(', '));
} else {
  console.log('PASS: current client matrix geometry matches all 7 accepted tetromino fixtures.');
}

const kicksetsLiteral = extractObjectLiteralAfterKey(bundle, 'kicksets');
const srsPlusLiteral = extractObjectLiteralAfterKey(kicksetsLiteral, '"SRS+"');
const jlStzKicks = parseKickTable(extractObjectLiteralAfterKey(srsPlusLiteral, 'kicks'));
const iKicks = parseKickTable(extractObjectLiteralAfterKey(srsPlusLiteral, 'i_kicks'));

const quarterTurns = [['0','1','01'], ['1','0','10'], ['1','2','12'], ['2','1','21'],
  ['2','3','23'], ['3','2','32'], ['3','0','30'], ['0','3','03']];
const halfTurns = [['0','2','02'], ['1','3','13'], ['2','0','20'], ['3','1','31']];

for (const [from, to, key] of quarterTurns) {
  compareKicks('I ' + key, getSrsKicks('I', Number(from), Number(to)), [[0,0], ...(iKicks[key] ?? [])]);
  for (const type of ['T','S','Z','J','L']) {
    compareKicks(type + ' ' + key, getSrsKicks(type, Number(from), Number(to)), [[0,0], ...(jlStzKicks[key] ?? [])]);
  }
}
for (const [from, to, key] of halfTurns) {
  compareKicks('I ' + key, getTetrio180Kicks('I', Number(from)), [[0,0], ...(iKicks[key] ?? [])]);
  for (const type of ['T','S','Z','J','L']) {
    compareKicks(type + ' ' + key, getTetrio180Kicks(type, Number(from)), [[0,0], ...(jlStzKicks[key] ?? [])]);
  }
}

if (errors.length) {
  console.error('FAIL: current-client reference audit found discrepancies:');
  for (const error of errors) console.error('- ' + error);
  process.exitCode = 1;
} else {
  console.log('PASS: current client SRS+ quarter-turn and direct-180 kick ordering matches games/01/kicks.js.');
  console.log(JSON.stringify({ ok: true, asset: source.asset, fetchedAt: source.fetchedAt,
    sha256: source.sha256, matrixPieces: 7, kickTransitionsChecked: quarterTurns.length * 6 + halfTurns.length * 6 }));
}

function compareKicks(label, actual, expected) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    errors.push(label + ' kick order differs; local=' + JSON.stringify(actual) + ', current=' + JSON.stringify(expected));
  }
}

function parseKickTable(objectLiteral) {
  const table = {};
  const property = /("(\\d{2})"|\\b(\\d{2}))\\s*:\\s*(\\[(?:\\s*\\[\\s*-?\\d+\\s*,\\s*-?\\d+\\s*\\]\\s*,?)*\\])/g;
  for (const match of objectLiteral.matchAll(property)) {
    const key = match[2] ?? match[3];
    table[key] = JSON.parse(match[4]);
  }
  return table;
}

function extractObjectLiteralAfterKey(input, key) {
  const keyIndex = input.indexOf(key + ':');
  if (keyIndex === -1) throw new Error('Could not find ' + key + ' in the client bundle.');
  const start = input.indexOf('{', keyIndex + key.length + 1);
  if (start === -1) throw new Error('Could not find ' + key + ' object start.');
  let depth = 0;
  let quote;
  let escaped = false;
  for (let index = start; index < input.length; index += 1) {
    const char = input[index];
    if (quote !== undefined) {
      if (escaped) escaped = false;
      else if (char === '\\\\') escaped = true;
      else if (char === quote) quote = undefined;
      continue;
    }
    if (char === '"' || char === "'" || char === '`') { quote = char; continue; }
    if (char === '{') depth += 1;
    else if (char === '}') {
      depth -= 1;
      if (depth === 0) return input.slice(start, index + 1);
    }
  }
  throw new Error('Could not find ' + key + ' object end.');
}
