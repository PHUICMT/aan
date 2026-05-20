use crate::{data_root, db, pdf, resolve_path};
use rusqlite::Connection;
use serde::Serialize;

#[derive(Serialize)]
pub(crate) struct Chapter {
    chapter_id: String,
    pid: i64,
    chapter_no: f64,
    title: String,
    is_downloaded: i64,
    pdf_path: String,
    page_count: i64,
    release_date: Option<String>,
    last_page_read: Option<i64>,
    read_at: Option<String>,
}

#[derive(Serialize)]
pub(crate) struct RecentRead {
    pid: i64,
    series_name: String,
    kind: String,
    cover_path: Option<String>,
    chapter_id: String,
    chapter_no: f64,
    chapter_title: String,
    page_count: i64,
    last_page_read: i64,
    read_at: String,
}

#[derive(Serialize)]
pub(crate) struct ChapterMatch {
    chapter_id: String,
    pid: i64,
    series_name: String,
    kind: String,
    chapter_no: f64,
    chapter_title: String,
    is_downloaded: i64,
    pdf_path: String,
}

pub(crate) fn list_chapters_inner(conn: &Connection, pid: i64) -> Result<Vec<Chapter>, String> {
    let mut stmt = conn
        .prepare(
            "SELECT chapter_id, pid, chapter_no, COALESCE(title,''),
                    COALESCE(is_downloaded, 0), COALESCE(pdf_path,''),
                    COALESCE(page_count, 0), release_date,
                    last_page_read, read_at
             FROM chapters WHERE pid = ?1
             ORDER BY chapter_no DESC",
        )
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([pid], |r| {
            Ok(Chapter {
                chapter_id: r.get(0)?,
                pid: r.get(1)?,
                chapter_no: r.get(2)?,
                title: r.get(3)?,
                is_downloaded: r.get(4)?,
                pdf_path: r.get(5)?,
                page_count: r.get(6)?,
                release_date: r.get::<_, Option<String>>(7)?,
                last_page_read: r.get::<_, Option<i64>>(8)?,
                read_at: r.get::<_, Option<String>>(9)?,
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
pub(crate) fn list_chapters(pid: i64) -> Result<Vec<Chapter>, String> {
    let conn = db::open(&data_root())?;
    list_chapters_inner(&conn, pid)
}

#[tauri::command]
pub(crate) fn read_chapter_bytes(pdf_path: String) -> Result<Vec<u8>, String> {
    let path = resolve_path(&pdf_path);
    if !path.exists() {
        return Err(format!("file not found: {}", path.display()));
    }
    std::fs::read(&path).map_err(|e| e.to_string())
}

#[tauri::command]
pub(crate) fn set_chapter_progress(chapter_id: String, page: i64) -> Result<(), String> {
    let conn = db::open(&data_root())?;
    db::set_chapter_progress(&conn, &chapter_id, page)
}

/// Patch missing page_count from the reader. Only fills 0/NULL rows so
/// the downloader's authoritative count is never clobbered.
pub(crate) fn backfill_chapter_page_count_inner(conn: &Connection, chapter_id: &str, page_count: i64) -> Result<(), String> {
    if page_count <= 0 { return Ok(()); }
    conn.execute(
        "UPDATE chapters SET page_count=?2
         WHERE chapter_id=?1 AND COALESCE(page_count,0) = 0",
        rusqlite::params![chapter_id, page_count],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub(crate) fn backfill_chapter_page_count(chapter_id: String, page_count: i64) -> Result<(), String> {
    let conn = db::open(&data_root())?;
    backfill_chapter_page_count_inner(&conn, &chapter_id, page_count)
}

pub(crate) fn search_chapters_inner(conn: &Connection, query: &str, limit: Option<i64>) -> Result<Vec<ChapterMatch>, String> {
    let q = query.trim();
    if q.is_empty() {
        return Ok(Vec::new());
    }
    let lim = limit.unwrap_or(60).clamp(1, 500);
    let pat = format!("%{}%", q.replace('%', "\\%").replace('_', "\\_"));
    let mut stmt = conn
        .prepare(
            "SELECT c.chapter_id, c.pid, s.name, s.type,
                    c.chapter_no, COALESCE(c.title,''),
                    COALESCE(c.is_downloaded, 0), COALESCE(c.pdf_path,'')
             FROM chapters c
             JOIN series s ON s.pid = c.pid
             WHERE c.title LIKE ?1 ESCAPE '\\'
             ORDER BY c.is_downloaded DESC, s.name ASC, c.chapter_no DESC
             LIMIT ?2",
        )
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map(rusqlite::params![pat, lim], |r| {
            Ok(ChapterMatch {
                chapter_id: r.get(0)?,
                pid: r.get(1)?,
                series_name: r.get(2)?,
                kind: r.get(3)?,
                chapter_no: r.get(4)?,
                chapter_title: r.get(5)?,
                is_downloaded: r.get(6)?,
                pdf_path: r.get(7)?,
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
pub(crate) fn search_chapters(query: String, limit: Option<i64>) -> Result<Vec<ChapterMatch>, String> {
    let conn = db::open(&data_root())?;
    search_chapters_inner(&conn, &query, limit)
}

pub(crate) fn list_recent_reads_inner(conn: &Connection, limit: Option<i64>) -> Result<Vec<RecentRead>, String> {
    let lim = limit.unwrap_or(50).clamp(1, 500);
    let mut stmt = conn
        .prepare(
            // ROW_NUMBER() with chapter_no DESC tie-break: GROUP BY broke
            // when two chapters shared a read_at second (NovelReader stamps
            // datetime('now') at second precision).
            "SELECT s.pid, s.name, s.type, s.cover_path,
                    c.chapter_id, c.chapter_no, COALESCE(c.title,''),
                    COALESCE(c.page_count, 0),
                    COALESCE(c.last_page_read, 0),
                    c.read_at
             FROM (
                 SELECT *,
                        ROW_NUMBER() OVER (
                            PARTITION BY pid
                            ORDER BY read_at DESC, chapter_no DESC
                        ) AS rn
                 FROM chapters
                 WHERE read_at IS NOT NULL
             ) c
             JOIN series s ON s.pid = c.pid
             WHERE c.rn = 1
             ORDER BY c.read_at DESC
             LIMIT ?1",
        )
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([lim], |r| {
            Ok(RecentRead {
                pid: r.get(0)?,
                series_name: r.get(1)?,
                kind: r.get(2)?,
                cover_path: r.get::<_, Option<String>>(3)?,
                chapter_id: r.get(4)?,
                chapter_no: r.get(5)?,
                chapter_title: r.get(6)?,
                page_count: r.get(7)?,
                last_page_read: r.get(8)?,
                read_at: r.get::<_, Option<String>>(9)?.unwrap_or_default(),
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
pub(crate) fn list_recent_reads(limit: Option<i64>) -> Result<Vec<RecentRead>, String> {
    let conn = db::open(&data_root())?;
    list_recent_reads_inner(&conn, limit)
}

#[tauri::command]
pub(crate) fn convert_chapter_to_pdf(chapter_id: String) -> Result<String, String> {
    // Folder of JPEGs → single PDF.
    let root = data_root();
    let conn = db::open(&root)?;
    let rel: String = conn
        .query_row(
            "SELECT pdf_path FROM chapters WHERE chapter_id=?1",
            rusqlite::params![chapter_id],
            |r| r.get(0),
        )
        .map_err(|e| e.to_string())?;
    let path = resolve_path(&rel);
    if !path.is_dir() {
        return Err("chapter is not stored as a folder".into());
    }
    let mut imgs: Vec<std::path::PathBuf> = std::fs::read_dir(&path)
        .map_err(|e| e.to_string())?
        .filter_map(|e| e.ok())
        .map(|e| e.path())
        .filter(|p| {
            let ext = p.extension().and_then(|s| s.to_str()).unwrap_or("").to_ascii_lowercase();
            ext == "jpg" || ext == "jpeg"
        })
        .collect();
    imgs.sort();
    if imgs.is_empty() {
        return Err("no jpegs in chapter folder".into());
    }
    let pdf_path = path.with_extension("pdf");
    pdf::build_pdf_from_jpegs(&imgs, &pdf_path)?;
    let new_rel = format!("{}.pdf", rel.trim_end_matches('/').trim_end_matches('\\'));
    conn.execute(
        "UPDATE chapters SET pdf_path=?2 WHERE chapter_id=?1",
        rusqlite::params![chapter_id, new_rel],
    )
    .map_err(|e| e.to_string())?;
    let _ = std::fs::remove_dir_all(&path);
    Ok(new_rel)
}

#[tauri::command]
pub(crate) fn convert_chapter_to_images(chapter_id: String) -> Result<String, String> {
    // PDF → folder of JPEGs. Only works on builder-produced DCTDecode PDFs.
    let root = data_root();
    let conn = db::open(&root)?;
    let rel: String = conn
        .query_row(
            "SELECT pdf_path FROM chapters WHERE chapter_id=?1",
            rusqlite::params![chapter_id],
            |r| r.get(0),
        )
        .map_err(|e| e.to_string())?;
    if !rel.to_ascii_lowercase().ends_with(".pdf") {
        return Err("chapter is not stored as a PDF".into());
    }
    let pdf_path = resolve_path(&rel);
    if !pdf_path.is_file() {
        return Err(format!("pdf not found: {}", pdf_path.display()));
    }
    let dir_rel = rel.trim_end_matches(".pdf").trim_end_matches(".PDF").to_string();
    let dir_path = resolve_path(&dir_rel);
    pdf::extract_jpegs_from_pdf(&pdf_path, &dir_path)?;
    conn.execute(
        "UPDATE chapters SET pdf_path=?2 WHERE chapter_id=?1",
        rusqlite::params![chapter_id, dir_rel],
    )
    .map_err(|e| e.to_string())?;
    let _ = std::fs::remove_file(&pdf_path);
    Ok(dir_rel)
}

/// Reconcile chapter rows with disk: flag downloaded by matching
/// `ch_<no>.pdf|.html|<dir>` filenames against chapter_no.
#[tauri::command]
pub(crate) fn rescan_chapter_files(pid: i64, kind: String) -> Result<i64, String> {
    let conn = db::open(&data_root())?;
    let base = if matches!(kind.as_str(), "novel" | "original_novel") {
        "novel"
    } else {
        "manga"
    };
    let dir = data_root().join(base).join(pid.to_string());
    if !dir.exists() {
        return Ok(0);
    }
    // chapter_no (rounded to 2 decimals) → data-root-relative path
    let mut found: std::collections::HashMap<String, String> = Default::default();
    for entry in std::fs::read_dir(&dir).map_err(|e| e.to_string())? {
        let Ok(e) = entry else { continue };
        let name = e.file_name().to_string_lossy().into_owned();
        // Accept "ch_<no>.pdf", "ch_<no>.html", and bare "ch_<no>" dirs.
        let stripped = name.strip_prefix("ch_").unwrap_or(&name);
        let no_part = stripped
            .trim_end_matches(".pdf")
            .trim_end_matches(".html")
            .trim_end_matches(".htm");
        if let Ok(n) = no_part.parse::<f64>() {
            let rel = format!("{}/{}/{}", base, pid, name);
            found.insert(format!("{:.2}", n), rel);
        }
    }
    let mut updated = 0_i64;
    // Flag matched files as downloaded.
    for (no_key, path) in &found {
        let n: f64 = no_key.parse().unwrap_or(0.0);
        let lo = n - 0.001;
        let hi = n + 0.001;
        let rows = conn
            .execute(
                "UPDATE chapters
                   SET is_downloaded = 1, pdf_path = ?2
                 WHERE pid = ?1
                   AND chapter_no BETWEEN ?3 AND ?4
                   AND (is_downloaded IS NULL OR is_downloaded = 0 OR pdf_path = '')",
                rusqlite::params![pid, path, lo, hi],
            )
            .unwrap_or(0);
        updated += rows as i64;
    }
    // Un-flag chapters whose pdf_path is gone, so UI can offer re-download.
    let mut stmt = conn
        .prepare(
            "SELECT chapter_id, pdf_path FROM chapters
              WHERE pid = ?1 AND COALESCE(is_downloaded, 0) = 1",
        )
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([pid], |r| {
            Ok((r.get::<_, String>(0)?, r.get::<_, String>(1)?))
        })
        .map_err(|e| e.to_string())?;
    let mut missing: Vec<String> = Vec::new();
    for row in rows {
        let (cid, path) = row.map_err(|e| e.to_string())?;
        if path.is_empty() {
            missing.push(cid);
            continue;
        }
        let abs = resolve_path(&path);
        if !abs.exists() {
            missing.push(cid);
        }
    }
    drop(stmt);
    for cid in &missing {
        let rows = conn
            .execute(
                "UPDATE chapters SET is_downloaded = 0, pdf_path = ''
                 WHERE chapter_id = ?1",
                [cid],
            )
            .unwrap_or(0);
        updated += rows as i64;
    }
    // Recompute counts so Library/Sidebar reflect the rescan.
    let _ = conn.execute(
        "UPDATE series SET
            local_chapter_count = (SELECT COUNT(*) FROM chapters
                                    WHERE pid = ?1 AND COALESCE(is_downloaded,0) = 1),
            chapter_count = MAX(
                COALESCE(chapter_count, 0),
                (SELECT COUNT(*) FROM chapters WHERE pid = ?1)
            )
         WHERE pid = ?1",
        [pid],
    );
    Ok(updated)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::test_util::*;

    #[test]
    fn test_list_chapters_sorted_desc() {
        let (_tmp, root) = temp_data_root();
        let conn = fresh_db(&root);
        insert_test_series(&conn, 1, "S", "manga", 3, 0, None, None, None);
        insert_test_chapter(&conn, "a", 1, 1.0, "one", 1, "p/1.pdf", 0);
        insert_test_chapter(&conn, "b", 1, 2.0, "two", 1, "p/2.pdf", 0);
        insert_test_chapter(&conn, "c", 1, 10.0, "ten", 1, "p/10.pdf", 0);
        let out = list_chapters_inner(&conn, 1).unwrap();
        assert_eq!(out.len(), 3);
        assert_eq!(out[0].chapter_no, 10.0);
        assert_eq!(out[1].chapter_no, 2.0);
        assert_eq!(out[2].chapter_no, 1.0);
    }

    #[test]
    fn test_set_chapter_progress_updates_read_at() {
        let (_tmp, root) = temp_data_root();
        let conn = fresh_db(&root);
        insert_test_series(&conn, 1, "S", "manga", 1, 0, None, None, None);
        insert_test_chapter(&conn, "c1", 1, 1.0, "t", 1, "p.pdf", 20);
        db::set_chapter_progress(&conn, "c1", 10).unwrap();
        let (page, read_at): (i64, Option<String>) = conn
            .query_row(
                "SELECT last_page_read, read_at FROM chapters WHERE chapter_id='c1'",
                [],
                |r| Ok((r.get(0)?, r.get(1)?)),
            )
            .unwrap();
        assert_eq!(page, 10);
        assert!(read_at.is_some());
    }

    #[test]
    fn test_search_chapters() {
        let (_tmp, root) = temp_data_root();
        let conn = fresh_db(&root);
        insert_test_series(&conn, 1, "S", "manga", 2, 0, None, None, None);
        insert_test_chapter(&conn, "a", 1, 1.0, "Prologue", 1, "p1.pdf", 0);
        insert_test_chapter(&conn, "b", 1, 2.0, "Epilogue", 1, "p2.pdf", 0);
        let out = search_chapters_inner(&conn, "log", Some(50)).unwrap();
        assert_eq!(out.len(), 2);
        let empty = search_chapters_inner(&conn, "  ", None).unwrap();
        assert!(empty.is_empty());
        let nope = search_chapters_inner(&conn, "zzz", None).unwrap();
        assert!(nope.is_empty());
    }

    #[test]
    fn test_list_recent_reads() {
        let (_tmp, root) = temp_data_root();
        let conn = fresh_db(&root);
        insert_test_series(&conn, 1, "S", "manga", 2, 0, None, None, None);
        insert_test_chapter(&conn, "a", 1, 1.0, "t", 1, "p1.pdf", 5);
        insert_test_chapter(&conn, "b", 1, 2.0, "t", 1, "p2.pdf", 5);
        set_chapter_read_at(&conn, "a", "2024-01-01 00:00:00", 1);
        set_chapter_read_at(&conn, "b", "2025-01-01 00:00:00", 2);
        let out = list_recent_reads_inner(&conn, Some(10)).unwrap();
        // Window picks one row per pid by recency.
        assert_eq!(out.len(), 1);
        assert_eq!(out[0].chapter_id, "b");
    }

    #[test]
    fn test_backfill_chapter_page_count_only_fills_zero() {
        let (_tmp, root) = temp_data_root();
        let conn = fresh_db(&root);
        insert_test_series(&conn, 1, "S", "manga", 2, 0, None, None, None);
        insert_test_chapter(&conn, "z", 1, 1.0, "", 1, "p.pdf", 0);
        insert_test_chapter(&conn, "nz", 1, 2.0, "", 1, "p.pdf", 42);
        backfill_chapter_page_count_inner(&conn, "z", 17).unwrap();
        backfill_chapter_page_count_inner(&conn, "nz", 99).unwrap();
        let z: i64 = conn
            .query_row("SELECT page_count FROM chapters WHERE chapter_id='z'", [], |r| r.get(0))
            .unwrap();
        let nz: i64 = conn
            .query_row("SELECT page_count FROM chapters WHERE chapter_id='nz'", [], |r| r.get(0))
            .unwrap();
        assert_eq!(z, 17);
        assert_eq!(nz, 42);
        // Non-positive arg is a no-op.
        backfill_chapter_page_count_inner(&conn, "z", 0).unwrap();
        let z: i64 = conn
            .query_row("SELECT page_count FROM chapters WHERE chapter_id='z'", [], |r| r.get(0))
            .unwrap();
        assert_eq!(z, 17);
    }
}
