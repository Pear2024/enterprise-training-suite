// lib/validators.ts
import { z } from 'zod';

export const TopicCreate = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  status: z.enum(['ACTIVE','DRAFT','ARCHIVED']).default('DRAFT'),
});
export type TopicCreateInput = z.infer<typeof TopicCreate>;
