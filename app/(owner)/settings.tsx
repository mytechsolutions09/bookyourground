import React, { useState } from 'react';
import { View, Text, StyleSheet, Platform, ScrollView, TextInput, Alert } from 'react-native';
import WebLayout from '@/components/web/WebLayout';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import MobileAppNavbar from '@/components/MobileAppNavbar';

const IS_WEB = Platform.OS === 'web';

function OwnerSettingsInner() {
  const { user } = useAuth();
  const [amount, setAmount] = useState('');
  const [accountDetails, setAccountDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [ifsc, setIfsc] = useState('');
  const [upiId, setUpiId] = useState('');
  const [savingBank, setSavingBank] = useState(false);

  const handleWithdraw = async () => {
    if (!user) {
      Alert.alert('Not signed in', 'Please sign in to request a withdrawal.');
      return;
    }

    const parsedAmount = Number(amount);
    if (!parsedAmount || parsedAmount <= 0) {
      Alert.alert('Invalid amount', 'Enter a valid withdrawal amount.');
      return;
    }

    if (!accountDetails.trim()) {
      Alert.alert('Missing details', 'Enter your UPI ID or bank details.');
      return;
    }

    try {
      setSubmitting(true);
      // This assumes a "withdrawals" table exists; if not, this will just log an error.
      const { error } = await supabase.from('withdrawals').insert({
        owner_id: user.id,
        amount: parsedAmount,
        account_details: accountDetails.trim(),
        status: 'pending',
      });

      if (error) {
        console.error('Error creating withdrawal request', error);
        Alert.alert('Error', 'Could not create withdrawal request. Please try again later.');
        return;
      }

      Alert.alert('Withdrawal requested', 'We have received your withdrawal request.');
      setAmount('');
      setAccountDetails('');
    } catch (e) {
      console.error('Unexpected withdrawal error', e);
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.inner}>
        <Card style={styles.panel}>
          <Text style={styles.sectionTitle}>Withdraw earnings</Text>
          <Text style={styles.sectionSubtitle}>
            Request a payout of your available earnings. Actual transfers are processed manually.
          </Text>

          <View style={styles.formRowHorizontal}>
            <View style={styles.formCol}>
              <Text style={styles.label}>Amount (₹)</Text>
              <TextInput
                value={amount}
                onChangeText={setAmount}
                keyboardType="numeric"
                placeholder="Enter amount to withdraw"
                style={styles.input}
              />
            </View>

            <View style={styles.formCol}>
              <Text style={styles.label}>UPI / bank details</Text>
              <TextInput
                value={accountDetails}
                onChangeText={setAccountDetails}
                placeholder="Enter UPI ID or bank account details"
                style={[styles.input, styles.multilineInput]}
                multiline
              />
            </View>
          </View>

          <View style={styles.actionsRow}>
            <Button
              title={submitting ? 'Requesting...' : 'Request withdrawal'}
              onPress={handleWithdraw}
              loading={submitting}
              disabled={submitting}
              style={styles.submitButton}
            />
          </View>
        </Card>

        <Card style={[styles.panel, { marginTop: 16 }]}>
          <Text style={styles.sectionTitle}>Add bank details</Text>
          <Text style={styles.sectionSubtitle}>
            Save your payout account details so we can use them for future withdrawals.
          </Text>

          <View style={styles.formRowHorizontal}>
            <View style={styles.formCol}>
              <Text style={styles.label}>Bank name</Text>
              <TextInput
                value={bankName}
                onChangeText={setBankName}
                placeholder="Enter bank name"
                style={styles.input}
              />
            </View>
            <View style={styles.formCol}>
              <Text style={styles.label}>Account number</Text>
              <TextInput
                value={accountNumber}
                onChangeText={setAccountNumber}
                placeholder="Enter account number"
                style={styles.input}
                keyboardType="number-pad"
              />
            </View>
          </View>

          <View style={styles.formRowHorizontal}>
            <View style={styles.formCol}>
              <Text style={styles.label}>IFSC code</Text>
              <TextInput
                value={ifsc}
                onChangeText={setIfsc}
                placeholder="Enter IFSC"
                style={styles.input}
                autoCapitalize="characters"
              />
            </View>
            <View style={styles.formCol}>
              <Text style={styles.label}>UPI ID (optional)</Text>
              <TextInput
                value={upiId}
                onChangeText={setUpiId}
                placeholder="Enter UPI ID"
                style={styles.input}
                autoCapitalize="none"
              />
            </View>
          </View>

          <View style={styles.actionsRow}>
            <Button
              title={savingBank ? 'Saving...' : 'Save bank details'}
              onPress={async () => {
                if (!user) {
                  Alert.alert('Not signed in', 'Please sign in to save bank details.');
                  return;
                }

                if (!bankName.trim() || !accountNumber.trim() || !ifsc.trim()) {
                  Alert.alert('Missing details', 'Bank name, account number and IFSC are required.');
                  return;
                }

                try {
                  setSavingBank(true);
                  // This assumes an "owner_bank_details" table exists.
                  const { error } = await supabase
                    .from('owner_bank_details')
                    .upsert(
                      {
                        owner_id: user.id,
                        bank_name: bankName.trim(),
                        account_number: accountNumber.trim(),
                        ifsc: ifsc.trim(),
                        upi_id: upiId.trim() || null,
                      },
                      { onConflict: 'owner_id' },
                    );

                  if (error) {
                    console.error('Error saving bank details', error);
                    Alert.alert('Error', 'Could not save bank details. Please try again later.');
                    return;
                  }

                  Alert.alert('Saved', 'Your bank details have been saved.');
                } catch (e) {
                  console.error('Unexpected bank details error', e);
                  Alert.alert('Error', 'Something went wrong. Please try again.');
                } finally {
                  setSavingBank(false);
                }
              }}
              loading={savingBank}
              disabled={savingBank}
              style={styles.submitButton}
            />
          </View>
        </Card>
      </View>
    </ScrollView>
  );
}
export default function OwnerSettingsScreen() {
  if (IS_WEB) {
    return (
      <WebLayout noCard>
        <OwnerSettingsInner />
      </WebLayout>
    );
  }

  return (
    <View style={styles.nativeRoot}>
      <MobileAppNavbar title="Ground owner settings" titleColor="#00ea6b" />
      <OwnerSettingsInner />
    </View>
  );
}

const styles = StyleSheet.create({
  nativeRoot: {
    flex: 1,
    backgroundColor: '#043529',
  },
  container: {
    flex: 1,
    backgroundColor: IS_WEB ? '#F5F5F5' : '#043529',
    padding: 16,
    ...Platform.select({
      web: {
        paddingLeft: 0,
        paddingRight: 0,
        paddingTop: 0,
      },
    }),
  },
  inner: {
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 24,
  },
  panel: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: IS_WEB ? '#FFFFFF' : '#06392e',
    borderColor: IS_WEB ? '#E5E7EB' : 'rgba(0,234,107,0.15)',
    borderWidth: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: IS_WEB ? '#111827' : '#FFFFFF',
    marginBottom: 6,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: IS_WEB ? '#6B7280' : '#9ca3af',
    marginBottom: 16,
  },
  formRow: {
    marginBottom: 12,
  },
  formRowHorizontal: {
    marginBottom: 12,
    flexDirection: 'row',
    gap: 12,
  },
  formCol: {
    flex: 1,
  },
  label: {
    fontSize: 13,
    fontWeight: '300',
    color: IS_WEB ? '#4B5563' : '#9ca3af',
    fontFamily: IS_WEB ? '"Inter", sans-serif' : undefined,
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: IS_WEB ? '#D1D5DB' : 'rgba(0,234,107,0.2)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: Platform.OS === 'web' ? 8 : 10,
    backgroundColor: IS_WEB ? '#FFFFFF' : '#043529',
    fontSize: 14,
    fontWeight: '300',
    color: IS_WEB ? '#000' : '#FFF',
    fontFamily: IS_WEB ? '"Inter", sans-serif' : undefined,
  },
  multilineInput: {
    minHeight: 72,
    textAlignVertical: 'top',
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
  },
  submitButton: {
    backgroundColor: '#01b854',
    borderWidth: 0,
  },
});

