import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, KeyboardAvoidingView, Platform, Switch, TextInput, Pressable } from 'react-native';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import WebLayout from '@/components/web/WebLayout';
import { ensureDefaultTimeSlotsForGround } from '@/utils/timeSlotsDb';

export default function AddGroundScreen() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    base_price_per_hour: '',
    pitch_type: '',
    ground_size: '',
    capacity: '',
    has_floodlights: false,
    has_parking: false,
    has_changing_rooms: false,
    has_pavilion: false,
    mediaUrls: [''],
  });

  const handleSubmit = async () => {
    if (!user) return;

    if (!formData.name || !formData.address || !formData.city || !formData.state || !formData.pincode || !formData.base_price_per_hour) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      const { data: created, error } = await supabase
        .from('grounds')
        .insert({
          owner_id: user.id,
          name: formData.name,
          description: formData.description || null,
          address: formData.address,
          city: formData.city,
          state: formData.state,
          pincode: formData.pincode,
          base_price_per_hour: parseFloat(formData.base_price_per_hour),
          pitch_type: formData.pitch_type || null,
          ground_size: formData.ground_size || null,
          capacity: formData.capacity ? parseInt(formData.capacity) : null,
          has_floodlights: formData.has_floodlights,
          has_parking: formData.has_parking,
          has_changing_rooms: formData.has_changing_rooms,
          has_pavilion: formData.has_pavilion,
        })
        .select('id')
        .single();

      if (error) throw error;

      // Seed default weekly time-slots for this ground (owner can fine-tune later).
      await ensureDefaultTimeSlotsForGround({
        groundId: created.id,
        pitchType: formData.pitch_type,
        supabaseClient: supabase,
      });

      // Optional: attach image URLs (first image becomes primary).
      const cleaned = (formData.mediaUrls || [])
        .map((u) => String(u ?? '').trim())
        .filter(Boolean);
      if (cleaned.length > 0) {
        const rows = cleaned.slice(0, 8).map((url, index) => ({
          ground_id: created.id as string,
          image_url: url,
          is_primary: index === 0,
          display_order: index,
        }));
        const { error: mediaError } = await supabase
          .from('ground_images')
          .insert(rows);
        if (mediaError) throw mediaError;
      }

      Alert.alert('Success', 'Ground added successfully! It will be visible after admin approval.', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const content = (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Add New Ground</Text>

        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Basic Information</Text>
          <Input
            label="Ground Name *"
            value={formData.name}
            onChangeText={(text) => setFormData({ ...formData, name: text })}
            placeholder="Enter ground name"
          />
          <Input
            label="Description"
            value={formData.description}
            onChangeText={(text) => setFormData({ ...formData, description: text })}
            placeholder="Brief description"
            multiline
            numberOfLines={3}
          />
        </Card>

        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Location</Text>
          <Input
            label="Address *"
            value={formData.address}
            onChangeText={(text) => setFormData({ ...formData, address: text })}
            placeholder="Street address"
          />
          <Input
            label="City *"
            value={formData.city}
            onChangeText={(text) => setFormData({ ...formData, city: text })}
            placeholder="City"
          />
          <Input
            label="State *"
            value={formData.state}
            onChangeText={(text) => setFormData({ ...formData, state: text })}
            placeholder="State"
          />
          <Input
            label="Pincode *"
            value={formData.pincode}
            onChangeText={(text) => setFormData({ ...formData, pincode: text })}
            placeholder="Pincode"
            keyboardType="numeric"
          />
        </Card>

        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Ground Details</Text>
          <Input
            label="Base Price Per Hour (₹) *"
            value={formData.base_price_per_hour}
            onChangeText={(text) => setFormData({ ...formData, base_price_per_hour: text })}
            placeholder="1000"
            keyboardType="decimal-pad"
          />
          <Text style={styles.subLabel}>Type</Text>
          <View style={styles.typeChipsRow}>
            {['Cricket Ground', 'Box Cricket'].map((label) => {
              const active = formData.pitch_type === label;
              return (
                <Pressable
                  key={label}
                  onPress={() => setFormData({ ...formData, pitch_type: label })}
                  style={[styles.typeChip, active && styles.typeChipActive]}
                >
                  <Text style={[styles.typeChipText, active && styles.typeChipTextActive]}>
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <Input
            label="Ground Size"
            value={formData.ground_size}
            onChangeText={(text) => setFormData({ ...formData, ground_size: text })}
            placeholder="e.g., Standard, Large"
          />
          <Input
            label="Capacity"
            value={formData.capacity}
            onChangeText={(text) => setFormData({ ...formData, capacity: text })}
            placeholder="Number of players"
            keyboardType="numeric"
          />
        </Card>

        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Amenities</Text>
          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Floodlights</Text>
            <Switch
              value={formData.has_floodlights}
              onValueChange={(value) => setFormData({ ...formData, has_floodlights: value })}
            />
          </View>
          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Parking</Text>
            <Switch
              value={formData.has_parking}
              onValueChange={(value) => setFormData({ ...formData, has_parking: value })}
            />
          </View>
          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Changing Rooms</Text>
            <Switch
              value={formData.has_changing_rooms}
              onValueChange={(value) => setFormData({ ...formData, has_changing_rooms: value })}
            />
          </View>
          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Pavilion</Text>
            <Switch
              value={formData.has_pavilion}
              onValueChange={(value) => setFormData({ ...formData, has_pavilion: value })}
            />
          </View>
        </Card>

        <Text style={styles.timeSlotsNote}>
          Default hourly time slots for all days will be auto-created from the selected type after
          you add this ground. You can fine-tune availability later from the My Grounds → Edit
          screen.
        </Text>

        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Images</Text>
          <Text style={styles.helperText}>Add 1–8 image URLs for this ground. First image is used as the primary thumbnail.</Text>
          {formData.mediaUrls.map((url, index) => (
            <View key={index} style={styles.mediaRow}>
              <TextInput
                style={[styles.mediaInput]}
                value={url}
                onChangeText={(text) => {
                  const next = [...formData.mediaUrls];
                  next[index] = text;
                  setFormData({ ...formData, mediaUrls: next });
                }}
                placeholder="https://example.com/ground-image.jpg"
              />
              {formData.mediaUrls.length > 1 && (
                <Pressable
                  onPress={() => {
                    const next = [...formData.mediaUrls];
                    next.splice(index, 1);
                    setFormData({ ...formData, mediaUrls: next });
                  }}
                  style={styles.mediaRemove}
                >
                  <Text style={styles.mediaRemoveText}>Remove</Text>
                </Pressable>
              )}
            </View>
          ))}
          {formData.mediaUrls.length < 8 && (
            <Pressable
              onPress={() =>
                setFormData({
                  ...formData,
                  mediaUrls: [...formData.mediaUrls, ''],
                })
              }
              style={styles.mediaAddButton}
            >
              <Text style={styles.mediaAddText}>Add another image</Text>
            </Pressable>
          )}
        </Card>

        <Button
          title="Add Ground"
          onPress={handleSubmit}
          loading={loading}
          fullWidth
          style={styles.submitButton}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );

  if (Platform.OS === 'web') {
    return <WebLayout>{content}</WebLayout>;
  }

  return content;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  scrollContent: {
    padding: 16,
    paddingTop: 64,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#212121',
    marginBottom: 24,
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#212121',
    marginBottom: 16,
  },
  subLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  helperText: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 8,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  switchLabel: {
    fontSize: 16,
    color: '#333',
  },
  typeChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  typeChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  typeChipActive: {
    borderColor: '#dc8d3c',
    backgroundColor: 'rgba(220,141,60,0.10)',
  },
  typeChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
  },
  typeChipTextActive: {
    color: '#dc8d3c',
  },
  mediaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  mediaInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
    fontSize: 14,
  },
  mediaRemove: {
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  mediaRemoveText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#B91C1C',
  },
  mediaAddButton: {
    marginTop: 4,
  },
  mediaAddText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2563EB',
  },
  timeSlotsNote: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
    marginBottom: 24,
  },
  submitButton: {
    marginTop: 8,
    marginBottom: 32,
  },
});
