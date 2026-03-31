import React, { useState } from 'react';
import { View, Text, StyleSheet, Platform, ScrollView, TextInput, Alert } from 'react-native';
import WebLayout from '@/components/web/WebLayout';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

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

          <View style={styles.formRow}>
            <Text style={styles.label}>Amount (₹)</Text>
            <TextInput
              value={amount}
              onChangeText={setAmount}
              keyboardType="numeric"
              placeholder="Enter amount to withdraw"
              style={styles.input}
            />
          </View>

          <View style={styles.formRow}>
            <Text style={styles.label}>UPI / bank details</Text>
            <TextInput
              value={accountDetails}
              onChangeText={setAccountDetails}
              placeholder="Enter UPI ID or bank account details"
              style={[styles.input, styles.multilineInput]}
              multiline
            />
          </View>

          <View style={styles.actionsRow}>
            <Button
              title={submitting ? 'Requesting...' : 'Request withdrawal'}
              onPress={handleWithdraw}
              loading={submitting}
              disabled={submitting}
            />
          </View>
        </Card>

        <Card style={[styles.panel, { marginTop: 16 }]}>
          <Text style={styles.sectionTitle}>Add bank details</Text>
          <Text style={styles.sectionSubtitle}>
            Save your payout account details so we can use them for future withdrawals.
          </Text>

          <View style={styles.formRow}>
            <Text style={styles.label}>Bank name</Text>
            <TextInput
              value={bankName}
              onChangeText={setBankName}
              placeholder="Enter bank name"
              style={styles.input}
            />
          </View>

          <View style={styles.formRow}>
            <Text style={styles.label}>Account number</Text>
            <TextInput
              value={accountNumber}
              onChangeText={setAccountNumber}
              placeholder="Enter account number"
              style={styles.input}
              keyboardType="number-pad"
            />
          </View>

          <View style={styles.formRow}>
            <Text style={styles.label}>IFSC code</Text>
            <TextInput
              value={ifsc}
              onChangeText={setIfsc}
              placeholder="Enter IFSC"
              style={styles.input}
              autoCapitalize="characters"
            />
          </View>

          <View style={styles.formRow}>
            <Text style={styles.label}>UPI ID (optional)</Text>
            <TextInput
              value={upiId}
              onChangeText={setUpiId}
              placeholder="Enter UPI ID"
              style={styles.input}
              autoCapitalize="none"
            />
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
            />
          </View>
        </Card>
      </View>
    </ScrollView>
  );
}

export default function OwnerSettingsScreen() {
  if (Platform.OS === 'web') {
    return (
      <WebLayout>
        <OwnerSettingsInner />
      </WebLayout>
    );
  }

  return <OwnerSettingsInner />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
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
    maxWidth: 1200,
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
  },
  panel: {
    paddingVertical: 16,
    paddingHorizontal: 16,
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
    color: '#111827',
    marginBottom: 6,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 16,
  },
  formRow: {
    marginBottom: 12,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4B5563',
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: Platform.OS === 'web' ? 8 : 10,
    backgroundColor: '#FFFFFF',
    fontSize: 14,
  },
  multilineInput: {
    minHeight: 72,
    textAlignVertical: 'top',
  },
  actionsRow: {
    marginTop: 8,
    flexDirection: 'row',
    justifyContent: 'flex-start',
  },
});

