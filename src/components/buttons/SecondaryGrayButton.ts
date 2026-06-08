export interface SecondaryGrayButtonProps {
  label: string;
  onclick: string;
  icon?: string;
  type?: 'button' | 'submit' | 'reset';
  disabled?: boolean;
}

/**
 * Neutral gray toolbar button — default .pay-action-btn with no color override.
 * Used for secondary toolbar actions (Download, Cancel, etc.).
 * Locked specs (Large): 44px height, 16px h-padding, 8px icon-label gap, 20×20 icon, 8px radius.
 */
export function SecondaryGrayButton({
  label,
  onclick,
  icon = '',
  type = 'button',
  disabled = false,
}: SecondaryGrayButtonProps): string {
  return `<button
    class="btn"
    onclick="${onclick}"
    type="${type}"
    ${disabled ? 'disabled' : ''}
  >${icon ? `${icon} ` : ''}${label}</button>`;
}
