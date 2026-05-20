import { render, fireEvent } from '@testing-library/svelte';
import { describe, it, expect, vi } from 'vitest';
import RandomPickModal from '../../../src/features/home/RandomPickModal.svelte';
import { makeSeries } from '../helpers';

function baseProps(over: Partial<Record<string, unknown>> = {}) {
  return {
    picked: makeSeries({ pid: 9, name: 'Picked One' }),
    covers: {} as Record<number, string>,
    canReroll: true,
    onReroll: vi.fn(),
    onOpen: vi.fn(),
    onCancel: vi.fn(),
    ...over,
  };
}

describe('RandomPickModal', () => {
  it('renders the picked series name', () => {
    const { container } = render(RandomPickModal, { props: baseProps() });
    expect(container.querySelector('.pick-name')?.textContent).toBe('Picked One');
  });

  it('reroll button disabled when canReroll is false', () => {
    const { container } = render(RandomPickModal, { props: baseProps({ canReroll: false }) });
    const ghost = container.querySelector('button.pick-btn.ghost') as HTMLButtonElement;
    expect(ghost.disabled).toBe(true);
  });

  it('reroll button enabled when canReroll is true and fires onReroll', async () => {
    const onReroll = vi.fn();
    const { container } = render(RandomPickModal, { props: baseProps({ onReroll }) });
    const ghost = container.querySelector('button.pick-btn.ghost') as HTMLButtonElement;
    expect(ghost.disabled).toBe(false);
    await fireEvent.click(ghost);
    expect(onReroll).toHaveBeenCalledOnce();
  });

  it('primary button fires onOpen', async () => {
    const onOpen = vi.fn();
    const { container } = render(RandomPickModal, { props: baseProps({ onOpen }) });
    await fireEvent.click(container.querySelector('button.pick-btn.primary') as HTMLButtonElement);
    expect(onOpen).toHaveBeenCalledOnce();
  });

  it('close (X) button fires onCancel', async () => {
    const onCancel = vi.fn();
    const { container } = render(RandomPickModal, { props: baseProps({ onCancel }) });
    await fireEvent.click(container.querySelector('button.pick-close') as HTMLButtonElement);
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it('backdrop click (overlay) fires onCancel', async () => {
    const onCancel = vi.fn();
    const { container } = render(RandomPickModal, { props: baseProps({ onCancel }) });
    const overlay = container.querySelector('.pick-overlay') as HTMLElement;
    // Click directly on the overlay element (target === currentTarget guard).
    await fireEvent.click(overlay, { bubbles: true });
    expect(onCancel).toHaveBeenCalled();
  });

  it('Escape key fires onCancel', async () => {
    const onCancel = vi.fn();
    render(RandomPickModal, { props: baseProps({ onCancel }) });
    await fireEvent.keyDown(window, { key: 'Escape' });
    expect(onCancel).toHaveBeenCalled();
  });

  it('Enter key fires onOpen', async () => {
    const onOpen = vi.fn();
    render(RandomPickModal, { props: baseProps({ onOpen }) });
    await fireEvent.keyDown(window, { key: 'Enter' });
    expect(onOpen).toHaveBeenCalled();
  });

  it('R key fires onReroll', async () => {
    const onReroll = vi.fn();
    render(RandomPickModal, { props: baseProps({ onReroll }) });
    await fireEvent.keyDown(window, { key: 'r' });
    expect(onReroll).toHaveBeenCalled();
  });
});
