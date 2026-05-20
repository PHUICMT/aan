// Novel text annotations: a coloured highlight over a character range
// in a chapter's plain-text projection, optionally with a note.

use crate::{data_root, db};
use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};

#[derive(Serialize, Clone, Debug)]
pub(crate) struct Annotation {
    pub id: i64,
    pub chapter_id: String,
    pub pid: i64,
    pub color: String,
    pub text_snippet: String,
    pub start_offset: i64,
    pub end_offset: i64,
    pub note: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Deserialize)]
pub(crate) struct AddAnnotationArgs {
    pub chapter_id: String,
    pub pid: i64,
    pub color: String,
    pub text_snippet: String,
    pub start_offset: i64,
    pub end_offset: i64,
    pub note: Option<String>,
}

const ALLOWED_COLORS: &[&str] = &["yellow", "green", "blue", "pink", "red"];

fn validate_color(c: &str) -> Result<(), String> {
    if ALLOWED_COLORS.contains(&c) { Ok(()) } else {
        Err(format!("unsupported color: {c}"))
    }
}

fn row_to_annotation(r: &rusqlite::Row) -> rusqlite::Result<Annotation> {
    Ok(Annotation {
        id: r.get(0)?,
        chapter_id: r.get(1)?,
        pid: r.get(2)?,
        color: r.get(3)?,
        text_snippet: r.get(4)?,
        start_offset: r.get(5)?,
        end_offset: r.get(6)?,
        note: r.get(7)?,
        created_at: r.get(8)?,
        updated_at: r.get(9)?,
    })
}

pub(crate) fn add_annotation_inner(
    conn: &Connection,
    args: &AddAnnotationArgs,
) -> Result<i64, String> {
    validate_color(&args.color)?;
    if args.end_offset <= args.start_offset {
        return Err("end_offset must be greater than start_offset".into());
    }
    if args.text_snippet.trim().is_empty() {
        return Err("text_snippet is required".into());
    }
    conn.execute(
        "INSERT INTO annotations (chapter_id, pid, color, text_snippet,
            start_offset, end_offset, note)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
        params![
            args.chapter_id,
            args.pid,
            args.color,
            args.text_snippet,
            args.start_offset,
            args.end_offset,
            args.note.clone().unwrap_or_default(),
        ],
    )
    .map_err(|e| e.to_string())?;
    Ok(conn.last_insert_rowid())
}

pub(crate) fn list_annotations_for_chapter_inner(
    conn: &Connection,
    chapter_id: &str,
) -> Result<Vec<Annotation>, String> {
    let mut stmt = conn
        .prepare(
            "SELECT id, chapter_id, pid, color, text_snippet,
                    start_offset, end_offset, COALESCE(note, ''),
                    created_at, updated_at
             FROM annotations
             WHERE chapter_id = ?1
             ORDER BY start_offset ASC, id ASC",
        )
        .map_err(|e| e.to_string())?;
    let iter = stmt
        .query_map([chapter_id], row_to_annotation)
        .map_err(|e| e.to_string())?;
    iter.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
}

pub(crate) fn list_annotations_for_series_inner(
    conn: &Connection,
    pid: i64,
) -> Result<Vec<Annotation>, String> {
    // Joining keeps the series-wide list in chapter reading order even
    // when annotations were created out of order.
    let mut stmt = conn
        .prepare(
            "SELECT a.id, a.chapter_id, a.pid, a.color, a.text_snippet,
                    a.start_offset, a.end_offset, COALESCE(a.note, ''),
                    a.created_at, a.updated_at
             FROM annotations a
             JOIN chapters c ON c.chapter_id = a.chapter_id
             WHERE a.pid = ?1
             ORDER BY c.chapter_no ASC, a.start_offset ASC, a.id ASC",
        )
        .map_err(|e| e.to_string())?;
    let iter = stmt
        .query_map([pid], row_to_annotation)
        .map_err(|e| e.to_string())?;
    iter.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
}

pub(crate) fn update_annotation_note_inner(
    conn: &Connection,
    id: i64,
    note: &str,
) -> Result<(), String> {
    conn.execute(
        "UPDATE annotations SET note = ?2, updated_at = datetime('now') WHERE id = ?1",
        params![id, note],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

pub(crate) fn update_annotation_color_inner(
    conn: &Connection,
    id: i64,
    color: &str,
) -> Result<(), String> {
    validate_color(color)?;
    conn.execute(
        "UPDATE annotations SET color = ?2, updated_at = datetime('now') WHERE id = ?1",
        params![id, color],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

pub(crate) fn remove_annotation_inner(conn: &Connection, id: i64) -> Result<(), String> {
    conn.execute("DELETE FROM annotations WHERE id = ?1", params![id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

/// Render every annotation in a series as a single markdown document.
/// Ordered by chapter, grouped under the chapter title heading. Notes
/// appear as a `> blockquote` below the highlight.
pub(crate) fn export_series_annotations_md_inner(
    conn: &Connection,
    pid: i64,
) -> Result<String, String> {
    let series_name: String = conn
        .query_row(
            "SELECT name FROM series WHERE pid = ?1",
            params![pid],
            |r| r.get(0),
        )
        .map_err(|e| e.to_string())?;

    let annotations = list_annotations_for_series_inner(conn, pid)?;
    if annotations.is_empty() {
        return Ok(format!("# {series_name}\n\n_No annotations yet._\n"));
    }

    // Chapter id → (no, title) for grouping headings.
    let mut chapter_meta: std::collections::HashMap<String, (f64, String)> =
        std::collections::HashMap::new();
    {
        let mut stmt = conn
            .prepare("SELECT chapter_id, chapter_no, COALESCE(title, '') FROM chapters WHERE pid = ?1")
            .map_err(|e| e.to_string())?;
        let rows = stmt
            .query_map(params![pid], |r| {
                Ok((r.get::<_, String>(0)?, r.get::<_, f64>(1)?, r.get::<_, String>(2)?))
            })
            .map_err(|e| e.to_string())?;
        for row in rows {
            let (cid, no, title) = row.map_err(|e| e.to_string())?;
            chapter_meta.insert(cid, (no, title));
        }
    }

    let mut out = String::new();
    out.push_str(&format!("# {series_name}\n\n"));
    out.push_str(&format!(
        "_Exported {} annotation{} from Aan._\n\n",
        annotations.len(),
        if annotations.len() == 1 { "" } else { "s" }
    ));

    let mut current_chapter = String::new();
    for a in &annotations {
        if a.chapter_id != current_chapter {
            let header = match chapter_meta.get(&a.chapter_id) {
                Some((no, title)) if !title.is_empty() => format!("Chapter {no:.0} — {title}"),
                Some((no, _)) => format!("Chapter {no:.0}"),
                None => a.chapter_id.clone(),
            };
            out.push_str(&format!("## {header}\n\n"));
            current_chapter = a.chapter_id.clone();
        }
        let badge = format!("`{}`", a.color);
        out.push_str(&format!("- {badge} {}\n", escape_md(&a.text_snippet)));
        if !a.note.is_empty() {
            for line in a.note.split('\n') {
                out.push_str(&format!("  > {}\n", line));
            }
        }
        out.push('\n');
    }
    Ok(out)
}

fn escape_md(s: &str) -> String {
    // Trim wrapping whitespace and collapse newlines so a single highlight
    // stays on one bullet — long highlights stay readable.
    let mut t = s.trim().to_string();
    t = t.replace('\n', " ").replace('\r', " ");
    while t.contains("  ") {
        t = t.replace("  ", " ");
    }
    t
}

// ── Tauri command surface ──────────────────────────────────────────

#[tauri::command]
pub(crate) fn add_annotation(args: AddAnnotationArgs) -> Result<i64, String> {
    let conn = db::open(&data_root())?;
    add_annotation_inner(&conn, &args)
}

#[tauri::command]
pub(crate) fn list_annotations_for_chapter(chapter_id: String) -> Result<Vec<Annotation>, String> {
    let conn = db::open(&data_root())?;
    list_annotations_for_chapter_inner(&conn, &chapter_id)
}

#[tauri::command]
pub(crate) fn list_annotations_for_series(pid: i64) -> Result<Vec<Annotation>, String> {
    let conn = db::open(&data_root())?;
    list_annotations_for_series_inner(&conn, pid)
}

#[tauri::command]
pub(crate) fn update_annotation_note(id: i64, note: String) -> Result<(), String> {
    let conn = db::open(&data_root())?;
    update_annotation_note_inner(&conn, id, &note)
}

#[tauri::command]
pub(crate) fn update_annotation_color(id: i64, color: String) -> Result<(), String> {
    let conn = db::open(&data_root())?;
    update_annotation_color_inner(&conn, id, &color)
}

#[tauri::command]
pub(crate) fn remove_annotation(id: i64) -> Result<(), String> {
    let conn = db::open(&data_root())?;
    remove_annotation_inner(&conn, id)
}

#[tauri::command]
pub(crate) fn export_series_annotations_md(pid: i64) -> Result<String, String> {
    let conn = db::open(&data_root())?;
    export_series_annotations_md_inner(&conn, pid)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::test_util::*;

    fn seed(conn: &Connection) {
        insert_test_series(conn, 1, "Test Book", "novel", 2, 0, None, Some("2025-01-01"), None);
        insert_test_chapter(conn, "1-1", 1, 1.0, "Prologue", 1, "p1", 0);
        insert_test_chapter(conn, "1-2", 1, 2.0, "Chapter Two", 1, "p2", 0);
    }

    fn add(conn: &Connection, chapter_id: &str, color: &str, text: &str, start: i64, end: i64) -> i64 {
        add_annotation_inner(conn, &AddAnnotationArgs {
            chapter_id: chapter_id.into(),
            pid: 1,
            color: color.into(),
            text_snippet: text.into(),
            start_offset: start,
            end_offset: end,
            note: None,
        }).unwrap()
    }

    #[test]
    fn add_and_list_for_chapter() {
        let (_tmp, root) = temp_data_root();
        let conn = fresh_db(&root);
        seed(&conn);
        add(&conn, "1-1", "yellow", "hello world", 10, 21);
        let list = list_annotations_for_chapter_inner(&conn, "1-1").unwrap();
        assert_eq!(list.len(), 1);
        assert_eq!(list[0].color, "yellow");
        assert_eq!(list[0].text_snippet, "hello world");
    }

    #[test]
    fn list_for_series_orders_by_chapter_then_offset() {
        let (_tmp, root) = temp_data_root();
        let conn = fresh_db(&root);
        seed(&conn);
        add(&conn, "1-2", "green", "later", 5, 10);
        add(&conn, "1-1", "yellow", "early", 0, 5);
        add(&conn, "1-1", "blue", "middle", 20, 26);
        let list = list_annotations_for_series_inner(&conn, 1).unwrap();
        assert_eq!(list.len(), 3);
        assert_eq!(list[0].text_snippet, "early");
        assert_eq!(list[1].text_snippet, "middle");
        assert_eq!(list[2].text_snippet, "later");
    }

    #[test]
    fn rejects_invalid_color() {
        let (_tmp, root) = temp_data_root();
        let conn = fresh_db(&root);
        seed(&conn);
        let err = add_annotation_inner(&conn, &AddAnnotationArgs {
            chapter_id: "1-1".into(), pid: 1, color: "orange".into(),
            text_snippet: "t".into(), start_offset: 0, end_offset: 1, note: None,
        }).unwrap_err();
        assert!(err.contains("color"));
    }

    #[test]
    fn rejects_empty_or_inverted_range() {
        let (_tmp, root) = temp_data_root();
        let conn = fresh_db(&root);
        seed(&conn);
        assert!(add_annotation_inner(&conn, &AddAnnotationArgs {
            chapter_id: "1-1".into(), pid: 1, color: "yellow".into(),
            text_snippet: "t".into(), start_offset: 5, end_offset: 5, note: None,
        }).is_err());
        assert!(add_annotation_inner(&conn, &AddAnnotationArgs {
            chapter_id: "1-1".into(), pid: 1, color: "yellow".into(),
            text_snippet: "".into(), start_offset: 0, end_offset: 1, note: None,
        }).is_err());
    }

    #[test]
    fn update_note_and_color() {
        let (_tmp, root) = temp_data_root();
        let conn = fresh_db(&root);
        seed(&conn);
        let id = add(&conn, "1-1", "yellow", "hi", 0, 2);
        update_annotation_note_inner(&conn, id, "important").unwrap();
        update_annotation_color_inner(&conn, id, "pink").unwrap();
        let list = list_annotations_for_chapter_inner(&conn, "1-1").unwrap();
        assert_eq!(list[0].note, "important");
        assert_eq!(list[0].color, "pink");
    }

    #[test]
    fn remove_drops_row() {
        let (_tmp, root) = temp_data_root();
        let conn = fresh_db(&root);
        seed(&conn);
        let id = add(&conn, "1-1", "yellow", "hi", 0, 2);
        remove_annotation_inner(&conn, id).unwrap();
        assert!(list_annotations_for_chapter_inner(&conn, "1-1").unwrap().is_empty());
    }

    #[test]
    fn export_empty_series() {
        let (_tmp, root) = temp_data_root();
        let conn = fresh_db(&root);
        seed(&conn);
        let md = export_series_annotations_md_inner(&conn, 1).unwrap();
        assert!(md.contains("# Test Book"));
        assert!(md.contains("No annotations"));
    }

    #[test]
    fn export_groups_by_chapter() {
        let (_tmp, root) = temp_data_root();
        let conn = fresh_db(&root);
        seed(&conn);
        add(&conn, "1-1", "yellow", "first highlight", 0, 15);
        add(&conn, "1-2", "green", "second highlight", 0, 16);
        let id = add(&conn, "1-1", "blue", "with note", 20, 30);
        update_annotation_note_inner(&conn, id, "important context").unwrap();

        let md = export_series_annotations_md_inner(&conn, 1).unwrap();
        assert!(md.contains("# Test Book"));
        assert!(md.contains("## Chapter 1 — Prologue"));
        assert!(md.contains("## Chapter 2 — Chapter Two"));
        assert!(md.contains("first highlight"));
        assert!(md.contains("second highlight"));
        assert!(md.contains("with note"));
        assert!(md.contains("> important context"));
    }
}
