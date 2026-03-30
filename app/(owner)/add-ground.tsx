import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, KeyboardAvoidingView, Platform, Switch } from 'react-native';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
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

      await ensureDefaultTimeSlotsForGround({
        groundId: created.id,
        pitchType: formData.pitch_type,
        supabaseClient: supabase,
      });

      Alert.alert('Success', 'Ground added successfully! It will be visible after admin approval.', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
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
          <Input
            label="Pitch Type"
            value={formData.pitch_type}
            onChangeText={(text) => setFormData({ ...formData, pitch_type: text })}
            placeholder="e.g., Turf, Concrete, Natural"
          />
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
  submitButton: {
    marginTop: 8,
    marginBottom: 32,
  },
});
