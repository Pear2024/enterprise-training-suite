// lib/db.ts
import { PrismaClient } from '@prisma/client';
import fs from 'node:fs';
import path from 'node:path';

let preparedCa = false;

function ensureCustomCa() {
  if (preparedCa) return;
  preparedCa = true;

  const base64 = process.env.AIVEN_CA_B64;
  if (!base64) return;

  try {
    const decoded = Buffer.from(base64, 'base64').toString('utf-8');
    const certPath = path.join('/tmp', 'aiven-ca.pem');

    if (!fs.existsSync(certPath) || fs.readFileSync(certPath, 'utf-8') !== decoded) {
      fs.writeFileSync(certPath, decoded, { encoding: 'utf-8' });
    }

    process.env.NODE_EXTRA_CA_CERTS = certPath;
  } catch (error) {
    console.error('Failed to prepare custom CA certificate from AIVEN_CA_B64', error);
  }
}

ensureCustomCa();

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ['error', 'warn'], // เพิ่ม 'query' ได้ตอนดีบัก
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
