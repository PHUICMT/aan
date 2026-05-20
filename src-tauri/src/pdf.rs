// PDF builder + extractor for image-only chapters. Each JPEG is embedded
// as-is via /DCTDecode (no recompression). Extractor only handles PDFs
// produced by this builder.
use pdf_writer::{Content, Filter, Finish, Name, Pdf, Rect, Ref};
use std::fs;
use std::path::Path;

/// Parse JPEG (width, height, components) from the first SOF marker.
/// Components: 1=grayscale, 3=RGB/YCbCr, 4=CMYK. The PDF ImageXObject's
/// color_space MUST match — mismatched channel counts break Adobe and pdf.js.
fn jpeg_meta(bytes: &[u8]) -> Result<(u16, u16, u8), String> {
    if bytes.len() < 4 || bytes[0] != 0xFF || bytes[1] != 0xD8 {
        return Err("not a JPEG".into());
    }
    let mut i = 2usize;
    while i + 9 < bytes.len() {
        if bytes[i] != 0xFF {
            return Err("bad JPEG segment".into());
        }
        let marker = bytes[i + 1];
        // Skip 0xFF padding
        if marker == 0xFF {
            i += 1;
            continue;
        }
        // SOI / EOI carry no length
        if marker == 0xD8 || marker == 0xD9 {
            i += 2;
            continue;
        }
        // SOFn: C0..CF except DHT(C4), JPG(C8), DAC(CC)
        let is_sof = matches!(marker, 0xC0..=0xCF) && !matches!(marker, 0xC4 | 0xC8 | 0xCC);
        let seg_len = u16::from_be_bytes([bytes[i + 2], bytes[i + 3]]) as usize;
        if is_sof {
            // SOF payload: precision(1), height(2), width(2), components(1)
            let h = u16::from_be_bytes([bytes[i + 5], bytes[i + 6]]);
            let w = u16::from_be_bytes([bytes[i + 7], bytes[i + 8]]);
            let nc = bytes[i + 9];
            return Ok((w, h, nc));
        }
        i += 2 + seg_len;
    }
    Err("no SOF marker".into())
}

/// Build a PDF from JPEG `images` into `output`. Returns page count.
pub fn build_pdf_from_jpegs(images: &[std::path::PathBuf], output: &Path) -> Result<usize, String> {
    if images.is_empty() {
        return Err("no images".into());
    }
    let mut pdf = Pdf::new();

    let catalog_id = Ref::new(1);
    let page_tree_id = Ref::new(2);
    let mut next_id = 3i32;

    let mut page_ids: Vec<Ref> = Vec::with_capacity(images.len());
    let mut image_ids: Vec<Ref> = Vec::with_capacity(images.len());
    let mut content_ids: Vec<Ref> = Vec::with_capacity(images.len());
    for _ in images {
        page_ids.push(Ref::new(next_id));
        next_id += 1;
        image_ids.push(Ref::new(next_id));
        next_id += 1;
        content_ids.push(Ref::new(next_id));
        next_id += 1;
    }

    pdf.catalog(catalog_id).pages(page_tree_id);
    let mut pages = pdf.pages(page_tree_id);
    pages.kids(page_ids.iter().copied()).count(images.len() as i32);
    pages.finish();

    let mut pages_made = 0usize;
    for (idx, img_path) in images.iter().enumerate() {
        let bytes = fs::read(img_path).map_err(|e| format!("read {}: {e}", img_path.display()))?;
        // Truncated JPEGs render in pdf.js but fail in Adobe; reject here.
        if bytes.len() < 4
            || bytes[0] != 0xFF
            || bytes[1] != 0xD8
            || bytes[bytes.len() - 2] != 0xFF
            || bytes[bytes.len() - 1] != 0xD9
        {
            return Err(format!(
                "image {} is not a complete JPEG (missing SOI/EOI marker)",
                img_path.display()
            ));
        }
        let (w, h, nc) = jpeg_meta(&bytes)?;
        let w_pts = f32::from(w);
        let h_pts = f32::from(h);

        let mut page = pdf.page(page_ids[idx]);
        page.parent(page_tree_id);
        page.media_box(Rect::new(0.0, 0.0, w_pts, h_pts));
        page.contents(content_ids[idx]);
        page.resources()
            .x_objects()
            .pair(Name(b"Im0"), image_ids[idx]);
        page.finish();

        // width/height/color_space must be set before filter() since
        // filter() returns the untyped Stream.
        let mut image = pdf.image_xobject(image_ids[idx], &bytes);
        image.width(i32::from(w));
        image.height(i32::from(h));
        image.bits_per_component(8);
        let cs = image.color_space();
        match nc {
            1 => { cs.device_gray(); }
            4 => { cs.device_cmyk(); }
            _ => { cs.device_rgb(); }
        }
        image.filter(Filter::DctDecode);
        image.finish();

        let mut content = Content::new();
        content
            .save_state()
            .transform([w_pts, 0.0, 0.0, h_pts, 0.0, 0.0])
            .x_object(Name(b"Im0"))
            .restore_state();
        pdf.stream(content_ids[idx], &content.finish());

        pages_made += 1;
    }

    let buf = pdf.finish();
    if let Some(parent) = output.parent() {
        let _ = fs::create_dir_all(parent);
    }
    fs::write(output, buf).map_err(|e| format!("write pdf: {e}"))?;
    Ok(pages_made)
}

/// Extract DCTDecode streams as 001.jpg, 002.jpg, ... into `out_dir`.
/// Only works on PDFs produced by `build_pdf_from_jpegs`.
pub fn extract_jpegs_from_pdf(pdf_path: &Path, out_dir: &Path) -> Result<usize, String> {
    let data = fs::read(pdf_path).map_err(|e| format!("read pdf: {e}"))?;
    fs::create_dir_all(out_dir).map_err(|e| format!("mkdir: {e}"))?;

    let needle = b"/Filter /DCTDecode";
    let mut idx = 0usize;
    let mut count = 0usize;
    while let Some(pos) = find(&data, needle, idx) {
        let after_filter = pos + needle.len();
        let stream_kw = match find(&data, b"stream", after_filter) {
            Some(p) => p,
            None => break,
        };
        let mut data_start = stream_kw + b"stream".len();
        // PDF spec: stream keyword followed by EOL (CRLF or LF).
        if data_start < data.len() && data[data_start] == b'\r' {
            data_start += 1;
        }
        if data_start < data.len() && data[data_start] == b'\n' {
            data_start += 1;
        }
        let endstream_kw = match find(&data, b"endstream", data_start) {
            Some(p) => p,
            None => break,
        };
        let mut data_end = endstream_kw;
        while data_end > data_start && matches!(data[data_end - 1], b'\n' | b'\r') {
            data_end -= 1;
        }
        let jpeg = &data[data_start..data_end];
        if jpeg.len() >= 2 && jpeg[0] == 0xFF && jpeg[1] == 0xD8 {
            count += 1;
            let dest = out_dir.join(format!("{:03}.jpg", count));
            fs::write(&dest, jpeg).map_err(|e| format!("write {dest:?}: {e}"))?;
        }
        idx = endstream_kw + b"endstream".len();
    }
    if count == 0 {
        return Err("no DCTDecode streams found".into());
    }
    Ok(count)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::test_util::tiny_jpeg;

    #[test]
    fn test_jpeg_meta_parses_dimensions() {
        let bytes = tiny_jpeg();
        let (w, h, nc) = jpeg_meta(&bytes).unwrap();
        assert_eq!(w, 1);
        assert_eq!(h, 1);
        assert_eq!(nc, 1);
    }

    #[test]
    fn test_jpeg_meta_rejects_non_jpeg() {
        let bytes = vec![0u8; 32];
        assert!(jpeg_meta(&bytes).is_err());
    }

    #[test]
    fn test_build_pdf_from_jpegs_writes_valid_pdf() {
        let tmp = tempfile::tempdir().unwrap();
        let jpg = tmp.path().join("001.jpg");
        std::fs::write(&jpg, tiny_jpeg()).unwrap();
        let pdf_out = tmp.path().join("out.pdf");
        let pages = build_pdf_from_jpegs(&[jpg], &pdf_out).unwrap();
        assert_eq!(pages, 1);
        let bytes = std::fs::read(&pdf_out).unwrap();
        assert!(bytes.starts_with(b"%PDF-"), "missing PDF header");
    }

    #[test]
    fn test_build_pdf_rejects_truncated_jpeg() {
        let tmp = tempfile::tempdir().unwrap();
        let mut bad = tiny_jpeg();
        // Strip the EOI marker.
        bad.truncate(bad.len() - 2);
        let jpg = tmp.path().join("bad.jpg");
        std::fs::write(&jpg, &bad).unwrap();
        let pdf_out = tmp.path().join("bad.pdf");
        assert!(build_pdf_from_jpegs(&[jpg], &pdf_out).is_err());
    }

    #[test]
    fn test_extract_roundtrip() {
        let tmp = tempfile::tempdir().unwrap();
        let jpg = tmp.path().join("p.jpg");
        std::fs::write(&jpg, tiny_jpeg()).unwrap();
        let pdf_out = tmp.path().join("r.pdf");
        build_pdf_from_jpegs(&[jpg], &pdf_out).unwrap();
        let extract_dir = tmp.path().join("imgs");
        let n = extract_jpegs_from_pdf(&pdf_out, &extract_dir).unwrap();
        assert_eq!(n, 1);
        assert!(extract_dir.join("001.jpg").exists());
    }
}

fn find(hay: &[u8], needle: &[u8], from: usize) -> Option<usize> {
    if needle.is_empty() || from >= hay.len() {
        return None;
    }
    hay[from..]
        .windows(needle.len())
        .position(|w| w == needle)
        .map(|p| from + p)
}
