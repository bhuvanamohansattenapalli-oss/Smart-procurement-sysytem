import "dotenv/config";
import { runDatabaseHealthCheck } from "../services/dbHealthService";
import { getDb, isPostgresActive } from "../db";

async function check() {
  console.log("[DB Check] Initializing database check...");
  try {
    await getDb();
    const result = await runDatabaseHealthCheck();

    console.log("\n================================================================================");
    console.log(`[DB Check Status] ${result.status.toUpperCase()}`);
    console.log(`Database Engine : ${result.database === "postgresql" ? "PostgreSQL (Supabase/Production)" : "Local JSON Store (Development)"}`);
    console.log(`Response Latency: ${result.latencyMs} ms`);
    console.log(`Tables Available: ${result.tablesTotal} / 16`);
    if (result.missingTables.length > 0) {
      console.log(`Missing Tables  : ${result.missingTables.join(", ")}`);
    }
    console.log(`CRUD Lifecycle  : INSERT=${result.crudVerification.insert ? "OK" : "FAIL"}, SELECT=${result.crudVerification.select ? "OK" : "FAIL"}, UPDATE=${result.crudVerification.update ? "OK" : "FAIL"}, DELETE=${result.crudVerification.delete ? "OK" : "FAIL"}`);
    console.log(`Details         : ${result.details}`);
    console.log(`Timestamp       : ${result.timestamp}`);
    console.log("================================================================================\n");

    if (result.status === "unhealthy") {
      process.exit(1);
    }
  } catch (err: any) {
    console.error("[DB Check Fatal]:", err?.message || err);
    process.exit(1);
  }
}

check();
