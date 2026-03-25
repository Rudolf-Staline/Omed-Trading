import sqlite3
import json
from datetime import datetime
from pathlib import Path

DB_PATH = Path(__file__).parent.parent / "nexus.db"


def get_connection():
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = get_connection()
    cur  = conn.cursor()
    cur.executescript("""
        CREATE TABLE IF NOT EXISTS signals (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            symbol      TEXT NOT NULL,
            direction   TEXT NOT NULL,
            score       REAL NOT NULL,
            entry       REAL,
            stop_loss   REAL,
            tp1         REAL,
            mode        TEXT,
            ai_comment  TEXT,
            created_at  TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS watchlist (
            id         INTEGER PRIMARY KEY AUTOINCREMENT,
            symbol     TEXT UNIQUE NOT NULL,
            name       TEXT,
            added_at   TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS alerts (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            symbol      TEXT NOT NULL,
            type        TEXT NOT NULL,
            message     TEXT NOT NULL,
            triggered   INTEGER DEFAULT 0,
            created_at  TEXT NOT NULL
        );
    """)
    conn.commit()
    conn.close()


def save_signal(opportunity: dict):
    conn = get_connection()
    cur  = conn.cursor()
    score_d = opportunity.get('score', {})
    setup_d = opportunity.get('trade_setup', {})
    cur.execute("""
        INSERT INTO signals (symbol, direction, score, entry, stop_loss, tp1, mode, ai_comment, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        opportunity.get('symbol'),
        score_d.get('direction'),
        score_d.get('total_score', 0),
        setup_d.get('entry'),
        setup_d.get('stop_loss'),
        setup_d.get('take_profits', {}).get('tp1'),
        opportunity.get('mode'),
        opportunity.get('ai_comment'),
        datetime.now().isoformat(),
    ))
    conn.commit()
    conn.close()


def get_recent_signals(limit: int = 50) -> list:
    conn = get_connection()
    cur  = conn.cursor()
    cur.execute("SELECT * FROM signals ORDER BY created_at DESC LIMIT ?", (limit,))
    rows = [dict(r) for r in cur.fetchall()]
    conn.close()
    return rows


def get_watchlist() -> list:
    conn = get_connection()
    cur  = conn.cursor()
    cur.execute("SELECT * FROM watchlist ORDER BY added_at DESC")
    rows = [dict(r) for r in cur.fetchall()]
    conn.close()
    return rows


def add_to_watchlist(symbol: str, name: str = "") -> dict:
    conn = get_connection()
    cur  = conn.cursor()
    try:
        cur.execute(
            "INSERT OR IGNORE INTO watchlist (symbol, name, added_at) VALUES (?, ?, ?)",
            (symbol, name, datetime.now().isoformat())
        )
        conn.commit()
        return {"success": True}
    except Exception as e:
        return {"success": False, "error": str(e)}
    finally:
        conn.close()


def remove_from_watchlist(symbol: str) -> dict:
    conn = get_connection()
    cur  = conn.cursor()
    cur.execute("DELETE FROM watchlist WHERE symbol = ?", (symbol,))
    conn.commit()
    conn.close()
    return {"success": True}


def add_alert(symbol: str, alert_type: str, message: str) -> dict:
    conn = get_connection()
    cur  = conn.cursor()
    cur.execute(
        "INSERT INTO alerts (symbol, type, message, created_at) VALUES (?, ?, ?, ?)",
        (symbol, alert_type, message, datetime.now().isoformat())
    )
    conn.commit()
    conn.close()
    return {"success": True}


def get_recent_alerts(limit: int = 50) -> list:
    conn = get_connection()
    cur  = conn.cursor()
    cur.execute("SELECT * FROM alerts ORDER BY created_at DESC LIMIT ?", (limit,))
    rows = [dict(r) for r in cur.fetchall()]
    conn.close()
    return rows
