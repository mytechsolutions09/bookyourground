import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Platform,
  Linking,
  TextInput,
  TouchableOpacity,
  Alert,
} from 'react-native';
import WebLayout from '@/components/web/WebLayout';
import SiteFooter from '@/components/web/SiteFooter';
import { supabase } from '@/lib/supabase';

export default function ContactScreen() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [role, setRole] = useState<'user' | 'ground_owner' | ''>('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!role) {
      Alert.alert('Select type', 'Please select whether you are a User or Ground owner.');
      return;
    }

    if (!name.trim() || !email.trim() || !message.trim()) {
      Alert.alert('Missing details', 'Please fill in your name, email, and message.');
      return;
    }

    try {
      setSubmitting(true);

      const { error } = await supabase.from('contact_queries').insert({
        role,
        name: name.trim(),
        email: email.trim(),
        subject: subject.trim() || null,
        message: message.trim(),
      });

      if (error) {
        console.error('Error saving contact query', error);
        Alert.alert(
          'Could not send message',
          'Something went wrong while sending your message. Please try again in a moment.'
        );
        return;
      }

      const to = 'invirtualcoin@gmail.com';
      const mailSubject = subject.trim()
        ? `[Book my ground] ${subject.trim()}`
        : '[Book my ground] Support request';
      const bodyLines = [
        `Type: ${role === 'ground_owner' ? 'Ground owner' : 'User'}`,
        `Name: ${name.trim()}`,
        `Email: ${email.trim()}`,
        '',
        'Message:',
        message.trim(),
      ];
      const body = encodeURIComponent(bodyLines.join('\n'));
      const url = `mailto:${to}?subject=${encodeURIComponent(mailSubject)}&body=${body}`;

      Linking.openURL(url).catch(() => {
        Alert.alert(
          'Message saved',
          'Your message was sent to support, but we could not open your email app.'
        );
      });

      Alert.alert('Message sent', 'Your message has been sent to support.');
      setName('');
      setEmail('');
      setSubject('');
      setMessage('');
      setRole('');
    } finally {
      setSubmitting(false);
    }
  };

  const content = (
    <View style={styles.page}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Text style={styles.title}>Contact</Text>
          <Text style={styles.subtitle}>
            Have a question about bookings or listing your ground? Reach out to us.
          </Text>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Email support</Text>
            <Text
              style={styles.link}
              onPress={() => Linking.openURL('mailto:support@bookyourground.in')}
            >
              support@bookyourground.in
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>For ground owners</Text>
            <Text style={styles.paragraph}>
              If you want to list your ground or need help managing availability and
              bookings, email us with your ground name, city, and contact details. Our
              team will get back to you with next steps.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Response time</Text>
            <Text style={styles.paragraph}>
              We typically respond within 1–2 business days. During weekends and holidays
              it may take a little longer.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Send us a message</Text>
            <Text style={styles.paragraph}>
              Use this form to send a message directly to the support team (super admin).
            </Text>

            <View style={styles.formRow}>
              <View style={styles.formColumn}>
                <Text style={styles.formLabel}>I am a</Text>
                <View style={styles.roleRow}>
                  <TouchableOpacity
                    style={[
                      styles.roleChip,
                      role === 'user' && styles.roleChipActive,
                    ]}
                    onPress={() => setRole('user')}
                  >
                    <Text
                      style={[
                        styles.roleChipText,
                        role === 'user' && styles.roleChipTextActive,
                      ]}
                    >
                      User
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.roleChip,
                      role === 'ground_owner' && styles.roleChipActive,
                    ]}
                    onPress={() => setRole('ground_owner')}
                  >
                    <Text
                      style={[
                        styles.roleChipText,
                        role === 'ground_owner' && styles.roleChipTextActive,
                      ]}
                    >
                      Ground owner
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            <View style={styles.formRow}>
              <View style={styles.formColumn}>
                <Text style={styles.formLabel}>Name</Text>
                <TextInput
                  value={name}
                  onChangeText={setName}
                  style={styles.input}
                  placeholder="Your name"
                  placeholderTextColor="#9CA3AF"
                />
              </View>

              <View style={styles.formColumn}>
                <Text style={styles.formLabel}>Email</Text>
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  style={styles.input}
                  placeholder="you@example.com"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
            </View>

            <View style={styles.formField}>
              <Text style={styles.formLabel}>Subject (optional)</Text>
              <TextInput
                value={subject}
                onChangeText={setSubject}
                style={styles.input}
                placeholder="Booking help, owner onboarding, etc."
                placeholderTextColor="#9CA3AF"
              />
            </View>

            <View style={styles.formField}>
              <Text style={styles.formLabel}>Message</Text>
              <TextInput
                value={message}
                onChangeText={setMessage}
                style={[styles.input, styles.textarea]}
                placeholder="Share as much detail as possible so we can help quickly."
                placeholderTextColor="#9CA3AF"
                multiline
                numberOfLines={5}
                textAlignVertical="top"
              />
            </View>

            <TouchableOpacity
              disabled={submitting}
              onPress={handleSubmit}
              style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
            >
              <Text style={styles.submitButtonText}>
                {submitting ? 'Opening email…' : 'Send message to support'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <SiteFooter />
      </ScrollView>
    </View>
  );

  if (Platform.OS === 'web') {
    return <WebLayout>{content}</WebLayout>;
  }

  return content;
}

const styles = {
  page: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  content: {
    padding: 16,
    paddingTop: Platform.OS === 'web' ? 32 : 64,
    paddingBottom: 32,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    maxWidth: 900,
    alignSelf: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  },
  subtitle: {
    marginTop: 6,
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
  },
  section: {
    marginTop: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  paragraph: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20,
  },
  link: {
    fontSize: 14,
    color: '#2563EB',
  },
  formRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
    marginBottom: 8,
  },
  formColumn: {
    flex: 1,
  },
  formField: {
    marginTop: 12,
  },
  formLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: Platform.OS === 'web' ? 8 : 10,
    fontSize: 14,
    color: '#111827',
    backgroundColor: '#FFFFFF',
  },
  textarea: {
    minHeight: 100,
  },
  submitButton: {
    marginTop: 16,
    backgroundColor: '#dc8d3c',
    borderRadius: 999,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  roleRow: {
    flexDirection: 'row',
    gap: 8,
  },
  roleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFFFFF',
  },
  roleChipActive: {
    backgroundColor: '#2b2f4b',
    borderColor: '#2b2f4b',
  },
  roleChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
  },
  roleChipTextActive: {
    color: '#FFFFFF',
  },
} as const;

