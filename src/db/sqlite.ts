import fs from "fs";
import path from "path";
// @ts-ignore
import { DatabaseSync } from "node:sqlite";
import type { TopStockItem } from "../utils/getForeignInstitutionTop10.js";

const DB_DIR = path.join(process.cwd(), "db");
const DB_PATH = path.join(DB_DIR, "fitop.db");

class SQLiteDB {
    private static instance: SQLiteDB;
    private db: any;

    private constructor() {
        if (!fs.existsSync(DB_DIR)) {
            fs.mkdirSync(DB_DIR, { recursive: true });
        }

        // node:sqlite의 DatabaseSync 초기화
        this.db = new DatabaseSync(DB_PATH);
        this.init();
    }

    public static getInstance(): SQLiteDB {
        if (!SQLiteDB.instance) {
            SQLiteDB.instance = new SQLiteDB();
        }
        return SQLiteDB.instance;
    }

    private init(): void {
        const createTableSql = `
            CREATE TABLE IF NOT EXISTS fitop (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                date TEXT UNIQUE NOT NULL,
                buyTop TEXT NOT NULL,
                sellTop TEXT NOT NULL
            );
        `;
        this.db.exec(createTableSql);
    }

    public getFiTop(
        date: string,
    ): {
        buyTop: TopStockItem[];
        sellTop: TopStockItem[];
        date: string;
    } | null {
        const stmt = this.db.prepare("SELECT * FROM fitop WHERE date = ?");
        const row = stmt.get(date);

        if (!row) return null;

        try {
            return {
                buyTop: JSON.parse(row.buyTop),
                sellTop: JSON.parse(row.sellTop),
                date: row.date,
            };
        } catch (e) {
            console.error("Failed to parse fitop DB record:", e);
            return null;
        }
    }

    public getLatestFiTop(): {
        buyTop: TopStockItem[];
        sellTop: TopStockItem[];
        date: string;
    } | null {
        // 가장 최신 데이터 조회 (Fallback용)
        const stmt = this.db.prepare(
            "SELECT * FROM fitop ORDER BY date DESC LIMIT 1",
        );
        const row = stmt.get();

        if (!row) return null;

        try {
            return {
                buyTop: JSON.parse(row.buyTop),
                sellTop: JSON.parse(row.sellTop),
                date: row.date,
            };
        } catch (e) {
            console.error("Failed to parse fitop DB record:", e);
            return null;
        }
    }

    public saveFiTop(
        date: string,
        buyTop: TopStockItem[],
        sellTop: TopStockItem[],
    ): void {
        const insertOrUpdateSql = `
            INSERT INTO fitop (date, buyTop, sellTop)
            VALUES (?, ?, ?)
            ON CONFLICT(date) DO UPDATE SET
                buyTop = excluded.buyTop,
                sellTop = excluded.sellTop;
        `;
        const stmt = this.db.prepare(insertOrUpdateSql);
        stmt.run(date, JSON.stringify(buyTop), JSON.stringify(sellTop));
    }
}

export const dbInstance = SQLiteDB.getInstance();
