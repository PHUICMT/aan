use crate::{data_root, db};
use rusqlite::Connection;
use serde::Serialize;

#[derive(Serialize)]
pub(crate) struct LibraryStats {
    total_series: i64,
    favorite_series: i64,
    total_chapters: i64,
    downloaded_chapters: i64,
    read_chapters: i64,
}

#[derive(Serialize)]
pub(crate) struct DailyCount {
    date: String,
    count: i64,
}

#[derive(Serialize)]
pub(crate) struct ReadingStats {
    total_read: i64,
    today: i64,
    week: i64,
    month: i64,
    daily: Vec<DailyCount>,
    total_seconds_today: i64,
    total_seconds_7d: i64,
    total_seconds_30d: i64,
}

pub(crate) fn library_stats_inner(conn: &Connection) -> Result<LibraryStats, String> {
    let q = |sql: &str| -> Result<i64, String> {
        conn.query_row(sql, [], |r| r.get::<_, i64>(0))
            .map_err(|e| e.to_string())
    };
    Ok(LibraryStats {
        total_series: q("SELECT COUNT(*) FROM series WHERE COALESCE(local_chapter_count,0) > 0")?,
        favorite_series: q("SELECT COUNT(*) FROM series WHERE COALESCE(is_favorite,0) = 1")?,
        total_chapters: q("SELECT COUNT(*) FROM chapters")?,
        downloaded_chapters: q("SELECT COUNT(*) FROM chapters WHERE COALESCE(is_downloaded,0) = 1")?,
        read_chapters: q("SELECT COUNT(*) FROM chapters WHERE read_at IS NOT NULL")?,
    })
}

#[tauri::command]
pub(crate) fn library_stats() -> Result<LibraryStats, String> {
    let conn = db::open(&data_root())?;
    library_stats_inner(&conn)
}

pub(crate) fn log_reading_session_inner(conn: &Connection, chapter_id: &str, pid: i64, seconds: i64) -> Result<(), String> {
    if seconds <= 0 || seconds > 7200 {
        return Err("invalid seconds".to_string());
    }
    conn.execute(
        "INSERT INTO reading_log (date, pid, chapter_id, seconds)
         VALUES (date('now','localtime'), ?1, ?2, ?3)",
        rusqlite::params![pid, chapter_id, seconds],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub(crate) fn log_reading_session(chapter_id: String, pid: i64, seconds: i64) -> Result<(), String> {
    let conn = db::open(&data_root())?;
    log_reading_session_inner(&conn, &chapter_id, pid, seconds)
}

pub(crate) fn reading_stats_inner(conn: &Connection, days: Option<i64>) -> Result<ReadingStats, String> {
    let span = days.unwrap_or(365).clamp(1, 1825);
    let q = |sql: &str| -> Result<i64, String> {
        conn.query_row(sql, [], |r| r.get::<_, i64>(0))
            .map_err(|e| e.to_string())
    };
    let total_read = q("SELECT COUNT(*) FROM chapters WHERE read_at IS NOT NULL")?;
    let today = q("SELECT COUNT(*) FROM chapters WHERE date(read_at) = date('now','localtime')")?;
    let week = q(
        "SELECT COUNT(*) FROM chapters WHERE date(read_at) >= date('now','localtime','-6 days')",
    )?;
    let month = q(
        "SELECT COUNT(*) FROM chapters WHERE date(read_at) >= date('now','localtime','-29 days')",
    )?;

    let mut stmt = conn
        .prepare(
            "SELECT date(read_at,'localtime') AS d, COUNT(*) AS n
             FROM chapters
             WHERE read_at IS NOT NULL
               AND date(read_at,'localtime') >= date('now','localtime', ?1)
             GROUP BY d
             ORDER BY d ASC",
        )
        .map_err(|e| e.to_string())?;
    let offset = format!("-{} days", span - 1);
    let rows = stmt
        .query_map([offset], |r| {
            Ok(DailyCount {
                date: r.get(0)?,
                count: r.get(1)?,
            })
        })
        .map_err(|e| e.to_string())?;
    let mut daily = Vec::new();
    for r in rows {
        daily.push(r.map_err(|e| e.to_string())?);
    }
    let secs_today: i64 = conn
        .query_row(
            "SELECT COALESCE(SUM(seconds),0) FROM reading_log
             WHERE date = date('now','localtime')",
            [],
            |r| r.get(0),
        )
        .unwrap_or(0);
    let secs_7d: i64 = conn
        .query_row(
            "SELECT COALESCE(SUM(seconds),0) FROM reading_log
             WHERE date >= date('now','localtime','-6 days')",
            [],
            |r| r.get(0),
        )
        .unwrap_or(0);
    let secs_30d: i64 = conn
        .query_row(
            "SELECT COALESCE(SUM(seconds),0) FROM reading_log
             WHERE date >= date('now','localtime','-29 days')",
            [],
            |r| r.get(0),
        )
        .unwrap_or(0);
    Ok(ReadingStats {
        total_read,
        today,
        week,
        month,
        daily,
        total_seconds_today: secs_today,
        total_seconds_7d: secs_7d,
        total_seconds_30d: secs_30d,
    })
}

#[tauri::command]
pub(crate) fn reading_stats(days: Option<i64>) -> Result<ReadingStats, String> {
    let conn = db::open(&data_root())?;
    reading_stats_inner(&conn, days)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::test_util::*;

    #[test]
    fn test_library_stats_counts() {
        let (_tmp, root) = temp_data_root();
        let conn = fresh_db(&root);
        insert_test_series(&conn, 1, "A", "manga", 2, 1, None, None, None);
        insert_test_series(&conn, 2, "B", "manga", 1, 0, None, None, None);
        insert_test_chapter(&conn, "a", 1, 1.0, "", 1, "p", 0);
        insert_test_chapter(&conn, "b", 1, 2.0, "", 1, "p", 0);
        insert_test_chapter(&conn, "c", 2, 1.0, "", 0, "", 0);
        set_chapter_read_at(&conn, "a", "2025-01-01 00:00:00", 1);
        let s = library_stats_inner(&conn).unwrap();
        assert_eq!(s.total_series, 2);
        assert_eq!(s.favorite_series, 1);
        assert_eq!(s.total_chapters, 3);
        assert_eq!(s.downloaded_chapters, 2);
        assert_eq!(s.read_chapters, 1);
    }

    #[test]
    fn test_log_reading_session_validation() {
        let (_tmp, root) = temp_data_root();
        let conn = fresh_db(&root);
        assert!(log_reading_session_inner(&conn, "c1", 1, 0).is_err());
        assert!(log_reading_session_inner(&conn, "c1", 1, 7201).is_err());
        assert!(log_reading_session_inner(&conn, "c1", 1, 60).is_ok());
        let n: i64 = conn
            .query_row("SELECT COUNT(*) FROM reading_log", [], |r| r.get(0))
            .unwrap();
        assert_eq!(n, 1);
    }

    #[test]
    fn test_reading_stats_today_week_seconds() {
        let (_tmp, root) = temp_data_root();
        let conn = fresh_db(&root);
        insert_test_series(&conn, 1, "S", "manga", 1, 0, None, None, None);
        insert_test_chapter(&conn, "a", 1, 1.0, "", 1, "p", 5);
        // read_at stored as ISO datetime — date(read_at,'localtime') vs date('now','localtime')
        // must match for the "today" bucket; use SQL `datetime('now')` to stay aligned.
        conn.execute(
            "UPDATE chapters SET read_at = datetime('now') WHERE chapter_id='a'",
            [],
        )
        .unwrap();
        log_reading_session_inner(&conn, "a", 1, 300).unwrap();
        let s = reading_stats_inner(&conn, Some(30)).unwrap();
        assert!(s.total_read >= 1);
        assert!(s.total_seconds_today >= 300);
        assert!(s.total_seconds_7d >= 300);
        assert!(s.total_seconds_30d >= 300);
    }
}
