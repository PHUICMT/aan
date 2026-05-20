use crate::{data_root, db};
use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use std::io::Read;
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

#[derive(Deserialize)]
pub(crate) struct CbzImportArgs {
    pub src_path: String,
    pub series_name: String,
    pub kind: String,
    pub chapter_no: f64,
    pub chapter_title: String,
}

#[derive(Deserialize)]
pub(crate) struct TxtImportArgs {
    pub src_path: String,
    pub series_name: String,
    pub kind: String,
    pub chapter_no: f64,
    pub chapter_title: String,
}

const IMAGE_EXTS: &[&str] = &["jpg", "jpeg", "png", "webp"];

fn is_image_name(name: &str) -> Option<&'static str> {
    let lower = name.to_ascii_lowercase();
    for &ext in IMAGE_EXTS {
        if lower.ends_with(&format!(".{ext}")) {
            return Some(ext);
        }
    }
    None
}

/// Re-encode the first image into a JPEG cover. Source may be PNG/WEBP
/// from the CBZ; the existing cover pipeline serves bytes as `image/jpeg`
/// so we normalize at write time.
fn write_cover_jpeg(dest: &Path, bytes: &[u8]) -> Result<(), String> {
    if dest.exists() {
        return Ok(());
    }
    let img = image::load_from_memory(bytes).map_err(|e| format!("decode cover: {e}"))?;
    let max_w = 480u32;
    let scaled = if img.width() > max_w {
        img.resize(max_w, u32::MAX, image::imageops::FilterType::Triangle)
    } else {
        img
    };
    if let Some(parent) = dest.parent() {
        std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    let mut out = std::fs::File::create(dest).map_err(|e| e.to_string())?;
    scaled
        .to_rgb8()
        .write_with_encoder(image::codecs::jpeg::JpegEncoder::new_with_quality(&mut out, 85))
        .map_err(|e| format!("encode cover: {e}"))
}

pub(crate) fn import_cbz_inner(
    conn: &Connection,
    data_root: &Path,
    args: CbzImportArgs,
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

    let file = std::fs::File::open(&src).map_err(|e| e.to_string())?;
    let mut zip = zip::ZipArchive::new(file).map_err(|e| e.to_string())?;

    // Collect image entries, sorted by filename so chapter order is stable.
    let mut entries: Vec<(String, &'static str)> = (0..zip.len())
        .filter_map(|i| {
            let f = zip.by_index(i).ok()?;
            if f.is_dir() {
                return None;
            }
            let name = f.name().to_string();
            let ext = is_image_name(&name)?;
            Some((name, ext))
        })
        .collect();
    entries.sort_by(|a, b| natord_cmp(&a.0, &b.0));
    if entries.is_empty() {
        return Err("cbz has no images".into());
    }

    let now = now_iso();
    let (pid, created_series) = find_or_create_series(conn, name, kind, &now)?;
    let base_id = chapter_id_for(pid, args.chapter_no);
    let chapter_id = unique_chapter_id(conn, &base_id)?;

    let chapter_dir = data_root.join("manga").join(pid.to_string()).join(&chapter_id);
    std::fs::create_dir_all(&chapter_dir).map_err(|e| e.to_string())?;

    let mut first_bytes: Option<Vec<u8>> = None;
    for (idx, (zname, ext)) in entries.iter().enumerate() {
        let mut entry = zip.by_name(zname).map_err(|e| e.to_string())?;
        let mut buf = Vec::with_capacity(entry.size() as usize);
        entry.read_to_end(&mut buf).map_err(|e| e.to_string())?;
        // Renumber to keep lexical sort matching reading order regardless
        // of the source archive's naming quirks.
        let out_name = format!("{:04}.{ext}", idx + 1);
        std::fs::write(chapter_dir.join(&out_name), &buf).map_err(|e| e.to_string())?;
        if first_bytes.is_none() {
            first_bytes = Some(buf);
        }
    }

    if let Some(bytes) = first_bytes {
        let cover_path = data_root.join("covers").join(format!("{pid}.jpg"));
        let _ = write_cover_jpeg(&cover_path, &bytes);
    }

    let stored_dir = format!("manga/{pid}/{chapter_id}");
    let page_count = entries.len() as i64;

    conn.execute(
        "INSERT INTO chapters (chapter_id, pid, chapter_no, title, is_downloaded,
                                pdf_path, page_count, update_date)
         VALUES (?1, ?2, ?3, ?4, 1, ?5, ?6, ?7)",
        params![
            chapter_id,
            pid,
            args.chapter_no,
            args.chapter_title.trim(),
            stored_dir,
            page_count,
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
pub(crate) fn import_cbz(args: CbzImportArgs) -> Result<ImportedChapter, String> {
    let root = data_root();
    let conn = db::open(&root)?;
    import_cbz_inner(&conn, &root, args)
}

#[derive(Deserialize)]
pub(crate) struct FolderImportArgs {
    pub src_path: String,
    pub series_name: String,
    pub kind: String,
    pub chapter_no: f64,
    pub chapter_title: String,
}

pub(crate) fn import_image_folder_inner(
    conn: &Connection,
    data_root: &Path,
    args: FolderImportArgs,
) -> Result<ImportedChapter, String> {
    let kind = normalize_kind(&args.kind)?;
    let src = PathBuf::from(&args.src_path);
    if !src.is_dir() {
        return Err(format!("not a directory: {}", args.src_path));
    }
    let name = args.series_name.trim();
    if name.is_empty() {
        return Err("series_name is empty".into());
    }

    let mut entries: Vec<(String, PathBuf, &'static str)> = std::fs::read_dir(&src)
        .map_err(|e| e.to_string())?
        .filter_map(|e| e.ok())
        .filter_map(|e| {
            let p = e.path();
            if !p.is_file() {
                return None;
            }
            let fname = p.file_name()?.to_string_lossy().into_owned();
            let ext = is_image_name(&fname)?;
            Some((fname, p, ext))
        })
        .collect();
    entries.sort_by(|a, b| natord_cmp(&a.0, &b.0));
    if entries.is_empty() {
        return Err("folder has no images".into());
    }

    let now = now_iso();
    let (pid, created_series) = find_or_create_series(conn, name, kind, &now)?;
    let base_id = chapter_id_for(pid, args.chapter_no);
    let chapter_id = unique_chapter_id(conn, &base_id)?;

    let chapter_dir = data_root.join("manga").join(pid.to_string()).join(&chapter_id);
    std::fs::create_dir_all(&chapter_dir).map_err(|e| e.to_string())?;

    let mut first_path: Option<PathBuf> = None;
    for (idx, (_fname, src_file, ext)) in entries.iter().enumerate() {
        let out_name = format!("{:04}.{ext}", idx + 1);
        std::fs::copy(src_file, chapter_dir.join(&out_name)).map_err(|e| e.to_string())?;
        if first_path.is_none() {
            first_path = Some(src_file.clone());
        }
    }

    if let Some(p) = first_path {
        if let Ok(bytes) = std::fs::read(&p) {
            let cover_path = data_root.join("covers").join(format!("{pid}.jpg"));
            let _ = write_cover_jpeg(&cover_path, &bytes);
        }
    }

    let stored_dir = format!("manga/{pid}/{chapter_id}");
    let page_count = entries.len() as i64;

    conn.execute(
        "INSERT INTO chapters (chapter_id, pid, chapter_no, title, is_downloaded,
                                pdf_path, page_count, update_date)
         VALUES (?1, ?2, ?3, ?4, 1, ?5, ?6, ?7)",
        params![
            chapter_id,
            pid,
            args.chapter_no,
            args.chapter_title.trim(),
            stored_dir,
            page_count,
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
pub(crate) fn import_image_folder(args: FolderImportArgs) -> Result<ImportedChapter, String> {
    let root = data_root();
    let conn = db::open(&root)?;
    import_image_folder_inner(&conn, &root, args)
}

/// Natural-order comparator: "page2" sorts before "page10". Falls back
/// to byte order outside of digit runs.
fn natord_cmp(a: &str, b: &str) -> std::cmp::Ordering {
    let (mut ai, mut bi) = (a.bytes(), b.bytes());
    let (mut ap, mut bp) = (ai.next(), bi.next());
    loop {
        match (ap, bp) {
            (None, None) => return std::cmp::Ordering::Equal,
            (None, _) => return std::cmp::Ordering::Less,
            (_, None) => return std::cmp::Ordering::Greater,
            (Some(x), Some(y)) if x.is_ascii_digit() && y.is_ascii_digit() => {
                // Compare full integer runs.
                let mut an: u64 = (x - b'0') as u64;
                let mut bn: u64 = (y - b'0') as u64;
                ap = ai.next();
                while let Some(c) = ap {
                    if !c.is_ascii_digit() {
                        break;
                    }
                    an = an.saturating_mul(10).saturating_add((c - b'0') as u64);
                    ap = ai.next();
                }
                bp = bi.next();
                while let Some(c) = bp {
                    if !c.is_ascii_digit() {
                        break;
                    }
                    bn = bn.saturating_mul(10).saturating_add((c - b'0') as u64);
                    bp = bi.next();
                }
                match an.cmp(&bn) {
                    std::cmp::Ordering::Equal => continue,
                    other => return other,
                }
            }
            (Some(x), Some(y)) => {
                match x.cmp(&y) {
                    std::cmp::Ordering::Equal => {
                        ap = ai.next();
                        bp = bi.next();
                    }
                    other => return other,
                }
            }
        }
    }
}

pub(crate) fn import_txt_inner(
    conn: &Connection,
    data_root: &Path,
    args: TxtImportArgs,
) -> Result<ImportedChapter, String> {
    let kind = normalize_kind(&args.kind)?;
    if kind != KIND_NOVEL && kind != KIND_ORIGINAL_NOVEL {
        return Err("text import only supports novel/original_novel".into());
    }
    let src = PathBuf::from(&args.src_path);
    if !src.exists() {
        return Err(format!("source not found: {}", args.src_path));
    }
    let name = args.series_name.trim();
    if name.is_empty() {
        return Err("series_name is empty".into());
    }

    let raw = std::fs::read(&src).map_err(|e| e.to_string())?;
    // Strip BOM, decode as UTF-8 lossily — Thai novels from various
    // sources sometimes carry stray bytes that strict decode would reject.
    let text = strip_utf8_bom(&raw);
    let body = String::from_utf8_lossy(text);
    let html = wrap_text_as_html(&args.chapter_title, body.as_ref());

    let now = now_iso();
    let (pid, created_series) = find_or_create_series(conn, name, kind, &now)?;
    let base_id = chapter_id_for(pid, args.chapter_no);
    let chapter_id = unique_chapter_id(conn, &base_id)?;

    let chapter_dir = data_root.join("novel").join(pid.to_string());
    std::fs::create_dir_all(&chapter_dir).map_err(|e| e.to_string())?;
    let dest = chapter_dir.join(format!("{chapter_id}.html"));
    std::fs::write(&dest, html.as_bytes()).map_err(|e| e.to_string())?;
    let stored_path = format!("novel/{pid}/{chapter_id}.html");

    conn.execute(
        "INSERT INTO chapters (chapter_id, pid, chapter_no, title, is_downloaded,
                                pdf_path, page_count, update_date)
         VALUES (?1, ?2, ?3, ?4, 1, ?5, 0, ?6)",
        params![
            chapter_id,
            pid,
            args.chapter_no,
            args.chapter_title.trim(),
            stored_path,
            now
        ],
    )
    .map_err(|e| e.to_string())?;

    conn.execute(
        "UPDATE series
         SET chapter_count       = (SELECT COUNT(*) FROM chapters WHERE pid=?1),
             local_chapter_count = (SELECT COUNT(*) FROM chapters WHERE pid=?1 AND is_downloaded=1),
             last_chapter_no     = (SELECT COALESCE(MAX(chapter_no), 0) FROM chapters WHERE pid=?1),
             last_updated        = ?2
         WHERE pid=?1",
        params![pid, now],
    )
    .map_err(|e| e.to_string())?;

    Ok(ImportedChapter {
        pid,
        chapter_id,
        created_series,
    })
}

#[tauri::command]
pub(crate) fn import_txt(args: TxtImportArgs) -> Result<ImportedChapter, String> {
    let root = data_root();
    let conn = db::open(&root)?;
    import_txt_inner(&conn, &root, args)
}

fn strip_utf8_bom(b: &[u8]) -> &[u8] {
    if b.starts_with(&[0xEF, 0xBB, 0xBF]) { &b[3..] } else { b }
}

fn wrap_text_as_html(title: &str, body: &str) -> String {
    let mut html = String::with_capacity(body.len() + 256);
    html.push_str("<!doctype html><html><head><meta charset=\"utf-8\"><title>");
    html.push_str(&html_escape(title));
    html.push_str("</title></head><body>");
    for para in body.split("\n\n") {
        let trimmed = para.trim();
        if trimmed.is_empty() {
            continue;
        }
        html.push_str("<p>");
        html.push_str(&html_escape(trimmed).replace('\n', "<br>"));
        html.push_str("</p>");
    }
    html.push_str("</body></html>");
    html
}

fn html_escape(s: &str) -> String {
    s.replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
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

    // ── CBZ ────────────────────────────────────────────────────────────

    fn build_cbz(root: &Path, name: &str, entries: &[(&str, &[u8])]) -> PathBuf {
        let path = root.join(name);
        let file = fs::File::create(&path).unwrap();
        let mut zip = zip::ZipWriter::new(file);
        let opts: zip::write::SimpleFileOptions = zip::write::SimpleFileOptions::default();
        for (n, bytes) in entries {
            zip.start_file::<_, ()>(*n, opts).unwrap();
            std::io::Write::write_all(&mut zip, bytes).unwrap();
        }
        zip.finish().unwrap();
        path
    }

    fn cbz_args(src: &Path, series: &str, ch: f64) -> CbzImportArgs {
        CbzImportArgs {
            src_path: src.to_string_lossy().into_owned(),
            series_name: series.into(),
            kind: "manga".into(),
            chapter_no: ch,
            chapter_title: format!("Ch {ch}"),
        }
    }

    #[test]
    fn cbz_extracts_images_in_natural_order() {
        let (_tmp, root) = temp_data_root();
        let conn = fresh_db(&root);
        let jpeg = tiny_jpeg();
        let src = build_cbz(
            &root,
            "ch.cbz",
            &[
                ("page10.jpg", &jpeg),
                ("page2.jpg", &jpeg),
                ("page1.jpg", &jpeg),
                ("readme.txt", b"ignored"),
            ],
        );
        let out = import_cbz_inner(&conn, &root, cbz_args(&src, "CBZ Series", 1.0)).unwrap();

        let dir = root.join("manga").join(out.pid.to_string()).join(&out.chapter_id);
        let mut names: Vec<_> = fs::read_dir(&dir).unwrap()
            .map(|e| e.unwrap().file_name().into_string().unwrap())
            .collect();
        names.sort();
        assert_eq!(names, vec!["0001.jpg", "0002.jpg", "0003.jpg"]);
        assert!(root.join("covers").join(format!("{}.jpg", out.pid)).exists());

        let pc: i64 = conn
            .query_row(
                "SELECT page_count FROM chapters WHERE chapter_id=?1",
                params![out.chapter_id],
                |r| r.get(0),
            )
            .unwrap();
        assert_eq!(pc, 3);
    }

    #[test]
    fn cbz_with_no_images_is_rejected() {
        let (_tmp, root) = temp_data_root();
        let conn = fresh_db(&root);
        let src = build_cbz(&root, "empty.cbz", &[("note.txt", b"x")]);
        assert!(import_cbz_inner(&conn, &root, cbz_args(&src, "S", 1.0)).is_err());
    }

    // ── TXT ────────────────────────────────────────────────────────────

    fn txt_args(src: &Path, series: &str, ch: f64) -> TxtImportArgs {
        TxtImportArgs {
            src_path: src.to_string_lossy().into_owned(),
            series_name: series.into(),
            kind: "novel".into(),
            chapter_no: ch,
            chapter_title: format!("Ch {ch}"),
        }
    }

    #[test]
    fn txt_wraps_to_html() {
        let (_tmp, root) = temp_data_root();
        let conn = fresh_db(&root);
        let src = root.join("ch.txt");
        fs::write(&src, "First paragraph.\nSecond line.\n\nNext paragraph.").unwrap();
        let out = import_txt_inner(&conn, &root, txt_args(&src, "Novel A", 1.0)).unwrap();

        let dest = root.join("novel").join(out.pid.to_string()).join(format!("{}.html", out.chapter_id));
        let body = fs::read_to_string(&dest).unwrap();
        assert!(body.contains("<p>First paragraph.<br>Second line.</p>"));
        assert!(body.contains("<p>Next paragraph.</p>"));
    }

    #[test]
    fn txt_strips_utf8_bom() {
        let (_tmp, root) = temp_data_root();
        let conn = fresh_db(&root);
        let src = root.join("ch.txt");
        let mut bytes = vec![0xEF, 0xBB, 0xBF];
        bytes.extend_from_slice(b"hello");
        fs::write(&src, bytes).unwrap();
        let out = import_txt_inner(&conn, &root, txt_args(&src, "S", 1.0)).unwrap();
        let dest = root.join("novel").join(out.pid.to_string()).join(format!("{}.html", out.chapter_id));
        let body = fs::read_to_string(&dest).unwrap();
        assert!(body.contains("<p>hello</p>"));
        assert!(!body.contains('\u{FEFF}'));
    }

    #[test]
    fn txt_rejects_manga_kind() {
        let (_tmp, root) = temp_data_root();
        let conn = fresh_db(&root);
        let src = root.join("ch.txt");
        fs::write(&src, "x").unwrap();
        let mut a = txt_args(&src, "S", 1.0);
        a.kind = "manga".into();
        assert!(import_txt_inner(&conn, &root, a).is_err());
    }

    // ── Image folder ───────────────────────────────────────────────────

    fn folder_args(src: &Path, series: &str, ch: f64) -> FolderImportArgs {
        FolderImportArgs {
            src_path: src.to_string_lossy().into_owned(),
            series_name: series.into(),
            kind: "manga".into(),
            chapter_no: ch,
            chapter_title: format!("Ch {ch}"),
        }
    }

    #[test]
    fn folder_copies_images_in_natural_order() {
        let (_tmp, root) = temp_data_root();
        let conn = fresh_db(&root);
        let jpeg = tiny_jpeg();
        let chap = root.join("chapter1");
        fs::create_dir_all(&chap).unwrap();
        for n in ["page10.jpg", "page2.jpg", "page1.jpg"] {
            fs::write(chap.join(n), &jpeg).unwrap();
        }
        fs::write(chap.join("note.txt"), b"skip me").unwrap();

        let out = import_image_folder_inner(&conn, &root, folder_args(&chap, "Folder Series", 1.0)).unwrap();

        let dir = root.join("manga").join(out.pid.to_string()).join(&out.chapter_id);
        let mut names: Vec<_> = fs::read_dir(&dir).unwrap()
            .map(|e| e.unwrap().file_name().into_string().unwrap())
            .collect();
        names.sort();
        assert_eq!(names, vec!["0001.jpg", "0002.jpg", "0003.jpg"]);
        assert!(root.join("covers").join(format!("{}.jpg", out.pid)).exists());
    }

    #[test]
    fn folder_with_no_images_is_rejected() {
        let (_tmp, root) = temp_data_root();
        let conn = fresh_db(&root);
        let empty = root.join("empty");
        fs::create_dir_all(&empty).unwrap();
        fs::write(empty.join("readme.txt"), b"x").unwrap();
        assert!(import_image_folder_inner(&conn, &root, folder_args(&empty, "S", 1.0)).is_err());
    }

    #[test]
    fn natord_orders_numerically() {
        assert_eq!(natord_cmp("page2.jpg", "page10.jpg"), std::cmp::Ordering::Less);
        assert_eq!(natord_cmp("a.jpg", "b.jpg"), std::cmp::Ordering::Less);
        assert_eq!(natord_cmp("1.jpg", "1.jpg"), std::cmp::Ordering::Equal);
    }
}
