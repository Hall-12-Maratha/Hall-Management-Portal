/**
 * Seed the initial hall_office admin account (port of backend/scripts/seed.py).
 *
 *   npm run db:seed
 *
 * Idempotent: does nothing if `admin@hall12` already exists. The password comes
 * from SEED_ADMIN_PASSWORD (default: Hall12kaAdmin!) and must be changed on
 * first login (must_change_password = true).
 */

import { loadEnvConfig } from "@next/env";
import { eq } from "drizzle-orm";

loadEnvConfig(process.cwd());

async function main() {
  const { getDb, getSql } = await import("../src/lib/server/db/client");
  const { users } = await import("../src/lib/server/db/schema");
  const { hashPassword } = await import("../src/lib/server/auth/password");

  const db = getDb();
  const identifier = "admin@hall12";
  const password = process.env.SEED_ADMIN_PASSWORD || "Hall12kaAdmin!";

  try {
    const [existing] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.identifier, identifier))
      .limit(1);

    if (existing) {
      console.log(`Admin user '${identifier}' already exists (id ${existing.id}). Skipping.`);
      return;
    }

    const [admin] = await db
      .insert(users)
      .values({
        identifier,
        email: "hall12@iitk.ac.in",
        passwordHash: await hashPassword(password),
        role: "hall_office",
        name: "Hall Office Admin",
        isActive: true,
        otpAttempts: 0,
        passwordSet: true,
        mustChangePassword: true,
        failedLoginAttempts: 0,
      })
      .returning({ id: users.id });

    console.log(`Created hall_office admin '${identifier}' (id ${admin.id}).`);
    console.log(`Temporary password: ${password}`);
    console.log("You will be asked to change it on first login.");
  } finally {
    await getSql().end();
  }
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
