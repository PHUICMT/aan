// Smart collections: named snapshots of Library filter state. The
// frontend owns the JSON shape — the backend stores it verbatim and
// returns it intact — so we can evolve the filter surface without a
// migration on every change.

use crate::{data_root, db};
use rusqlite::{params, Connection};
use serde::Serialize;

#[derive(Serialize, Clone, Debug)]
pub(crate) struct Collection {
    pub id: i64,
    pub name: String,
    pub filter_json: String,
    pub position: i64,
    pub created_at: String,
    pub updated_at: String,
}

pub(crate) fn list_collections_inner(conn: &Connection) -> Result<Vec<Collection>, String> {
    let mut stmt = conn
        .prepare(
            "SELECT id, name, filter_json, position, created_at, updated_at
             FROM collections
             ORDER BY position ASC, id ASC",
        )
        .map_err(|e| e.to_string())?;
    let iter = stmt
        .query_map([], |r| {
            Ok(Collection {
                id: r.get(0)?,
                name: r.get(1)?,
                filter_json: r.get(2)?,
                position: r.get(3)?,
                created_at: r.get(4)?,
                updated_at: r.get(5)?,
            })
        })
        .map_err(|e| e.to_string())?;
    iter.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
}

pub(crate) fn create_collection_inner(
    conn: &Connection,
    name: &str,
    filter_json: &str,
) -> Result<i64, String> {
    let name = name.trim();
    if name.is_empty() { return Err("name is required".into()); }
    if !filter_json.trim_start().starts_with('{') {
        return Err("filter_json must be a JSON object".into());
    }
    let max_pos: i64 = conn
        .query_row("SELECT COALESCE(MAX(position), 0) FROM collections", [], |r| r.get(0))
        .unwrap_or(0);
    conn.execute(
        "INSERT INTO collections (name, filter_json, position) VALUES (?1, ?2, ?3)",
        params![name, filter_json, max_pos + 1],
    )
    .map_err(|e| e.to_string())?;
    Ok(conn.last_insert_rowid())
}

pub(crate) fn update_collection_inner(
    conn: &Connection,
    id: i64,
    name: Option<&str>,
    filter_json: Option<&str>,
) -> Result<(), String> {
    let mut sets: Vec<&str> = Vec::new();
    let mut bind: Vec<&dyn rusqlite::ToSql> = Vec::new();
    let n;
    let j;
    if let Some(v) = name {
        let v = v.trim();
        if v.is_empty() { return Err("name cannot be blank".into()); }
        n = v;
        sets.push("name = ?");
        bind.push(&n);
    }
    if let Some(v) = filter_json {
        if !v.trim_start().starts_with('{') {
            return Err("filter_json must be a JSON object".into());
        }
        j = v;
        sets.push("filter_json = ?");
        bind.push(&j);
    }
    if sets.is_empty() { return Ok(()); }
    let sql = format!(
        "UPDATE collections SET {}, updated_at = datetime('now') WHERE id = ?",
        sets.join(", "),
    );
    bind.push(&id);
    conn.execute(&sql, rusqlite::params_from_iter(bind))
        .map_err(|e| e.to_string())?;
    Ok(())
}

pub(crate) fn delete_collection_inner(conn: &Connection, id: i64) -> Result<(), String> {
    conn.execute("DELETE FROM collections WHERE id = ?1", params![id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

pub(crate) fn reorder_collections_inner(
    conn: &Connection,
    ordered_ids: &[i64],
) -> Result<(), String> {
    let tx = conn.unchecked_transaction().map_err(|e| e.to_string())?;
    for (i, id) in ordered_ids.iter().enumerate() {
        tx.execute(
            "UPDATE collections SET position = ?1, updated_at = datetime('now') WHERE id = ?2",
            params![i as i64, id],
        )
        .map_err(|e| e.to_string())?;
    }
    tx.commit().map_err(|e| e.to_string())
}

// ── Tauri command surface ──────────────────────────────────────────

#[tauri::command]
pub(crate) fn list_collections() -> Result<Vec<Collection>, String> {
    let conn = db::open(&data_root())?;
    list_collections_inner(&conn)
}

#[tauri::command]
pub(crate) fn create_collection(name: String, filter_json: String) -> Result<i64, String> {
    let conn = db::open(&data_root())?;
    create_collection_inner(&conn, &name, &filter_json)
}

#[tauri::command]
pub(crate) fn update_collection(
    id: i64,
    name: Option<String>,
    filter_json: Option<String>,
) -> Result<(), String> {
    let conn = db::open(&data_root())?;
    update_collection_inner(&conn, id, name.as_deref(), filter_json.as_deref())
}

#[tauri::command]
pub(crate) fn delete_collection(id: i64) -> Result<(), String> {
    let conn = db::open(&data_root())?;
    delete_collection_inner(&conn, id)
}

#[tauri::command]
pub(crate) fn reorder_collections(ordered_ids: Vec<i64>) -> Result<(), String> {
    let conn = db::open(&data_root())?;
    reorder_collections_inner(&conn, &ordered_ids)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::test_util::*;

    #[test]
    fn create_and_list() {
        let (_tmp, root) = temp_data_root();
        let conn = fresh_db(&root);
        let id = create_collection_inner(&conn, "Cyberpunk On Hold", r#"{"type":"manga","rs":"on_hold"}"#).unwrap();
        assert!(id > 0);
        let list = list_collections_inner(&conn).unwrap();
        assert_eq!(list.len(), 1);
        assert_eq!(list[0].name, "Cyberpunk On Hold");
        assert_eq!(list[0].position, 1);
    }

    #[test]
    fn create_rejects_blank_name_and_non_json() {
        let (_tmp, root) = temp_data_root();
        let conn = fresh_db(&root);
        assert!(create_collection_inner(&conn, "   ", r#"{"x":1}"#).is_err());
        assert!(create_collection_inner(&conn, "ok", "not json").is_err());
    }

    #[test]
    fn update_changes_name_and_json() {
        let (_tmp, root) = temp_data_root();
        let conn = fresh_db(&root);
        let id = create_collection_inner(&conn, "A", r#"{"x":1}"#).unwrap();
        update_collection_inner(&conn, id, Some("B"), Some(r#"{"y":2}"#)).unwrap();
        let list = list_collections_inner(&conn).unwrap();
        assert_eq!(list[0].name, "B");
        assert!(list[0].filter_json.contains("\"y\":2"));
    }

    #[test]
    fn update_with_blank_name_rejected() {
        let (_tmp, root) = temp_data_root();
        let conn = fresh_db(&root);
        let id = create_collection_inner(&conn, "A", r#"{"x":1}"#).unwrap();
        assert!(update_collection_inner(&conn, id, Some(" "), None).is_err());
    }

    #[test]
    fn delete_drops_row() {
        let (_tmp, root) = temp_data_root();
        let conn = fresh_db(&root);
        let id = create_collection_inner(&conn, "A", r#"{"x":1}"#).unwrap();
        delete_collection_inner(&conn, id).unwrap();
        assert!(list_collections_inner(&conn).unwrap().is_empty());
    }

    #[test]
    fn reorder_persists_positions() {
        let (_tmp, root) = temp_data_root();
        let conn = fresh_db(&root);
        let a = create_collection_inner(&conn, "A", r#"{"x":1}"#).unwrap();
        let b = create_collection_inner(&conn, "B", r#"{"x":2}"#).unwrap();
        let c = create_collection_inner(&conn, "C", r#"{"x":3}"#).unwrap();
        reorder_collections_inner(&conn, &[c, a, b]).unwrap();
        let list = list_collections_inner(&conn).unwrap();
        assert_eq!(list.iter().map(|x| x.name.as_str()).collect::<Vec<_>>(),
                   vec!["C", "A", "B"]);
    }
}
