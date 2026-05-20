use crate::{data_root, db};
use rusqlite::Connection;
use serde::Serialize;

#[derive(Serialize)]
pub(crate) struct Bookmark {
    id: i64,
    chapter_id: String,
    page: i64,
    note: String,
    created_at: String,
}

pub(crate) fn add_bookmark_inner(conn: &Connection, chapter_id: &str, page: i64, note: Option<String>) -> Result<i64, String> {
    conn.execute(
        "INSERT INTO chapter_bookmarks (chapter_id, page, note) VALUES (?1, ?2, ?3)",
        rusqlite::params![chapter_id, page, note.unwrap_or_default()],
    )
    .map_err(|e| e.to_string())?;
    Ok(conn.last_insert_rowid())
}

#[tauri::command]
pub(crate) fn add_bookmark(chapter_id: String, page: i64, note: Option<String>) -> Result<i64, String> {
    let conn = db::open(&data_root())?;
    add_bookmark_inner(&conn, &chapter_id, page, note)
}

pub(crate) fn remove_bookmark_inner(conn: &Connection, id: i64) -> Result<(), String> {
    conn.execute("DELETE FROM chapter_bookmarks WHERE id=?1", [id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub(crate) fn remove_bookmark(id: i64) -> Result<(), String> {
    let conn = db::open(&data_root())?;
    remove_bookmark_inner(&conn, id)
}

pub(crate) fn list_bookmarks_inner(conn: &Connection, chapter_id: &str) -> Result<Vec<Bookmark>, String> {
    let mut stmt = conn
        .prepare(
            "SELECT id, chapter_id, page, COALESCE(note,''), created_at
             FROM chapter_bookmarks
             WHERE chapter_id = ?1
             ORDER BY page ASC, id ASC",
        )
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([chapter_id], |r| {
            Ok(Bookmark {
                id: r.get(0)?,
                chapter_id: r.get(1)?,
                page: r.get(2)?,
                note: r.get(3)?,
                created_at: r.get(4)?,
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
pub(crate) fn list_bookmarks(chapter_id: String) -> Result<Vec<Bookmark>, String> {
    let conn = db::open(&data_root())?;
    list_bookmarks_inner(&conn, &chapter_id)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::test_util::*;

    #[test]
    fn test_add_and_list_bookmarks_ordered_by_page() {
        let (_tmp, root) = temp_data_root();
        let conn = fresh_db(&root);
        add_bookmark_inner(&conn, "c1", 5, None).unwrap();
        add_bookmark_inner(&conn, "c1", 2, Some("note".into())).unwrap();
        add_bookmark_inner(&conn, "c2", 1, None).unwrap();
        let out = list_bookmarks_inner(&conn, "c1").unwrap();
        assert_eq!(out.len(), 2);
        assert_eq!(out[0].page, 2);
        assert_eq!(out[1].page, 5);
        assert_eq!(out[0].note, "note");
    }

    #[test]
    fn test_remove_bookmark() {
        let (_tmp, root) = temp_data_root();
        let conn = fresh_db(&root);
        let id = add_bookmark_inner(&conn, "c1", 1, None).unwrap();
        remove_bookmark_inner(&conn, id).unwrap();
        let out = list_bookmarks_inner(&conn, "c1").unwrap();
        assert!(out.is_empty());
    }
}
