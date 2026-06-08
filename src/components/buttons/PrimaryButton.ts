export interface PrimaryButtonProps {
  label: string;
  onclick: string;
  icon?: string;
  type?: 'button' | 'submit' | 'reset';
  disabled?: boolean;
}

/**
 * Blue filled toolbar CTA button.
 * Uses .pay-action-btn + inline blue override + mouse handlers for hover.
 * Locked specs (Large): 44px height, 16px h-padding, 8px icon-label gap, 20×20 icon, 8px radius.
 * Disabled: background + border #D1E0FF, text white (no opacity).
 */
export function PrimaryButton({
  label,
  onclick,
  icon = '',
  type = 'button',
  disabled = false,
}: PrimaryButtonProps): string {
  return `<button
    class="btn btn-primary"
    onclick="${onclick}"
    type="${type}"
    ${disabled ? 'disabled' : ''}
  >${icon ? `${icon} ` : ''}${label}</button>`;
}
