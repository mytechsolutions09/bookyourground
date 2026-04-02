import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, TouchableOpacity, Platform, Modal, Pressable, ScrollView, TextInput, Switch, Alert } from 'react-native';
import { router } from 'expo-router';
import { Plus } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { GroundWithImages } from '@/types';
import GroundCard from '@/components/grounds/GroundCard';
import type { GroundWithImages as GroundWithImagesType } from '@/types';
import WebLayout from '@/components/web/WebLayout';

function makeGroundPath(ground: GroundWithImagesType): string {
  const name = (ground.name ?? '').toString().toLowerCase().trim();
  const city = (ground.city ?? '').toString().toLowerCase().trim();
  const slugify = (value: string) =>
    (value || 'ground')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+/, '')
      .replace(/-+$/, '');
  const citySlug = slugify(city || 'city');
  const nameSlug = slugify(name);
  return `/ground/${encodeURIComponent(citySlug)}/${encodeURIComponent(nameSlug)}`;
}
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import TimeSlotsEditor, { TimeSlotsEditorHandle } from '@/components/availability/TimeSlotsEditor';
import { cricketPitchSurfaceForDb, isCricketGroundType } from '@/utils/cricketGround';

function isVideoUrl(url: string): boolean {
  const lower = url.trim().toLowerCase();
  return (
    lower.endsWith('.mp4') ||
    lower.endsWith('.webm') ||
    lower.endsWith('.mov') ||
    lower.includes('youtube.com') ||
    lower.includes('youtu.be') ||
    lower.includes('vimeo.com')
  );
}

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
  const [locationRows, setLocationRows] = useState<any[]>([]);
  const [editLocationKey, setEditLocationKey] = useState<string>('');
  const [uploadingMedia, setUploadingMedia] = useState(false);

  useEffect(() => {
    if (user) {
      loadGrounds();
    }
  }, [user]);

  useEffect(() => {
    const loadLocations = async () => {
      try {
        const { data, error } = await supabase
          .from('locations')
          .select('*')
          .eq('active', true)
          .order('sort_order', { ascending: true })
          .order('city', { ascending: true });

        if (error) throw error;
        setLocationRows(data || []);
      } catch (e) {
        console.error('Error loading locations for owner grounds:', e);
      }
    };

    loadLocations();
  }, []);

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
      cricket_pitch_surface: ((ground as any).cricket_pitch_surface ?? '') as string,
      ground_size: (ground.ground_size ?? '') as string,
      capacity: ground.capacity != null ? String(ground.capacity) : '',
      has_floodlights: !!(ground as any).has_floodlights,
      has_parking: !!(ground as any).has_parking,
      has_changing_rooms: !!(ground as any).has_changing_rooms,
      has_pavilion: !!(ground as any).has_pavilion,
      has_washrooms: !!(ground as any).has_washrooms,
      active: !!(ground as any).active,
      mediaUrls: (ground.ground_images ?? []).map((img) => img.image_url),
    });
    setEditLocationKey(`${ground.city ?? ''}__${ground.state ?? ''}`);
    setEditOpen(true);
  };

  const closeEditModal = () => {
    setEditOpen(false);
    setEditForm(null);
  };

  const handlePickMediaForEdit = async () => {
    if (!user) {
      Alert.alert('Login required', 'Please sign in again to upload media.');
      return;
    }
    if (!editForm?.id) return;

    try {
      setUploadingMedia(true);
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        quality: 0.8,
      });

      if (result.canceled || !result.assets?.length) {
        return;
      }

      const asset = result.assets[0];
      const uri = asset.uri;
      const extensionFromUri = uri.split('.').pop() || '';
      const ext =
        extensionFromUri.toLowerCase().match(/^(jpg|jpeg|png|webp|mp4|mov|m4v)$/)?.[0] || 'jpg';

      const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const filePath = `owner-media/${user.id}/${fileName}`;

      const response = await fetch(uri);
      const blob = await response.blob();

      const { error: uploadError } = await supabase.storage
        .from('ground-images')
        .upload(filePath, blob, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) {
        console.error('Media upload failed:', uploadError);
        Alert.alert('Upload failed', uploadError.message);
        return;
      }

      const { data } = supabase.storage.from('ground-images').getPublicUrl(filePath);
      const publicUrl = data.publicUrl;

      setEditForm((prev: any) => {
        const urls = (prev.mediaUrls ?? [])
          .map((u: string) => String(u ?? '').trim())
          .filter(Boolean);
        const addingVideo = isVideoUrl(publicUrl);
        const imgCount = urls.filter((u) => !isVideoUrl(u)).length;
        const vidCount = urls.filter(isVideoUrl).length;
        if (addingVideo) {
          if (vidCount >= 2) {
            Alert.alert('Limit reached', 'You can add up to 2 videos.');
            return prev;
          }
        } else if (imgCount >= 8) {
          Alert.alert('Limit reached', 'You can add up to 8 images.');
          return prev;
        }
        return { ...prev, mediaUrls: [...urls, publicUrl] };
      });
    } catch (e: any) {
      console.error('Error picking/uploading media:', e);
      Alert.alert('Upload error', e?.message ?? 'Something went wrong while uploading media.');
    } finally {
      setUploadingMedia(false);
    }
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
    if (isCricketGroundType(editForm.pitch_type)) {
      const s = cricketPitchSurfaceForDb(editForm.pitch_type, editForm.cricket_pitch_surface);
      if (!s) {
        Alert.alert('Pitch surface', 'Please choose Turf or Matting for this cricket ground.');
        return;
      }
    }
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
        cricket_pitch_surface: cricketPitchSurfaceForDb(
          editForm.pitch_type,
          editForm.cricket_pitch_surface,
        ),
        ground_size: String(editForm.ground_size ?? '').trim() || null,
        capacity: parseNullableInt(String(editForm.capacity ?? '')),
        has_floodlights: !!editForm.has_floodlights,
        has_parking: !!editForm.has_parking,
        has_changing_rooms: !!editForm.has_changing_rooms,
        has_pavilion: !!editForm.has_pavilion,
        has_washrooms: !!editForm.has_washrooms,
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

      // Sync ground media (images/videos) – max 8 images + 2 videos.
      const rawUrls: string[] = Array.isArray(editForm.mediaUrls)
        ? editForm.mediaUrls
        : [];
      const cleaned = rawUrls.map((u) => String(u ?? '').trim()).filter(Boolean);
      const imageUrls = cleaned.filter((u) => !isVideoUrl(u)).slice(0, 8);
      const videoUrls = cleaned.filter(isVideoUrl).slice(0, 2);
      const finalUrls = [...imageUrls, ...videoUrls];

      await supabase.from('ground_images').delete().eq('ground_id', editForm.id);

      if (finalUrls.length > 0) {
        const rows = finalUrls.map((url, index) => ({
          ground_id: editForm.id as string,
          image_url: url,
          is_primary: index === 0,
          display_order: index,
        }));
        const { error: mediaError } = await supabase
          .from('ground_images')
          .insert(rows);
        if (mediaError) throw mediaError;
      }

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

  const content = (
    <View style={styles.container}>
      {Platform.OS !== 'web' && (
        <View style={styles.header}>
          <Text style={styles.title}>My Grounds</Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => router.push('/(owner)/add-ground')}
          >
            <Plus size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      )}

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
              compact={Platform.OS === 'web'}
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
                    onPress={() => router.push(makeGroundPath(item))}
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
        numColumns={Platform.OS === 'web' ? 2 : 1}
        columnWrapperStyle={Platform.OS === 'web' ? styles.listRowWeb : undefined}
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
              <View style={styles.formRow2}>
                <View style={styles.formInputHalf}>
                  <Text style={styles.locationLabel}>City / State</Text>
                  <OwnerLocationDropdown
                    value={editLocationKey}
                    options={buildLocationOptions(locationRows)}
                    onChange={(k) => {
                      setEditLocationKey(k);
                      const [city, state] = k.split('__');
                      setEditForm((p: any) => ({
                        ...p,
                        city: city || '',
                        state: state || '',
                      }));
                    }}
                  />
                </View>
              </View>
              <TextInput
                style={styles.formInput}
                value={String(editForm?.address ?? '')}
                onChangeText={(t) => setEditForm((p: any) => ({ ...p, address: t }))}
                placeholder="Address"
              />
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
                onChangeText={(t) =>
                  setEditForm((p: any) => ({
                    ...p,
                    pitch_type: t,
                    cricket_pitch_surface: isCricketGroundType(t) ? p.cricket_pitch_surface : '',
                  }))
                }
                placeholder="Type (Cricket Ground / Box Cricket)"
              />
              {isCricketGroundType(String(editForm?.pitch_type ?? '')) ? (
                <>
                  <Text style={styles.locationLabel}>Pitch surface</Text>
                  <View style={styles.surfaceChipsRow}>
                    {(['Turf', 'Matting'] as const).map((surfaceLabel) => {
                      const active = String(editForm?.cricket_pitch_surface ?? '') === surfaceLabel;
                      return (
                        <Pressable
                          key={surfaceLabel}
                          onPress={() =>
                            setEditForm((p: any) => ({ ...p, cricket_pitch_surface: surfaceLabel }))
                          }
                          style={[styles.surfaceChip, active && styles.surfaceChipActive]}
                        >
                          <Text
                            style={[styles.surfaceChipText, active && styles.surfaceChipTextActive]}
                          >
                            {surfaceLabel}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </>
              ) : null}
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
                <Text style={styles.switchLabel}>Washroom</Text>
                <Switch
                  value={!!editForm?.has_washrooms}
                  onValueChange={(v) => setEditForm((p: any) => ({ ...p, has_washrooms: v }))}
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

              <Text style={styles.modalSectionTitle}>Media (up to 8 images, 2 videos)</Text>
              <Text style={styles.mediaHint}>
                Add URLs below, or upload files from your device (stored in the ground-images bucket).
              </Text>
              <Pressable
                style={[styles.mediaAddButton, styles.mediaUploadButton]}
                onPress={handlePickMediaForEdit}
                disabled={uploadingMedia}
              >
                <Text style={styles.mediaUploadText}>
                  {uploadingMedia ? 'Uploading…' : 'Upload from device'}
                </Text>
              </Pressable>
              {(editForm?.mediaUrls ?? []).map((url: string, index: number) => (
                <View key={index} style={styles.mediaRow}>
                  <TextInput
                    style={[styles.formInput, styles.mediaInput]}
                    value={url}
                    onChangeText={(t) =>
                      setEditForm((prev: any) => {
                        const next = [...(prev.mediaUrls ?? [])];
                        next[index] = t;
                        return { ...prev, mediaUrls: next };
                      })
                    }
                    placeholder="https://example.com/image-or-video"
                  />
                  <Pressable
                    onPress={() =>
                      setEditForm((prev: any) => {
                        const next = [...(prev.mediaUrls ?? [])];
                        next.splice(index, 1);
                        return { ...prev, mediaUrls: next };
                      })
                    }
                    style={styles.mediaRemove}
                  >
                    <Text style={styles.mediaRemoveText}>Remove</Text>
                  </Pressable>
                </View>
              ))}
              {(editForm?.mediaUrls ?? []).length < 10 ? (
                <Pressable
                  onPress={() =>
                    setEditForm((prev: any) => ({
                      ...prev,
                      mediaUrls: [...(prev.mediaUrls ?? []), ''],
                    }))
                  }
                  style={styles.mediaAddButton}
                >
                  <Text style={styles.mediaAddText}>Add media URL</Text>
                </Pressable>
              ) : null}

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
  listRowWeb: {
    gap: 12,
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
    zIndex: 10,
  },
  modalCard: {
    maxHeight: '90%',
    padding: 14,
    borderRadius: 14,
    overflow: 'visible',
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
    overflow: 'visible',
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
    zIndex: 20,
    marginBottom: 10,
  },
  formInputHalf: {
    flex: 1,
  },
  locationLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 4,
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
  mediaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  mediaInput: {
    flex: 1,
    marginBottom: 0,
  },
  mediaRemove: {
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  mediaRemoveText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#B91C1C',
  },
  mediaAddButton: {
    alignSelf: 'flex-start',
    marginTop: 4,
    marginBottom: 8,
  },
  mediaAddText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2563EB',
  },
  mediaHint: {
    fontSize: 11,
    color: '#6B7280',
    marginBottom: 8,
    lineHeight: 16,
  },
  mediaUploadButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    marginBottom: 10,
  },
  mediaUploadText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
  },
  surfaceChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  surfaceChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  surfaceChipActive: {
    borderColor: '#2563EB',
    backgroundColor: '#EFF6FF',
  },
  surfaceChipText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#374151',
  },
  surfaceChipTextActive: {
    color: '#1D4ED8',
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

function buildLocationOptions(rows: any[]) {
  const map = new Map<string, string>();
  rows.forEach((row) => {
    const key = `${row.city}__${row.state}`;
    const label = row.label?.trim() || `${row.city}, ${row.state}`;
    map.set(key, label);
  });
  return Array.from(map.entries()).map(([key, label]) => ({ key, label }));
}

function OwnerLocationDropdown({
  value,
  options,
  onChange,
}: {
  value: string;
  options: { key: string; label: string }[];
  onChange: (k: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.key === value);

  return (
    <View style={locationDropdownStyles.outer}>
      <Pressable
        onPress={() => setOpen((prev) => !prev)}
        style={[locationDropdownStyles.button, open && locationDropdownStyles.buttonOpen]}
      >
        <Text style={locationDropdownStyles.buttonText}>
          {selected?.label || 'Select city and state'}
        </Text>
      </Pressable>
      {open && (
        <View style={locationDropdownStyles.menu}>
          <ScrollView>
            {options.map((opt) => (
              <Pressable
                key={opt.key}
                onPress={() => {
                  onChange(opt.key);
                  setOpen(false);
                }}
                style={locationDropdownStyles.option}
              >
                <Text style={locationDropdownStyles.optionText}>{opt.label}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

const locationDropdownStyles = StyleSheet.create({
  outer: {
    position: 'relative',
    zIndex: 25,
  },
  button: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
  },
  buttonOpen: {
    borderColor: '#dc8d3c',
    backgroundColor: 'rgba(220,141,60,0.05)',
  },
  buttonText: {
    fontSize: 14,
    color: '#111827',
  },
  menu: {
    position: 'relative' as any,
    maxHeight: 260,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    zIndex: 5000,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
  },
  option: {
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  optionText: {
    fontSize: 14,
    color: '#111827',
  },
});
