/**
 * Database Migration Script
 * Creates tables in Supabase PostgreSQL database
 *
 * Run this after setting up your Supabase project:
 * node scripts/migrate.js
 */

import { supabase } from "../config/database.js";
import { logger } from "../config/logger.js";
import dotenv from "dotenv";

dotenv.config();

const migrations = [
  {
    name: "Create users table",
    sql: `
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(20) NOT NULL CHECK (role IN ('ADMIN', 'TEACHER')),
        created_at TIMESTAMP DEFAULT NOW()
      );
      
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    `,
  },
  {
    name: "Create quiz_packages table",
    sql: `
      CREATE TABLE IF NOT EXISTS quiz_packages (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        teacher_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );
      
      CREATE INDEX IF NOT EXISTS idx_quiz_packages_teacher ON quiz_packages(teacher_id);
    `,
  },
  {
    name: "Create questions table",
    sql: `
      CREATE TABLE IF NOT EXISTS questions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        quiz_id UUID NOT NULL REFERENCES quiz_packages(id) ON DELETE CASCADE,
        question_text TEXT NOT NULL,
        image_url TEXT,
        options JSONB NOT NULL,
        correct_idx INTEGER NOT NULL CHECK (correct_idx >= 0 AND correct_idx <= 3),
        time_limit INTEGER DEFAULT 15 CHECK (time_limit >= 5 AND time_limit <= 60),
        points INTEGER DEFAULT 20 CHECK (points >= 1 AND points <= 100),
        created_at TIMESTAMP DEFAULT NOW()
      );
      
      CREATE INDEX IF NOT EXISTS idx_questions_quiz ON questions(quiz_id);
    `,
  },
];

async function runMigrations() {
  logger.info("Starting database migrations...");

  for (const migration of migrations) {
    try {
      logger.info(`Running migration: ${migration.name}`);

      // Supabase uses RPC or direct SQL via PostgREST
      // We'll use the REST API to execute SQL
      const { data, error } = await supabase.rpc("exec_sql", {
        sql_query: migration.sql,
      });

      // Note: Supabase doesn't support arbitrary SQL execution via REST API
      // You need to run these migrations manually in Supabase SQL Editor
      // or use Supabase CLI

      if (error) {
        // This is expected - we'll log instructions instead
        logger.warn(
          `Migration "${migration.name}" - Please run manually in Supabase SQL Editor`
        );
        logger.info(`SQL to run:\n${migration.sql}\n`);
      } else {
        logger.info(`✓ Migration "${migration.name}" completed`);
      }
    } catch (err) {
      logger.error(`Error in migration "${migration.name}":`, err.message);
      logger.info(
        `Please run this SQL manually in Supabase SQL Editor:\n${migration.sql}\n`
      );
    }
  }

  logger.info(
    "Migration process completed. Please check Supabase SQL Editor if any migrations need manual execution."
  );
}

// Export SQL for manual execution
export function getMigrationSQL() {
  return migrations.map((m) => `-- ${m.name}\n${m.sql}`).join("\n\n");
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runMigrations().catch((err) => {
    logger.error("Migration failed:", err);
    process.exit(1);
  });
}
