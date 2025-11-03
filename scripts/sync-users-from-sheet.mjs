#!/usr/bin/env node
/**
 * Sync active employees from Google Sheets and upsert into the Training System API.
 *
 * Required env vars:
 *   GOOGLE_APPLICATION_CREDENTIALS=/absolute/path/to/service-account.json
 *   SHEET_ID=<spreadsheet id>
 *   SHEET_RANGE=tbl_employee_active!A2:E
 *
 * Optional:
 *   BATCH_SIZE (default: 200)
 *   LOG_LEVEL (info | debug | silent)
 *   EXPORT_JSON_PATH (absolute path to also write the payload as a JSON snapshot)
 *   SYNC_EMAIL_DOMAIN (fallback domain if sheet does not contain email)
 *   SYNC_DEFAULT_PASSWORD / SYNC_DEFAULT_PASSWORD_HASH
 *
 * Usage: node scripts/sync-users-from-sheet.mjs
 */

import 'dotenv/config';
import path from 'node:path';
import fs from 'node:fs';
import process from 'node:process';
import { google } from 'googleapis';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const {
  GOOGLE_APPLICATION_CREDENTIALS,
  SHEET_ID,
  SHEET_RANGE = 'tbl_employee_active!A2:E',
  BATCH_SIZE = '200',
  LOG_LEVEL = 'info',
  EXPORT_JSON_PATH,
  SYNC_EMAIL_DOMAIN,
  SYNC_DEFAULT_PASSWORD,
  SYNC_DEFAULT_PASSWORD_HASH,
} = process.env;

const prisma = new PrismaClient();

function log(level, ...args) {
  if (LOG_LEVEL === 'silent') return;
  if (LOG_LEVEL === 'debug' || level !== 'debug') {
    console.log(`[${level}]`, ...args);
  }
}

async function main() {
  validateEnv();

  const client = await buildGoogleClient();
  const sheets = google.sheets({ version: 'v4', auth: client });

  log('info', `Fetching rows from sheet ${SHEET_ID} range ${SHEET_RANGE}`);

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: SHEET_RANGE,
    valueRenderOption: 'UNFORMATTED_VALUE',
  });

  const rows = res.data.values ?? [];

  log('info', `Fetched ${rows.length} rows`);

  if (!rows.length) {
    log('info', 'No rows to sync');
    await prisma.$disconnect();
    return;
  }

const payload = rows
  .filter((row) => row?.[0])
  .map((row) => ({
    employee_number: safeString(row[0]),
    first_name_last_name: safeString(row[1]) || null,
    phone: safeString(row[2]) || null,
    supervisor: safeString(row[3]) || null,
    department: safeString(row[4]) || null,
  }));

  log('info', `Prepared payload with ${payload.length} employees`);

  if (EXPORT_JSON_PATH) {
    const exportPath = path.resolve(EXPORT_JSON_PATH);
    fs.writeFileSync(exportPath, JSON.stringify(payload, null, 2), 'utf-8');
    log('info', `Exported payload snapshot to ${exportPath}`);
  }

  const batchSize = Number(BATCH_SIZE);
  let processed = 0;

  for (let i = 0; i < payload.length; i += batchSize) {
    const chunk = payload.slice(i, i + batchSize);
    log('debug', `Upserting chunk ${i / batchSize + 1} (${chunk.length} records)`);
    const operations = [];

    for (const row of chunk) {
      const departmentId = await resolveDepartmentId(row.department);
      operations.push(
        prisma.user.upsert({
          where: { username: row.employee_number },
          update: buildUpdatePayload(row, departmentId),
          create: buildCreatePayload(row, departmentId),
        }),
      );
    }

    await prisma.$transaction(operations, { timeout: 60_000 });
    processed += chunk.length;
  }

  await markInactiveEmployees(payload.map((p) => p.employee_number));

  log('info', `Completed sync. Processed ${processed} employees.`);
  await prisma.$disconnect();
}

function validateEnv() {
  const missing = [];
  if (!GOOGLE_APPLICATION_CREDENTIALS) missing.push('GOOGLE_APPLICATION_CREDENTIALS');
  if (!SHEET_ID) missing.push('SHEET_ID');

  if (missing.length) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}

async function buildGoogleClient() {
  const credentialsPath = path.resolve(GOOGLE_APPLICATION_CREDENTIALS);
  if (!fs.existsSync(credentialsPath)) {
    throw new Error(`Service account credentials not found at ${credentialsPath}`);
  }

  const scopes = ['https://www.googleapis.com/auth/spreadsheets.readonly'];
  const auth = new google.auth.GoogleAuth({
    keyFile: credentialsPath,
    scopes,
  });

  return auth.getClient();
}

function safeString(value) {
  if (value === null || value === undefined) return '';
  return String(value).trim();
}

function buildCreatePayload(row, departmentId) {
  return {
    username: row.employee_number,
    email: determineEmail(row),
    firstName: extractFirstName(row.first_name_last_name),
    lastName: extractLastName(row.first_name_last_name),
    phone: row.phone || null,
    supervisorEmail: normalizeEmail(row.supervisor),
    passwordHash: DEFAULT_PASSWORD_HASH,
    role: 'EMPLOYEE',
    isActive: true,
    departmentId,
  };
}

function buildUpdatePayload(row, departmentId) {
  return {
    email: determineEmail(row),
    firstName: extractFirstName(row.first_name_last_name),
    lastName: extractLastName(row.first_name_last_name),
    phone: row.phone || null,
    supervisorEmail: normalizeEmail(row.supervisor),
    role: 'EMPLOYEE',
    isActive: true,
    departmentId,
  };
}

function determineEmail(row) {
  const supplied = normalizeEmail(row.email);
  if (supplied) return supplied;
  if (SYNC_EMAIL_DOMAIN) {
    return `${row.employee_number}@${SYNC_EMAIL_DOMAIN}`.toLowerCase();
  }
  return `${row.employee_number}@example.com`;
}

function normalizeEmail(value) {
  const str = safeString(value);
  return str ? str.toLowerCase() : null;
}

function extractFirstName(fullName) {
  const [first] = splitName(fullName);
  return first;
}

function extractLastName(fullName) {
  const [, last] = splitName(fullName);
  return last;
}

function splitName(fullName) {
  const safe = safeString(fullName);
  if (!safe) return [null, null];
  const parts = safe.split(/\s+/);
  if (parts.length === 1) return [parts[0], null];
  const last = parts.pop();
  return [parts.join(' ') || null, last ?? null];
}

async function markInactiveEmployees(activeUsernames) {
  if (!activeUsernames.length) return;

  await prisma.user.updateMany({
    where: {
      role: 'EMPLOYEE',
      username: { notIn: activeUsernames },
    },
    data: { isActive: false },
  });
}

const departmentCache = new Map();

async function resolveDepartmentId(name) {
  const normalized = safeString(name);
  if (!normalized) return null;
  if (departmentCache.has(normalized)) return departmentCache.get(normalized);

  const department = await prisma.department.upsert({
    where: { name: normalized },
    update: {},
    create: { name: normalized },
  });

  departmentCache.set(normalized, department.id);
  return department.id;
}

const DEFAULT_PASSWORD_HASH =
  SYNC_DEFAULT_PASSWORD_HASH ||
  bcrypt.hashSync(SYNC_DEFAULT_PASSWORD || 'pass123', 10);

main().catch((error) => {
  console.error('[error] Sync failed', error);
  prisma.$disconnect().catch(() => {});
  process.exitCode = 1;
});
