export interface LinkButtonProps {
  label: string;
  onclick: string;
  id?: string;
  icon?: string;
  inactive?: boolean;
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
}

/**
 * Text-only blue link button for secondary in-section actions.
 * e.g. "View History", "View Timeline", "View Manager History".
 * Locked specs: .field-helper-link, 14px/600, var(--blue), no bg or border.
 * inactive state: .field-helper-link--inactive (gray, non-interactive).
 * Disabled: color #D1E0FF (no opacity), non-interactive.
 */
export function LinkButton({
  label,
  onclick,
  id = '',
  icon = '',
  inactive = false,
  disabled = false,
  type = 'button',
}: LinkButtonProps): string {
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
