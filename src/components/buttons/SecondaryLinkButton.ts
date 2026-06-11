export interface SecondaryLinkButtonProps {
  label: string;
  onclick: string;
  id?: string;
  icon?: string;
  inactive?: boolean;
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
}

/**
 * Secondary Link button (gray-700) — text-only link for neutral in-section actions.
 * Same structure as PrimaryLinkButton but rendered in var(--700) instead of blue.
 * Locked specs: .btn-link.btn-link-secondary, 14px/600, color var(--700), no bg/border, padding 0.
 * Hover: underline on text (text-underline-offset 2px), icon excluded.
 * Inactive: .btn-link--inactive (gray, non-interactive).
 */
export function SecondaryLinkButton({
  label,
  onclick,
  id = '',
  icon = '',
  inactive = false,
  disabled = false,
  type = 'button',
}: SecondaryLinkButtonProps): string {
  const classes = [
    'btn-link',
    'btn-link-secondary',
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
