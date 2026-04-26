import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, useWindowDimensions } from 'react-native';
import { Calendar, Clock, MapPin, Users } from 'lucide-react-native';
import { Platform } from 'react-native';
import { BookingWithDetails } from '@/types';
import { formatCurrency, formatDate, getStatusColor, getStatusLabel, isDateInPast } from '@/utils/helpers';
import { formatBookingSlotSummary } from '@/utils/bookingSlotFormat';
import { cricketTeamsLabelFromBooking } from '@/utils/cricketGround';
import Card from '@/components/ui/Card';

interface BookingCardProps {
  booking: BookingWithDetails;
  onPress: () => void;
  showGroundDetails?: boolean;
  metaText?: string;
  whoTitle?: string;
  onCancel?: () => void;
  onReview?: () => void;
  lightMode?: boolean;
}

const NATIVE_CARD_BG = '#043529';
const NATIVE_ACCENT = '#02c259';
const NATIVE_TEXT = '#dcc093';

export default function BookingCard({
  booking,
  onPress,
  showGroundDetails = true,
  metaText,
  whoTitle,
  onCancel,
  onReview,
  lightMode,
}: BookingCardProps) {
  const { width } = useWindowDimensions();
  const isWeb = Platform.OS === 'web';
  const IS_DARK = !isWeb || (width < 900);
  const primaryImage = booking.ground.ground_images?.[0]?.image_url ||
    'https://images.pexels.com/photos/1661950/pexels-photo-1661950.jpeg';

  const cricketTeamsLabel = cricketTeamsLabelFromBooking(
    booking.ground.pitch_type,
    booking.notes,
  );

  const isLight = lightMode || (!isWeb && !IS_DARK) || (isWeb && !IS_DARK);
  const iconDetail = isLight ? '#10b981' : NATIVE_ACCENT;
  const pinColor = isLight ? '#666' : NATIVE_TEXT;
  const groundNameStyle = [styles.groundName, !isLight && styles.groundNameNative];
  const locationStyle = [styles.location, !isLight && styles.locationNative];
  const detailTextStyle = [styles.detailText, !isLight && styles.detailTextNative];
  const compactNameStyle = [styles.compactGroundName, !isLight && styles.compactGroundNameNative];
  const compactLocStyle = [styles.compactGroundLocation, !isLight && styles.compactGroundLocationNative];
  const amountStyle = [styles.amount, !isLight && styles.amountNative];
  const metaStyle = [styles.metaText, !isLight && styles.metaTextNative];
  const paymentMethodStyle = [styles.paymentMethod, !isLight && styles.paymentMethodNative];
  const whoTitleStyle = [styles.whoTitleText, !isLight && styles.whoTitleTextNative];
  const badgeBg = getStatusColor(booking.status);
  const statusLabelStyle = styles.statusText;

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85}>
      <Card
        style={[
          styles.card,
          isWeb && !IS_DARK && styles.cardWeb,
          !isWeb && IS_DARK && !isLight && styles.cardNative,
          isLight && styles.cardLight,
        ]}
      >
        <View style={styles.content}>
          {showGroundDetails && (
            <>
              <Image source={{ uri: primaryImage }} style={styles.image} />
              <Text style={groundNameStyle}>{booking.ground.name}</Text>
              <View style={styles.locationRow}>
                <MapPin size={14} color={pinColor} />
                <Text style={locationStyle}>{booking.ground.city}</Text>
              </View>
            </>
          )}

          {!showGroundDetails && (
            <View style={styles.compactHeader}>
              <Text style={compactNameStyle}>{booking.ground.name}</Text>
              <Text style={compactLocStyle}>
                {booking.ground.city}, {booking.ground.state}
              </Text>
            </View>
          )}

          <View style={styles.detailsRow}>
            <View style={styles.detail}>
              <Calendar size={16} color={iconDetail} />
              <Text style={detailTextStyle}>{formatDate(booking.booking_date)}</Text>
            </View>
            <View style={styles.detail}>
              <Clock size={16} color={iconDetail} />
              <Text style={detailTextStyle}>
                {formatBookingSlotSummary(
                  booking.start_time,
                  booking.end_time,
                  booking.ground.pitch_type,
                )}
              </Text>
            </View>
            {((booking as any).opponent || cricketTeamsLabel) ? (
              <View style={styles.detail}>
                <Users size={16} color={iconDetail} />
                <Text style={detailTextStyle}>
                  {(booking as any).opponent ? 'MATCHED' : cricketTeamsLabel}
                </Text>
                {(booking as any).opponent && (
                  <View style={styles.vsBadge}>
                    <Text style={styles.vsBadgeText}>VS</Text>
                    <Text style={styles.opponentNameText} numberOfLines={1}>
                      {((booking as any).opponent.team_name || (booking as any).opponent.full_name).toUpperCase()}
                    </Text>
                  </View>
                )}
              </View>
            ) : null}
          </View>

          <View style={styles.footer}>
            <View style={styles.footerLeft}>
              <Text style={amountStyle}>{formatCurrency(booking.total_amount)}</Text>
              {booking.payment_method && (
                <Text style={paymentMethodStyle}>
                  Via {booking.payment_method === 'cash' ? 'Cash' : 'Online'}
                </Text>
              )}
            </View>
            <View style={styles.statusRow}>
              {onReview && (
                <TouchableOpacity 
                  onPress={(e) => {
                    e.stopPropagation();
                    onReview();
                  }}
                  style={[styles.reviewBtnSmall]}
                >
                  <Text style={styles.reviewBtnText}>RATE & REVIEW</Text>
                </TouchableOpacity>
              )}
              {onCancel && (
                <TouchableOpacity 
                  onPress={(e) => {
                    e.stopPropagation();
                    onCancel();
                  }}
                  style={[styles.cancelBtnSmall, isLight && styles.cancelBtnSmallWeb]}
                >
                  <Text style={styles.cancelBtnText}>CANCEL</Text>
                </TouchableOpacity>
              )}
              {!(booking.status === 'confirmed' && new Date(booking.booking_date) < new Date(new Date().setHours(0,0,0,0))) && (
                <View style={[styles.statusBadge, { backgroundColor: badgeBg }]}>
                  <Text style={statusLabelStyle}>
                    {booking.status === 'confirmed' ? (isDateInPast(booking.booking_date) ? 'Done' : 'Active') : getStatusLabel(booking.status)}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {whoTitle ? (
            <Text style={whoTitleStyle}>
              Booked by: <Text style={{ fontWeight: '800' }}>{whoTitle}</Text>
            </Text>
          ) : null}
          <View style={styles.idRow}>
             <Text style={metaStyle}>
               Booking ID: {booking.id.substring(0, 8).toUpperCase()}
             </Text>
          </View>
          {metaText ? <Text style={metaStyle}>{metaText}</Text> : null}
        </View>
      </Card>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 14,
    borderRadius: 18,
    overflow: 'hidden',
    flex: 1,
  },
  cardWeb: {
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    borderWidth: 1,
    borderColor: 'rgba(229,231,235,0.9)',
  },
  cardNative: {
    backgroundColor: '#06392e',
    borderWidth: 1,
    borderColor: 'rgba(0,234,107,0.2)',
    shadowOpacity: 0,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 0 },
    elevation: 0,
  },
  cardLight: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  content: {
    gap: 8,
    padding: 10,
  },
  image: {
    width: '100%',
    height: 140,
    borderRadius: 14,
    backgroundColor: '#E0E0E0',
    marginBottom: 4,
  },
  groundName: {
    fontFamily: 'Inter',
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
  },
  groundNameNative: {
    color: NATIVE_TEXT,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  location: {
    fontSize: 14,
    color: '#666',
  },
  locationNative: {
    color: NATIVE_TEXT,
  },
  detailsRow: {
    gap: 6,
    marginTop: 4,
  },
  detail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontFamily: 'Inter',
    fontSize: 13,
    color: '#4B5563',
  },
  detailTextNative: {
    color: NATIVE_TEXT,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },
  footerLeft: {
    gap: 2,
  },
  amount: {
    fontFamily: 'Inter',
    fontSize: 14,
    fontWeight: '600',
    color: '#10b981',
  },
  amountNative: {
    color: NATIVE_ACCENT,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  compactHeader: {
    marginBottom: 4,
  },
  compactGroundName: {
    fontFamily: 'Inter',
    fontSize: 15,
    fontWeight: '500',
    color: '#111827',
  },
  compactGroundNameNative: {
    color: NATIVE_TEXT,
  },
  compactGroundLocation: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  compactGroundLocationNative: {
    color: NATIVE_TEXT,
  },
  metaText: {
    marginTop: 6,
    fontSize: 12,
    color: '#6B7280',
  },
  metaTextNative: {
    color: NATIVE_TEXT,
  },
  metaMuted: {
    fontSize: 12,
    color: '#6B7280',
  },
  ownerListCard: {
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  ownerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  ownerCol: {
    flex: 1,
    minWidth: 0,
  },
  ownerAmountCol: {
    alignItems: 'flex-start',
    gap: 4,
  },
  paymentMethod: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
    fontWeight: '500',
    textTransform: 'uppercase',
  },
  paymentMethodNative: {
    color: NATIVE_TEXT,
    opacity: 0.8,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cancelBtnSmall: {
    paddingVertical: 4,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  cancelBtnSmallWeb: {
    backgroundColor: 'transparent',
  },
  cancelBtnText: {
    fontFamily: 'Inter',
    color: '#F44336',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  whoTitleText: {
    fontSize: 13,
    color: '#374151',
    marginTop: 4,
  },
  whoTitleTextNative: {
    color: NATIVE_TEXT,
  },
  reviewBtnSmall: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#00ea6b',
    backgroundColor: 'rgba(0,234,107,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewBtnText: {
    fontFamily: 'Inter',
    color: '#01b854',
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  vsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 4,
    flex: 1,
  },
  vsBadgeText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#10b981',
  },
  opponentNameText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#111827',
    flex: 1,
  },
  idRow: {
    marginTop: 2,
    opacity: 0.8,
  },
});


