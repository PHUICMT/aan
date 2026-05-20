import { describe, it, expect, beforeEach } from 'vitest';
import { navigate, openSeries, openList, goBack, toggleShortcuts, closeShortcuts } from '../../../src/shared/lib/store/nav.svelte';
import { app } from '../../../src/shared/lib/store/state.svelte';

beforeEach(() => {
  app.page = 'home';
  app.prevPage = 'home';
  app.navDir = 'forward';
  app.seriesPid = null;
  app.shortcutsOpen = false;
});

describe('navigate', () => {
  it('updates page and marks forward', () => {
    navigate('library');
    expect(app.page).toBe('library');
    expect(app.prevPage).toBe('home');
    expect(app.navDir).toBe('forward');
  });

  it('preserves prevPage when navigating to current page', () => {
    app.page = 'library';
    app.prevPage = 'home';
    navigate('library');
    expect(app.prevPage).toBe('home');
  });
});

describe('openSeries', () => {
  it('stores pid and switches to series page', () => {
    openSeries(42);
    expect(app.seriesPid).toBe(42);
    expect(app.page).toBe('series');
    expect(app.navDir).toBe('forward');
  });
});

describe('openList', () => {
  it('sets list status and route', () => {
    openList('plan');
    expect(app.listStatus).toBe('plan');
    expect(app.page).toBe('list');
  });
});

describe('goBack', () => {
  it('reader → series when prev is unrelated', async () => {
    app.page = 'reader';
    app.prevPage = 'library';
    await goBack();
    expect(app.page).toBe('series');
    expect(app.navDir).toBe('back');
  });

  it('reader → home when prev was home', async () => {
    app.page = 'reader';
    app.prevPage = 'home';
    await goBack();
    expect(app.page).toBe('home');
  });

  it('series → library by default', async () => {
    app.page = 'series';
    app.prevPage = 'settings';
    await goBack();
    expect(app.page).toBe('library');
  });

  it('series → favorites when prev was favorites', async () => {
    app.page = 'series';
    app.prevPage = 'favorites';
    await goBack();
    expect(app.page).toBe('favorites');
  });

  it('anything else → home', async () => {
    app.page = 'settings';
    app.prevPage = 'library';
    await goBack();
    expect(app.page).toBe('home');
  });
});

describe('shortcuts', () => {
  it('toggles open/closed', () => {
    toggleShortcuts();
    expect(app.shortcutsOpen).toBe(true);
    toggleShortcuts();
    expect(app.shortcutsOpen).toBe(false);
  });

  it('close forces false', () => {
    app.shortcutsOpen = true;
    closeShortcuts();
    expect(app.shortcutsOpen).toBe(false);
  });
});
