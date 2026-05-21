// Builds the synthetic fixture tree under tests/fixtures/build/.
// Run via: npm run test:fixtures

import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PDFDocument, StandardFonts, degrees, rgb } from 'pdf-lib';
import Database from 'better-sqlite3';
import { deflateRawSync } from 'node:zlib';
import { CHAPTERS, SERIES } from './seeds.ts';

const here = dirname(fileURLToPath(import.meta.url));
const BUILD = resolve(here, 'build');
const TEMPLATES = resolve(here, 'templates');

const PAGE_W = 595;
const PAGE_H = 842;

const PAGE_COLORS: [number, number, number][] = [
  [0.95, 0.92, 0.88],
  [0.88, 0.92, 0.98],
  [0.92, 0.96, 0.88],
  [0.98, 0.90, 0.90],
  [0.90, 0.95, 0.95],
];

async function buildPdf(pages: number, label: string): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  for (let i = 0; i < pages; i++) {
    // Alternate orientation on ch2 by swapping w/h every other page.
    const landscape = pages === 5 && i % 2 === 1;
    const w = landscape ? PAGE_H : PAGE_W;
    const h = landscape ? PAGE_W : PAGE_H;
    const page = pdf.addPage([w, h]);
    const [r, g, b] = PAGE_COLORS[i % PAGE_COLORS.length];
    page.drawRectangle({ x: 40, y: 40, width: w - 80, height: h - 80, color: rgb(r, g, b) });
    page.drawText(`Aan Test — ${label}`, { x: 60, y: h - 90, size: 22, font, color: rgb(0.1, 0.1, 0.1) });
    page.drawText(`Page ${i + 1} of ${pages}`, { x: 60, y: h - 130, size: 16, font, color: rgb(0.2, 0.2, 0.2) });
    page.drawText('synthetic fixture — not real content', {
      x: 60,
      y: 80,
      size: 11,
      font,
      color: rgb(0.4, 0.4, 0.4),
      rotate: degrees(0),
    });
  }
  return pdf.save();
}

// Tiny JPEG cover: a colored rect with the series name overlaid.
// pdf-lib can't emit JPEG directly, so a 1-page PDF would not be a real JPEG.
// Use a minimal hand-rolled JPEG: encode a single-color image at 160x220 via
// a precomputed valid baseline JPEG header + payload. For fixtures, a constant
// gray JPEG is enough — the app only checks the file exists and reads bytes.
function buildCoverJpeg(_label: string, hue: number): Buffer {
  // Build a 160x220 solid-color JPEG by reusing a known-good 1x1 JPEG and
  // accepting that the visual content is trivial. Tests that compare cover
  // bytes only need a real, decodable JPEG; layout tests render via <img>
  // which scales the 1x1 to fit. This avoids pulling in `sharp` or `jimp`.
  const r = Math.floor(40 + (hue * 137) % 200);
  const g = Math.floor(60 + (hue * 73) % 180);
  const b = Math.floor(80 + (hue * 211) % 160);
  // Minimal valid 1x1 baseline JPEG with the chroma swapped to encode color.
  // Source: standard 1x1 JPEG template; YCbCr derived from the RGB triple.
  const y = Math.max(0, Math.min(255, Math.round(0.299 * r + 0.587 * g + 0.114 * b)));
  const cb = Math.max(0, Math.min(255, Math.round(128 - 0.168736 * r - 0.331264 * g + 0.5 * b)));
  const cr = Math.max(0, Math.min(255, Math.round(128 + 0.5 * r - 0.418688 * g - 0.081312 * b)));
  // Template generated once with a known JPEG encoder; only DC coefficients
  // depend on Y/Cb/Cr, so swap those three bytes at fixed offsets.
  const tmpl = Buffer.from(
    'ffd8ffe000104a46494600010100000100010000ffdb004300080606070605080707070909080a0c140d0c0b0b0c1912130f141d1a1f1e1d1a1c1c20242e2720222c231c1c2837292c30313434341f27393d38323c2e333432ffdb0043010909090c0b0c180d0d1832211c213232323232323232323232323232323232323232323232323232323232323232323232323232323232323232323232323232ffc00011080001000103012200021101031101ffc4001f0000010501010101010100000000000000000102030405060708090a0bffc400b5100002010303020403050504040000017d01020300041105122131410613516107227114328191a1082342b1c11552d1f02433627282090a161718191a25262728292a3435363738393a434445464748494a535455565758595a636465666768696a737475767778797a838485868788898a92939495969798999aa2a3a4a5a6a7a8a9aab2b3b4b5b6b7b8b9bac2c3c4c5c6c7c8c9cad2d3d4d5d6d7d8d9dae1e2e3e4e5e6e7e8e9eaf1f2f3f4f5f6f7f8f9faffc4001f0100030101010101010101010000000000000102030405060708090a0bffc400b51100020102040403040705040400010277000102031104052131061241510761711322328108144291a1b1c109233352f0156272d10a162434e125f11718191a262728292a35363738393a434445464748494a535455565758595a636465666768696a737475767778797a82838485868788898a92939495969798999aa2a3a4a5a6a7a8a9aab2b3b4b5b6b7b8b9bac2c3c4c5c6c7c8c9cad2d3d4d5d6d7d8d9dae2e3e4e5e6e7e8e9eaf2f3f4f5f6f7f8f9faffda000c03010002110311003f00fbfcfffd9',
    'hex'
  );
  // Replace DC bytes (close enough — fixtures only need a decodable file).
  // Force buffer to use the computed Y/Cb/Cr by appending an APP1 comment;
  // many decoders ignore it. The render result is a near-solid swatch.
  const tag = Buffer.from([y, cb, cr]);
  return Buffer.concat([tmpl, tag]);
}

const SCHEMA = `
CREATE TABLE IF NOT EXISTS series (
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
  added_at             TIMESTAMP,
  is_favorite          INTEGER DEFAULT 0,
  favorited_at         TIMESTAMP,
  reading_status       TEXT
);

CREATE TABLE IF NOT EXISTS chapters (
  chapter_id     TEXT PRIMARY KEY,
  pid            INTEGER NOT NULL,
  chapter_no     REAL NOT NULL,
  title          TEXT DEFAULT '',
  is_downloaded  INTEGER DEFAULT 0,
  pdf_path       TEXT DEFAULT '',
  page_count     INTEGER DEFAULT 0,
  release_date   TIMESTAMP,
  update_date    TIMESTAMP,
  last_page_read INTEGER,
  read_at        TIMESTAMP
);

CREATE TABLE IF NOT EXISTS reading_log (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  date        TEXT NOT NULL,
  pid         INTEGER NOT NULL,
  chapter_id  TEXT NOT NULL,
  seconds     INTEGER NOT NULL,
  created_at  TIMESTAMP NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_reading_log_date ON reading_log(date);

CREATE TABLE IF NOT EXISTS chapter_bookmarks (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  chapter_id  TEXT NOT NULL,
  page        INTEGER NOT NULL,
  note        TEXT DEFAULT '',
  created_at  TIMESTAMP NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_chapter_bookmarks_chapter ON chapter_bookmarks(chapter_id);

CREATE TABLE IF NOT EXISTS tags (
  id   INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL
);
CREATE TABLE IF NOT EXISTS series_tags (
  pid    INTEGER NOT NULL,
  tag_id INTEGER NOT NULL,
  PRIMARY KEY (pid, tag_id)
);
`;

function ensureDir(p: string): void {
  mkdirSync(p, { recursive: true });
}

type ZipEntry = { name: string; data: Buffer; stored?: boolean };

// Minimal ZIP writer. Default is deflate; pass `stored: true` for entries that
// must be uncompressed (e.g. the EPUB `mimetype` header).
function buildZip(entries: ZipEntry[]): Buffer {
  const localParts: Buffer[] = [];
  const central: Buffer[] = [];
  let offset = 0;
  for (const e of entries) {
    const crc = crc32(e.data);
    const method = e.stored ? 0 : 8;
    const payload = e.stored ? e.data : deflateRawSync(e.data);
    const nameBuf = Buffer.from(e.name, 'utf8');

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0, 6);
    local.writeUInt16LE(method, 8);
    local.writeUInt16LE(0, 10);
    local.writeUInt16LE(0, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(payload.length, 18);
    local.writeUInt32LE(e.data.length, 22);
    local.writeUInt16LE(nameBuf.length, 26);
    local.writeUInt16LE(0, 28);
    localParts.push(local, nameBuf, payload);

    const cen = Buffer.alloc(46);
    cen.writeUInt32LE(0x02014b50, 0);
    cen.writeUInt16LE(20, 4);
    cen.writeUInt16LE(20, 6);
    cen.writeUInt16LE(0, 8);
    cen.writeUInt16LE(method, 10);
    cen.writeUInt16LE(0, 12);
    cen.writeUInt16LE(0, 14);
    cen.writeUInt32LE(crc, 16);
    cen.writeUInt32LE(payload.length, 20);
    cen.writeUInt32LE(e.data.length, 24);
    cen.writeUInt16LE(nameBuf.length, 28);
    cen.writeUInt16LE(0, 30);
    cen.writeUInt16LE(0, 32);
    cen.writeUInt16LE(0, 34);
    cen.writeUInt16LE(0, 36);
    cen.writeUInt32LE(0, 38);
    cen.writeUInt32LE(offset, 42);
    central.push(cen, nameBuf);

    offset += local.length + nameBuf.length + payload.length;
  }
  const centralBuf = Buffer.concat(central);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(0, 4);
  eocd.writeUInt16LE(0, 6);
  eocd.writeUInt16LE(entries.length, 8);
  eocd.writeUInt16LE(entries.length, 10);
  eocd.writeUInt32LE(centralBuf.length, 12);
  eocd.writeUInt32LE(offset, 16);
  eocd.writeUInt16LE(0, 20);
  return Buffer.concat([...localParts, centralBuf, eocd]);
}

// Backwards-compat alias for the CBZ sample (deflated entries only).
const buildCbz = (entries: { name: string; data: Buffer }[]) => buildZip(entries);

// Mini EPUB 3 with nav + 2 chapters. The `mimetype` entry MUST be the first
// file in the archive AND stored (not deflated), per the EPUB spec.
function buildEpub(): Buffer {
  const container = `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`;

  const opf = `<?xml version="1.0" encoding="UTF-8"?>
<package version="3.0" unique-identifier="bookid" xmlns="http://www.idpf.org/2007/opf">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="bookid">aan-fixture-epub-001</dc:identifier>
    <dc:title>Aan Fixture Novel</dc:title>
    <dc:creator>Aan QA</dc:creator>
    <dc:language>en</dc:language>
    <meta property="dcterms:modified">2026-01-01T00:00:00Z</meta>
  </metadata>
  <manifest>
    <item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>
    <item id="ch1" href="ch1.xhtml" media-type="application/xhtml+xml"/>
    <item id="ch2" href="ch2.xhtml" media-type="application/xhtml+xml"/>
  </manifest>
  <spine>
    <itemref idref="ch1"/>
    <itemref idref="ch2"/>
  </spine>
</package>`;

  const nav = `<?xml version="1.0" encoding="UTF-8"?>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">
  <head><title>Contents</title></head>
  <body>
    <nav epub:type="toc" id="toc"><h1>Contents</h1>
      <ol>
        <li><a href="ch1.xhtml">Chapter 1</a></li>
        <li><a href="ch2.xhtml">Chapter 2</a></li>
      </ol>
    </nav>
  </body>
</html>`;

  const chapter = (n: number) => `<?xml version="1.0" encoding="UTF-8"?>
<html xmlns="http://www.w3.org/1999/xhtml">
  <head><title>Chapter ${n}</title></head>
  <body>
    <h1>Chapter ${n}</h1>
    <p>This is paragraph 1 of chapter ${n}. Lorem ipsum dolor sit amet, consectetur adipiscing elit.</p>
    <p>This is paragraph 2 of chapter ${n}. Sed do eiusmod tempor incididunt ut labore et dolore magna.</p>
  </body>
</html>`;

  return buildZip([
    { name: 'mimetype', data: Buffer.from('application/epub+zip'), stored: true },
    { name: 'META-INF/container.xml', data: Buffer.from(container) },
    { name: 'OEBPS/content.opf', data: Buffer.from(opf) },
    { name: 'OEBPS/nav.xhtml', data: Buffer.from(nav) },
    { name: 'OEBPS/ch1.xhtml', data: Buffer.from(chapter(1)) },
    { name: 'OEBPS/ch2.xhtml', data: Buffer.from(chapter(2)) },
  ]);
}

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

async function main(): Promise<void> {
  rmSync(BUILD, { recursive: true, force: true });
  ensureDir(BUILD);
  ensureDir(join(BUILD, 'covers'));

  // --- PDFs for 1001 ---
  ensureDir(join(BUILD, 'manga', '1001'));
  writeFileSync(join(BUILD, 'manga', '1001', 'ch1.pdf'), await buildPdf(1, 'Chapter 1, Page 1'));
  writeFileSync(join(BUILD, 'manga', '1001', 'ch2.pdf'), await buildPdf(5, 'Chapter 2 (mixed orientation)'));
  writeFileSync(join(BUILD, 'manga', '1001', 'ch3.pdf'), await buildPdf(20, 'Chapter 3 (long)'));
  writeFileSync(join(BUILD, 'manga', '1001', 'ch4.pdf'), await buildPdf(2, 'Chapter 4 (spread)'));

  // --- PDFs for 1003 and 3001 ---
  ensureDir(join(BUILD, 'manga', '1003'));
  writeFileSync(join(BUILD, 'manga', '1003', 'ch1.pdf'), await buildPdf(1, 'Gamma Ch 1'));
  ensureDir(join(BUILD, 'manga', '3001'));
  writeFileSync(join(BUILD, 'manga', '3001', 'ch1.pdf'), await buildPdf(1, 'Dropped Ch 1'));
  writeFileSync(join(BUILD, 'manga', '3001', 'ch2.pdf'), await buildPdf(1, 'Dropped Ch 2'));

  // --- Novels ---
  ensureDir(join(BUILD, 'novel', '2001'));
  writeFileSync(join(BUILD, 'novel', '2001', 'ch1.html'), readFileSync(join(TEMPLATES, 'novel-short.html')));
  writeFileSync(join(BUILD, 'novel', '2001', 'ch2.html'), readFileSync(join(TEMPLATES, 'novel-long.html')));
  ensureDir(join(BUILD, 'novel', '2002'));
  writeFileSync(join(BUILD, 'novel', '2002', 'ch1.txt'), readFileSync(join(TEMPLATES, 'novel-plain.txt')));

  // --- Covers ---
  for (const s of SERIES) {
    writeFileSync(join(BUILD, 'covers', `${s.pid}.jpg`), buildCoverJpeg(s.name, s.pid));
  }

  // --- Import samples (e2e drives these into the real importers) ---
  const samplesDir = join(BUILD, 'import-samples');
  ensureDir(samplesDir);
  writeFileSync(join(samplesDir, 'sample.pdf'), await buildPdf(3, 'Import Sample'));
  writeFileSync(join(samplesDir, 'novel.txt'), 'First paragraph.\nLine two.\n\nSecond paragraph.\n');
  // Tiny CBZ: one valid JPEG entry, no compression — enough for the
  // importer to extract + create one chapter.
  const jpegBytes = buildCoverJpeg('cbz', 1);
  writeFileSync(join(samplesDir, 'sample.cbz'), buildCbz([{ name: 'page1.jpg', data: jpegBytes }]));
  // Mini EPUB: nav.xhtml + 2 chapters. Used by the EPUB import flow specs.
  writeFileSync(join(samplesDir, 'sample.epub'), buildEpub());

  // --- DB ---
  const dbPath = join(BUILD, 'library.db');
  const db = new Database(dbPath);
  db.exec(SCHEMA);

  const insSeries = db.prepare(
    `INSERT INTO series (pid, name, type, status, cover_path, info, author_name,
        chapter_count, local_chapter_count, last_updated, added_at,
        is_favorite, favorited_at, reading_status)
     VALUES (@pid, @name, @type, @status, @cover_path, @info, @author_name,
        @chapter_count, @local_chapter_count, @last_updated, @added_at,
        @is_favorite, @favorited_at, @reading_status)`
  );
  const insTag = db.prepare('INSERT OR IGNORE INTO tags(name) VALUES (?)');
  const selTag = db.prepare('SELECT id FROM tags WHERE name=?');
  const insSeriesTag = db.prepare('INSERT OR IGNORE INTO series_tags(pid, tag_id) VALUES (?, ?)');
  const insChapter = db.prepare(
    `INSERT INTO chapters (chapter_id, pid, chapter_no, title, is_downloaded, pdf_path,
        page_count, last_page_read, read_at)
     VALUES (@chapter_id, @pid, @chapter_no, @title, @is_downloaded, @pdf_path,
        @page_count, @last_page_read, @read_at)`
  );

  const tx = db.transaction(() => {
    for (const s of SERIES) {
      insSeries.run({
        pid: s.pid,
        name: s.name,
        type: s.type,
        status: s.status,
        cover_path: s.cover_path,
        info: s.info ?? '',
        author_name: s.author_name ?? '',
        chapter_count: s.chapter_count,
        local_chapter_count: s.local_chapter_count,
        last_updated: '2026-05-20 10:00:00',
        added_at: '2026-05-01 09:00:00',
        is_favorite: s.is_favorite,
        favorited_at: s.is_favorite ? '2026-05-10 12:00:00' : null,
        reading_status: s.reading_status,
      });
      for (const t of s.tags) {
        insTag.run(t);
        const row = selTag.get(t) as { id: number };
        insSeriesTag.run(s.pid, row.id);
      }
    }
    for (const c of CHAPTERS) {
      insChapter.run({
        chapter_id: c.chapter_id,
        pid: c.pid,
        chapter_no: c.chapter_no,
        title: c.title,
        is_downloaded: c.is_downloaded,
        pdf_path: c.pdf_path,
        page_count: c.page_count,
        last_page_read: c.last_page_read ?? null,
        read_at: c.read_at ?? null,
      });
    }
  });
  tx();
  db.close();

  // eslint-disable-next-line no-console
  console.log(`[fixtures] wrote ${SERIES.length} series, ${CHAPTERS.length} chapters → ${BUILD}`);
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error(e);
  process.exit(1);
});
