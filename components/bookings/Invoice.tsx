import React from 'react';
import { View, Text, StyleSheet, Platform, ScrollView, Image } from 'react-native';

export interface InvoiceItem {
  id: string;
  description: string;
  amount: number;
}

export interface PaymentEvent {
  status: string;
  date: string;
}

export interface InvoiceProps {
  billNumber: string;
  dateIssued: string;
  billingCycleText?: string;
  cycleDateText?: string;
  
  companyName?: string;
  companyAddress?: string[];
  companyTaxId?: string;
  companyLogoUrl?: string;
  
  totalDue: number;
  currency?: string;
  
  overviewTitle: string;
  items: InvoiceItem[];
  creditAmount?: number;
  subtotal: number;
  taxLabel: string;
  taxAmount: number;
  total: number;
  
  accountName: string;
  accountEmail: string;
  accountPhone?: string;
  accountAddress: string[];
  
  paymentEvents: PaymentEvent[];
  
  containerStyle?: any;
}

const formatMoney = (amount: number, currency: string = 'INR') => {
  return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;
};

export default function Invoice({
  billNumber,
  dateIssued,
  billingCycleText,
  cycleDateText,
  companyName = 'BookYourGround',
  companyAddress = [
    'Purple Plus',
    'support@bookyourground.com',
    'https://bookyourground.com'
  ],
  companyTaxId,
  companyLogoUrl = 'https://nwvarvvyhjkvtgijwfkc.supabase.co/storage/v1/object/public/Assets/logo.png',
  totalDue,
  currency = 'INR',
  overviewTitle,
  items,
  creditAmount = 0,
  subtotal,
  taxLabel,
  taxAmount,
  total,
  accountName,
  accountEmail,
  accountPhone,
  accountAddress,
  paymentEvents,
  containerStyle,
}: InvoiceProps) {
  return (
    <ScrollView style={[styles.container, containerStyle]} contentContainerStyle={styles.contentContainer}>
      {/* Header Section */}
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <Text style={styles.billTitle}>
            Bill <Text style={styles.billNumber}>#{billNumber}</Text>
          </Text>
          <View style={styles.headerSubtitleRow}>
            <Text style={styles.dateIssued}>Date issued {dateIssued}</Text>
            {(billingCycleText || cycleDateText) && (
              <View style={styles.verticalDivider} />
            )}
            <View>
              {billingCycleText && <Text style={styles.cycleText}>{billingCycleText}</Text>}
              {cycleDateText && <Text style={styles.cycleText}>{cycleDateText}</Text>}
            </View>
          </View>
        </View>
        <View style={styles.headerRight}>
          {companyLogoUrl ? (
            <Image source={{ uri: companyLogoUrl }} style={styles.companyLogoImage} resizeMode="contain" />
          ) : (
            <Text style={styles.companyLogoText}>{companyName}</Text>
          )}
          <View style={styles.companyInfoContainer}>
            <Text style={styles.companyInfoText}>{companyName}</Text>
            {companyAddress.map((line, index) => (
              <Text key={index} style={styles.companyInfoText}>{line}</Text>
            ))}
            {companyTaxId && (
              <Text style={styles.companyInfoText}>{companyTaxId}</Text>
            )}
          </View>
        </View>
      </View>

      {/* Total Due Section */}
      <View style={styles.totalDueSection}>
        <Text style={styles.sectionTitleSmall}>TOTAL DUE</Text>
        <Text style={styles.totalDueAmount}>
          ₹{totalDue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{' '}
          <Text style={styles.totalDueCurrency}>{currency}</Text>
        </Text>
      </View>

      {/* Overview Section */}
      <View style={styles.overviewSection}>
        <Text style={styles.sectionTitleSmall}>OVERVIEW</Text>
        <Text style={styles.overviewTitle}>{overviewTitle}</Text>
        
        <View style={styles.itemsContainer}>
          {items.map((item) => (
            <View key={item.id} style={styles.itemRow}>
              <Text style={styles.itemDescription}>{item.description}</Text>
              <Text style={styles.itemAmount}>{formatMoney(item.amount, currency)}</Text>
            </View>
          ))}
          
          {creditAmount > 0 && (
            <View style={styles.itemRow}>
              <Text style={styles.itemDescriptionBold}>Credit</Text>
              <Text style={styles.itemAmount}>{formatMoney(creditAmount, currency)}</Text>
            </View>
          )}
        </View>

        <View style={styles.totalsContainer}>
          <View style={styles.totalsRow}>
            <Text style={styles.totalsLabel}>Subtotal</Text>
            <Text style={styles.totalsValue}>{formatMoney(subtotal, currency)}</Text>
          </View>
          <View style={styles.totalsRow}>
            <Text style={styles.totalsLabel}>{taxLabel}</Text>
            <Text style={styles.totalsValue}>{formatMoney(taxAmount, currency)}</Text>
          </View>
          <View style={styles.grandTotalRow}>
            <Text style={styles.grandTotalLabel}>Total</Text>
            <Text style={styles.grandTotalValue}>{formatMoney(total, currency)}</Text>
          </View>
        </View>
      </View>

      {/* Footer Details Section */}
      <View style={styles.footerSection}>
        <View style={styles.footerColumn}>
          <Text style={styles.footerTitle}>Account billed</Text>
          <Text style={styles.footerText}>{accountName}</Text>
          <Text style={styles.footerText}>{accountEmail}</Text>
          {accountPhone && <Text style={styles.footerText}>{accountPhone}</Text>}
        </View>
        
        <View style={styles.footerColumn}>
          <Text style={[styles.footerText, { marginTop: 22 }]}></Text>
          {accountAddress.map((line, index) => (
            <Text key={index} style={styles.footerText}>{line}</Text>
          ))}
        </View>

        <View style={styles.footerColumn}>
          <Text style={styles.footerTitle}>Payment status</Text>
          {paymentEvents.map((event, index) => (
            <Text key={index} style={styles.footerText}>
              <Text style={styles.paymentStatusBold}>{event.status}</Text> {event.date}
            </Text>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  contentContainer: {
    padding: 40,
    maxWidth: 900,
    width: '100%',
    alignSelf: 'center',
  },
  headerRow: {
    flexDirection: Platform.OS === 'web' && window.innerWidth > 600 ? 'row' : 'column',
    justifyContent: 'space-between',
    marginBottom: 40,
  },
  headerLeft: {
    flex: 1,
    marginBottom: Platform.OS === 'web' && window.innerWidth > 600 ? 0 : 24,
  },
  billTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 8,
  },
  billNumber: {
    fontWeight: '800',
  },
  headerSubtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateIssued: {
    fontSize: 14,
    color: '#666666',
  },
  verticalDivider: {
    width: 1,
    height: 16,
    backgroundColor: '#CCCCCC',
    marginHorizontal: 12,
  },
  cycleText: {
    fontSize: 14,
    color: '#333333',
  },
  headerRight: {
    alignItems: Platform.OS === 'web' && window.innerWidth > 600 ? 'flex-end' : 'flex-start',
  },
  companyLogoImage: {
    width: 180,
    height: 60,
    marginBottom: 16,
  },
  companyLogoText: {
    fontSize: 28,
    fontWeight: '800',
    color: '#000000',
    marginBottom: 16,
  },
  companyInfoContainer: {
    alignItems: Platform.OS === 'web' && window.innerWidth > 600 ? 'flex-end' : 'flex-start',
  },
  companyInfoText: {
    fontSize: 12,
    color: '#333333',
    marginBottom: 2,
  },
  totalDueSection: {
    marginBottom: 40,
  },
  sectionTitleSmall: {
    fontSize: 12,
    fontWeight: '700',
    color: '#666666',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  totalDueAmount: {
    fontSize: 28,
    fontWeight: '800',
    color: '#000000',
  },
  totalDueCurrency: {
    fontSize: 16,
    fontWeight: '700',
  },
  overviewSection: {
    marginBottom: 40,
  },
  overviewTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 20,
  },
  itemsContainer: {
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#EEEEEE',
    paddingVertical: 16,
    marginBottom: 16,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  itemDescription: {
    fontSize: 14,
    color: '#333333',
    flex: 1,
    paddingRight: 16,
  },
  itemDescriptionBold: {
    fontSize: 14,
    fontWeight: '700',
    color: '#000000',
    flex: 1,
  },
  itemAmount: {
    fontSize: 14,
    color: '#333333',
    textAlign: 'right',
  },
  totalsContainer: {
    alignItems: 'flex-end',
  },
  totalsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    width: '100%',
    maxWidth: 400,
    marginBottom: 8,
  },
  totalsLabel: {
    fontSize: 14,
    color: '#666666',
    marginRight: 40,
    width: 200,
    textAlign: 'right',
  },
  totalsValue: {
    fontSize: 14,
    color: '#333333',
    width: 120,
    textAlign: 'right',
  },
  grandTotalRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    width: '100%',
    maxWidth: 400,
    marginTop: 8,
    paddingTop: 16,
  },
  grandTotalLabel: {
    fontSize: 16,
    fontWeight: '800',
    color: '#000000',
    marginRight: 40,
    width: 200,
    textAlign: 'right',
  },
  grandTotalValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#000000',
    width: 120,
    textAlign: 'right',
  },
  footerSection: {
    flexDirection: Platform.OS === 'web' && window.innerWidth > 600 ? 'row' : 'column',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderColor: '#EEEEEE',
    paddingTop: 32,
    gap: 24,
  },
  footerColumn: {
    flex: 1,
  },
  footerTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 8,
  },
  footerText: {
    fontSize: 13,
    color: '#333333',
    marginBottom: 4,
    lineHeight: 18,
  },
  paymentStatusBold: {
    fontWeight: '700',
    color: '#000000',
  },
});
