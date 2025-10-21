// prisma.config.ts
import "dotenv/config";          // << เพิ่มบรรทัดนี้
import { defineConfig } from "prisma/config";

export default defineConfig({
  migrations: {
    seed: "tsx prisma/seed.ts",
  },
});
