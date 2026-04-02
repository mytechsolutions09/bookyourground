import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  Alert,
  Platform,
  Pressable,
  useWindowDimensions,
  Image,
  TextInput,
  Switch,
  ScrollView,
  Modal,
} from 'react-native';
import { supabase } from '@/lib/supabase';
import { GroundWithImages } from '@/types';
import GroundCard from '@/components/grounds/GroundCard';
import Card from '@/components/ui/Card';
import WebLayout from '@/components/web/WebLayout';
import { useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import Button from '@/components/ui/Button';
import { useAuth } from '@/contexts/AuthContext';
import TimeSlotsEditor, { TimeSlotsEditorHandle } from '@/components/availability/TimeSlotsEditor';
import { ensureDefaultTimeSlotsForGround } from '@/utils/timeSlotsDb';
import { cricketPitchSurfaceForDb, isCricketGroundType } from '@/utils/cricketGround';
import { getGroundBookingScheduleLines } from '@/utils/bookingSlots';

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

/** Supabase/JS may surface booleans inconsistently; align with DB `approved = true`. */
function groundIsApproved(g: { approved?: unknown } | null | undefined): boolean {
  const a = g?.approved;
  if (a === true) return true;
  if (a === false || a == null) return false;
  if (typeof a === 'string') {
    const s = a.trim().toLowerCase();
    return s === 'true' || s === 't' || s === '1';
  }
  return false;
}

function FilterDropdown({
  options,
  value,
  onChange,
}: {
  options: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);

  const display = (v: string) => (v === 'all' ? 'All' : v);

  return (
    <View style={styles.dropdownOuter}>
      <Pressable
        onPress={() => setOpen((v) => !v)}
        style={[styles.dropdownButton, open && styles.dropdownButtonOpen]}
      >
        <Text style={styles.dropdownButtonText}>{display(value)}</Text>
      </Pressable>

      {open ? (
        <View style={styles.dropdownMenu}>
          {options.map((opt) => (
            <Pressable
              key={opt}
              onPress={() => {
                onChange(opt);
                setOpen(false);
              }}
              style={[
                styles.dropdownOption,
                opt === value && styles.dropdownOptionActive,
              ]}
            >
              <Text
                style={[
                  styles.dropdownOptionText,
                  opt === value && styles.dropdownOptionTextActive,
                ]}
              >
                {display(opt)}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

export default function GroundsAdminScreen() {
  const params = useLocalSearchParams();
  const ownerIdParam = Array.isArray(params.ownerId) ? params.ownerId[0] : params.ownerId;
  const createParam = Array.isArray(params.create) ? params.create[0] : params.create;

  const { user } = useAuth();
  const { width } = useWindowDimensions();
  const [grounds, setGrounds] = useState<GroundWithImages[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGround, setSelectedGround] = useState<GroundWithImages | null>(null);
  const [viewMode, setViewMode] = useState<'tiles' | 'list'>('tiles');
  const [locationFilter, setLocationFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  const [createOpen, setCreateOpen] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);

  const [editOpen, setEditOpen] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [savingAvailability, setSavingAvailability] = useState(false);
  const [uploadingMedia, setUploadingMedia] = useState(false);

  const [editForm, setEditForm] = useState<any>(null);
  const availabilityRef = React.useRef<TimeSlotsEditorHandle | null>(null);
  const [createForm, setCreateForm] = useState<any>({
    name: '',
    description: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    base_price_per_hour: '',
    pitch_type: '',
    cricket_pitch_surface: '',
    ground_size: '',
    capacity: '',
    has_floodlights: false,
    has_parking: false,
    has_changing_rooms: false,
    has_pavilion: false,
    verified: false,
    approved: false,
    active: true,
    latitude: '',
    longitude: '',
  });

  const pendingCount = useMemo(() => {
    return grounds.filter((g: any) => g.approved === false).length;
  }, [grounds]);

  const locationOptions = useMemo(() => {
    const cities = Array.from(new Set(grounds.map((g) => g.city).filter(Boolean)));
    return ['all', ...cities];
  }, [grounds]);

  const typeOptions = useMemo(() => {
    const types = Array.from(
      new Set(grounds.map((g) => g.pitch_type).filter((t): t is string => !!t)),
    );
    return ['all', ...types];
  }, [grounds]);

  const filteredGrounds = useMemo(() => {
    return grounds.filter((g) => {
      const matchesLocation = locationFilter === 'all' || g.city === locationFilter;
      const matchesType = typeFilter === 'all' || g.pitch_type === typeFilter;
      return matchesLocation && matchesType;
    });
  }, [grounds, locationFilter, typeFilter]);

  useEffect(() => {
    loadGrounds();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ownerIdParam]);

  const loadGrounds = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('grounds')
        .select(`
          *,
          ground_images(*),
          owner:profiles(full_name, phone, business_name)
        `)
        .order('created_at', { ascending: false });

      if (ownerIdParam) query = query.eq('owner_id', ownerIdParam);

      const { data, error } = await query;
      if (error) throw error;
      setGrounds((data || []) as GroundWithImages[]);
    } catch (error) {
      console.error('Error loading grounds:', error);
      if (Platform.OS === 'web') alert('Error loading grounds');
    } finally {
      setLoading(false);
    }
  };

  const updateGroundStatus = async (groundId: string, approved: boolean) => {
    try {
      const { error } = await supabase
        .from('grounds')
        .update({ approved })
        .eq('id', groundId);

      if (error) throw error;

      if (Platform.OS === 'web') {
        alert(`Ground ${approved ? 'approved' : 'rejected'} successfully`);
      } else {
        Alert.alert('Success', `Ground ${approved ? 'approved' : 'rejected'} successfully`);
      }

      loadGrounds();
      setSelectedGround(null);
    } catch (error: any) {
      if (Platform.OS === 'web') {
        alert('Error: ' + error?.message);
      } else {
        Alert.alert('Error', error?.message ?? 'Failed to update ground');
      }
    }
  };

  const resetCreateForm = () => {
    setCreateForm({
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
      verified: false,
      approved: false,
      active: true,
      latitude: '',
      longitude: '',
    });
  };

  useEffect(() => {
    if (createOpen) resetCreateForm();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [createOpen]);

  // Support opening the "Add Ground" modal directly from the left sidebar tab
  // (e.g. `/ (admin) /grounds?create=1`).
  useEffect(() => {
    if (!createParam) return;
    const v = String(createParam).trim().toLowerCase();
    if (v === '1' || v === 'true') {
      setCreateOpen(true);
    }
  }, [createParam]);

  const startEditGround = (ground: GroundWithImages) => {
    setSelectedGround(ground);
    setEditOpen(true);
    setCreateOpen(false);
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
      verified: !!(ground as any).verified,
      approved: !!(ground as any).approved,
      active: !!(ground as any).active,
      latitude: (ground as any).latitude != null ? String((ground as any).latitude) : '',
      longitude: (ground as any).longitude != null ? String((ground as any).longitude) : '',
      mediaUrls: (ground.ground_images ?? []).map((img) => img.image_url),
    });
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
        if (Platform.OS === 'web') alert('Please choose Turf or Matting for this cricket ground.');
        else Alert.alert('Pitch surface', 'Please choose Turf or Matting for this cricket ground.');
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
        verified: !!editForm.verified,
        approved: !!editForm.approved,
        active: !!editForm.active,
        latitude: parseNullableFloat(String(editForm.latitude ?? '')),
        longitude: parseNullableFloat(String(editForm.longitude ?? '')),
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

      // Replace existing media for this ground.
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

      setEditOpen(false);
      setEditForm(null);
      loadGrounds();
    } catch (e: any) {
      console.error('Error saving ground edit:', e);
      if (Platform.OS === 'web') alert(e?.message ?? 'Failed to save ground');
      else Alert.alert('Error', e?.message ?? 'Failed to save ground');
    } finally {
      setEditLoading(false);
      setSavingAvailability(false);
    }
  };

  const handleDeleteGround = async (groundId: string) => {
    const runDelete = async () => {
      try {
        setEditLoading(true);
        const { error } = await supabase
          .from('grounds')
          .delete()
          .eq('id', groundId);
        if (error) throw error;
        setEditOpen(false);
        setEditForm(null);
        setSelectedGround(null);
        loadGrounds();
      } catch (e: any) {
        console.error('Error deleting ground:', e);
        if (Platform.OS === 'web') alert(e?.message ?? 'Failed to delete ground');
        else Alert.alert('Error', e?.message ?? 'Failed to delete ground');
      } finally {
        setEditLoading(false);
      }
    };

    if (Platform.OS === 'web') {
      const ok = typeof window !== 'undefined' ? window.confirm('Delete this ground?') : true;
      if (!ok) return;
      await runDelete();
      return;
    }

    Alert.alert('Delete Ground', 'Are you sure you want to delete this ground?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: runDelete,
      },
    ]);
  };

  const closeEditModal = () => {
    setEditOpen(false);
    setEditForm(null);
  };

  const handlePickMediaForEdit = async () => {
    if (!user) {
      if (Platform.OS === 'web') alert('Please sign in again to upload media.');
      else Alert.alert('Login required', 'Please sign in again to upload media.');
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
        if (Platform.OS === 'web') alert(uploadError.message);
        else Alert.alert('Upload failed', uploadError.message);
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
            if (Platform.OS === 'web') alert('You can add up to 2 videos.');
            else Alert.alert('Limit reached', 'You can add up to 2 videos.');
            return prev;
          }
        } else if (imgCount >= 8) {
          if (Platform.OS === 'web') alert('You can add up to 8 images.');
          else Alert.alert('Limit reached', 'You can add up to 8 images.');
          return prev;
        }
        return { ...prev, mediaUrls: [...urls, publicUrl] };
      });
    } catch (e: any) {
      console.error('Error picking/uploading media:', e);
      const msg = e?.message ?? 'Something went wrong while uploading media.';
      if (Platform.OS === 'web') alert(msg);
      else Alert.alert('Upload error', msg);
    } finally {
      setUploadingMedia(false);
    }
  };

  const handleCreateGround = async () => {
    if (!user) {
      if (Platform.OS === 'web') alert('Please login');
      else Alert.alert('Error', 'Please login');
      return;
    }
    if (isCricketGroundType(createForm.pitch_type)) {
      const s = cricketPitchSurfaceForDb(createForm.pitch_type, createForm.cricket_pitch_surface);
      if (!s) {
        if (Platform.OS === 'web') alert('Please choose Turf or Matting for this cricket ground.');
        else Alert.alert('Pitch surface', 'Please choose Turf or Matting for this cricket ground.');
        return;
      }
    }
    try {
      setCreateLoading(true);

      const payload: any = {
        owner_id: user.id,
        name: String(createForm.name ?? '').trim(),
        description: String(createForm.description ?? '').trim() || null,
        address: String(createForm.address ?? '').trim(),
        city: String(createForm.city ?? '').trim(),
        state: String(createForm.state ?? '').trim(),
        pincode: String(createForm.pincode ?? '').trim(),
        base_price_per_hour: parseNullableFloat(String(createForm.base_price_per_hour ?? '')) ?? 0,
        pitch_type: String(createForm.pitch_type ?? '').trim() || null,
        cricket_pitch_surface: cricketPitchSurfaceForDb(
          createForm.pitch_type,
          createForm.cricket_pitch_surface,
        ),
        ground_size: String(createForm.ground_size ?? '').trim() || null,
        capacity: parseNullableInt(String(createForm.capacity ?? '')),
        has_floodlights: !!createForm.has_floodlights,
        has_parking: !!createForm.has_parking,
        has_changing_rooms: !!createForm.has_changing_rooms,
        has_pavilion: !!createForm.has_pavilion,
        verified: !!createForm.verified,
        approved: !!createForm.approved,
        active: !!createForm.active,
        latitude: parseNullableFloat(String(createForm.latitude ?? '')),
        longitude: parseNullableFloat(String(createForm.longitude ?? '')),
      };

      const { data: created, error } = await supabase
        .from('grounds')
        .insert(payload)
        .select('id')
        .single();
      if (error) throw error;

      await ensureDefaultTimeSlotsForGround({
        groundId: created.id,
        pitchType: payload.pitch_type,
        supabaseClient: supabase,
      });

      setCreateOpen(false);
      loadGrounds();
    } catch (e: any) {
      console.error('Error creating ground:', e);
      if (Platform.OS === 'web') alert(e?.message ?? 'Failed to create ground');
      else Alert.alert('Error', e?.message ?? 'Failed to create ground');
    } finally {
      setCreateLoading(false);
    }
  };

  const renderGroundActions = (ground: GroundWithImages, isApproved: boolean) => {
    const ownerName = (ground as any).owner?.business_name || (ground as any).owner?.full_name;

    return (
      <Card style={styles.actionsCard}>
        <Text style={styles.actionsTitle}>Ground Review</Text>

        {ownerName ? (
          <View style={styles.ownerInfo}>
            <Text style={styles.ownerLabel}>Owner</Text>
            <Text style={styles.ownerText}>{ownerName}</Text>
          </View>
        ) : null}

        <Text style={styles.approvalText}>{isApproved ? 'Status: Approved' : 'Status: Pending approval'}</Text>

        <View style={styles.actionsButtons}>
          {!isApproved ? (
            <>
              <Button
                title="Approve"
                onPress={() => updateGroundStatus(ground.id, true)}
                variant="secondary"
                size="small"
                style={{ flex: 1 }}
              />
              <Button
                title="Reject"
                onPress={() => updateGroundStatus(ground.id, false)}
                variant="danger"
                size="small"
                style={{ flex: 1 }}
              />
            </>
          ) : null}

          <Button
            title="Edit"
            onPress={() => startEditGround(ground)}
            variant="outline"
            size="small"
            style={{ flex: 1 }}
          />

          <Button
            title="Delete"
            onPress={() => handleDeleteGround(ground.id)}
            variant="danger"
            size="small"
            style={{ flex: 1 }}
          />
        </View>
      </Card>
    );
  };

  const headerSubtitle = ownerIdParam
    ? `Showing grounds for one owner`
    : `Total: ${filteredGrounds.length} (pending: ${pendingCount})`;

  const numColumns = viewMode === 'tiles' ? (width >= 1200 ? 3 : 2) : 1;
  const tilesColumnWrapperStyle = viewMode === 'tiles' && Platform.OS === 'web'
    ? ({ justifyContent: 'space-between' } as any)
    : undefined;

  const content = (
    <View style={styles.container}>
      <View style={[styles.header, Platform.OS === 'web' && styles.webHeader]}>
        <View style={styles.headerTopRow}>
          <View style={styles.headerTitleBlock}>
            <Text style={styles.title}>Grounds</Text>
            <Text style={styles.subtitle}>{headerSubtitle}</Text>
          </View>
          <Button
            title={createOpen ? 'Cancel Add' : 'Add Ground'}
            onPress={() => {
              setCreateOpen((v) => !v);
              setEditOpen(false);
              setEditForm(null);
              setSelectedGround(null);
            }}
            variant={createOpen ? 'outline' : 'primary'}
            size="medium"
            loading={createLoading}
            style={styles.headerAddButton}
          />
        </View>

        <View style={styles.controlsRow}>
          <View style={styles.filtersWrap}>
            <View style={styles.filtersGroup}>
              <Text style={styles.filtersLabel}>Location</Text>
              <FilterDropdown
                options={locationOptions}
                value={locationFilter}
                onChange={setLocationFilter}
              />
            </View>

            <View style={styles.filtersGroup}>
              <Text style={styles.filtersLabel}>Type</Text>
              <FilterDropdown
                options={typeOptions}
                value={typeFilter}
                onChange={setTypeFilter}
              />
            </View>
          </View>

          <View style={styles.viewToggle}>
            <Pressable
              onPress={() => setViewMode('tiles')}
              style={[
                styles.viewToggleOption,
                viewMode === 'tiles' && styles.viewToggleOptionActive,
              ]}
            >
              <Text
                style={[
                  styles.viewToggleText,
                  viewMode === 'tiles' && styles.viewToggleTextActive,
                ]}
              >
                Tiles
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setViewMode('list')}
              style={[
                styles.viewToggleOption,
                viewMode === 'list' && styles.viewToggleOptionActive,
              ]}
            >
              <Text
                style={[
                  styles.viewToggleText,
                  viewMode === 'list' && styles.viewToggleTextActive,
                ]}
              >
                List
              </Text>
            </Pressable>
          </View>
        </View>
      </View>

      {createOpen ? (
        <View style={styles.createFormSection}>
          <Card style={styles.listDetailsCard}>
            <Text style={styles.formTitle}>Add Ground</Text>

            <ScrollView style={styles.formWrap}>
                <TextInput
                  style={styles.formInput}
                  value={String(createForm.name ?? '')}
                  onChangeText={(t) => setCreateForm({ ...createForm, name: t })}
                  placeholder="Name"
                />
                <TextInput
                  style={styles.formInput}
                  value={String(createForm.description ?? '')}
                  onChangeText={(t) => setCreateForm({ ...createForm, description: t })}
                  placeholder="Description"
                />
                <TextInput
                  style={styles.formInput}
                  value={String(createForm.address ?? '')}
                  onChangeText={(t) => setCreateForm({ ...createForm, address: t })}
                  placeholder="Address"
                />

                <View style={styles.formRow2}>
                  <TextInput
                    style={[styles.formInput, styles.formInputHalf]}
                    value={String(createForm.city ?? '')}
                    onChangeText={(t) => setCreateForm({ ...createForm, city: t })}
                    placeholder="City"
                  />
                  <TextInput
                    style={[styles.formInput, styles.formInputHalf]}
                    value={String(createForm.state ?? '')}
                    onChangeText={(t) => setCreateForm({ ...createForm, state: t })}
                    placeholder="State"
                  />
                </View>

                <View style={styles.formRow2}>
                  <TextInput
                    style={[styles.formInput, styles.formInputHalf]}
                    value={String(createForm.pincode ?? '')}
                    onChangeText={(t) => setCreateForm({ ...createForm, pincode: t })}
                    placeholder="Pincode"
                  />
                  <TextInput
                    style={[styles.formInput, styles.formInputHalf]}
                    value={String(createForm.base_price_per_hour ?? '')}
                    onChangeText={(t) => setCreateForm({ ...createForm, base_price_per_hour: t })}
                    placeholder="Price/hr"
                    keyboardType="numeric"
                  />
                </View>

                <TextInput
                  style={styles.formInput}
                  value={String(createForm.pitch_type ?? '')}
                  onChangeText={(t) =>
                    setCreateForm({
                      ...createForm,
                      pitch_type: t,
                      cricket_pitch_surface: isCricketGroundType(t)
                        ? createForm.cricket_pitch_surface
                        : '',
                    })
                  }
                  placeholder="Type (Cricket Ground / Box Cricket)"
                />
                {isCricketGroundType(String(createForm.pitch_type ?? '')) ? (
                  <>
                    <Text style={styles.surfaceFieldLabel}>Pitch surface</Text>
                    <View style={styles.surfaceChipsRow}>
                      {(['Turf', 'Matting'] as const).map((surfaceLabel) => {
                        const active = String(createForm.cricket_pitch_surface ?? '') === surfaceLabel;
                        return (
                          <Pressable
                            key={surfaceLabel}
                            onPress={() =>
                              setCreateForm({ ...createForm, cricket_pitch_surface: surfaceLabel })
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
                  value={String(createForm.ground_size ?? '')}
                  onChangeText={(t) => setCreateForm({ ...createForm, ground_size: t })}
                  placeholder="Ground size"
                />
                <TextInput
                  style={styles.formInput}
                  value={String(createForm.capacity ?? '')}
                  onChangeText={(t) => setCreateForm({ ...createForm, capacity: t })}
                  placeholder="Capacity"
                  keyboardType="numeric"
                />

                <View style={styles.switchRow}>
                  <Text style={styles.switchLabel}>Floodlights</Text>
                  <Switch
                    value={!!createForm.has_floodlights}
                    onValueChange={(v) => setCreateForm({ ...createForm, has_floodlights: v })}
                  />
                </View>
                <View style={styles.switchRow}>
                  <Text style={styles.switchLabel}>Parking</Text>
                  <Switch
                    value={!!createForm.has_parking}
                    onValueChange={(v) => setCreateForm({ ...createForm, has_parking: v })}
                  />
                </View>
                <View style={styles.switchRow}>
                  <Text style={styles.switchLabel}>Changing Rooms</Text>
                  <Switch
                    value={!!createForm.has_changing_rooms}
                    onValueChange={(v) => setCreateForm({ ...createForm, has_changing_rooms: v })}
                  />
                </View>
                <View style={styles.switchRow}>
                  <Text style={styles.switchLabel}>Pavilion</Text>
                  <Switch
                    value={!!createForm.has_pavilion}
                    onValueChange={(v) => setCreateForm({ ...createForm, has_pavilion: v })}
                  />
                </View>

                <View style={styles.switchRow}>
                  <Text style={styles.switchLabel}>Verified</Text>
                  <Switch
                    value={!!createForm.verified}
                    onValueChange={(v) => setCreateForm({ ...createForm, verified: v })}
                  />
                </View>
                <View style={styles.switchRow}>
                  <Text style={styles.switchLabel}>Approved</Text>
                  <Switch
                    value={!!createForm.approved}
                    onValueChange={(v) => setCreateForm({ ...createForm, approved: v })}
                  />
                </View>
                <View style={styles.switchRow}>
                  <Text style={styles.switchLabel}>Active</Text>
                  <Switch
                    value={!!createForm.active}
                    onValueChange={(v) => setCreateForm({ ...createForm, active: v })}
                  />
                </View>

                <View style={styles.formActions}>
                  <Button
                    title={createLoading ? 'Creating...' : 'Create'}
                    onPress={handleCreateGround}
                    loading={createLoading}
                    fullWidth
                    size="large"
                  />
                </View>
            </ScrollView>
          </Card>
        </View>
      ) : null}

      <FlatList
        data={filteredGrounds}
        renderItem={({ item }) => {
          const isSelected = selectedGround?.id === item.id;
          const latestGround =
            grounds.find((g) => g.id === item.id) ?? item;
          const isApproved = groundIsApproved(latestGround);
          const schedule = getGroundBookingScheduleLines(latestGround.pitch_type);

          const primaryImage =
            latestGround.ground_images?.find((img: any) => img.is_primary)?.image_url ||
            latestGround.ground_images?.[0]?.image_url ||
            'https://images.pexels.com/photos/1661950/pexels-photo-1661950.jpeg';

          const ownerName =
            (latestGround as any).owner?.business_name ||
            (latestGround as any).owner?.full_name ||
            '—';

          if (viewMode === 'tiles') {
            return (
              <View style={styles.tileItem}>
                <GroundCard
                  ground={latestGround}
                  showBookingSchedule
                  onPress={() =>
                    setSelectedGround(selectedGround?.id === item.id ? null : latestGround)
                  }
                />
                {isSelected ? renderGroundActions(latestGround, isApproved) : null}
              </View>
            );
          }

          return (
            <View style={styles.listRowOuter}>
              <Pressable
                onPress={() => setSelectedGround(isSelected ? null : latestGround)}
                style={styles.listRow}
              >
                <Image source={{ uri: primaryImage }} style={styles.listThumb} />

                <View style={styles.listMain}>
                  <Text style={styles.listTitle}>{latestGround.name}</Text>
                  <Text style={styles.listSub}>
                    {latestGround.city}, {latestGround.state} • {latestGround.pitch_type ?? '—'}
                  </Text>
                  <Text style={styles.listScheduleLine}>{schedule.datesLine}</Text>
                  <Text style={styles.listScheduleLine}>{schedule.slotsLine}</Text>

                  <View style={styles.listMetaRow}>
                    <Text style={styles.listMeta}>
                      ₹{latestGround.base_price_per_hour}/hr
                    </Text>
                    <Text style={styles.listMeta}>
                      {ownerName}
                    </Text>
                  </View>
                </View>

                <View style={styles.listBadges}>
                  <Text
                    style={[
                      styles.badge,
                      isApproved ? styles.badgeApproved : styles.badgePending,
                    ]}
                  >
                    {isApproved ? 'Approved' : 'Pending'}
                  </Text>
                  <Text
                    style={[
                      styles.badge,
                      latestGround.active ? styles.badgeActive : styles.badgeInactive,
                    ]}
                  >
                    {latestGround.active ? 'Active' : 'Inactive'}
                  </Text>
                </View>
              </Pressable>

              {isSelected ? (
                <Card style={styles.listDetailsCard}>
                  <Text style={styles.detailsTitle}>Ground Details</Text>
                  <Text style={styles.detailsText}>
                    Address: {latestGround.address}, {latestGround.pincode}
                  </Text>
                  {latestGround.description ? (
                    <Text style={styles.detailsText}>About: {latestGround.description}</Text>
                  ) : null}

                  <Text style={styles.detailsSectionTitle}>Booking schedule</Text>
                  <Text style={styles.detailsText}>{schedule.datesLine}</Text>
                  <Text style={styles.detailsText}>{schedule.slotsLine}</Text>

                  <View style={styles.detailsGrid}>
                    <View style={styles.detailsGridItem}>
                      <Text style={styles.detailsGridLabel}>Owner</Text>
                      <Text style={styles.detailsGridValue}>{ownerName}</Text>
                    </View>
                    <View style={styles.detailsGridItem}>
                      <Text style={styles.detailsGridLabel}>Capacity</Text>
                      <Text style={styles.detailsGridValue}>{latestGround.capacity ?? '—'}</Text>
                    </View>
                    <View style={styles.detailsGridItem}>
                      <Text style={styles.detailsGridLabel}>Ground Size</Text>
                      <Text style={styles.detailsGridValue}>{latestGround.ground_size ?? '—'}</Text>
                    </View>
                    <View style={styles.detailsGridItem}>
                      <Text style={styles.detailsGridLabel}>Amenities</Text>
                      <Text style={styles.detailsGridValue}>
                        {(latestGround.has_floodlights ? 'Floodlights, ' : '') +
                          (latestGround.has_parking ? 'Parking, ' : '') +
                          (latestGround.has_changing_rooms ? 'Changing, ' : '') +
                          (latestGround.has_pavilion ? 'Pavilion' : '')}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.detailsActions}>
                    {!isApproved ? (
                      <>
                        <Button
                          title="Approve"
                          onPress={() => updateGroundStatus(latestGround.id, true)}
                          variant="secondary"
                          size="small"
                          style={{ flex: 1 }}
                        />
                        <Button
                          title="Reject"
                          onPress={() => updateGroundStatus(latestGround.id, false)}
                          variant="danger"
                          size="small"
                          style={{ flex: 1 }}
                        />
                      </>
                    ) : null}
                    <Button
                      title="Edit"
                      onPress={() => startEditGround(latestGround)}
                      variant="outline"
                      size="small"
                      style={{ flex: 1 }}
                    />
                    <Button
                      title="Delete"
                      onPress={() => handleDeleteGround(latestGround.id)}
                      variant="danger"
                      size="small"
                      style={{ flex: 1 }}
                    />
                  </View>

                  {/* Edit ground is now in a modal (see below). */}
                </Card>
              ) : null}
            </View>
          );
        }}
        keyExtractor={(item) => item.id}
        extraData={{ grounds, selectedGround, viewMode }}
        contentContainerStyle={styles.list}
        key={`grounds-${viewMode}-${numColumns}`}
        numColumns={numColumns}
        columnWrapperStyle={tilesColumnWrapperStyle}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={loadGrounds} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No grounds found</Text>
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
              <Button
                title="Close"
                onPress={closeEditModal}
                variant="outline"
                size="small"
              />
            </View>

            <ScrollView style={styles.modalScroll} keyboardShouldPersistTaps="handled">
              <TextInput
                style={styles.formInput}
                value={String(editForm?.name ?? '')}
                onChangeText={(t) => setEditForm((prev: any) => ({ ...prev, name: t }))}
                placeholder="Name"
              />
              <TextInput
                style={styles.formInput}
                value={String(editForm?.description ?? '')}
                onChangeText={(t) => setEditForm((prev: any) => ({ ...prev, description: t }))}
                placeholder="Description"
              />
              <TextInput
                style={styles.formInput}
                value={String(editForm?.address ?? '')}
                onChangeText={(t) => setEditForm((prev: any) => ({ ...prev, address: t }))}
                placeholder="Address"
              />
              <View style={styles.formRow2}>
                <TextInput
                  style={[styles.formInput, styles.formInputHalf]}
                  value={String(editForm?.city ?? '')}
                  onChangeText={(t) => setEditForm((prev: any) => ({ ...prev, city: t }))}
                  placeholder="City"
                />
                <TextInput
                  style={[styles.formInput, styles.formInputHalf]}
                  value={String(editForm?.state ?? '')}
                  onChangeText={(t) => setEditForm((prev: any) => ({ ...prev, state: t }))}
                  placeholder="State"
                />
              </View>
              <View style={styles.formRow2}>
                <TextInput
                  style={[styles.formInput, styles.formInputHalf]}
                  value={String(editForm?.pincode ?? '')}
                  onChangeText={(t) => setEditForm((prev: any) => ({ ...prev, pincode: t }))}
                  placeholder="Pincode"
                />
                <TextInput
                  style={[styles.formInput, styles.formInputHalf]}
                  value={String(editForm?.base_price_per_hour ?? '')}
                  onChangeText={(t) =>
                    setEditForm((prev: any) => ({ ...prev, base_price_per_hour: t }))
                  }
                  placeholder="Price/hr"
                  keyboardType="numeric"
                />
              </View>

              <TextInput
                style={styles.formInput}
                value={String(editForm?.pitch_type ?? '')}
                onChangeText={(t) =>
                  setEditForm((prev: any) => ({
                    ...prev,
                    pitch_type: t,
                    cricket_pitch_surface: isCricketGroundType(t) ? prev.cricket_pitch_surface : '',
                  }))
                }
                placeholder="Type (Cricket Ground / Box Cricket)"
              />
              {isCricketGroundType(String(editForm?.pitch_type ?? '')) ? (
                <>
                  <Text style={styles.surfaceFieldLabel}>Pitch surface</Text>
                  <View style={styles.surfaceChipsRow}>
                    {(['Turf', 'Matting'] as const).map((surfaceLabel) => {
                      const active = String(editForm?.cricket_pitch_surface ?? '') === surfaceLabel;
                      return (
                        <Pressable
                          key={surfaceLabel}
                          onPress={() =>
                            setEditForm((prev: any) => ({
                              ...prev,
                              cricket_pitch_surface: surfaceLabel,
                            }))
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
                onChangeText={(t) => setEditForm((prev: any) => ({ ...prev, ground_size: t }))}
                placeholder="Ground size"
              />
              <TextInput
                style={styles.formInput}
                value={String(editForm?.capacity ?? '')}
                onChangeText={(t) => setEditForm((prev: any) => ({ ...prev, capacity: t }))}
                placeholder="Capacity"
                keyboardType="numeric"
              />

              <View style={styles.switchRow}>
                <Text style={styles.switchLabel}>Floodlights</Text>
                <Switch
                  value={!!editForm?.has_floodlights}
                  onValueChange={(v) =>
                    setEditForm((prev: any) => ({ ...prev, has_floodlights: v }))
                  }
                />
              </View>
              <View style={styles.switchRow}>
                <Text style={styles.switchLabel}>Parking</Text>
                <Switch
                  value={!!editForm?.has_parking}
                  onValueChange={(v) => setEditForm((prev: any) => ({ ...prev, has_parking: v }))}
                />
              </View>
              <View style={styles.switchRow}>
                <Text style={styles.switchLabel}>Changing Rooms</Text>
                <Switch
                  value={!!editForm?.has_changing_rooms}
                  onValueChange={(v) =>
                    setEditForm((prev: any) => ({ ...prev, has_changing_rooms: v }))
                  }
                />
              </View>
              <View style={styles.switchRow}>
                <Text style={styles.switchLabel}>Pavilion</Text>
                <Switch
                  value={!!editForm?.has_pavilion}
                  onValueChange={(v) =>
                    setEditForm((prev: any) => ({ ...prev, has_pavilion: v }))
                  }
                />
              </View>

              <View style={styles.switchRow}>
                <Text style={styles.switchLabel}>Verified</Text>
                <Switch
                  value={!!editForm?.verified}
                  onValueChange={(v) => setEditForm((prev: any) => ({ ...prev, verified: v }))}
                />
              </View>
              <View style={styles.switchRow}>
                <Text style={styles.switchLabel}>Approved</Text>
                <Switch
                  value={!!editForm?.approved}
                  onValueChange={(v) => setEditForm((prev: any) => ({ ...prev, approved: v }))}
                />
              </View>
              <View style={styles.switchRow}>
                <Text style={styles.switchLabel}>Active</Text>
                <Switch
                  value={!!editForm?.active}
                  onValueChange={(v) => setEditForm((prev: any) => ({ ...prev, active: v }))}
                />
              </View>

              <Text style={styles.detailsSectionTitle}>Media (up to 8 images, 2 videos)</Text>
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

              <Text style={styles.detailsSectionTitle}>Editable availability (Days & Slots)</Text>
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

  if (Platform.OS === 'web') return <WebLayout>{content}</WebLayout>;
  return content;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    backgroundColor: '#FFFFFF',
    padding: 12,
    paddingTop: 48,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    overflow: 'visible' as any,
    zIndex: 50,
  },
  webHeader: {
    paddingTop: 12,
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  headerTitleBlock: {
    flex: 1,
    minWidth: 0,
    paddingRight: 8,
  },
  headerAddButton: {
    flexShrink: 0,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#212121',
  },
  subtitle: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  list: {
    padding: 16,
    zIndex: 1,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
  },
  actionsCard: {
    marginTop: -4,
    marginBottom: 12,
    backgroundColor: '#FFF9E6',
    padding: 14,
  },
  actionsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#212121',
    marginBottom: 8,
  },
  approvalText: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 12,
  },
  ownerInfo: {
    marginBottom: 10,
  },
  ownerLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  ownerText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  actionsButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  filtersWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-end',
    gap: 10,
  },
  filtersGroup: {
    minWidth: 190,
  },
  filtersLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#374151',
  },
  dropdownOuter: {
    position: 'relative',
  },
  dropdownButton: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    minWidth: 160,
  },
  dropdownButtonOpen: {
    borderColor: '#dc8d3c',
    backgroundColor: 'rgba(220,141,60,0.08)',
  },
  dropdownButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#374151',
  },
  dropdownMenu: {
    position: 'absolute',
    top: 40,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingVertical: 6,
    zIndex: 10000,
    elevation: 50,
  },
  dropdownOption: {
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  dropdownOptionActive: {
    backgroundColor: 'rgba(220,141,60,0.12)',
  },
  dropdownOptionText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#374151',
  },
  dropdownOptionTextActive: {
    color: '#dc8d3c',
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  chipActive: {
    borderColor: '#dc8d3c',
    backgroundColor: 'rgba(220,141,60,0.12)',
  },
  chipText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#374151',
  },
  chipTextActive: {
    color: '#dc8d3c',
  },
  viewToggle: {
    flexDirection: 'row',
    gap: 8,
  },
  viewToggleOption: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  viewToggleOptionActive: {
    borderColor: '#dc8d3c',
    backgroundColor: 'rgba(220,141,60,0.12)',
  },
  viewToggleText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#374151',
  },
  viewToggleTextActive: {
    color: '#dc8d3c',
  },
  controlsRow: {
    marginTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    flexWrap: 'wrap',
  },
  tileItem: {
    flex: 1,
    alignSelf: 'stretch',
    marginHorizontal: 6,
    marginBottom: 12,
    minWidth: 0,
  },
  listRowOuter: {
    marginBottom: 12,
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  listThumb: {
    width: 72,
    height: 54,
    borderRadius: 8,
    backgroundColor: '#E0E0E0',
  },
  listMain: {
    flex: 1,
  },
  listTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#212121',
    marginBottom: 4,
  },
  listSub: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
    marginBottom: 6,
  },
  listScheduleLine: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 2,
  },
  listMetaRow: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
  },
  listMeta: {
    fontSize: 12,
    fontWeight: '700',
    color: '#374151',
  },
  listBadges: {
    alignItems: 'flex-end',
    gap: 6,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    fontSize: 11,
    fontWeight: '800',
    color: '#374151',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  badgeApproved: {
    borderColor: '#4CAF50',
    color: '#4CAF50',
    backgroundColor: 'rgba(76,175,80,0.10)',
  },
  badgePending: {
    borderColor: '#F57C00',
    color: '#F57C00',
    backgroundColor: 'rgba(245,124,0,0.10)',
  },
  badgeActive: {
    borderColor: '#dc8d3c',
    color: '#dc8d3c',
    backgroundColor: 'rgba(220,141,60,0.10)',
  },
  badgeInactive: {
    borderColor: '#9CA3AF',
    color: '#6B7280',
    backgroundColor: 'rgba(156,163,175,0.10)',
  },
  listDetailsCard: {
    marginTop: 10,
    padding: 14,
    backgroundColor: '#FFF9E6',
    borderRadius: 12,
  },
  detailsTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#212121',
    marginBottom: 8,
  },
  detailsSectionTitle: {
    fontSize: 12,
    fontWeight: '900',
    color: '#374151',
    marginTop: 8,
    marginBottom: 4,
  },
  detailsText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 6,
  },
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 10,
  },
  detailsGridItem: {
    minWidth: 160,
    flex: 1,
  },
  detailsGridLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#6B7280',
    marginBottom: 4,
  },
  detailsGridValue: {
    fontSize: 12,
    fontWeight: '800',
    color: '#111827',
  },
  detailsActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 10,
  },
  formWrap: {
    marginTop: 10,
  },
  formTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: '#212121',
    marginBottom: 10,
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
  surfaceFieldLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#374151',
    marginBottom: 6,
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
  modalFooter: {
    marginTop: 12,
  },
  createFormSection: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
  },
});

