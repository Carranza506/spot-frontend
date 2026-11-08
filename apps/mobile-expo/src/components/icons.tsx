import type { ReactNode } from 'react';
import Svg, { Circle, Path } from 'react-native-svg';
import { color as palette } from '@spot/shared';

interface IconProps {
  size?: number;
  color?: string;
}

/** Stroke icons (24×24 grid) for the home screen. Decorative: the control around them carries the label. */
function StrokeIcon({ size = 22, color = palette.textPrimary, children }: IconProps & { children: ReactNode }) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {children}
    </Svg>
  );
}

export function SearchIcon(props: IconProps) {
  return (
    <StrokeIcon {...props}>
      <Circle cx={11} cy={11} r={7} />
      <Path d="M20 20l-3.5-3.5" />
    </StrokeIcon>
  );
}

export function SlidersIcon(props: IconProps) {
  return (
    <StrokeIcon {...props}>
      <Path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12" />
      <Circle cx={16} cy={6} r={2} />
      <Circle cx={10} cy={12} r={2} />
      <Circle cx={18} cy={18} r={2} />
    </StrokeIcon>
  );
}

export function SparkleIcon(props: IconProps) {
  return (
    <StrokeIcon {...props}>
      <Path d="M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8z" />
      <Path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z" />
    </StrokeIcon>
  );
}

export function HeartIcon(props: IconProps) {
  return (
    <StrokeIcon {...props}>
      <Path d="M12 20s-7-4.3-9-8.7C1.6 8.1 3.6 4.5 7.1 4.5c2 0 3.4 1.1 4.1 2.3.7-1.2 2.1-2.3 4.1-2.3 3.5 0 5.5 3.6 4.1 6.8C18.9 15.7 12 20 12 20z" />
    </StrokeIcon>
  );
}

export function CalendarIcon(props: IconProps) {
  return (
    <StrokeIcon {...props}>
      <Path d="M5 5h14a1 1 0 011 1v13a1 1 0 01-1 1H5a1 1 0 01-1-1V6a1 1 0 011-1z" />
      <Path d="M4 10h16M8 3v4M16 3v4" />
    </StrokeIcon>
  );
}

export function BellIcon(props: IconProps) {
  return (
    <StrokeIcon {...props}>
      <Path d="M6 16V11a6 6 0 1112 0v5l1.5 2h-15z" />
      <Path d="M10 20.5a2 2 0 004 0" />
    </StrokeIcon>
  );
}

export function LogoutIcon(props: IconProps) {
  return (
    <StrokeIcon {...props}>
      <Path d="M14 4h4a2 2 0 012 2v12a2 2 0 01-2 2h-4" />
      <Path d="M10 16l-4-4 4-4M6 12h10" />
    </StrokeIcon>
  );
}

export function ChevronRightIcon(props: IconProps) {
  return (
    <StrokeIcon {...props}>
      <Path d="M9 6l6 6-6 6" />
    </StrokeIcon>
  );
}
