import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, ViewStyle, TextStyle, StyleProp, View } from 'react-native';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'danger';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  /** Overrides default spinner color when `loading` (e.g. match `textStyle` on dark buttons). */
  loadingIndicatorColor?: string;
  icon?: any;
}

export default function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  fullWidth = false,
  style,
  textStyle,
  loadingIndicatorColor,
  icon: Icon,
}: ButtonProps) {
  const isDisabled = disabled || loading;
  const primaryColor = '#01e669';

  return (
    <TouchableOpacity
      style={[
        styles.button,
        styles[variant],
        styles[size],
        fullWidth && styles.fullWidth,
        isDisabled && styles.disabled,
        style,
      ]}
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator
          color={
            loadingIndicatorColor ??
            (variant === 'outline' ? primaryColor : '#FFFFFF')
          }
        />
      ) : (
        <View style={styles.inner}>
          {Icon && (
            <Icon
              size={size === 'small' ? 14 : size === 'large' ? 20 : 18}
              color={variant === 'outline' ? primaryColor : '#FFFFFF'}
              style={{ marginRight: 8 }}
            />
          )}
          <Text style={[styles.text, styles[`${variant}Text`], styles[`${size}Text`], textStyle]}>
            {title}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primary: {
    backgroundColor: '#01e669',
  },
  secondary: {
    backgroundColor: '#4CAF50',
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: '#01e669',
  },
  danger: {
    backgroundColor: '#F44336',
  },
  small: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  medium: {
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  large: {
    paddingVertical: 16,
    paddingHorizontal: 32,
  },
  fullWidth: {
    width: '100%',
  },
  disabled: {
    opacity: 0.5,
  },
  text: {
    fontFamily: 'Inter',
    fontWeight: '600',
  },
  primaryText: {
    color: '#FFFFFF',
  },
  secondaryText: {
    color: '#FFFFFF',
  },
  outlineText: {
    color: '#01e669',
  },
  dangerText: {
    color: '#FFFFFF',
  },
  smallText: {
    fontSize: 14,
  },
  mediumText: {
    fontSize: 16,
  },
  largeText: {
    fontSize: 18,
  },
});
