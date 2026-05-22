import { Ionicons } from '@expo/vector-icons';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

type IconSize  = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl';
type IconColor = 'primary' | 'secondary' | 'muted' | 'danger' | 'warning' | 'success' | 'white';

const sizes: Record<IconSize, number> = {
  xs:  16,
  sm:  20,
  md:  24,
  lg:  32,
  xl:  48,
  xxl: 64,
};

const colors: Record<IconColor, string> = {
  primary:   '#6aa84f',
  secondary: '#374151',
  muted:     '#9ca3af',
  danger:    '#ef4444',
  warning:   '#f59e0b',
  success:   '#10b981',
  white:     '#ffffff',
};

interface IconProps {
  name: IoniconName;
  size?: IconSize;
  color?: IconColor;
  style?: any;
}

export function Icon({ name, size = 'md', color = 'secondary', style }: IconProps) {
  return <Ionicons name={name} size={sizes[size]} color={colors[color]} style={style} />;
}
