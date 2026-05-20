import { render, fireEvent } from '@testing-library/svelte';
import { describe, it, expect, vi } from 'vitest';
import QuickChips from '../../../src/features/home/QuickChips.svelte';

describe('QuickChips', () => {
  it('renders all four chips', () => {
    const { container } = render(QuickChips, { props: { randomBusy: false, onPickRandom: () => {} } });
    expect(container.querySelectorAll('button.chip').length).toBe(4);
  });

  it('fires onPickRandom when random chip clicked', async () => {
    const onPickRandom = vi.fn();
    const { container } = render(QuickChips, { props: { randomBusy: false, onPickRandom } });
    const random = container.querySelector('button.chip.random') as HTMLButtonElement;
    await fireEvent.click(random);
    expect(onPickRandom).toHaveBeenCalledTimes(1);
  });

  it('disables the random chip while randomBusy', () => {
    const { container } = render(QuickChips, { props: { randomBusy: true, onPickRandom: () => {} } });
    const random = container.querySelector('button.chip.random') as HTMLButtonElement;
    expect(random.disabled).toBe(true);
  });

  it('non-random chips remain interactive when randomBusy', () => {
    const { container } = render(QuickChips, { props: { randomBusy: true, onPickRandom: () => {} } });
    const nonRandom = container.querySelectorAll('button.chip:not(.random)');
    nonRandom.forEach((b) => expect((b as HTMLButtonElement).disabled).toBe(false));
  });
});
