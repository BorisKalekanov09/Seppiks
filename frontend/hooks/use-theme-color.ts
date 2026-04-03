/**
 * Simplified theme color hook — Seppiks always runs in dark mode.
 */
import { Colors } from '@/constants/theme';

export function useThemeColor(
  props: { light?: string; dark?: string },
  colorName: keyof typeof Colors
) {
  const colorFromProps = props['dark'];
  if (colorFromProps) {
    return colorFromProps;
  }
  const color = Colors[colorName];
  return typeof color === 'string' ? color : Colors.textPrimary;
}
