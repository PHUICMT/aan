use crate::{data_root, db};
use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};

#[derive(Deserialize)]
pub(crate) struct PdfImportArgs {
    pub src_path: String,
    pub series_name: String,
    pub kind: String,
    pub chapter_no: f64,
    pub chapter_title: String,
    pub page_count: i64,
    pub cover_bytes: Option<Vec<u8>>,
}

#[derive(Serialize)]
pub(crate) struct ImportedChapter {
    pub pid: i64,
    pub chapter_id: String,
    pub created_series: bool,
}

const KIND_MANGA: &str = "manga";
const KIND_COMIC: &str = "comic";
const KIND_NOVEL: &str = "novel";
const KIND_ORIGINAL_NOVEL: &str = "original_novel";

fn normalize_kind(kind: &str) -> Result<&str, String> {
    match kind {
        KIND_MANGA => Ok(KIND_MANGA),
        KIND_COMIC => Ok(KIND_COMIC),
        KIND_NOVEL => Ok(KIND_NOVEL),
        KIND_ORIGINAL_NOVEL => Ok(KIND_ORIGINAL_NOVEL),
        other => Err(format!("unsupported kind: {other}")),
    }
}

fn now_iso() -> String {
    // SQLite's CURRENT_TIMESTAMP format keeps queries that sort by string
    // happy (e.g. ORDER BY added_at DESC).
    let secs = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_secs() as i64)
        .unwrap_or(0);
    // Minimal ISO without pulling chrono — just enough for ordering.
    format!("{}", time_to_iso(secs))
}

fn time_to_iso(secs: i64) -> String {
    let (yy, mo, dd, hh, mm, ss) = epoch_to_components(secs);
    format!("{yy:04}-{mo:02}-{dd:02} {hh:02}:{mm:02}:{ss:02}")
}

fn epoch_to_components(secs: i64) -> (i32, u32, u32, u32, u32, u32) {
    let mut s = secs;
    let ss = (s.rem_euclid(60)) as u32;
    s = s.div_euclid(60);
    let mm = (s.rem_euclid(60)) as u32;
    s = s.div_euclid(60);
    let hh = (s.rem_euclid(24)) as u32;
    let mut days = s.div_euclid(24) as i32;
    let mut year: i32 = 1970;
    loop {
        let dy = if is_leap(year) { 366 } else { 365 };
        if days < dy {
            break;
        }
        days -= dy;
        year += 1;
    }
    let months_norm = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    let months_leap = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    let months = if is_leap(year) { &months_leap } else { &months_norm };
    let mut month = 1u32;
    for &len in months {
        if days < len {
            break;
        }
        days -= len;
        month += 1;
    }
    (year, month, (days + 1) as u32, hh, mm, ss)
}

fn is_leap(y: i32) -> bool {
    (y % 4 == 0 && y % 100 != 0) || y % 400 == 0
}

/// Lookup an existing series by exact (name, type) match, else allocate a
/// new pid above `999_999` to avoid collisions with legacy NekoPost ids.
fn find_or_create_series(
    conn: &Connection,
    name: &str,
    kind: &str,
    now: &str,
) -> Result<(i64, bool), String> {
    let existing: Option<i64> = conn
        .query_row(
            "SELECT pid FROM series WHERE name=?1 AND type=?2 LIMIT 1",
            params![name, kind],
            |r| r.get(0),
        )
        .ok();
    if let Some(pid) = existing {
        return Ok((pid, false));
    }
    let next_pid: i64 = conn
        .query_row(
            "SELECT COALESCE(MAX(pid), 999999) + 1 FROM series",
            [],
            |r| r.get(0),
        )
        .map_err(|e| e.to_string())?;
    let pid = next_pid.max(1_000_000);
    conn.execute(
        "INSERT INTO series (pid, name, type, status, chapter_count, local_chapter_count,
                              last_updated, added_at)
         VALUES (?1, ?2, ?3, 0, 0, 0, ?4, ?4)",
        params![pid, name, kind, now],
    )
    .map_err(|e| e.to_string())?;
    Ok((pid, true))
}

fn chapter_id_for(pid: i64, chapter_no: f64) -> String {
    if (chapter_no.fract()).abs() < f64::EPSILON {
        format!("{pid}-{}", chapter_no as i64)
    } else {
        // Stable formatting for fractional chapters like 5.5.
        format!("{pid}-{}", format_args!("{:.2}", chapter_no))
            .trim_end_matches('0')
            .trim_end_matches('.')
            .to_string()
    }
}

fn unique_chapter_id(conn: &Connection, base: &str) -> Result<String, String> {
    let exists = |id: &str| -> Result<bool, String> {
        conn.query_row(
            "SELECT 1 FROM chapters WHERE chapter_id=?1",
            params![id],
            |_| Ok(true),
        )
        .map(|_: bool| true)
        .or_else(|e| match e {
            rusqlite::Error::QueryReturnedNoRows => Ok(false),
            other => Err(other.to_string()),
        })
    };
    if !exists(base)? {
        return Ok(base.to_string());
    }
    for i in 2..1000 {
        let cand = format!("{base}-{i}");
        if !exists(&cand)? {
            return Ok(cand);
        }
    }
    Err("could not allocate unique chapter id".into())
}

pub(crate) fn import_pdf_inner(
    conn: &Connection,
    data_root: &Path,
    args: PdfImportArgs,
) -> Result<ImportedChapter, String> {
    let kind = normalize_kind(&args.kind)?;
    let src = PathBuf::from(&args.src_path);
    if !src.exists() {
        return Err(format!("source not found: {}", args.src_path));
    }
    let name = args.series_name.trim();
    if name.is_empty() {
        return Err("series_name is empty".into());
    }
    if args.page_count < 0 {
        return Err("page_count must be >= 0".into());
    }

    let now = now_iso();
    let (pid, created_series) = find_or_create_series(conn, name, kind, &now)?;

    let base_id = chapter_id_for(pid, args.chapter_no);
    let chapter_id = unique_chapter_id(conn, &base_id)?;

    // Destination layout mirrors fixtures: manga/{pid}/{chapter_id}.pdf
    let series_dir = data_root.join("manga").join(pid.to_string());
    std::fs::create_dir_all(&series_dir).map_err(|e| e.to_string())?;
    let dest = series_dir.join(format!("{chapter_id}.pdf"));
    std::fs::copy(&src, &dest).map_err(|e| e.to_string())?;
    let stored_pdf_path = format!("manga/{pid}/{chapter_id}.pdf");

    // Cover: only write when missing — re-imports should not overwrite a
    // cover the user already chose.
    if let Some(bytes) = args.cover_bytes.as_ref() {
        let cover_dir = data_root.join("covers");
        std::fs::create_dir_all(&cover_dir).map_err(|e| e.to_string())?;
        let cover_path = cover_dir.join(format!("{pid}.jpg"));
        if !cover_path.exists() {
            std::fs::write(&cover_path, bytes).map_err(|e| e.to_string())?;
        }
    }

    conn.execute(
        "INSERT INTO chapters (chapter_id, pid, chapter_no, title, is_downloaded,
                                pdf_path, page_count, update_date)
         VALUES (?1, ?2, ?3, ?4, 1, ?5, ?6, ?7)",
        params![
            chapter_id,
            pid,
            args.chapter_no,
            args.chapter_title.trim(),
            stored_pdf_path,
            args.page_count,
            now
        ],
    )
    .map_err(|e| e.to_string())?;

    let cover_rel = format!("covers/{pid}.jpg");
    conn.execute(
        "UPDATE series
         SET chapter_count       = (SELECT COUNT(*) FROM chapters WHERE pid=?1),
             local_chapter_count = (SELECT COUNT(*) FROM chapters WHERE pid=?1 AND is_downloaded=1),
             last_chapter_no     = (SELECT COALESCE(MAX(chapter_no), 0) FROM chapters WHERE pid=?1),
             last_updated        = ?2,
             cover_path          = CASE WHEN COALESCE(cover_path,'')='' THEN ?3 ELSE cover_path END
         WHERE pid=?1",
        params![pid, now, cover_rel],
    )
    .map_err(|e| e.to_string())?;

    Ok(ImportedChapter {
        pid,
        chapter_id,
        created_series,
    })
}

#[tauri::command]
pub(crate) fn import_pdf(args: PdfImportArgs) -> Result<ImportedChapter, String> {
    let root = data_root();
    let conn = db::open(&root)?;
    import_pdf_inner(&conn, &root, args)
}

/// Read a PDF picked by the file dialog into bytes so the frontend can
/// hand it to pdf.js for page-count + thumbnail extraction. Refuses
/// anything that doesn't look like a PDF path — the caller controls the
/// dialog filter, but we belt-and-suspender it here too.
#[tauri::command]
pub(crate) fn read_import_pdf(path: String) -> Result<Vec<u8>, String> {
    let p = PathBuf::from(&path);
    let ext_ok = p
        .extension()
        .and_then(|s| s.to_str())
        .map(|s| s.eq_ignore_ascii_case("pdf"))
        .unwrap_or(false);
    if !ext_ok {
        return Err("only .pdf files are supported for import".into());
    }
    if !p.is_file() {
        return Err(format!("not a file: {path}"));
    }
    std::fs::read(&p).map_err(|e| e.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::test_util::{fresh_db, temp_data_root, tiny_jpeg};
    use std::fs;

    fn write_fake_pdf(root: &Path, name: &str) -> PathBuf {
        let src = root.join(name);
        fs::write(&src, b"%PDF-1.4\n%aan-fixture\n").unwrap();
        src
    }

    fn args(src: &Path, series: &str, ch: f64) -> PdfImportArgs {
        PdfImportArgs {
            src_path: src.to_string_lossy().into_owned(),
            series_name: series.into(),
            kind: "manga".into(),
            chapter_no: ch,
            chapter_title: format!("Ch {ch}"),
            page_count: 12,
            cover_bytes: Some(tiny_jpeg()),
        }
    }

    #[test]
    fn first_import_creates_series_and_chapter() {
        let (_tmp, root) = temp_data_root();
        let conn = fresh_db(&root);
        let src = write_fake_pdf(&root, "one.pdf");
        let out = import_pdf_inner(&conn, &root, args(&src, "Test Series", 1.0)).unwrap();

        assert!(out.created_series);
        assert!(out.pid >= 1_000_000);
        assert_eq!(out.chapter_id, format!("{}-1", out.pid));

        let dest = root.join("manga").join(out.pid.to_string()).join(format!("{}.pdf", out.chapter_id));
        assert!(dest.exists(), "pdf copied to {dest:?}");

        let cover = root.join("covers").join(format!("{}.jpg", out.pid));
        assert!(cover.exists(), "cover written");

        let count: i64 = conn
            .query_row(
                "SELECT local_chapter_count FROM series WHERE pid=?1",
                params![out.pid],
                |r| r.get(0),
            )
            .unwrap();
        assert_eq!(count, 1);
    }

    #[test]
    fn second_chapter_reuses_existing_series() {
        let (_tmp, root) = temp_data_root();
        let conn = fresh_db(&root);
        let a = write_fake_pdf(&root, "a.pdf");
        let b = write_fake_pdf(&root, "b.pdf");

        let first = import_pdf_inner(&conn, &root, args(&a, "Same Title", 1.0)).unwrap();
        let second = import_pdf_inner(&conn, &root, args(&b, "Same Title", 2.0)).unwrap();

        assert_eq!(first.pid, second.pid);
        assert!(first.created_series);
        assert!(!second.created_series);

        let count: i64 = conn
            .query_row(
                "SELECT chapter_count FROM series WHERE pid=?1",
                params![first.pid],
                |r| r.get(0),
            )
            .unwrap();
        assert_eq!(count, 2);
    }

    #[test]
    fn duplicate_chapter_no_gets_a_suffix() {
        let (_tmp, root) = temp_data_root();
        let conn = fresh_db(&root);
        let a = write_fake_pdf(&root, "a.pdf");
        let b = write_fake_pdf(&root, "b.pdf");

        let first = import_pdf_inner(&conn, &root, args(&a, "Repeat", 1.0)).unwrap();
        let second = import_pdf_inner(&conn, &root, args(&b, "Repeat", 1.0)).unwrap();

        assert_eq!(first.pid, second.pid);
        assert_ne!(first.chapter_id, second.chapter_id);
        assert!(second.chapter_id.ends_with("-2"));
    }

    #[test]
    fn cover_does_not_overwrite_existing_one() {
        let (_tmp, root) = temp_data_root();
        let conn = fresh_db(&root);
        let cover_dir = root.join("covers");
        fs::create_dir_all(&cover_dir).unwrap();

        let src = write_fake_pdf(&root, "a.pdf");
        let first = import_pdf_inner(&conn, &root, args(&src, "S", 1.0)).unwrap();

        let cover_path = cover_dir.join(format!("{}.jpg", first.pid));
        // Replace with a sentinel so we can detect any later overwrite.
        fs::write(&cover_path, b"sentinel").unwrap();

        let src2 = write_fake_pdf(&root, "b.pdf");
        let _ = import_pdf_inner(&conn, &root, args(&src2, "S", 2.0)).unwrap();

        let after = fs::read(&cover_path).unwrap();
        assert_eq!(after, b"sentinel");
    }

    #[test]
    fn rejects_unknown_kind() {
        let (_tmp, root) = temp_data_root();
        let conn = fresh_db(&root);
        let src = write_fake_pdf(&root, "a.pdf");
        let mut a = args(&src, "S", 1.0);
        a.kind = "doujinshi".into();
        assert!(import_pdf_inner(&conn, &root, a).is_err());
    }

    #[test]
    fn rejects_empty_name() {
        let (_tmp, root) = temp_data_root();
        let conn = fresh_db(&root);
        let src = write_fake_pdf(&root, "a.pdf");
        let mut a = args(&src, "   ", 1.0);
        a.series_name = "   ".into();
        assert!(import_pdf_inner(&conn, &root, a).is_err());
    }

    #[test]
    fn rejects_missing_source() {
        let (_tmp, root) = temp_data_root();
        let conn = fresh_db(&root);
        let a = args(&root.join("nope.pdf"), "S", 1.0);
        assert!(import_pdf_inner(&conn, &root, a).is_err());
    }
}
