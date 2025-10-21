// types/session.ts
import type { UserRole } from '@prisma/client';

export type SessionPayload = {
  userId: number;
  role: UserRole;
  username: string;
  // เพิ่มฟิลด์อื่นได้ตามต้องการ เช่น:
  // departmentId?: number;
};
