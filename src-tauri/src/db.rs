use rusqlite::{params, Connection};
use std::path::PathBuf;

pub fn library_path(data_root: &std::path::Path) -> PathBuf {
    data_root.join("library.db")
}

pub fn open(data_root: &std::path::Path) -> Result<Connection, String> {
    if !data_root.exists() {
        std::fs::create_dir_all(data_root).map_err(|e| e.to_string())?;
    }
    let conn = Connection::open(library_path(data_root)).map_err(|e| e.to_string())?;
    ensure_schema(&conn)?;
    Ok(conn)
}

/// Idempotent add-only migrations.
fn ensure_schema(conn: &Connection) -> Result<(), String> {
    conn.execute(
        "CREATE TABLE IF NOT EXISTS series (
            pid                  INTEGER PRIMARY KEY,
            name                 TEXT NOT NULL,
            alias                TEXT DEFAULT '',
            type                 TEXT NOT NULL,
            status               INTEGER DEFAULT 0,
            cover_path           TEXT DEFAULT '',
            info                 TEXT DEFAULT '',
            author_name          TEXT DEFAULT '',
            artist_name          TEXT DEFAULT '',
            chapter_count        INTEGER DEFAULT 0,
            local_chapter_count  INTEGER DEFAULT 0,
            last_chapter_no      REAL DEFAULT 0,
            last_updated         TIMESTAMP,
            added_at             TIMESTAMP
        )",
        [],
    )
    .map_err(|e| e.to_string())?;
    conn.execute(
        "CREATE TABLE IF NOT EXISTS chapters (
            chapter_id     TEXT PRIMARY KEY,
            pid            INTEGER NOT NULL,
            chapter_no     REAL NOT NULL,
            title          TEXT DEFAULT '',
            is_downloaded  INTEGER DEFAULT 0,
            pdf_path       TEXT DEFAULT '',
            page_count     INTEGER DEFAULT 0,
            release_date   TIMESTAMP,
            update_date    TIMESTAMP
        )",
        [],
    )
    .map_err(|e| e.to_string())?;

    let chapter_cols: Vec<String> = conn
        .prepare("PRAGMA table_info(chapters)")
        .and_then(|mut s| {
            s.query_map([], |r| r.get::<_, String>(1))?
                .collect::<Result<Vec<_>, _>>()
        })
        .map_err(|e| e.to_string())?;
    if !chapter_cols.iter().any(|c| c == "last_page_read") {
        let _ = conn.execute("ALTER TABLE chapters ADD COLUMN last_page_read INTEGER", []);
    }
    if !chapter_cols.iter().any(|c| c == "read_at") {
        let _ = conn.execute("ALTER TABLE chapters ADD COLUMN read_at TIMESTAMP", []);
    }

    let series_cols: Vec<String> = conn
        .prepare("PRAGMA table_info(series)")
        .and_then(|mut s| {
            s.query_map([], |r| r.get::<_, String>(1))?
                .collect::<Result<Vec<_>, _>>()
        })
        .map_err(|e| e.to_string())?;
    if !series_cols.iter().any(|c| c == "is_favorite") {
        let _ = conn.execute("ALTER TABLE series ADD COLUMN is_favorite INTEGER DEFAULT 0", []);
    }
    if !series_cols.iter().any(|c| c == "favorited_at") {
        let _ = conn.execute("ALTER TABLE series ADD COLUMN favorited_at TIMESTAMP", []);
    }
    if !series_cols.iter().any(|c| c == "reading_status") {
        let _ = conn.execute("ALTER TABLE series ADD COLUMN reading_status TEXT", []);
    }
    if !series_cols.iter().any(|c| c == "reader_prefs_json") {
        let _ = conn.execute("ALTER TABLE series ADD COLUMN reader_prefs_json TEXT", []);
    }
    if !series_cols.iter().any(|c| c == "added_at") {
        let _ = conn.execute("ALTER TABLE series ADD COLUMN added_at TIMESTAMP", []);
        let _ = conn.execute(
            "UPDATE series SET added_at = COALESCE(last_updated, datetime('now'))
             WHERE added_at IS NULL",
            [],
        );
    }

    // Strip legacy "data/" / "data\" prefix from stored paths.
    let _ = conn.execute(
        "UPDATE chapters SET pdf_path = SUBSTR(pdf_path, 6)
         WHERE pdf_path LIKE 'data/%'",
        [],
    );
    let _ = conn.execute(
        "UPDATE chapters SET pdf_path = REPLACE(SUBSTR(pdf_path, 6), '\\', '/')
         WHERE pdf_path LIKE 'data\\%'",
        [],
    );
    let _ = conn.execute(
        "UPDATE series SET cover_path = SUBSTR(cover_path, 6)
         WHERE cover_path LIKE 'data/%'",
        [],
    );
    let _ = conn.execute(
        "UPDATE series SET cover_path = REPLACE(SUBSTR(cover_path, 6), '\\', '/')
         WHERE cover_path LIKE 'data\\%'",
        [],
    );

    // Reading-session log: one row per reader flush, accumulated
    // foreground seconds. Drives time-based stats independent of chapter counts.
    conn.execute(
        "CREATE TABLE IF NOT EXISTS reading_log (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            date        TEXT NOT NULL,
            pid         INTEGER NOT NULL,
            chapter_id  TEXT NOT NULL,
            seconds     INTEGER NOT NULL,
            created_at  TIMESTAMP NOT NULL DEFAULT (datetime('now'))
        )",
        [],
    )
    .map_err(|e| e.to_string())?;
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_reading_log_date ON reading_log(date)",
        [],
    )
    .map_err(|e| e.to_string())?;

    // Page bookmarks, independent of last_page_read progress.
    conn.execute(
        "CREATE TABLE IF NOT EXISTS chapter_bookmarks (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            chapter_id  TEXT NOT NULL,
            page        INTEGER NOT NULL,
            note        TEXT DEFAULT '',
            created_at  TIMESTAMP NOT NULL DEFAULT (datetime('now'))
        )",
        [],
    )
    .map_err(|e| e.to_string())?;
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_chapter_bookmarks_chapter
         ON chapter_bookmarks(chapter_id)",
        [],
    )
    .map_err(|e| e.to_string())?;

    // Novel text annotations: a coloured highlight over a character range in
    // a chapter's plain-text projection, optionally with a note. The range
    // is stored as text offsets (start..end) against the chapter's text-only
    // content — robust as long as the HTML doesn't change between sessions,
    // which it won't (we own the file on disk).
    conn.execute(
        "CREATE TABLE IF NOT EXISTS annotations (
            id            INTEGER PRIMARY KEY AUTOINCREMENT,
            chapter_id    TEXT NOT NULL,
            pid           INTEGER NOT NULL,
            color         TEXT NOT NULL,
            text_snippet  TEXT NOT NULL,
            start_offset  INTEGER NOT NULL,
            end_offset    INTEGER NOT NULL,
            note          TEXT DEFAULT '',
            created_at    TIMESTAMP NOT NULL DEFAULT (datetime('now')),
            updated_at    TIMESTAMP NOT NULL DEFAULT (datetime('now'))
        )",
        [],
    )
    .map_err(|e| e.to_string())?;
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_annotations_chapter
         ON annotations(chapter_id)",
        [],
    )
    .map_err(|e| e.to_string())?;
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_annotations_pid
         ON annotations(pid)",
        [],
    )
    .map_err(|e| e.to_string())?;

    conn.execute(
        "CREATE TABLE IF NOT EXISTS tags (
            id   INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT UNIQUE NOT NULL
        )",
        [],
    )
    .map_err(|e| e.to_string())?;
    conn.execute(
        "CREATE TABLE IF NOT EXISTS series_tags (
            pid    INTEGER NOT NULL,
            tag_id INTEGER NOT NULL,
            PRIMARY KEY (pid, tag_id)
        )",
        [],
    )
    .map_err(|e| e.to_string())?;

    Ok(())
}

pub fn list_tags_for_series(conn: &Connection, pid: i64) -> Result<Vec<String>, String> {
    let mut stmt = conn
        .prepare(
            "SELECT t.name FROM tags t \
             JOIN series_tags st ON st.tag_id=t.id \
             WHERE st.pid=?1 ORDER BY t.name ASC",
        )
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map(params![pid], |r| r.get::<_, String>(0))
        .map_err(|e| e.to_string())?;
    let mut out = Vec::new();
    for r in rows {
        out.push(r.map_err(|e| e.to_string())?);
    }
    Ok(out)
}

pub fn set_series_favorite(conn: &Connection, pid: i64, fav: bool) -> Result<(), String> {
    if fav {
        conn.execute(
            "UPDATE series SET is_favorite=1, favorited_at=datetime('now') WHERE pid=?1",
            params![pid],
        )
        .map_err(|e| e.to_string())?;
    } else {
        conn.execute(
            "UPDATE series SET is_favorite=0, favorited_at=NULL WHERE pid=?1",
            params![pid],
        )
        .map_err(|e| e.to_string())?;
    }
    Ok(())
}

pub fn set_chapter_progress(
    conn: &Connection,
    chapter_id: &str,
    page: i64,
) -> Result<(), String> {
    conn.execute(
        "UPDATE chapters SET last_page_read=?2, read_at=datetime('now') WHERE chapter_id=?1",
        params![chapter_id, page],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::test_util::*;

    #[test]
    fn test_open_runs_migrations_idempotent() {
        let (_tmp, root) = temp_data_root();
        let _conn = open(&root).unwrap();
        // Second open against the same path should not fail (all migrations IF NOT EXISTS).
        let conn = open(&root).unwrap();
        let n: i64 = conn
            .query_row("SELECT COUNT(*) FROM series", [], |r| r.get(0))
            .unwrap();
        assert_eq!(n, 0);
        // Verify added-after-the-fact columns exist.
        let cols: Vec<String> = conn
            .prepare("PRAGMA table_info(series)")
            .unwrap()
            .query_map([], |r| r.get::<_, String>(1))
            .unwrap()
            .collect::<Result<_, _>>()
            .unwrap();
        assert!(cols.contains(&"is_favorite".to_string()));
        assert!(cols.contains(&"reading_status".to_string()));
        assert!(cols.contains(&"added_at".to_string()));
    }

    #[test]
    fn test_list_tags_for_series() {
        let (_tmp, root) = temp_data_root();
        let conn = fresh_db(&root);
        insert_test_series(&conn, 1, "A", "manga", 1, 0, None, None, None);
        let t1 = insert_tag(&conn, "drama");
        let t2 = insert_tag(&conn, "action");
        link_tag(&conn, 1, t1);
        link_tag(&conn, 1, t2);
        let out = list_tags_for_series(&conn, 1).unwrap();
        // Ordered alphabetically.
        assert_eq!(out, vec!["action".to_string(), "drama".to_string()]);
    }

    #[test]
    fn test_set_chapter_progress() {
        let (_tmp, root) = temp_data_root();
        let conn = fresh_db(&root);
        insert_test_series(&conn, 1, "S", "manga", 1, 0, None, None, None);
        insert_test_chapter(&conn, "c1", 1, 1.0, "", 1, "p", 10);
        set_chapter_progress(&conn, "c1", 5).unwrap();
        let p: i64 = conn
            .query_row(
                "SELECT last_page_read FROM chapters WHERE chapter_id='c1'",
                [],
                |r| r.get(0),
            )
            .unwrap();
        assert_eq!(p, 5);
    }
}

pub fn list_all_tags(conn: &Connection) -> Result<Vec<(String, i64)>, String> {
    let mut stmt = conn
        .prepare(
            "SELECT t.name, COUNT(DISTINCT st.pid) AS n \
             FROM tags t \
             JOIN series_tags st ON st.tag_id=t.id \
             JOIN series s ON s.pid=st.pid \
             WHERE s.local_chapter_count > 0 \
             GROUP BY t.id \
             HAVING n > 0 \
             ORDER BY n DESC, t.name ASC",
        )
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([], |r| Ok((r.get::<_, String>(0)?, r.get::<_, i64>(1)?)))
        .map_err(|e| e.to_string())?;
    let mut out = Vec::new();
    for r in rows {
        out.push(r.map_err(|e| e.to_string())?);
    }
    Ok(out)
}
