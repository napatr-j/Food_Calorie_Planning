"""
Database bootstrap script.

Creates core tables, imports the food library CSV into SQLite, assigns a default
image path for each food (when available), and prints a short validation report.

This script is intended to be idempotent for local development.
"""

import re
import sqlite3
import sys
from pathlib import Path

import pandas as pd

sys.stdout.reconfigure(encoding="utf-8")

DB_PATH = Path("database/app.db")
CSV_PATH = Path("data/food_menu.csv")
TRAIN_DIR = Path("data/train")

_DDL_CORE = """
CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    username      TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at    DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_profiles (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id         INTEGER UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    display_name    TEXT,
    height_cm       REAL CHECK(height_cm BETWEEN 50 AND 300),
    weight_kg       REAL CHECK(weight_kg BETWEEN 10 AND 500),
    body_fat_pct    REAL CHECK(body_fat_pct BETWEEN 1 AND 70),
    age             INTEGER CHECK(age BETWEEN 5 AND 120),
    gender          TEXT CHECK(gender IN ('male', 'female')),
    activity_level  TEXT CHECK(activity_level IN (
                        'sedentary', 'light_exercise',
                        'moderate_exercise', 'heavy_exercise', 'athlete'
                    )),
    ideal_cal       REAL CHECK(ideal_cal BETWEEN 500 AND 10000),
    bmi             REAL,
    tdee            REAL,
    updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS food_log (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    food_name     TEXT NOT NULL,
    confidence    REAL,
    kcal          REAL NOT NULL,
    protein_g     REAL,
    fat_g         REAL,
    carbs_g       REAL,
    sugar_g       REAL,
    image_path    TEXT,
    logged_at     DATETIME DEFAULT CURRENT_TIMESTAMP,
    log_date      DATE GENERATED ALWAYS AS (DATE(logged_at)) VIRTUAL
);

CREATE INDEX IF NOT EXISTS idx_food_log_user_date
    ON food_log(user_id, log_date);
"""


def _to_snake(s: str) -> str:
    """'Stir-Fried Thai Basil' → 'stir_fried_thai_basil'"""
    return re.sub(r"[\s\-]+", "_", s.strip()).lower()


def find_image_for_food(food_name: str, train_dir: Path = TRAIN_DIR) -> str | None:
    """
    Pick a deterministic image for a given food class folder.

    Args:
        food_name: Folder name under *train_dir* (typically the model class name).
        train_dir: Root directory containing class subfolders.

    Returns:
        A POSIX-style relative path to the first image found, or None if missing.
    """
    folder = train_dir / food_name
    if not folder.exists():
        return None
    images = sorted(
        list(folder.glob("*.jpg"))
        + list(folder.glob("*.jpeg"))
        + list(folder.glob("*.png"))
    )
    if not images:
        return None
    return images[0].as_posix()


def main() -> None:
    """Create tables and import foods into the SQLite database."""
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)

    conn = sqlite3.connect(DB_PATH)
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")

    conn.executescript(_DDL_CORE)

    df = pd.read_csv(CSV_PATH)

    df = df.rename(columns={
        "English Name":     "display_name",
        "Thai Name":        "thai_name",
        "Calories (kcal)":  "kcal",
        "Carbohydrate (g)": "carbs_g",
        "Protein (g)":      "protein_g",
        "Fat (g)":          "fat_g",
        "Sugar (g)":        "sugar_g",
    })
    df = df.drop(columns=["Menu Code No."])

    df["name"] = df["display_name"].apply(_to_snake)

    df["image_path"] = df["name"].apply(find_image_for_food)

    df = df[["name", "display_name", "thai_name",
             "kcal", "protein_g", "fat_g", "carbs_g", "sugar_g",
             "image_path"]]

    df.to_sql("foods", conn, if_exists="replace", index=False)

    conn.execute("CREATE INDEX IF NOT EXISTS idx_foods_name ON foods(name)")
    conn.commit()

    counts = {
        tbl: conn.execute(f"SELECT COUNT(*) FROM {tbl}").fetchone()[0]
        for tbl in ("users", "user_profiles", "food_log", "foods")
    }

    no_image = [
        r[0] for r in
        conn.execute("SELECT name FROM foods WHERE image_path IS NULL ORDER BY name")
        .fetchall()
    ]

    train_folders = {p.name for p in TRAIN_DIR.iterdir() if p.is_dir()}
    known_names   = set(df["name"])
    unmatched     = sorted(train_folders - known_names)

    conn.close()

    print("✅ Tables created")
    for tbl, n in counts.items():
        print(f"   {tbl}: {n} rows")
    print(f"✅ Foods imported: {counts['foods']} rows")

    if no_image:
        print(f"⚠️  Foods with no image: {len(no_image)} rows → {no_image}")
    else:
        print("✅ All foods have images")

    if unmatched:
        print(f"⚠️  Class folders not matched in CSV ({len(unmatched)}): {unmatched}")
    else:
        print("✅ All class folders matched in CSV")


if __name__ == "__main__":
    main()
