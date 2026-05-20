// Barrel re-export — domain stores live under ./store/
// Kept at this path so existing consumers (`import { app, navigate, ... } from '.../store.svelte'`) continue to work.
export * from './store/index';
