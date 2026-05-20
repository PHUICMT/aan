<script lang="ts">
  import { ICON_PATHS } from '../lib/icons';
  type Props = { name: string; size?: number };
  let { name, size = 16 }: Props = $props();
</script>

<svg
  width={size}
  height={size}
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  stroke-width="2"
  stroke-linecap="round"
  stroke-linejoin="round"
  aria-hidden="true"
>{@html ICON_PATHS[name] ?? ''}</svg>
