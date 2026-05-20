<script lang="ts">
  type Props = { title: string; subtitle?: string };
  let { title, subtitle = '' }: Props = $props();
</script>

<div class="page">
  <h1>{title}</h1>
  {#if subtitle}<p>{subtitle}</p>{/if}
</div>

<style>
  .page {
    padding: 60px 40px; height: 100%;
    display: flex; flex-direction: column;
    justify-content: center; align-items: center;
    text-align: center; gap: 8px;
  }
  h1 {
    font-size: 32px; font-weight: 700;
    background: linear-gradient(135deg, var(--heading-grad-from) 0%, var(--heading-grad-to) 100%);
    -webkit-background-clip: text; background-clip: text;
    -webkit-text-fill-color: transparent;
  }
  p { color: var(--text2); font-size: 13px; }
</style>
