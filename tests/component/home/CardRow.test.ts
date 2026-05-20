import { render, fireEvent } from '@testing-library/svelte';
import { describe, it, expect, vi } from 'vitest';
import CardRow from '../../../src/features/home/CardRow.svelte';
import { app } from '../../../src/shared/lib/store.svelte';
import { makeSeries } from '../helpers';

describe('CardRow', () => {
  it('renders provided title and item names', () => {
    const items = [makeSeries({ pid: 1, name: 'Alpha' }), makeSeries({ pid: 2, name: 'Beta' })];
    const { container } = render(CardRow, {
      props: { title: 'My Block', items, covers: {}, onClick: () => {} },
    });
    expect(container.querySelector('h2')?.textContent).toBe('My Block');
    const names = Array.from(container.querySelectorAll('.fav-name')).map((n) => n.textContent);
    expect(names).toEqual(['Alpha', 'Beta']);
  });

  it('fires onClick with the clicked series', async () => {
    const items = [makeSeries({ pid: 1, name: 'Alpha' })];
    const onClick = vi.fn();
    const { container } = render(CardRow, {
      props: { title: 'X', items, covers: {}, onClick },
    });
    await fireEvent.click(container.querySelector('button.fav-card') as HTMLButtonElement);
    expect(onClick).toHaveBeenCalledOnce();
    expect(onClick.mock.calls[0][0].pid).toBe(1);
  });

  it('see-all button navigates when seeAllHref provided', async () => {
    app.page = 'home';
    const { container } = render(CardRow, {
      props: { title: 'X', items: [], covers: {}, onClick: () => {}, seeAllHref: 'library' },
    });
    const more = container.querySelector('button.more') as HTMLButtonElement;
    expect(more).not.toBeNull();
    await fireEvent.click(more);
    expect(app.page).toBe('library');
  });

  it('shows hint span (not button) when seeAllHint provided without href', () => {
    const { container } = render(CardRow, {
      props: { title: 'X', items: [], covers: {}, onClick: () => {}, seeAllHint: '3 items' },
    });
    expect(container.querySelector('button.more')).toBeNull();
    expect(container.querySelector('span.more.muted')?.textContent?.trim()).toBe('3 items');
  });

  it('uses cover img when covers map has the pid', () => {
    const items = [makeSeries({ pid: 7, name: 'Zed' })];
    const { container } = render(CardRow, {
      props: { title: 'X', items, covers: { 7: 'blob:url' }, onClick: () => {} },
    });
    expect(container.querySelector('.cover-fav img')).not.toBeNull();
    expect(container.querySelector('.cover-fallback')).toBeNull();
  });

  it('applies abandoned-card class when dimmed', () => {
    const items = [makeSeries({ pid: 1 })];
    const { container } = render(CardRow, {
      props: { title: 'X', items, covers: {}, onClick: () => {}, dimmed: true },
    });
    expect(container.querySelector('.fav-card.abandoned-card')).not.toBeNull();
  });
});
