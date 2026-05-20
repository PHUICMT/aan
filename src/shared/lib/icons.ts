// Lucide-style SVG path data (viewBox 24x24)
export const ICON_PATHS: Record<string, string> = {
  book:
    '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>' +
    '<path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>',
  search:
    '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
  download:
    '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>' +
    '<polyline points="7 10 12 15 17 10"/>' +
    '<line x1="12" y1="15" x2="12" y2="3"/>',
  settings:
    '<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>' +
    '<circle cx="12" cy="12" r="3"/>',
  sync:
    '<path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>' +
    '<path d="M3 3v5h5"/>' +
    '<path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/>' +
    '<path d="M16 16h5v5"/>',
  minus:    '<line x1="5" y1="12" x2="19" y2="12"/>',
  plus:     '<line x1="5" y1="12" x2="19" y2="12"/><line x1="12" y1="5" x2="12" y2="19"/>',
  square:   '<rect x="4" y="4" width="16" height="16" rx="2"/>',
  copy:     '<rect x="4" y="4" width="14" height="14" rx="2"/><rect x="8" y="8" width="14" height="14" rx="2"/>',
  inbox:
    '<polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/>' +
    '<path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>',
  // lucide maximize-2 / minimize-2 — title bar window controls.
  maximize:
    '<polyline points="15 3 21 3 21 9"/>' +
    '<polyline points="9 21 3 21 3 15"/>' +
    '<line x1="21" y1="3" x2="14" y2="10"/>' +
    '<line x1="3" y1="21" x2="10" y2="14"/>',
  restore:
    '<polyline points="4 14 10 14 10 20"/>' +
    '<polyline points="20 10 14 10 14 4"/>' +
    '<line x1="14" y1="10" x2="21" y2="3"/>' +
    '<line x1="3" y1="21" x2="10" y2="14"/>',
  x:        '<line x1="6" y1="6" x2="18" y2="18"/><line x1="6" y1="18" x2="18" y2="6"/>',
  chevron_right: '<polyline points="9 18 15 12 9 6"/>',
  chevron_left:  '<polyline points="15 18 9 12 15 6"/>',
  chevron_down:  '<polyline points="6 9 12 15 18 9"/>',
  check:    '<polyline points="20 6 9 17 4 12"/>',
  clock:    '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
  alert_triangle:
    '<path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>' +
    '<line x1="12" y1="9" x2="12" y2="13"/>' +
    '<line x1="12" y1="17" x2="12.01" y2="17"/>',
  external_link:
    '<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>' +
    '<polyline points="15 3 21 3 21 9"/>' +
    '<line x1="10" y1="14" x2="21" y2="3"/>',
  folder:
    '<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>',
  folder_open:
    '<path d="M6 17h14l3-7H9l-3 7z"/>' +
    '<path d="M2 7v12a2 2 0 0 0 2 2h2l3-7h13V7a2 2 0 0 0-2-2h-8l-2-2H4a2 2 0 0 0-2 2z"/>',
  // Reader mode icons (lucide)
  scroll:
    '<path d="M19 17V5a2 2 0 0 0-2-2H4"/>' +
    '<path d="M8 21h12a2 2 0 0 0 2-2v-1a2 2 0 0 0-2-2H8"/>' +
    '<path d="M8 21V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v4h6"/>',
  file_text:
    '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>' +
    '<polyline points="14 2 14 8 20 8"/>' +
    '<line x1="8" y1="13" x2="16" y2="13"/>' +
    '<line x1="8" y1="17" x2="14" y2="17"/>',
  book_open:
    '<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>' +
    '<path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>',
  sun:
    '<circle cx="12" cy="12" r="4"/>' +
    '<line x1="12" y1="2" x2="12" y2="5"/>' +
    '<line x1="12" y1="19" x2="12" y2="22"/>' +
    '<line x1="2" y1="12" x2="5" y2="12"/>' +
    '<line x1="19" y1="12" x2="22" y2="12"/>' +
    '<line x1="4.93" y1="4.93" x2="7.05" y2="7.05"/>' +
    '<line x1="16.95" y1="16.95" x2="19.07" y2="19.07"/>' +
    '<line x1="4.93" y1="19.07" x2="7.05" y2="16.95"/>' +
    '<line x1="16.95" y1="7.05" x2="19.07" y2="4.93"/>',
  moon:
    '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>',
  heart:
    '<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>',
  bookmark:
    '<path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>',
  bookmark_plus:
    '<path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>' +
    '<line x1="12" y1="7" x2="12" y2="13"/>' +
    '<line x1="9" y1="10" x2="15" y2="10"/>',
  layout_grid:
    '<rect x="3" y="3" width="7" height="7"/>' +
    '<rect x="14" y="3" width="7" height="7"/>' +
    '<rect x="3" y="14" width="7" height="7"/>' +
    '<rect x="14" y="14" width="7" height="7"/>',
  layout_compact:
    '<rect x="3" y="3" width="4" height="4"/>' +
    '<rect x="10" y="3" width="4" height="4"/>' +
    '<rect x="17" y="3" width="4" height="4"/>' +
    '<rect x="3" y="10" width="4" height="4"/>' +
    '<rect x="10" y="10" width="4" height="4"/>' +
    '<rect x="17" y="10" width="4" height="4"/>' +
    '<rect x="3" y="17" width="4" height="4"/>' +
    '<rect x="10" y="17" width="4" height="4"/>' +
    '<rect x="17" y="17" width="4" height="4"/>',
  layout_list:
    '<line x1="3" y1="6" x2="21" y2="6"/>' +
    '<line x1="3" y1="12" x2="21" y2="12"/>' +
    '<line x1="3" y1="18" x2="21" y2="18"/>',
  trash:
    '<polyline points="3 6 5 6 21 6"/>' +
    '<path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>' +
    '<path d="M10 11v6"/><path d="M14 11v6"/>',
  palette:
    '<circle cx="13.5" cy="6.5" r="0.5" fill="currentColor"/>' +
    '<circle cx="17.5" cy="10.5" r="0.5" fill="currentColor"/>' +
    '<circle cx="8.5" cy="7.5" r="0.5" fill="currentColor"/>' +
    '<circle cx="6.5" cy="12.5" r="0.5" fill="currentColor"/>' +
    '<path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c1.1 0 2-.9 2-2 0-.5-.2-1-.5-1.4-.3-.4-.5-.9-.5-1.4 0-1.1.9-2 2-2h2.2c2.7 0 4.8-2.1 4.8-4.8C22 5.9 17.5 2 12 2z"/>',
  type:
    '<polyline points="4 7 4 4 20 4 20 7"/>' +
    '<line x1="9" y1="20" x2="15" y2="20"/>' +
    '<line x1="12" y1="4" x2="12" y2="20"/>',
  database:
    '<ellipse cx="12" cy="5" rx="9" ry="3"/>' +
    '<path d="M3 5v6c0 1.66 4.03 3 9 3s9-1.34 9-3V5"/>' +
    '<path d="M3 11v6c0 1.66 4.03 3 9 3s9-1.34 9-3v-6"/>',
  globe:
    '<circle cx="12" cy="12" r="10"/>' +
    '<line x1="2" y1="12" x2="22" y2="12"/>' +
    '<path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>',
  rotate_ccw:
    '<polyline points="1 4 1 10 7 10"/>' +
    '<path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/>',
};
