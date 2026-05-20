import { render, fireEvent } from '@testing-library/svelte';
import { describe, it, expect, vi } from 'vitest';
import ReaderToolbar from '../../../src/features/reader/ReaderToolbar.svelte';

function baseProps(over: Partial<Record<string, unknown>> = {}) {
  return {
    mode: 'paged' as const,
    modeLabel: 'Paged',
    modeIcon: 'square',
    fitLabel: 'Fit width',
    fitIcon: 'maximize',
    currentPage: 5,
    pageCount: 20,
    visibleIndicesLen: 1,
    jumpValue: '5',
    zoom: 1.0,
    onPrev: vi.fn(),
    onNext: vi.fn(),
    onSubmitJump: vi.fn((e: SubmitEvent) => e.preventDefault()),
    onJumpInput: vi.fn(),
    onCycleMode: vi.fn(),
    onCycleFit: vi.fn(),
    onZoomIn: vi.fn(),
    onZoomOut: vi.fn(),
    onZoomReset: vi.fn(),
    ...over,
  };
}

describe('ReaderToolbar', () => {
  it('renders the page indicator', () => {
    const { container } = render(ReaderToolbar, { props: baseProps() });
    expect(container.querySelector('.of')?.textContent).toContain('20');
    expect((container.querySelector('input[type="number"]') as HTMLInputElement).value).toBe('5');
  });

  it('prev/next call their handlers', async () => {
    const onPrev = vi.fn();
    const onNext = vi.fn();
    const { container } = render(ReaderToolbar, { props: baseProps({ onPrev, onNext }) });
    const navs = container.querySelectorAll('button.nav');
    await fireEvent.click(navs[0] as HTMLButtonElement);
    await fireEvent.click(navs[1] as HTMLButtonElement);
    expect(onPrev).toHaveBeenCalledOnce();
    expect(onNext).toHaveBeenCalledOnce();
  });

  it('jump form submit fires onSubmitJump', async () => {
    const onSubmitJump = vi.fn((e: SubmitEvent) => e.preventDefault());
    const { container } = render(ReaderToolbar, { props: baseProps({ onSubmitJump }) });
    await fireEvent.submit(container.querySelector('form.page-jump') as HTMLFormElement);
    expect(onSubmitJump).toHaveBeenCalledOnce();
  });

  it('typing in the jump input fires onJumpInput', async () => {
    const onJumpInput = vi.fn();
    const { container } = render(ReaderToolbar, { props: baseProps({ onJumpInput }) });
    const inp = container.querySelector('input[type="number"]') as HTMLInputElement;
    inp.value = '7';
    await fireEvent.input(inp);
    expect(onJumpInput).toHaveBeenCalledWith('7');
  });

  it('zoom controls call their handlers and label reflects %', async () => {
    const onZoomIn = vi.fn();
    const onZoomOut = vi.fn();
    const onZoomReset = vi.fn();
    const { container } = render(ReaderToolbar, {
      props: baseProps({ zoom: 1.25, onZoomIn, onZoomOut, onZoomReset }),
    });
    const zoomBtns = container.querySelectorAll('.zoom-ctrl > button');
    expect((zoomBtns[1] as HTMLElement).textContent?.trim()).toBe('125%');
    await fireEvent.click(zoomBtns[0] as HTMLButtonElement); // minus
    await fireEvent.click(zoomBtns[1] as HTMLButtonElement); // label = reset
    await fireEvent.click(zoomBtns[2] as HTMLButtonElement); // plus
    expect(onZoomOut).toHaveBeenCalledOnce();
    expect(onZoomReset).toHaveBeenCalledOnce();
    expect(onZoomIn).toHaveBeenCalledOnce();
  });

  it('cycle mode + fit handlers fire from their buttons', async () => {
    const onCycleMode = vi.fn();
    const onCycleFit = vi.fn();
    const { container } = render(ReaderToolbar, {
      props: baseProps({ onCycleMode, onCycleFit }),
    });
    const modeBtns = container.querySelectorAll('button.mode');
    // First two .mode buttons (before zoom-ctrl) are mode + fit.
    await fireEvent.click(modeBtns[0] as HTMLButtonElement);
    await fireEvent.click(modeBtns[1] as HTMLButtonElement);
    expect(onCycleMode).toHaveBeenCalledOnce();
    expect(onCycleFit).toHaveBeenCalledOnce();
  });
});
