<script lang="ts">
  type Props = {
    radius?: number;
    height?: string;
    width?: string;
  };
  let { radius = 10, height = '100%', width = '100%' }: Props = $props();
</script>

<div
  class="shimmer"
  style:--radius="{radius}px"
  style:height
  style:width
>
  <div class="band"></div>
</div>

<style>
  .shimmer {
    position: relative;
    overflow: hidden;
    background: var(--shimmer-bg);
    border-radius: var(--radius);
    isolation: isolate;
  }
  .band {
    position: absolute;
    inset: 0;
    transform: translateX(-100%);
    background: var(--shimmer-band);
    animation: shimmer-sweep 1.6s var(--ease-in-out) infinite;
  }
</style>
