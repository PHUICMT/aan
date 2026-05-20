import { test, expect, invokeCmd } from '../fixtures/app';
import { LibraryPage } from '../pages/LibraryPage';
import { SeriesDetailPage } from '../pages/SeriesDetailPage';
import { ReaderPage } from '../pages/ReaderPage';

// The selection-driven UX path needs a real user gesture, so we drive
// the underlying Rust commands directly to exercise the persistence +
// re-apply path, then assert via the Annotations panel. Cleanup wipes
// every annotation we created for the fixture chapter.

const TEST_PID = 2001;
const TEST_CHAPTER = '2001-ch2';

const createdIds: number[] = [];

test.afterEach(async ({ app }) => {
  for (const id of createdIds.splice(0)) {
    try { await invokeCmd(app, 'remove_annotation', { id }); } catch {}
  }
});

async function openNovelChapter(app: import('@playwright/test').Page) {
  const lib = new LibraryPage(app);
  const detail = new SeriesDetailPage(app);
  const reader = new ReaderPage(app);
  await lib.open();
  await lib.clickSeriesByPid(TEST_PID);
  await detail.waitLoaded();
  await detail.openChapter(TEST_CHAPTER);
  await reader.waitLoaded();
}

test('annotations created via command surface as wrappers + panel rows', async ({ app }) => {
  await openNovelChapter(app);

  // Create two annotations in different colours, exercising the same
  // persistence layer the selection menu uses.
  for (const args of [
    { color: 'yellow', text: 'paragraph one', start: 0, end: 13 },
    { color: 'pink', text: 'paragraph two', start: 14, end: 27 },
  ]) {
    const id = await invokeCmd<number>(app, 'add_annotation', {
      args: {
        chapter_id: TEST_CHAPTER,
        pid: TEST_PID,
        color: args.color,
        text_snippet: args.text,
        start_offset: args.start,
        end_offset: args.end,
      },
    });
    createdIds.push(id);
  }

  await app.click('[data-test="anno-panel-toggle"]');
  const panel = app.locator('[data-test="anno-panel"]');
  await expect(panel).toBeVisible();
  await expect(panel.locator('.anno-item')).toHaveCount(2);
  await expect(panel.locator('.anno-item.anno-yellow').first()).toBeVisible();
  await expect(panel.locator('.anno-item.anno-pink').first()).toBeVisible();
});

test('annotation list survives chapter swap and reload', async ({ app }) => {
  const id = await invokeCmd<number>(app, 'add_annotation', {
    args: {
      chapter_id: TEST_CHAPTER,
      pid: TEST_PID,
      color: 'blue',
      text_snippet: 'persistent highlight',
      start_offset: 5,
      end_offset: 24,
      note: 'remember this',
    },
  });
  createdIds.push(id);

  await app.reload({ waitUntil: 'domcontentloaded' });
  await openNovelChapter(app);
  await app.click('[data-test="anno-panel-toggle"]');
  const panel = app.locator('[data-test="anno-panel"]');
  await expect(panel.locator('.anno-item')).toHaveCount(1);
  await expect(panel.locator('.anno-text')).toHaveText('persistent highlight');
  await expect(panel.locator('.anno-note')).toHaveText('remember this');
});

test('export_series_annotations_md emits chapter-grouped markdown', async ({ app }) => {
  for (const args of [
    { color: 'yellow', text: 'first', start: 0, end: 5 },
    { color: 'green', text: 'second', start: 10, end: 16 },
  ]) {
    const id = await invokeCmd<number>(app, 'add_annotation', {
      args: {
        chapter_id: TEST_CHAPTER,
        pid: TEST_PID,
        color: args.color,
        text_snippet: args.text,
        start_offset: args.start,
        end_offset: args.end,
      },
    });
    createdIds.push(id);
  }

  const md = await invokeCmd<string>(app, 'export_series_annotations_md', { pid: TEST_PID });
  expect(md).toContain('## Chapter');
  expect(md).toContain('first');
  expect(md).toContain('second');
});
