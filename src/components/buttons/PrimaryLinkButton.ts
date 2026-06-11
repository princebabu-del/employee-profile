export interface PrimaryLinkButtonProps {
  label: string;
  onclick: string;
  id?: string;
  icon?: string;
  inactive?: boolean;
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
}

/**
 * Primary Link button (blue) — text-only link for in-section actions.
 * e.g. "View History", "View Timeline", "Add Manager".
 * Locked specs: .btn-link, 14px/600, color var(--blue), no bg/border, padding 0.
 * Hover: underline on text (text-underline-offset 2px), icon excluded.
 * Inactive: .btn-link--inactive (gray, non-interactive).
 * Disabled: color #D1E0FF, non-interactive.
 */
export function PrimaryLinkButton({
  label,
  onclick,
  id = '',
  icon = '',
  inactive = false,
  disabled = false,
  type = 'button',
}: PrimaryLinkButtonProps): string {
  const classes = [
    'btn-link',
    inactive ? 'btn-link--inactive' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const inlineStyle = icon ? 'display:inline-flex;align-items:center;gap:4px;' : '';

  return `<button
    class="${classes}"
    onclick="${onclick}"
    type="${type}"
    ${id ? `id="${id}"` : ''}
    ${disabled ? 'disabled' : ''}
    ${inlineStyle ? `style="${inlineStyle}"` : ''}
  >${icon ? `${icon}` : ''}${label}</button>`;
}
