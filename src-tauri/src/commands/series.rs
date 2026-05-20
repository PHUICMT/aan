use crate::{data_root, db};
use rusqlite::Connection;
use serde::Serialize;

#[derive(Serialize)]
pub(crate) struct SeriesDetail {
    pid: i64,
    name: String,
    alias: Option<String>,
    #[serde(rename = "type")]
    kind: String,
    status: i64,
    info: Option<String>,
    author_name: Option<String>,
    artist_name: Option<String>,
    chapter_count: i64,
    local_chapter_count: i64,
    last_updated: Option<String>,
    last_chapter_no: f64,
    tags: Vec<String>,
    is_favorite: i64,
    reading_status: Option<String>,
}

#[derive(Serialize)]
pub(crate) struct SeriesCard {
    pid: i64,
    name: String,
    alias: Option<String>,
    #[serde(rename = "type")]
    kind: String,
    status: i64,
    cover_path: Option<String>,
    chapter_count: i64,
    local_chapter_count: i64,
    last_updated: Option<String>,
    tags: Vec<String>,
    is_favorite: i64,
    last_read_at: Option<String>,
    reading_status: Option<String>,
}

#[derive(Serialize)]
pub(crate) struct GenreCount {
    name: String,
    count: i64,
}

pub(crate) fn list_local_series_inner(conn: &Connection) -> Result<Vec<SeriesCard>, String> {
    let mut stmt = conn
        .prepare(
            "SELECT s.pid, s.name, s.alias, s.type, s.status, s.cover_path,
                    COALESCE(s.chapter_count, 0), COALESCE(s.local_chapter_count, 0),
                    s.last_updated,
                    COALESCE(s.is_favorite, 0),
                    (SELECT MAX(c.read_at) FROM chapters c WHERE c.pid = s.pid),
                    s.reading_status
             FROM series s
             WHERE COALESCE(s.local_chapter_count, 0) > 0
                OR COALESCE(s.is_favorite, 0) = 1
                OR s.reading_status IS NOT NULL
             ORDER BY s.last_updated DESC, s.name ASC",
        )
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([], |r| {
            Ok(SeriesCard {
                pid: r.get(0)?,
                name: r.get(1)?,
                alias: r.get::<_, Option<String>>(2)?,
                kind: r.get(3)?,
                status: r.get(4)?,
                cover_path: r.get::<_, Option<String>>(5)?,
                chapter_count: r.get(6)?,
                local_chapter_count: r.get(7)?,
                last_updated: r.get::<_, Option<String>>(8)?,
                tags: Vec::new(),
                is_favorite: r.get(9)?,
                last_read_at: r.get::<_, Option<String>>(10)?,
                reading_status: r.get::<_, Option<String>>(11)?,
            })
        })
        .map_err(|e| e.to_string())?;
    let mut out = Vec::new();
    for r in rows {
        let mut card = r.map_err(|e| e.to_string())?;
        card.tags = db::list_tags_for_series(conn, card.pid).unwrap_or_default();
        out.push(card);
    }
    Ok(out)
}

#[tauri::command]
pub(crate) fn list_local_series() -> Result<Vec<SeriesCard>, String> {
    let conn = db::open(&data_root())?;
    list_local_series_inner(&conn)
}

pub(crate) fn delete_orphan_series_inner(conn: &Connection, root: &std::path::Path, pid: i64) -> Result<bool, String> {
    // Refuse to delete if the user has engaged with the series.
    let safe: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM series
              WHERE pid = ?1
                AND COALESCE(local_chapter_count, 0) = 0
                AND COALESCE(is_favorite, 0) = 0
                AND reading_status IS NULL",
            [pid],
            |r| r.get(0),
        )
        .unwrap_or(0);
    if safe == 0 {
        return Ok(false);
    }
    let _ = conn.execute("DELETE FROM chapters WHERE pid = ?1", [pid]);
    let _ = conn.execute("DELETE FROM series_tags WHERE pid = ?1", [pid]);
    let _ = conn.execute("DELETE FROM series WHERE pid = ?1", [pid]);
    let cover = root.join("covers").join(format!("{pid}.jpg"));
    let _ = std::fs::remove_file(&cover);
    Ok(true)
}

#[tauri::command]
pub(crate) fn delete_orphan_series(pid: i64) -> Result<bool, String> {
    let root = data_root();
    let conn = db::open(&root)?;
    delete_orphan_series_inner(&conn, &root, pid)
}

pub(crate) fn get_series_inner(conn: &Connection, pid: i64) -> Result<SeriesDetail, String> {
    let row = conn
        .query_row(
            "SELECT pid, name, alias, type, status, info, author_name, artist_name,
                    COALESCE(chapter_count, 0), COALESCE(local_chapter_count, 0),
                    last_updated, COALESCE(last_chapter_no, 0),
                    COALESCE(is_favorite, 0), reading_status
             FROM series WHERE pid = ?1",
            [pid],
            |r| {
                Ok(SeriesDetail {
                    pid: r.get(0)?,
                    name: r.get(1)?,
                    alias: r.get::<_, Option<String>>(2)?,
                    kind: r.get(3)?,
                    status: r.get(4)?,
                    info: r.get::<_, Option<String>>(5)?,
                    author_name: r.get::<_, Option<String>>(6)?,
                    artist_name: r.get::<_, Option<String>>(7)?,
                    chapter_count: r.get(8)?,
                    local_chapter_count: r.get(9)?,
                    last_updated: r.get::<_, Option<String>>(10)?,
                    last_chapter_no: r.get(11)?,
                    tags: Vec::new(),
                    is_favorite: r.get(12)?,
                    reading_status: r.get::<_, Option<String>>(13)?,
                })
            },
        )
        .map_err(|e| e.to_string())?;
    let mut detail = row;
    detail.tags = db::list_tags_for_series(conn, pid).unwrap_or_default();
    Ok(detail)
}

#[tauri::command]
pub(crate) fn get_series(pid: i64) -> Result<SeriesDetail, String> {
    let conn = db::open(&data_root())?;
    get_series_inner(&conn, pid)
}

pub(crate) fn list_genres_inner(conn: &Connection) -> Result<Vec<GenreCount>, String> {
    let rows = db::list_all_tags(conn)?;
    Ok(rows
        .into_iter()
        .map(|(name, count)| GenreCount { name, count })
        .collect())
}

#[tauri::command]
pub(crate) fn list_genres() -> Result<Vec<GenreCount>, String> {
    let conn = db::open(&data_root())?;
    list_genres_inner(&conn)
}

#[tauri::command]
pub(crate) fn set_series_favorite(pid: i64, fav: bool) -> Result<(), String> {
    let conn = db::open(&data_root())?;
    db::set_series_favorite(&conn, pid, fav)
}

pub(crate) fn set_reading_status_inner(conn: &Connection, pid: i64, status: Option<String>) -> Result<(), String> {
    // Whitelist accepted values to keep the column tidy.
    let normalized = match status.as_deref() {
        Some("plan") | Some("reading") | Some("completed") | Some("on_hold") | Some("dropped") => status,
        None | Some("") => None,
        Some(_) => return Err("invalid reading_status".into()),
    };
    conn.execute(
        "UPDATE series SET reading_status = ?2 WHERE pid = ?1",
        rusqlite::params![pid, normalized],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub(crate) fn set_reading_status(pid: i64, status: Option<String>) -> Result<(), String> {
    let conn = db::open(&data_root())?;
    set_reading_status_inner(&conn, pid, status)
}

/// Series with status='reading' but no read activity in `days`.
/// Excludes completed/dropped. Drives the Home reminder rail.
pub(crate) fn list_abandoned_inner(conn: &Connection, days: Option<i64>, limit: Option<i64>) -> Result<Vec<SeriesCard>, String> {
    let d = days.unwrap_or(30).clamp(1, 365);
    let lim = limit.unwrap_or(6).clamp(1, 30);
    let cutoff = format!("-{} days", d);
    let mut stmt = conn
        .prepare(
            "SELECT s.pid, s.name, s.alias, s.type, s.status, s.cover_path,
                    COALESCE(s.chapter_count, 0), COALESCE(s.local_chapter_count, 0),
                    s.last_updated,
                    COALESCE(s.is_favorite, 0),
                    (SELECT MAX(c.read_at) FROM chapters c WHERE c.pid = s.pid) AS lra,
                    s.reading_status
             FROM series s
             WHERE COALESCE(s.reading_status, '') = 'reading'
               AND COALESCE(s.local_chapter_count, 0) > 0
               AND (
                 (SELECT MAX(c.read_at) FROM chapters c WHERE c.pid = s.pid) IS NULL
                 OR (SELECT MAX(c.read_at) FROM chapters c WHERE c.pid = s.pid) < datetime('now', ?1)
               )
             ORDER BY lra ASC NULLS FIRST, s.name ASC
             LIMIT ?2",
        )
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map(rusqlite::params![cutoff, lim], |r| {
            Ok(SeriesCard {
                pid: r.get(0)?,
                name: r.get(1)?,
                alias: r.get::<_, Option<String>>(2)?,
                kind: r.get(3)?,
                status: r.get(4)?,
                cover_path: r.get::<_, Option<String>>(5)?,
                chapter_count: r.get(6)?,
                local_chapter_count: r.get(7)?,
                last_updated: r.get::<_, Option<String>>(8)?,
                tags: Vec::new(),
                is_favorite: r.get(9)?,
                last_read_at: r.get::<_, Option<String>>(10)?,
                reading_status: r.get::<_, Option<String>>(11)?,
            })
        })
        .map_err(|e| e.to_string())?;
    let mut out = Vec::new();
    for r in rows { out.push(r.map_err(|e| e.to_string())?); }
    Ok(out)
}

#[tauri::command]
pub(crate) fn list_abandoned(days: Option<i64>, limit: Option<i64>) -> Result<Vec<SeriesCard>, String> {
    let conn = db::open(&data_root())?;
    list_abandoned_inner(&conn, days, limit)
}

pub(crate) fn list_recently_added_inner(conn: &Connection, limit: Option<i64>) -> Result<Vec<SeriesCard>, String> {
    let lim = limit.unwrap_or(8).clamp(1, 50);
    let mut stmt = conn
        .prepare(
            "SELECT s.pid, s.name, s.alias, s.type, s.status, s.cover_path,
                    COALESCE(s.chapter_count, 0), COALESCE(s.local_chapter_count, 0),
                    s.last_updated,
                    COALESCE(s.is_favorite, 0),
                    (SELECT MAX(c.read_at) FROM chapters c WHERE c.pid = s.pid),
                    s.reading_status
             FROM series s
             WHERE COALESCE(s.local_chapter_count, 0) > 0
               AND s.added_at IS NOT NULL
             ORDER BY
                 s.added_at DESC,
                 s.name ASC
             LIMIT ?1",
        )
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([lim], |r| {
            Ok(SeriesCard {
                pid: r.get(0)?,
                name: r.get(1)?,
                alias: r.get::<_, Option<String>>(2)?,
                kind: r.get(3)?,
                status: r.get(4)?,
                cover_path: r.get::<_, Option<String>>(5)?,
                chapter_count: r.get(6)?,
                local_chapter_count: r.get(7)?,
                last_updated: r.get::<_, Option<String>>(8)?,
                tags: Vec::new(),
                is_favorite: r.get(9)?,
                last_read_at: r.get::<_, Option<String>>(10)?,
                reading_status: r.get::<_, Option<String>>(11)?,
            })
        })
        .map_err(|e| e.to_string())?;
    let mut out = Vec::new();
    for r in rows {
        out.push(r.map_err(|e| e.to_string())?);
    }
    Ok(out)
}

#[tauri::command]
pub(crate) fn list_recently_added(limit: Option<i64>) -> Result<Vec<SeriesCard>, String> {
    let conn = db::open(&data_root())?;
    list_recently_added_inner(&conn, limit)
}

pub(crate) fn list_favorite_series_inner(conn: &Connection) -> Result<Vec<SeriesCard>, String> {
    let mut stmt = conn
        .prepare(
            "SELECT s.pid, s.name, s.alias, s.type, s.status, s.cover_path,
                    COALESCE(s.chapter_count, 0), COALESCE(s.local_chapter_count, 0),
                    s.last_updated,
                    COALESCE(s.is_favorite, 0),
                    (SELECT MAX(c.read_at) FROM chapters c WHERE c.pid = s.pid),
                    s.reading_status
             FROM series s
             WHERE COALESCE(s.is_favorite, 0) = 1
             ORDER BY s.favorited_at DESC, s.name ASC",
        )
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([], |r| {
            Ok(SeriesCard {
                pid: r.get(0)?,
                name: r.get(1)?,
                alias: r.get::<_, Option<String>>(2)?,
                kind: r.get(3)?,
                status: r.get(4)?,
                cover_path: r.get::<_, Option<String>>(5)?,
                chapter_count: r.get(6)?,
                local_chapter_count: r.get(7)?,
                last_updated: r.get::<_, Option<String>>(8)?,
                tags: Vec::new(),
                is_favorite: r.get(9)?,
                last_read_at: r.get::<_, Option<String>>(10)?,
                reading_status: r.get::<_, Option<String>>(11)?,
            })
        })
        .map_err(|e| e.to_string())?;
    let mut out = Vec::new();
    for r in rows {
        let mut card = r.map_err(|e| e.to_string())?;
        card.tags = db::list_tags_for_series(conn, card.pid).unwrap_or_default();
        out.push(card);
    }
    Ok(out)
}

#[tauri::command]
pub(crate) fn list_favorite_series() -> Result<Vec<SeriesCard>, String> {
    let conn = db::open(&data_root())?;
    list_favorite_series_inner(&conn)
}

#[derive(Serialize)]
pub(crate) struct TopSeriesEntry {
    pid: i64,
    name: String,
    kind: String,
    seconds: i64,
    chapters: i64,
}

pub(crate) fn top_series_week_inner(conn: &Connection, limit: Option<i64>) -> Result<Vec<TopSeriesEntry>, String> {
    let lim = limit.unwrap_or(5).clamp(1, 20);
    let mut stmt = conn
        .prepare(
            "SELECT rl.pid,
                    COALESCE(s.name, '') AS name,
                    COALESCE(s.type, '') AS kind,
                    SUM(rl.seconds) AS total_seconds,
                    COUNT(DISTINCT rl.chapter_id) AS chapter_count
             FROM reading_log rl
             LEFT JOIN series s ON s.pid = rl.pid
             WHERE rl.date >= date('now','localtime','-6 days')
             GROUP BY rl.pid
             ORDER BY total_seconds DESC
             LIMIT ?1",
        )
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map(rusqlite::params![lim], |r| {
            Ok(TopSeriesEntry {
                pid: r.get(0)?,
                name: r.get(1)?,
                kind: r.get(2)?,
                seconds: r.get(3)?,
                chapters: r.get(4)?,
            })
        })
        .map_err(|e| e.to_string())?;
    let mut out = Vec::new();
    for r in rows {
        out.push(r.map_err(|e| e.to_string())?);
    }
    Ok(out)
}

#[tauri::command]
pub(crate) fn top_series_week(limit: Option<i64>) -> Result<Vec<TopSeriesEntry>, String> {
    let conn = db::open(&data_root())?;
    top_series_week_inner(&conn, limit)
}

// ── Editor: update / delete / cover ─────────────────────────────────

#[derive(serde::Deserialize, Default)]
pub(crate) struct SeriesPatch {
    /// Each field is "missing" (no edit) vs `Some("")` (clear) vs `Some(value)`.
    pub name: Option<String>,
    pub alias: Option<String>,
    pub info: Option<String>,
    pub author_name: Option<String>,
    pub artist_name: Option<String>,
    pub status: Option<i64>,
}

pub(crate) fn update_series_inner(
    conn: &Connection,
    pid: i64,
    patch: SeriesPatch,
) -> Result<(), String> {
    // Build SET clauses dynamically so unchanged columns stay untouched.
    let mut sets: Vec<&str> = Vec::new();
    let mut params: Vec<Box<dyn rusqlite::ToSql>> = Vec::new();
    if let Some(v) = patch.name.as_ref() {
        if v.trim().is_empty() {
            return Err("name cannot be empty".into());
        }
        sets.push("name = ?");
        params.push(Box::new(v.trim().to_string()));
    }
    if let Some(v) = patch.alias { sets.push("alias = ?"); params.push(Box::new(v)); }
    if let Some(v) = patch.info { sets.push("info = ?"); params.push(Box::new(v)); }
    if let Some(v) = patch.author_name { sets.push("author_name = ?"); params.push(Box::new(v)); }
    if let Some(v) = patch.artist_name { sets.push("artist_name = ?"); params.push(Box::new(v)); }
    if let Some(v) = patch.status { sets.push("status = ?"); params.push(Box::new(v)); }
    if sets.is_empty() {
        return Ok(());
    }
    let sql = format!("UPDATE series SET {} WHERE pid = ?", sets.join(", "));
    params.push(Box::new(pid));
    let refs: Vec<&dyn rusqlite::ToSql> = params.iter().map(|b| b.as_ref()).collect();
    conn.execute(&sql, refs.as_slice()).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub(crate) fn update_series(pid: i64, patch: SeriesPatch) -> Result<(), String> {
    let conn = db::open(&data_root())?;
    update_series_inner(&conn, pid, patch)
}

/// Deletes a series and **all** its files, even if downloaded or favorited.
/// Caller is expected to confirm with the user before invoking this.
pub(crate) fn delete_series_force_inner(
    conn: &Connection,
    root: &std::path::Path,
    pid: i64,
) -> Result<(), String> {
    let chapter_paths: Vec<String> = conn
        .prepare("SELECT COALESCE(pdf_path,'') FROM chapters WHERE pid = ?1")
        .map_err(|e| e.to_string())?
        .query_map([pid], |r| r.get::<_, String>(0))
        .map_err(|e| e.to_string())?
        .filter_map(Result::ok)
        .filter(|s| !s.is_empty())
        .collect();

    let _ = conn.execute("DELETE FROM chapters WHERE pid = ?1", [pid]);
    let _ = conn.execute("DELETE FROM series_tags WHERE pid = ?1", [pid]);
    let _ = conn.execute("DELETE FROM bookmarks WHERE pid = ?1", [pid]);
    let _ = conn.execute("DELETE FROM reading_log WHERE pid = ?1", [pid]);
    let _ = conn.execute("DELETE FROM series WHERE pid = ?1", [pid]);

    // Remove chapter files: image dirs (no .pdf suffix) or individual files.
    for stored in chapter_paths {
        let p = crate::app_config::resolve_stored_path(&stored, root);
        if p.is_dir() {
            let _ = std::fs::remove_dir_all(&p);
        } else if p.is_file() {
            let _ = std::fs::remove_file(&p);
        }
    }
    // Series-wide folders.
    let _ = std::fs::remove_dir_all(root.join("manga").join(pid.to_string()));
    let _ = std::fs::remove_dir_all(root.join("novel").join(pid.to_string()));
    let _ = std::fs::remove_file(root.join("covers").join(format!("{pid}.jpg")));
    Ok(())
}

#[tauri::command]
pub(crate) fn delete_series_force(pid: i64) -> Result<(), String> {
    let root = data_root();
    let conn = db::open(&root)?;
    delete_series_force_inner(&conn, &root, pid)
}

/// Read an arbitrary image file the user picked via the cover dialog.
/// Extension-gated so the command can't be coerced into reading any path.
#[tauri::command]
pub(crate) fn read_cover_source(path: String) -> Result<Vec<u8>, String> {
    let p = std::path::PathBuf::from(&path);
    let ext_ok = p
        .extension()
        .and_then(|s| s.to_str())
        .map(|s| matches!(s.to_ascii_lowercase().as_str(), "jpg" | "jpeg" | "png" | "webp"))
        .unwrap_or(false);
    if !ext_ok {
        return Err("only jpg/jpeg/png/webp are supported".into());
    }
    if !p.is_file() {
        return Err(format!("not a file: {path}"));
    }
    std::fs::read(&p).map_err(|e| e.to_string())
}

/// Replace the cover with bytes the frontend just produced (resize +
/// re-encode through the `image` crate so the read-cover path stays
/// uniformly JPEG).
#[tauri::command]
pub(crate) fn set_series_cover(pid: i64, bytes: Vec<u8>) -> Result<(), String> {
    let root = data_root();
    let dest = root.join("covers").join(format!("{pid}.jpg"));
    if let Some(parent) = dest.parent() {
        std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    let img = image::load_from_memory(&bytes).map_err(|e| format!("decode: {e}"))?;
    let max_w = 600u32;
    let scaled = if img.width() > max_w {
        img.resize(max_w, u32::MAX, image::imageops::FilterType::Triangle)
    } else {
        img
    };
    let mut out = std::fs::File::create(&dest).map_err(|e| e.to_string())?;
    scaled
        .to_rgb8()
        .write_with_encoder(image::codecs::jpeg::JpegEncoder::new_with_quality(&mut out, 88))
        .map_err(|e| format!("encode: {e}"))?;

    // Make sure series.cover_path points at the canonical file.
    let conn = db::open(&root)?;
    let rel = format!("covers/{pid}.jpg");
    conn.execute(
        "UPDATE series SET cover_path = ?2 WHERE pid = ?1",
        rusqlite::params![pid, rel],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

// ── Per-series reader preferences override ─────────────────────────
// Reader settings are normally a global default (localStorage). A
// series can opt-in to its own snapshot stored as opaque JSON; the
// reader applies it on chapter open and falls back to the global if
// the column is NULL.

pub(crate) fn get_series_reader_prefs_inner(
    conn: &Connection,
    pid: i64,
) -> Result<Option<String>, String> {
    let v: Option<String> = conn
        .query_row(
            "SELECT reader_prefs_json FROM series WHERE pid = ?1",
            rusqlite::params![pid],
            |r| r.get(0),
        )
        .map_err(|e| e.to_string())?;
    Ok(v.filter(|s| !s.is_empty()))
}

pub(crate) fn set_series_reader_prefs_inner(
    conn: &Connection,
    pid: i64,
    json: &str,
) -> Result<(), String> {
    // Tiny structural sanity check — keeps obvious junk out of the column
    // without paying for a full serde round-trip on every save.
    if !json.trim_start().starts_with('{') {
        return Err("reader prefs must be a JSON object".into());
    }
    conn.execute(
        "UPDATE series SET reader_prefs_json = ?2 WHERE pid = ?1",
        rusqlite::params![pid, json],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

pub(crate) fn clear_series_reader_prefs_inner(
    conn: &Connection,
    pid: i64,
) -> Result<(), String> {
    conn.execute(
        "UPDATE series SET reader_prefs_json = NULL WHERE pid = ?1",
        rusqlite::params![pid],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub(crate) fn get_series_reader_prefs(pid: i64) -> Result<Option<String>, String> {
    let conn = db::open(&data_root())?;
    get_series_reader_prefs_inner(&conn, pid)
}

#[tauri::command]
pub(crate) fn set_series_reader_prefs(pid: i64, json: String) -> Result<(), String> {
    let conn = db::open(&data_root())?;
    set_series_reader_prefs_inner(&conn, pid, &json)
}

#[tauri::command]
pub(crate) fn clear_series_reader_prefs(pid: i64) -> Result<(), String> {
    let conn = db::open(&data_root())?;
    clear_series_reader_prefs_inner(&conn, pid)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::test_util::*;

    #[test]
    fn test_list_local_series_returns_only_engaged() {
        let (_tmp, root) = temp_data_root();
        let conn = fresh_db(&root);
        insert_test_series(&conn, 1, "Orphan", "manga", 0, 0, None, None, None);
        insert_test_series(&conn, 2, "Engaged", "manga", 3, 0, None, Some("2024-01-01"), None);
        let out = list_local_series_inner(&conn).unwrap();
        assert_eq!(out.len(), 1);
    }

    #[test]
    fn test_set_series_favorite_toggles() {
        let (_tmp, root) = temp_data_root();
        let conn = fresh_db(&root);
        insert_test_series(&conn, 10, "X", "manga", 1, 0, None, None, None);
        db::set_series_favorite(&conn, 10, true).unwrap();
        let fav: i64 = conn
            .query_row("SELECT is_favorite FROM series WHERE pid=10", [], |r| r.get(0))
            .unwrap();
        assert_eq!(fav, 1);
        db::set_series_favorite(&conn, 10, false).unwrap();
        let fav: i64 = conn
            .query_row("SELECT is_favorite FROM series WHERE pid=10", [], |r| r.get(0))
            .unwrap();
        assert_eq!(fav, 0);
    }

    #[test]
    fn test_set_reading_status_whitelist() {
        let (_tmp, root) = temp_data_root();
        let conn = fresh_db(&root);
        insert_test_series(&conn, 1, "S", "manga", 1, 0, None, None, None);
        assert!(set_reading_status_inner(&conn, 1, Some("reading".into())).is_ok());
        assert!(set_reading_status_inner(&conn, 1, Some("garbage".into())).is_err());
        assert!(set_reading_status_inner(&conn, 1, None).is_ok());
    }

    #[test]
    fn test_delete_orphan_series_refuses_engaged() {
        let (_tmp, root) = temp_data_root();
        let conn = fresh_db(&root);
        insert_test_series(&conn, 1, "Fav", "manga", 0, 1, None, None, None);
        insert_test_series(&conn, 2, "Orph", "manga", 0, 0, None, None, None);
        assert!(!delete_orphan_series_inner(&conn, &root, 1).unwrap());
        assert!(delete_orphan_series_inner(&conn, &root, 2).unwrap());
        let n: i64 = conn
            .query_row("SELECT COUNT(*) FROM series WHERE pid=2", [], |r| r.get(0))
            .unwrap();
        assert_eq!(n, 0);
    }

    #[test]
    fn test_list_genres_aggregates_tags() {
        let (_tmp, root) = temp_data_root();
        let conn = fresh_db(&root);
        insert_test_series(&conn, 1, "A", "manga", 1, 0, None, None, None);
        insert_test_series(&conn, 2, "B", "manga", 1, 0, None, None, None);
        let tid = insert_tag(&conn, "action");
        link_tag(&conn, 1, tid);
        link_tag(&conn, 2, tid);
        let out = list_genres_inner(&conn).unwrap();
        assert_eq!(out.len(), 1);
        assert_eq!(out[0].name, "action");
        assert_eq!(out[0].count, 2);
    }

    #[test]
    fn test_list_favorite_series() {
        let (_tmp, root) = temp_data_root();
        let conn = fresh_db(&root);
        insert_test_series(&conn, 1, "Fav", "manga", 1, 1, None, None, None);
        insert_test_series(&conn, 2, "Plain", "manga", 1, 0, None, None, None);
        let out = list_favorite_series_inner(&conn).unwrap();
        assert_eq!(out.len(), 1);
    }

    #[test]
    fn test_list_recently_added_orders_by_added_at() {
        let (_tmp, root) = temp_data_root();
        let conn = fresh_db(&root);
        insert_test_series(&conn, 1, "Old", "manga", 1, 0, None, None, Some("2024-01-01"));
        insert_test_series(&conn, 2, "New", "manga", 1, 0, None, None, Some("2025-06-01"));
        let out = list_recently_added_inner(&conn, None).unwrap();
        assert_eq!(out.len(), 2);
        assert_eq!(out[0].pid, 2);
    }

    #[test]
    fn test_list_abandoned_filters_by_recency() {
        let (_tmp, root) = temp_data_root();
        let conn = fresh_db(&root);
        insert_test_series(&conn, 1, "Stale", "manga", 1, 0, Some("reading"), None, None);
        insert_test_chapter(&conn, "c1", 1, 1.0, "", 1, "manga/1/ch_1.pdf", 5);
        set_chapter_read_at(&conn, "c1", "2020-01-01 00:00:00", 1);
        let out = list_abandoned_inner(&conn, Some(30), Some(10)).unwrap();
        assert_eq!(out.len(), 1);
        assert_eq!(out[0].pid, 1);
    }

    #[test]
    fn test_top_series_week() {
        let (_tmp, root) = temp_data_root();
        let conn = fresh_db(&root);
        insert_test_series(&conn, 1, "Top", "manga", 1, 0, None, None, None);
        let today: String = conn
            .query_row("SELECT date('now','localtime')", [], |r| r.get(0))
            .unwrap();
        conn.execute(
            "INSERT INTO reading_log (date, pid, chapter_id, seconds) VALUES (?1, 1, 'c1', 120)",
            [&today],
        )
        .unwrap();
        conn.execute(
            "INSERT INTO reading_log (date, pid, chapter_id, seconds) VALUES (?1, 1, 'c2', 60)",
            [&today],
        )
        .unwrap();
        let out = top_series_week_inner(&conn, Some(5)).unwrap();
        assert_eq!(out.len(), 1);
        assert_eq!(out[0].pid, 1);
        assert_eq!(out[0].seconds, 180);
        assert_eq!(out[0].chapters, 2);
    }

    #[test]
    fn test_get_series_returns_detail() {
        let (_tmp, root) = temp_data_root();
        let conn = fresh_db(&root);
        insert_test_series(&conn, 7, "Hello", "manga", 2, 0, None, None, None);
        let d = get_series_inner(&conn, 7).unwrap();
        assert_eq!(d.pid, 7);
        assert_eq!(d.name, "Hello");
    }

    // ── Editor ─────────────────────────────────────────────────────

    #[test]
    fn update_series_patches_only_supplied_fields() {
        let (_tmp, root) = temp_data_root();
        let conn = fresh_db(&root);
        insert_test_series(&conn, 100, "Old", "manga", 1, 0, None, None, None);

        let patch = SeriesPatch {
            name: Some("New Name".into()),
            info: Some("Synopsis here".into()),
            ..Default::default()
        };
        update_series_inner(&conn, 100, patch).unwrap();
        let (name, info, author): (String, String, String) = conn
            .query_row(
                "SELECT name, info, COALESCE(author_name,'') FROM series WHERE pid=100",
                [],
                |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?)),
            )
            .unwrap();
        assert_eq!(name, "New Name");
        assert_eq!(info, "Synopsis here");
        assert_eq!(author, ""); // untouched
    }

    #[test]
    fn update_series_rejects_blank_name() {
        let (_tmp, root) = temp_data_root();
        let conn = fresh_db(&root);
        insert_test_series(&conn, 1, "X", "manga", 0, 0, None, None, None);
        let patch = SeriesPatch { name: Some("   ".into()), ..Default::default() };
        assert!(update_series_inner(&conn, 1, patch).is_err());
    }

    #[test]
    fn delete_series_force_drops_rows_and_files() {
        let (_tmp, root) = temp_data_root();
        let conn = fresh_db(&root);
        insert_test_series(&conn, 200, "Wipe Me", "manga", 1, 0, None, None, None);
        insert_test_chapter(&conn, "200-1", 200, 1.0, "Ch 1", 1, "manga/200/200-1.pdf", 5);

        // Create the file so we can assert it goes away.
        let pdf_dir = root.join("manga").join("200");
        std::fs::create_dir_all(&pdf_dir).unwrap();
        let pdf = pdf_dir.join("200-1.pdf");
        std::fs::write(&pdf, b"%PDF-1.4").unwrap();
        let cover = root.join("covers").join("200.jpg");
        std::fs::create_dir_all(cover.parent().unwrap()).unwrap();
        std::fs::write(&cover, b"x").unwrap();

        delete_series_force_inner(&conn, &root, 200).unwrap();

        let n: i64 = conn
            .query_row("SELECT COUNT(*) FROM series WHERE pid=200", [], |r| r.get(0))
            .unwrap();
        assert_eq!(n, 0);
        let c: i64 = conn
            .query_row("SELECT COUNT(*) FROM chapters WHERE pid=200", [], |r| r.get(0))
            .unwrap();
        assert_eq!(c, 0);
        assert!(!pdf.exists());
        assert!(!cover.exists());
    }

    #[test]
    fn reader_prefs_roundtrip() {
        let (_tmp, root) = temp_data_root();
        let conn = fresh_db(&root);
        insert_test_series(&conn, 11, "Z", "novel", 1, 0, None, None, None);
        assert_eq!(get_series_reader_prefs_inner(&conn, 11).unwrap(), None);
        set_series_reader_prefs_inner(&conn, 11, r#"{"layout":"paged","theme":"sepia"}"#).unwrap();
        let got = get_series_reader_prefs_inner(&conn, 11).unwrap().unwrap();
        assert!(got.contains("\"theme\":\"sepia\""));
        clear_series_reader_prefs_inner(&conn, 11).unwrap();
        assert_eq!(get_series_reader_prefs_inner(&conn, 11).unwrap(), None);
    }

    #[test]
    fn reader_prefs_rejects_non_json() {
        let (_tmp, root) = temp_data_root();
        let conn = fresh_db(&root);
        insert_test_series(&conn, 12, "X", "novel", 1, 0, None, None, None);
        let err = set_series_reader_prefs_inner(&conn, 12, "not-json").unwrap_err();
        assert!(err.contains("JSON"));
    }
}
