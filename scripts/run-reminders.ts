/** For a server crontab:  *\/15 * * * *  cd /app && npm run reminders */
import { runReminders } from "@/lib/reminders";
import { prisma } from "@/lib/prisma";

runReminders()
  .then((r) => {
    console.log(JSON.stringify({ ranAt: r.ranAt, ownerConfigured: r.ownerConfigured, counts: r.counts }));
  })
  .catch((e) => {
    console.error("[reminders] failed", e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
