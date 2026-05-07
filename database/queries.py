"""
Database query helpers used by the Next.js API layer.

This module contains thin, synchronous SQLite helpers for:
- food search and lookup
- daily log summaries
- profile upserts with BMI/TDEE derivations
"""

import sqlite3
from contextlib import contextmanager
from pathlib import Path

DB_PATH = Path("database/app.db")

_ACTIVITY_MULTIPLIERS = {
    "sedentary":         1.2,
    "light_exercise":    1.375,
    "moderate_exercise": 1.55,
    "heavy_exercise":    1.725,
    "athlete":           1.9,
}

_SORT_ALLOWLIST = {"name", "thai_name", "kcal"}


@contextmanager
def _conn():
    """Yield a SQLite connection with common PRAGMAs enabled."""
    con = sqlite3.connect(DB_PATH)
    con.row_factory = sqlite3.Row
    con.execute("PRAGMA foreign_keys=ON")
    try:
        yield con
        con.commit()
    finally:
        con.close()


def _calc_bmi(weight_kg, height_cm) -> float | None:
    """Calculate BMI from weight (kg) and height (cm)."""
    if weight_kg is None or height_cm is None:
        return None
    return round(weight_kg / (height_cm / 100) ** 2, 2)


def _calc_tdee(weight_kg, height_cm, age, gender, activity_level) -> float | None:
    """Estimate TDEE using Mifflin-St Jeor BMR and an activity multiplier."""
    if any(v is None for v in (weight_kg, height_cm, age, gender, activity_level)):
        return None
    bmr = 10 * weight_kg + 6.25 * height_cm - 5 * age
    bmr += 5 if gender == "male" else -161
    multiplier = _ACTIVITY_MULTIPLIERS.get(activity_level)
    if multiplier is None:
        return None
    return round(bmr * multiplier, 2)


def get_today_calories(user_id: int) -> float:
    """Return total kcal logged today for *user_id* (0.0 if none)."""
    with _conn() as con:
        row = con.execute(
            "SELECT COALESCE(SUM(kcal), 0) FROM food_log "
            "WHERE user_id = ? AND log_date = DATE('now')",
            (user_id,),
        ).fetchone()
        return float(row[0])


def get_today_meals(user_id: int) -> list[dict]:
    """Return every meal logged today, ordered oldest-first."""
    with _conn() as con:
        rows = con.execute(
            """
            SELECT fl.food_name,
                   f.thai_name,
                   fl.kcal,
                   fl.sugar_g,
                   fl.image_path,
                   fl.logged_at
            FROM   food_log fl
            LEFT JOIN foods f ON fl.food_name = f.name
            WHERE  fl.user_id  = ?
              AND  fl.log_date = DATE('now')
            ORDER BY fl.logged_at ASC
            """,
            (user_id,),
        ).fetchall()
        return [dict(r) for r in rows]


def get_remaining_calories(user_id: int) -> float | None:
    """Return remaining kcal for today. None if no calorie goal is set."""
    with _conn() as con:
        goal_row = con.execute(
            "SELECT COALESCE(ideal_cal, tdee) FROM user_profiles WHERE user_id = ?",
            (user_id,),
        ).fetchone()

        if goal_row is None or goal_row[0] is None:
            return None

        cal_row = con.execute(
            "SELECT COALESCE(SUM(kcal), 0) FROM food_log "
            "WHERE user_id = ? AND log_date = DATE('now')",
            (user_id,),
        ).fetchone()

        return round(float(goal_row[0]) - float(cal_row[0]), 2)


def search_foods(query: str, sort_by: str = "name") -> list[dict]:
    """Search the food library by English name, Thai name, or display name."""
    if sort_by not in _SORT_ALLOWLIST:
        raise ValueError(f"sort_by must be one of {sorted(_SORT_ALLOWLIST)}")

    like = f"%{query}%"
    with _conn() as con:
        rows = con.execute(
            f"""
            SELECT name, thai_name, display_name,
                   kcal, protein_g, fat_g, carbs_g, sugar_g, image_path
            FROM   foods
            WHERE  name         LIKE ?
              OR   thai_name    LIKE ?
              OR   display_name LIKE ?
            ORDER BY {sort_by}
            """,
            (like, like, like),
        ).fetchall()
        return [dict(r) for r in rows]


def update_profile(user_id: int, **kwargs) -> dict:
    """
    Upsert user profile fields, then recalculate and persist BMI + TDEE.

    Accepted kwargs: display_name, height_cm, weight_kg, body_fat_pct,
                     age, gender, activity_level, ideal_cal
    """
    _ALLOWED = {
        "display_name", "height_cm", "weight_kg", "body_fat_pct",
        "age", "gender", "activity_level", "ideal_cal",
    }
    updates = {k: v for k, v in kwargs.items() if k in _ALLOWED}
    if not updates:
        raise ValueError(f"No valid fields provided. Allowed: {sorted(_ALLOWED)}")

    with _conn() as con:
        row = con.execute(
            "SELECT * FROM user_profiles WHERE user_id = ?", (user_id,)
        ).fetchone()

        merged = dict(row) if row else {"user_id": user_id}
        merged.update(updates)

        bmi  = _calc_bmi(merged.get("weight_kg"), merged.get("height_cm"))
        tdee = _calc_tdee(
            merged.get("weight_kg"), merged.get("height_cm"),
            merged.get("age"), merged.get("gender"),
            merged.get("activity_level"),
        )

        if row is None:
            payload = {
                "user_id":        user_id,
                "display_name":   merged.get("display_name"),
                "height_cm":      merged.get("height_cm"),
                "weight_kg":      merged.get("weight_kg"),
                "body_fat_pct":   merged.get("body_fat_pct"),
                "age":            merged.get("age"),
                "gender":         merged.get("gender"),
                "activity_level": merged.get("activity_level"),
                "ideal_cal":      merged.get("ideal_cal"),
                "bmi":            bmi,
                "tdee":           tdee,
            }
            cols         = ", ".join(payload)
            placeholders = ", ".join("?" * len(payload))
            con.execute(
                f"INSERT INTO user_profiles ({cols}) VALUES ({placeholders})",
                list(payload.values()),
            )
        else:
            to_set = {**updates, "bmi": bmi, "tdee": tdee}
            set_clause = ", ".join(f"{k} = ?" for k in to_set)
            set_clause += ", updated_at = CURRENT_TIMESTAMP"
            con.execute(
                f"UPDATE user_profiles SET {set_clause} WHERE user_id = ?",
                list(to_set.values()) + [user_id],
            )

        updated = con.execute(
            "SELECT * FROM user_profiles WHERE user_id = ?", (user_id,)
        ).fetchone()
        return dict(updated)
