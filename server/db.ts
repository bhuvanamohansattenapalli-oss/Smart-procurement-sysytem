import fs from "fs";
import path from "path";
import { eq, desc, asc, type SQL } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  users,
  farmers,
  registrations,
  otpChallenges,
  officers,
  procurementCentres,
  slots,
  bookings,
  queueEntries,
  procurements,
  payments,
  notifications,
  cropPrices,
  transportBookings,
  staffAuditLogs,
  staffNotifications,
  type InsertUser,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

export function normalizePhone(raw: string | undefined | null): string {
  if (!raw) return "";
  const digits = String(raw).replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) return digits.slice(2);
  if (digits.length === 11 && digits.startsWith("0")) return digits.slice(1);
  return digits.length > 10 ? digits.slice(-10) : digits;
}

let _db: any = null;

function getTableName(table: any): string {
  if (!table) return "unknown";
  return (
    table[Symbol.for("drizzle:Name")] ||
    table[Symbol.for("drizzle:OriginalName")] ||
    table[Symbol.for("drizzle:BaseName")] ||
    table.name ||
    "unknown"
  );
}

function evaluateCondition(row: Record<string, any>, condition: any): boolean {
  if (!condition) return true;

  const chunks = condition.queryChunks;
  if (!chunks || !Array.isArray(chunks)) return true;

  // Check for wrapped or compound condition
  const sqlChildren: any[] = [];
  let isOr = false;

  for (const chunk of chunks) {
    if (chunk && typeof chunk === "object") {
      if ("queryChunks" in chunk) {
        sqlChildren.push(chunk);
      } else if ("value" in chunk && Array.isArray(chunk.value)) {
        const text = chunk.value.join(" ").toLowerCase();
        if (text.includes(" or ")) isOr = true;
      }
    }
  }

  if (sqlChildren.length > 0) {
    if (isOr) {
      return sqlChildren.some((child) => evaluateCondition(row, child));
    }
    return sqlChildren.every((child) => evaluateCondition(row, child));
  }

  // Atomic condition
  let column: any = null;
  let operator = "=";
  let targetValue: any = undefined;
  let hasTarget = false;

  for (const chunk of chunks) {
    if (!chunk) continue;
    if (typeof chunk === "object") {
      if ("name" in chunk && "table" in chunk) {
        column = chunk;
      } else if ("value" in chunk) {
        if (!Array.isArray(chunk.value)) {
          targetValue = chunk.value;
          hasTarget = true;
        } else {
          const raw = chunk.value.join("").trim();
          if (raw.includes("<>")) operator = "<>";
          else if (raw.includes("<=")) operator = "<=";
          else if (raw.includes(">=")) operator = ">=";
          else if (raw.includes("<")) operator = "<";
          else if (raw.includes(">")) operator = ">";
          else if (raw.includes("=")) operator = "=";
        }
      }
    }
  }

  if (!column || !hasTarget) return true;

  const colName = column.name;
  const rowVal = row[colName];

  const normalize = (v: any) => {
    if (v instanceof Date) return v.getTime();
    if (typeof v === "string" && !isNaN(Date.parse(v)) && v.includes("-") && v.length >= 10) {
      const parsed = Date.parse(v);
      if (!isNaN(parsed)) return parsed;
    }
    return v;
  };

  const a = normalize(rowVal);
  const b = normalize(targetValue);

  switch (operator) {
    case "=":
      return a == b;
    case "<>":
      return a != b;
    case "<=":
      return a <= b;
    case ">=":
      return a >= b;
    case "<":
      return a < b;
    case ">":
      return a > b;
    default:
      return a == b;
  }
}

class LocalDatabaseStore {
  private tables = new Map<string, Record<string, any>[]>();
  private autoIncrements = new Map<string, number>();
  private getStorageFilePath(): string {
    if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.LAMBDA_TASK_ROOT) {
      return path.resolve("/tmp", "procureflow_db.json");
    }
    return path.resolve(process.cwd(), ".data", "procureflow_db.json");
  }

  constructor() {
    this.initTables();
    this.loadFromDisk();
  }

  private initTables() {
    const tableList = [
      "users",
      "farmers",
      "registrations",
      "otpChallenges",
      "officers",
      "procurementCentres",
      "slots",
      "bookings",
      "queueEntries",
      "procurements",
      "payments",
      "notifications",
      "cropPrices",
      "transportBookings",
      "staffAuditLogs",
      "staffNotifications",
    ];
    for (const name of tableList) {
      if (!this.tables.has(name)) {
        this.tables.set(name, []);
        this.autoIncrements.set(name, 1);
      }
    }
  }

  private loadFromDisk() {
    try {
      const targetPath = this.getStorageFilePath();
      let readPath = targetPath;
      if (!fs.existsSync(readPath)) {
        const fallback = path.resolve(process.cwd(), ".data", "procureflow_db.json");
        if (fs.existsSync(fallback)) {
          readPath = fallback;
        }
      }
      if (fs.existsSync(readPath)) {
        const raw = fs.readFileSync(readPath, "utf-8");
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object") {
          if (parsed.tables && typeof parsed.tables === "object") {
            for (const [table, rows] of Object.entries(parsed.tables)) {
              if (Array.isArray(rows)) {
                this.tables.set(table, rows);
              }
            }
          }
          if (parsed.autoIncrements && typeof parsed.autoIncrements === "object") {
            for (const [table, nextId] of Object.entries(parsed.autoIncrements)) {
              if (typeof nextId === "number") {
                this.autoIncrements.set(table, nextId);
              }
            }
          }
          console.log(`[Database] Loaded persistent local store from ${readPath} (${this.tables.get("farmers")?.length ?? 0} farmers, ${this.tables.get("bookings")?.length ?? 0} bookings).`);
        }
      }
    } catch (err) {
      console.warn("[Database] Failed to read persistent local store from disk:", err);
    }
  }

  saveToDisk() {
    try {
      const targetPath = this.getStorageFilePath();
      const dir = path.dirname(targetPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      const data = {
        tables: Object.fromEntries(this.tables.entries()),
        autoIncrements: Object.fromEntries(this.autoIncrements.entries()),
        lastSaved: new Date().toISOString(),
      };
      fs.writeFileSync(targetPath, JSON.stringify(data, null, 2), "utf-8");
    } catch (err) {
      console.warn("[Database] Failed to persist local store to disk:", err);
    }
  }

  getTableData(tableName: string): Record<string, any>[] {
    if (!this.tables.has(tableName)) {
      this.tables.set(tableName, []);
      this.autoIncrements.set(tableName, 1);
    }
    return this.tables.get(tableName)!;
  }

  getNextId(tableName: string): number {
    const current = this.autoIncrements.get(tableName) || 1;
    this.autoIncrements.set(tableName, current + 1);
    this.saveToDisk();
    return current;
  }

  select(selection?: any) {
    const self = this;
    return {
      from(table: any) {
        const tableName = getTableName(table);
        let whereCond: any = null;
        let orderConfigs: any[] = [];
        let limitCount: number | null = null;

        const runQuery = () => {
          let rows = [...self.getTableData(tableName)];

          if (whereCond) {
            rows = rows.filter((r) => evaluateCondition(r, whereCond));
          }

          if (orderConfigs.length > 0) {
            for (const ord of orderConfigs) {
              let colName: string | null = null;
              let isDesc = false;

              if (ord && ord.queryChunks) {
                for (const chunk of ord.queryChunks) {
                  if (chunk && chunk.name) colName = chunk.name;
                  if (
                    chunk &&
                    chunk.value &&
                    Array.isArray(chunk.value) &&
                    chunk.value.join("").includes("desc")
                  ) {
                    isDesc = true;
                  }
                }
              } else if (ord && ord.name) {
                colName = ord.name;
              } else if (ord && ord.column?.name) {
                colName = ord.column.name;
              }
              if (ord && (ord.type === "desc" || ord.direction === "desc")) {
                isDesc = true;
              }

              if (colName) {
                rows.sort((a, b) => {
                  const valA = a[colName!];
                  const valB = b[colName!];
                  if (valA === valB) return 0;
                  if (valA === undefined || valA === null) return 1;
                  if (valB === undefined || valB === null) return -1;
                  const res = valA < valB ? -1 : 1;
                  return isDesc ? -res : res;
                });
              }
            }
          }

          if (limitCount !== null) {
            rows = rows.slice(0, limitCount);
          }

          if (selection && typeof selection === "object" && !("queryChunks" in selection)) {
            return rows.map((r) => {
              const projected: Record<string, any> = {};
              for (const key of Object.keys(selection)) {
                const colDef = selection[key];
                const colName = colDef?.name || key;
                projected[key] = r[colName];
              }
              return projected;
            });
          }

          return rows;
        };

        const executor: any = {
          where(cond: any) {
            whereCond = cond;
            return executor;
          },
          orderBy(...orders: any[]) {
            orderConfigs = orders.flat();
            return executor;
          },
          limit(num: number) {
            limitCount = num;
            return executor;
          },
          then(onFulfilled?: any, onRejected?: any) {
            return Promise.resolve().then(runQuery).then(onFulfilled, onRejected);
          },
          catch(onRejected?: any) {
            return Promise.resolve().then(runQuery).catch(onRejected);
          },
        };

        return executor;
      },
    };
  }

  insert(table: any) {
    const self = this;
    const tableName = getTableName(table);
    return {
      values(valuesInput: any) {
        const rowsToInsert = Array.isArray(valuesInput) ? valuesInput : [valuesInput];
        let onDupUpdate: Record<string, any> | null = null;

        const runInsert = () => {
          const tableRows = self.getTableData(tableName);
          for (const row of rowsToInsert) {
            const newRow: Record<string, any> = {
              id: row.id !== undefined ? row.id : self.getNextId(tableName),
              createdAt: row.createdAt || new Date(),
              updatedAt: row.updatedAt || new Date(),
              ...row,
            };

            // Check for unique conflict on openId or phone
            if (tableName === "users" && row.openId) {
              const existingIdx = tableRows.findIndex((r) => r.openId === row.openId);
              if (existingIdx >= 0) {
                if (onDupUpdate) {
                  tableRows[existingIdx] = {
                    ...tableRows[existingIdx],
                    ...onDupUpdate,
                    updatedAt: new Date(),
                  };
                }
                continue;
              }
            }

            tableRows.push(newRow);
          }
          self.saveToDisk();
          return { insertId: rowsToInsert[0]?.id || 1 };
        };

        const executor: any = {
          onDuplicateKeyUpdate({ set }: { set: Record<string, any> }) {
            onDupUpdate = set;
            return executor;
          },
          then(onFulfilled?: any, onRejected?: any) {
            return Promise.resolve().then(runInsert).then(onFulfilled, onRejected);
          },
          catch(onRejected?: any) {
            return Promise.resolve().then(runInsert).catch(onRejected);
          },
        };

        return executor;
      },
    };
  }

  update(table: any) {
    const self = this;
    const tableName = getTableName(table);
    return {
      set(values: Record<string, any>) {
        let whereCond: any = null;

        const runUpdate = () => {
          const tableRows = self.getTableData(tableName);
          let affectedRows = 0;

          for (let i = 0; i < tableRows.length; i++) {
            if (!whereCond || evaluateCondition(tableRows[i], whereCond)) {
              tableRows[i] = {
                ...tableRows[i],
                ...values,
                updatedAt: values.updatedAt || new Date(),
              };
              affectedRows++;
            }
          }
          self.saveToDisk();
          return { affectedRows };
        };

        const executor: any = {
          where(cond: any) {
            whereCond = cond;
            return executor;
          },
          then(onFulfilled?: any, onRejected?: any) {
            return Promise.resolve().then(runUpdate).then(onFulfilled, onRejected);
          },
          catch(onRejected?: any) {
            return Promise.resolve().then(runUpdate).catch(onRejected);
          },
        };

        return executor;
      },
    };
  }

  delete(table: any) {
    const self = this;
    const tableName = getTableName(table);
    return {
      where(whereCond: any) {
        const runDelete = () => {
          const tableRows = self.getTableData(tableName);
          const remaining = tableRows.filter((r) => !evaluateCondition(r, whereCond));
          const affectedRows = tableRows.length - remaining.length;
          self.tables.set(tableName, remaining);
          self.saveToDisk();
          return { affectedRows };
        };

        return {
          then(onFulfilled?: any, onRejected?: any) {
            return Promise.resolve().then(runDelete).then(onFulfilled, onRejected);
          },
          catch(onRejected?: any) {
            return Promise.resolve().then(runDelete).catch(onRejected);
          },
        };
      },
    };
  }
}

const localStore = new LocalDatabaseStore();

export async function getDb(): Promise<ReturnType<typeof drizzle>> {
  if (!_db) {
    if (process.env.DATABASE_URL) {
      try {
        const masked = process.env.DATABASE_URL.replace(/:\/\/[^:]+:[^@]+@/, "://***:***@");
        console.log(`[Database] Connecting to production MySQL database at ${masked}...`);
        _db = drizzle(process.env.DATABASE_URL);
      } catch (error) {
        console.warn("[Database] MySQL connection failed, using persistent local store fallback:", error);
        _db = localStore as any;
      }
    } else {
      _db = localStore as any;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = "admin";
      updateSet.role = "admin";
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}
