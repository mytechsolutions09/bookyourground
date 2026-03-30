import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, TouchableOpacity, Platform, Modal, Pressable, ScrollView, TextInput, Switch, Alert } from 'react-native';
import { router } from 'expo-router';
import { Plus } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { GroundWithImages } from '@/types';
import GroundCard from '@/components/grounds/GroundCard';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import TimeSlotsEditor, { TimeSlotsEditorHandle } from '@/components/availability/TimeSlotsEditor';

export default function OwnerGroundsScreen() {
  const { user } = useAuth();
  const [grounds, setGrounds] = useState<GroundWithImages[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGroundId, setSelectedGroundId] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [savingAvailability, setSavingAvailability] = useState(false);
  const [editForm, setEditForm] = useState<any>(null);
  const availabilityRef = React.useRef<TimeSlotsEditorHandle | null>(null);

  useEffect(() => {
    if (user) {
      loadGrounds();
    }
  }, [user]);

  const loadGrounds = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('grounds')
        .select(`
          *,
          ground_images(*),
          reviews(rating)
        `)
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setGrounds(data || []);
    } catch (error) {
      console.error('Error loading grounds:', error);
    } finally {
      setLoading(false);
    }
  };

  const startEditGround = (ground: GroundWithImages) => {
    setEditForm({
      id: ground.id,
      name: ground.name ?? '',
      description: (ground.description ?? '') as string,
      address: ground.address ?? '',
      city: ground.city ?? '',
      state: ground.state ?? '',
      pincode: ground.pincode ?? '',
      base_price_per_hour: ground.base_price_per_hour != null ? String(ground.base_price_per_hour) : '',
      pitch_type: (ground.pitch_type ?? '') as string,
      ground_size: (ground.ground_size ?? '') as string,
      capacity: ground.capacity != null ? String(ground.capacity) : '',
      has_floodlights: !!(ground as any).has_floodlights,
      has_parking: !!(ground as any).has_parking,
      has_changing_rooms: !!(ground as any).has_changing_rooms,
      has_pavilion: !!(ground as any).has_pavilion,
      active: !!(ground as any).active,
    });
    setEditOpen(true);
  };

  const closeEditModal = () => {
    setEditOpen(false);
    setEditForm(null);
  };

  const parseNullableFloat = (value: string): number | null => {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const n = Number(trimmed);
    return Number.isFinite(n) ? n : null;
  };

  const parseNullableInt = (value: string): number | null => {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const n = parseInt(trimmed, 10);
    return Number.isFinite(n) ? n : null;
  };

  const handleSaveEdit = async () => {
    if (!editForm?.id) return;
    try {
      setEditLoading(true);
      const payload: any = {
        name: String(editForm.name ?? '').trim(),
        description: String(editForm.description ?? '').trim() || null,
        address: String(editForm.address ?? '').trim(),
        city: String(editForm.city ?? '').trim(),
        state: String(editForm.state ?? '').trim(),
        pincode: String(editForm.pincode ?? '').trim(),
        base_price_per_hour: parseNullableFloat(String(editForm.base_price_per_hour ?? '')) ?? 0,
        pitch_type: String(editForm.pitch_type ?? '').trim() || null,
        ground_size: String(editForm.ground_size ?? '').trim() || null,
        capacity: parseNullableInt(String(editForm.capacity ?? '')),
        has_floodlights: !!editForm.has_floodlights,
        has_parking: !!editForm.has_parking,
        has_changing_rooms: !!editForm.has_changing_rooms,
        has_pavilion: !!editForm.has_pavilion,
        active: !!editForm.active,
      };

      const { error } = await supabase
        .from('grounds')
        .update(payload)
        .eq('id', editForm.id);
      if (error) throw error;

      setSavingAvailability(true);
      const ok = await availabilityRef.current?.save?.();
      setSavingAvailability(false);
      if (ok === false) return;

      closeEditModal();
      loadGrounds();
    } catch (e: any) {
      console.error('Error saving ground edit (owner):', e);
      Alert.alert('Error', e?.message ?? 'Failed to save ground');
    } finally {
      setEditLoading(false);
      setSavingAvailability(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>My Grounds</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => router.push('/(owner)/add-ground')}
        >
          <Plus size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={grounds}
        renderItem={({ item }) => (
          <View>
            <GroundCard
              ground={item}
              onPress={() =>
                setSelectedGroundId((prev) => (prev === item.id ? null : item.id))
              }
              showBookingSchedule
            />

            {selectedGroundId === item.id ? (
              <Card style={styles.editorCard}>
                <Text style={styles.editorTitle}>Actions</Text>
                <View style={styles.actionsRow}>
                  <Button
                    title="Edit Ground"
                    onPress={() => startEditGround(item)}
                    variant="primary"
                    size="small"
                    style={{ flex: 1 }}
                  />
                  <Button
                    title="View details"
                    onPress={() => router.push(`/grounds/${item.id}`)}
                    variant="outline"
                    size="small"
                    style={{ flex: 1 }}
                  />
                </View>
                <Button
                  title="Manage bookings"
                  onPress={() => router.push('/(owner)/bookings')}
                  variant="outline"
                  size="small"
                  fullWidth
                  style={styles.viewDetailsButton}
                />
              </Card>
            ) : null}
          </View>
        )}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={loadGrounds} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>You haven't added any grounds yet</Text>
            <Button
              title="Add Your First Ground"
              onPress={() => router.push('/(owner)/add-ground')}
              style={styles.emptyButton}
            />
          </View>
        }
      />

      <Modal
        transparent
        visible={editOpen && !!editForm?.id}
        animationType="fade"
        onRequestClose={closeEditModal}
      >
        <Pressable style={styles.modalOverlay} onPress={closeEditModal} />
        <View style={styles.modalWrap}>
          <Card style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Ground</Text>
              <Button title="Close" onPress={closeEditModal} variant="outline" size="small" />
            </View>

            <ScrollView style={styles.modalScroll} keyboardShouldPersistTaps="handled">
              <TextInput
                style={styles.formInput}
                value={String(editForm?.name ?? '')}
                onChangeText={(t) => setEditForm((p: any) => ({ ...p, name: t }))}
                placeholder="Name"
              />
              <TextInput
                style={styles.formInput}
                value={String(editForm?.description ?? '')}
                onChangeText={(t) => setEditForm((p: any) => ({ ...p, description: t }))}
                placeholder="Description"
              />
              <TextInput
                style={styles.formInput}
                value={String(editForm?.address ?? '')}
                onChangeText={(t) => setEditForm((p: any) => ({ ...p, address: t }))}
                placeholder="Address"
              />
              <View style={styles.formRow2}>
                <TextInput
                  style={[styles.formInput, styles.formInputHalf]}
                  value={String(editForm?.city ?? '')}
                  onChangeText={(t) => setEditForm((p: any) => ({ ...p, city: t }))}
                  placeholder="City"
                />
                <TextInput
                  style={[styles.formInput, styles.formInputHalf]}
                  value={String(editForm?.state ?? '')}
                  onChangeText={(t) => setEditForm((p: any) => ({ ...p, state: t }))}
                  placeholder="State"
                />
              </View>
              <View style={styles.formRow2}>
                <TextInput
                  style={[styles.formInput, styles.formInputHalf]}
                  value={String(editForm?.pincode ?? '')}
                  onChangeText={(t) => setEditForm((p: any) => ({ ...p, pincode: t }))}
                  placeholder="Pincode"
                />
                <TextInput
                  style={[styles.formInput, styles.formInputHalf]}
                  value={String(editForm?.base_price_per_hour ?? '')}
                  onChangeText={(t) => setEditForm((p: any) => ({ ...p, base_price_per_hour: t }))}
                  placeholder="Price/hr"
                  keyboardType="numeric"
                />
              </View>
              <TextInput
                style={styles.formInput}
                value={String(editForm?.pitch_type ?? '')}
                onChangeText={(t) => setEditForm((p: any) => ({ ...p, pitch_type: t }))}
                placeholder="Type (Cricket Ground / Box Cricket)"
              />
              <TextInput
                style={styles.formInput}
                value={String(editForm?.ground_size ?? '')}
                onChangeText={(t) => setEditForm((p: any) => ({ ...p, ground_size: t }))}
                placeholder="Ground size"
              />
              <TextInput
                style={styles.formInput}
                value={String(editForm?.capacity ?? '')}
                onChangeText={(t) => setEditForm((p: any) => ({ ...p, capacity: t }))}
                placeholder="Capacity"
                keyboardType="numeric"
              />

              <View style={styles.switchRow}>
                <Text style={styles.switchLabel}>Floodlights</Text>
                <Switch
                  value={!!editForm?.has_floodlights}
                  onValueChange={(v) => setEditForm((p: any) => ({ ...p, has_floodlights: v }))}
                />
              </View>
              <View style={styles.switchRow}>
                <Text style={styles.switchLabel}>Parking</Text>
                <Switch
                  value={!!editForm?.has_parking}
                  onValueChange={(v) => setEditForm((p: any) => ({ ...p, has_parking: v }))}
                />
              </View>
              <View style={styles.switchRow}>
                <Text style={styles.switchLabel}>Changing Rooms</Text>
                <Switch
                  value={!!editForm?.has_changing_rooms}
                  onValueChange={(v) =>
                    setEditForm((p: any) => ({ ...p, has_changing_rooms: v }))
                  }
                />
              </View>
              <View style={styles.switchRow}>
                <Text style={styles.switchLabel}>Pavilion</Text>
                <Switch
                  value={!!editForm?.has_pavilion}
                  onValueChange={(v) => setEditForm((p: any) => ({ ...p, has_pavilion: v }))}
                />
              </View>
              <View style={styles.switchRow}>
                <Text style={styles.switchLabel}>Active</Text>
                <Switch
                  value={!!editForm?.active}
                  onValueChange={(v) => setEditForm((p: any) => ({ ...p, active: v }))}
                />
              </View>

              <Text style={styles.modalSectionTitle}>Editable availability (Days & Slots)</Text>
              {editForm?.id ? (
                <TimeSlotsEditor
                  ref={availabilityRef}
                  groundId={String(editForm.id)}
                  pitchType={String(editForm.pitch_type ?? '') || null}
                  canEdit
                  showSaveButton={false}
                />
              ) : null}
            </ScrollView>

            <View style={styles.modalFooter}>
              <Button
                title={(editLoading || savingAvailability) ? 'Saving...' : 'Save'}
                onPress={handleSaveEdit}
                loading={editLoading || savingAvailability}
                fullWidth
                size="large"
              />
            </View>
          </Card>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    paddingTop: 48,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#212121',
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Platform.OS === 'web' ? '#dc8d3c' : '#2196F3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: {
    padding: 16,
  },
  editorCard: {
    marginBottom: 16,
    padding: 14,
    backgroundColor: '#FFF9E6',
  },
  editorTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#212121',
    marginBottom: 10,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  viewDetailsButton: {
    marginTop: 10,
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  modalWrap: {
    flex: 1,
    justifyContent: 'center',
    padding: 16,
  },
  modalCard: {
    maxHeight: '90%',
    padding: 14,
    borderRadius: 14,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#212121',
    flex: 1,
  },
  modalScroll: {
    maxHeight: 560,
  },
  modalSectionTitle: {
    fontSize: 12,
    fontWeight: '900',
    color: '#374151',
    marginTop: 12,
    marginBottom: 6,
  },
  modalFooter: {
    marginTop: 12,
  },
  formInput: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 10,
  },
  formRow2: {
    flexDirection: 'row',
    gap: 10,
  },
  formInputHalf: {
    flex: 1,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  switchLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: '#374151',
  },
  formActions: {
    marginTop: 10,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 24,
    textAlign: 'center',
  },
  emptyButton: {
    marginTop: 16,
  },
});
