export interface SecondaryBlueButtonProps {
  label: string;
  onclick: string;
  id?: string;
  type?: 'button' | 'submit' | 'reset';
  disabled?: boolean;
}

/**
 * Outlined blue button for drawer footers — sits between the neutral and primary actions.
 * e.g. "Save & Add Another".
 * Locked specs (Large): 44px height, 16px h-padding, 8px icon-label gap, 20×20 icon, 8px radius.
 * Disabled: border + text #D1E0FF (no opacity), background stays white.
 */
export function SecondaryBlueButton({
  label,
  onclick,
  id = '',
  type = 'button',
  disabled = false,
}: SecondaryBlueButtonProps): string {
  return `<button
    class="btn btn-secondary"
    onclick="${onclick}"
    type="${type}"
    ${id ? `id="${id}"` : ''}
    ${disabled ? 'disabled' : ''}
  >${label}</button>`;
}
