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
  TouchableOpacity,
} from 'react-native';
import { supabase } from '@/lib/supabase';
import { GroundWithImages } from '@/types';
import GroundCard from '@/components/grounds/GroundCard';
import Card from '@/components/ui/Card';
import WebLayout from '@/components/web/WebLayout';
import MobileAppNavbar from '@/components/MobileAppNavbar';
import { useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
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
  const { width } = useWindowDimensions();
  const isWeb = Platform.OS === 'web';
  const isSmallWeb = isWeb && width < 1024;
  const isMobile = width < 768;

  const params = useLocalSearchParams();
  const ownerIdParam = Array.isArray(params.ownerId) ? params.ownerId[0] : params.ownerId;
  const createParam = Array.isArray(params.create) ? params.create[0] : params.create;

  const { user } = useAuth();
  const [grounds, setGrounds] = useState<GroundWithImages[]>([]);
  const [loading, setLoading] = useState(true);
  const [occupancyRates, setOccupancyRates] = useState<Record<string, number>>({});
  const [selectedGround, setSelectedGround] = useState<GroundWithImages | null>(null);
  const [isActionsModalOpen, setIsActionsModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'tiles' | 'list'>('tiles');
  const [locationFilter, setLocationFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const [createOpen, setCreateOpen] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);

  const [editOpen, setEditOpen] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [savingAvailability, setSavingAvailability] = useState(false);
  const [uploadingMedia, setUploadingMedia] = useState(false);

  const [editForm, setEditForm] = useState<any>(null);
  const availabilityRef = React.useRef<TimeSlotsEditorHandle | null>(null);
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null);
  const [allLocations, setAllLocations] = useState<any[]>([]);
  const [createForm, setCreateForm] = useState<any>({
    name: '',
    description: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    // base_price_per_hour removed
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
      
      const query = searchQuery.toLowerCase().trim();
      const owner = (g as any).owner;
      const ownerInfo = Array.isArray(owner) ? owner[0] : owner;
      
      const matchesSearch = !query || 
        g.name?.toLowerCase().includes(query) || 
        g.city?.toLowerCase().includes(query) || 
        g.address?.toLowerCase().includes(query) ||
        ownerInfo?.business_name?.toLowerCase().includes(query) ||
        ownerInfo?.full_name?.toLowerCase().includes(query) ||
        ownerInfo?.phone?.toLowerCase().includes(query);

      return matchesLocation && matchesType && matchesSearch;
    });
  }, [grounds, locationFilter, typeFilter, searchQuery]);

  const showApproveOption = selectedGround ? !groundIsApproved(selectedGround) : false;

  useEffect(() => {
    loadGrounds();
    loadLocations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ownerIdParam]);

  const loadLocations = async () => {
    try {
      const { data, error } = await supabase
        .from('locations')
        .select('*')
        .eq('active', true)
        .order('sort_order', { ascending: true });
      
      if (error) throw error;
      setAllLocations(data || []);
    } catch (err) {
      console.error('Error loading locations:', err);
    }
  };

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

      // Fetch global occupancy for admin
      const { data: occData, error: occError } = await supabase.rpc('get_all_grounds_occupancy');
      if (!occError && occData) {
        const mapping: Record<string, number> = {};
        occData.forEach((row: any) => {
          mapping[row.ground_id] = row.occupancy_percentage;
        });
        setOccupancyRates(mapping);
      }
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
      setIsActionsModalOpen(false);
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
      // base_price_per_hour removed
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
      // base_price_per_hour removed
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
        // base_price_per_hour removed
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
        setIsActionsModalOpen(false);
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
      let uri = asset.uri;

      // Resize and compress if it's an image
      const isImage = asset.mimeType?.startsWith('image/') || 
                     !asset.mimeType?.startsWith('video/'); // Fallback check

      if (isImage) {
        try {
          const manipResult = await ImageManipulator.manipulateAsync(
            uri,
            [{ resize: { width: 1000 } }], // Resize to max 1000px width
            { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
          );
          uri = manipResult.uri;
        } catch (manipError) {
          console.warn('Image manipulation failed, using original:', manipError);
        }
      }

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
        // base_price_per_hour removed
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

  const handleDuplicateGround = async (ground: GroundWithImages) => {
    try {
      setDuplicatingId(ground.id);
      
      // 1. Create Ground Copy
      const groundPayload = {
        owner_id: ground.owner_id,
        name: `${ground.name} (Copy)`,
        description: ground.description,
        address: ground.address,
        city: ground.city,
        state: ground.state,
        pincode: ground.pincode,
        base_price_per_hour: ground.base_price_per_hour,
        pitch_type: ground.pitch_type,
        cricket_pitch_surface: (ground as any).cricket_pitch_surface,
        ground_size: ground.ground_size,
        capacity: ground.capacity,
        has_floodlights: (ground as any).has_floodlights,
        has_parking: (ground as any).has_parking,
        has_changing_rooms: (ground as any).has_changing_rooms,
        has_pavilion: (ground as any).has_pavilion,
        verified: (ground as any).verified,
        approved: (ground as any).approved,
        active: (ground as any).active,
        latitude: (ground as any).latitude,
        longitude: (ground as any).longitude,
      };

      const { data: newGround, error: groundError } = await supabase
        .from('grounds')
        .insert(groundPayload)
        .select('id')
        .single();

      if (groundError) throw groundError;

      // 2. Copy Images
      if (ground.ground_images && ground.ground_images.length > 0) {
        const imageRows = ground.ground_images.map(img => ({
          ground_id: newGround.id,
          image_url: img.image_url,
          is_primary: img.is_primary,
          display_order: img.display_order,
        }));
        const { error: imageError } = await supabase.from('ground_images').insert(imageRows);
        if (imageError) console.error('Error copying images:', imageError);
      }

      // 3. Copy Time Slots
      const { data: oldSlots, error: slotsFetchError } = await supabase
        .from('time_slots')
        .select('*')
        .eq('ground_id', ground.id);
      
      if (slotsFetchError) {
        console.error('Error fetching old slots:', slotsFetchError);
      } else if (oldSlots && oldSlots.length > 0) {
        const newSlots = oldSlots.map(slot => ({
          ground_id: newGround.id,
          day_of_week: slot.day_of_week,
          start_time: slot.start_time,
          end_time: slot.end_time,
          custom_price: slot.custom_price,
          is_available: slot.is_available,
        }));
        const { error: slotsInsertError } = await supabase.from('time_slots').insert(newSlots);
        if (slotsInsertError) console.error('Error copying slots:', slotsInsertError);
      } else {
        // Fallback to defaults if no slots found
        await ensureDefaultTimeSlotsForGround({
          groundId: newGround.id,
          pitchType: ground.pitch_type,
          supabaseClient: supabase,
        });
      }

      if (Platform.OS === 'web') alert('Ground duplicated successfully!');
      else Alert.alert('Success', 'Ground duplicated successfully!');
      
      loadGrounds();
      setIsActionsModalOpen(false);
    } catch (e: any) {
      console.error('Error duplicating ground:', e);
      if (Platform.OS === 'web') alert(e?.message ?? 'Failed to duplicate ground');
      else Alert.alert('Error', e?.message ?? 'Failed to duplicate ground');
    } finally {
      setDuplicatingId(null);
    }
  };

  const handleExportGround = async (ground: GroundWithImages) => {
    const ownerName = (ground as any).owner?.business_name || (ground as any).owner?.full_name || 'N/A';
    
    // Fetch time slots for detailed export
    const { data: slots } = await supabase
      .from('time_slots')
      .select('day_of_week, start_time, end_time, custom_price, is_available')
      .eq('ground_id', ground.id);

    // Construct simplified object for export
    const exportData: any = {
      Id: ground.id,
      Name: ground.name,
      Description: ground.description,
      Address: ground.address,
      City: ground.city,
      State: ground.state,
      Pincode: ground.pincode,
      Price_per_hour: ground.base_price_per_hour,
      Pitch_Type: ground.pitch_type,
      Pitch_Surface: (ground as any).cricket_pitch_surface,
      Ground_Size: ground.ground_size,
      Capacity: ground.capacity,
      Floodlights: (ground as any).has_floodlights ? 'Yes' : 'No',
      Parking: (ground as any).has_parking ? 'Yes' : 'No',
      Changing_Rooms: (ground as any).has_changing_rooms ? 'Yes' : 'No',
      Pavilion: (ground as any).has_pavilion ? 'Yes' : 'No',
      Washrooms: (ground as any).has_washrooms ? 'Yes' : 'No',
      Verified: (ground as any).verified ? 'Yes' : 'No',
      Approved: (ground as any).approved ? 'Yes' : 'No',
      Active: (ground as any).active ? 'Yes' : 'No',
      Latitude: (ground as any).latitude,
      Longitude: (ground as any).longitude,
      Owner_Name: ownerName,
      Owner_Phone: (ground as any).owner?.phone || 'N/A',
      Created_At: (ground as any).created_at,
      Time_Slots: slots || [],
      Images: (ground.ground_images ?? []).map(img => ({
        url: img.image_url,
        is_primary: img.is_primary,
        display_order: img.display_order
      }))
    };

    if (Platform.OS === 'web') {
      const jsonStr = JSON.stringify(exportData, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `ground_${ground.name?.replace(/\s+/g, '_')}_export.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } else {
      Alert.alert('Export', 'JSON export for this ground:\n\n' + JSON.stringify(exportData, null, 2).substring(0, 400) + '...');
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
            title={duplicatingId === ground.id ? "..." : "Duplicate"}
            onPress={() => handleDuplicateGround(ground)}
            variant="outline"
            size="small"
            style={{ flex: 1 }}
            disabled={duplicatingId != null}
          />

          <Button
            title="Delete"
            onPress={() => handleDeleteGround(ground.id)}
            variant="danger"
            size="small"
            style={{ flex: 1 }}
          />

          <Button
            title="Export"
            onPress={() => handleExportGround(ground)}
            variant="outline"
            size="small"
            style={{ flex: 1 }}
          />
        </View>
      </Card>
    );
  };

  const handleImportGround = async () => {
    if (Platform.OS !== 'web') {
      Alert.alert('Import', 'Import feature is currently available on Web only.');
      return;
    }

    try {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json';
      input.onchange = async (e: any) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (event: any) => {
          try {
            const data = JSON.parse(event.target.result);
            
            if (!data.Name || !data.Address || !data.City) {
              alert('Invalid ground data format. Missing Name, Address, or City.');
              return;
            }

            const ok = window.confirm(`Import ground "${data.Name}" by owner "${data.Owner_Name}"?`);
            if (!ok) return;

            setLoading(true);
            
            let targetOwnerId = user?.id;
            
            if (data.Owner_Phone && data.Owner_Phone !== 'N/A') {
               const { data: ownerProfile, error: ownerErr } = await supabase
                 .from('profiles')
                 .select('id')
                 .eq('phone', data.Owner_Phone)
                 .limit(1)
                 .maybeSingle();
               if (ownerProfile) targetOwnerId = ownerProfile.id;
            }

            const payload: any = {
              owner_id: targetOwnerId,
              name: data.Name,
              description: data.Description,
              address: data.Address,
              city: data.City,
              state: data.State,
              pincode: data.Pincode,
              base_price_per_hour: data.Price_per_hour || 0,
              pitch_type: data.Pitch_Type,
              cricket_pitch_surface: data.Pitch_Surface,
              ground_size: data.Ground_Size,
              capacity: data.Capacity,
              has_floodlights: data.Floodlights === 'Yes',
              has_parking: data.Parking === 'Yes',
              has_changing_rooms: data.Changing_Rooms === 'Yes',
              has_pavilion: data.Pavilion === 'Yes',
              has_washrooms: data.Washrooms === 'Yes',
              verified: data.Verified === 'Yes',
              approved: data.Approved === 'Yes',
              active: data.Active === 'Yes',
              latitude: data.Latitude,
              longitude: data.Longitude,
            };

            const { data: created, error } = await supabase
              .from('grounds')
              .insert(payload)
              .select('id')
              .single();

            if (error) throw error;

            if (data.Time_Slots && Array.isArray(data.Time_Slots) && data.Time_Slots.length > 0) {
               // We might have some slots already from a trigger or ensureDefault? 
               // Delete just in case to avoid duplicates
               await supabase.from('time_slots').delete().eq('ground_id', created.id);
               
               const slotsToInsert = data.Time_Slots.map((s: any) => ({
                 ground_id: created.id,
                 day_of_week: s.day_of_week,
                 start_time: s.start_time,
                 end_time: s.end_time,
                 custom_price: s.custom_price,
                 is_available: s.is_available,
               }));
               
               const { error: slotsErr } = await supabase.from('time_slots').insert(slotsToInsert);
               if (slotsErr) console.warn('Error importing time slots:', slotsErr);
            } else {
               await ensureDefaultTimeSlotsForGround({
                 groundId: created.id,
                 pitchType: payload.pitch_type,
                 supabaseClient: supabase,
               });
            }

            if (data.Images && Array.isArray(data.Images) && data.Images.length > 0) {
               const imagesToInsert = data.Images.map((img: any) => ({
                 ground_id: created.id,
                 image_url: img.url,
                 is_primary: img.is_primary,
                 display_order: img.display_order
               }));
               await supabase.from('ground_images').insert(imagesToInsert);
            }

            alert(`Ground "${data.Name}" imported successfully!`);
            loadGrounds();
          } catch (err: any) {
            alert('Error parsing or importing file: ' + err.message);
          } finally {
            setLoading(false);
          }
        };
        reader.readAsText(file);
      };
      input.click();
    } catch (err: any) {
      alert('Error: ' + err.message);
    }
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
      {isWeb && (
        <View style={[styles.header, styles.webHeader, (isMobile || isSmallWeb) && { padding: 16 }]}>
          <View style={[
            styles.compactHeaderRow,
            (isMobile || isSmallWeb) && { flexDirection: 'column', alignItems: 'stretch', gap: 12 }
          ]}>
            <View style={styles.titleSection}>
              <Text style={styles.title}>Grounds</Text>
            </View>

            <View style={styles.searchSection}>
              <TextInput
                style={styles.searchInputFlat}
                placeholder="Search grounds..."
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>

            <View style={[styles.filtersSection, (isMobile || isSmallWeb) && { flex: 0, justifyContent: 'flex-start', gap: 8 }]}>
              <FilterDropdown
                options={locationOptions}
                value={locationFilter}
                onChange={setLocationFilter}
              />
              <FilterDropdown
                options={typeOptions}
                value={typeFilter}
                onChange={setTypeFilter}
              />
            </View>

            <TouchableOpacity
              onPress={handleImportGround}
              style={[styles.importButtonFlat, (isMobile || isSmallWeb) && { alignSelf: 'flex-start' }]}
            >
              <Text style={styles.importButtonText}>Import JSON</Text>
            </TouchableOpacity>
          </View>

        </View>
      )}

      {isWeb && filteredGrounds.length > 0 && (
        isSmallWeb || isMobile ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} bounces={false}>
            <View style={[styles.tableHeaderContainer, { minWidth: 1000, marginHorizontal: 0, paddingHorizontal: 16 }]}>
              <View style={styles.tableHeaderRow}>
                <Text style={[styles.tableHeaderCell, styles.colGround]}>Ground</Text>
                <Text style={[styles.tableHeaderCell, styles.colOwner]}>Owner</Text>
                <Text style={[styles.tableHeaderCell, styles.colLocation]}>Location</Text>
                <Text style={[styles.tableHeaderCell, styles.colPrice]}>Price & Type</Text>
                <Text style={[styles.tableHeaderCell, styles.colStatus]}>Status</Text>
                <Text style={[styles.tableHeaderCell, styles.colActions]}>Actions</Text>
              </View>
            </View>
          </ScrollView>
        ) : (
          <View style={styles.tableHeaderContainer}>
            <View style={[styles.tableHeaderRow, { width: '100%' }]}>
              <Text style={[styles.tableHeaderCell, styles.colGround]}>Ground</Text>
              <Text style={[styles.tableHeaderCell, styles.colOwner]}>Owner</Text>
              <Text style={[styles.tableHeaderCell, styles.colLocation]}>Location</Text>
              <Text style={[styles.tableHeaderCell, styles.colPrice]}>Price & Type</Text>
              <Text style={[styles.tableHeaderCell, styles.colStatus]}>Status</Text>
              <Text style={[styles.tableHeaderCell, styles.colActions]}>Actions</Text>
            </View>
          </View>
        )
      )}

      {createOpen ? (
        <View style={styles.createFormSection}>
          <View style={styles.tableDetailsSection}>
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

                <View style={[styles.formInput, { paddingHorizontal: 0, paddingVertical: 0, zIndex: 100, position: 'relative', overflow: 'visible' }]}>
                  <FilterDropdown
                    options={['Select Location', ...allLocations.map(loc => `${loc.city}, ${loc.state}`)]}
                    value={createForm.city ? `${createForm.city}, ${createForm.state}` : 'Select Location'}
                    onChange={(v) => {
                      if (v === 'Select Location') return;
                      const [city, state] = v.split(', ');
                      setCreateForm({ ...createForm, city, state });
                    }}
                  />
                </View>

                <View style={styles.formRow2}>
                  <TextInput
                    style={[styles.formInput, styles.formInputHalf]}
                    value={String(createForm.pincode ?? '')}
                    onChangeText={(t) => setCreateForm({ ...createForm, pincode: t })}
                    placeholder="Pincode"
                  />
                  {/* base_price_per_hour removed */}
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
          </View>
        </View>
      ) : null}

      <FlatList
        data={filteredGrounds}
        renderItem={({ item }) => {
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

          const ownerPhone = (latestGround as any).owner?.phone || '—';

          if (isWeb && !isSmallWeb) {
            return (
              <View style={styles.tableRowContainer}>
                <TouchableOpacity
                  onPress={() => {
                    setSelectedGround(latestGround);
                    setIsActionsModalOpen(true);
                  }}
                  activeOpacity={0.8}
                  style={styles.tableRow}
                >
                  <View style={[styles.tableCell, styles.colGround]}>
                    <View style={styles.tableGroundInfo}>
                      <Image source={{ uri: primaryImage }} style={styles.tableThumb} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.groundName} numberOfLines={1} ellipsizeMode="tail">{latestGround.name}</Text>
                        <Text style={styles.groundType} numberOfLines={1}>{latestGround.pitch_type}</Text>
                      </View>
                    </View>
                  </View>

                  <View style={[styles.tableCell, styles.colOwner]}>
                    <Text style={styles.ownerName}>{ownerName}</Text>
                    <Text style={styles.ownerPhone}>{ownerPhone}</Text>
                  </View>

                  <View style={[styles.tableCell, styles.colLocation]}>
                    <Text style={styles.locationText}>{latestGround.city}, {latestGround.state}</Text>
                  </View>

                  <View style={[styles.tableCell, styles.colPrice]}>
                    <Text style={styles.priceText}>Price set in Availability</Text>
                  </View>

                  <View style={[styles.tableCell, styles.colStatus]}>
                    <View style={styles.statusBadges}>
                        <View style={[styles.miniBadge, isApproved ? styles.miniBadgeApproved : styles.miniBadgePending]}>
                            <Text style={[styles.miniBadgeText, isApproved ? styles.miniBadgeTextApproved : styles.miniBadgeTextPending]}>
                                {isApproved ? 'Approved' : 'Pending'}
                            </Text>
                        </View>
                        <View style={[styles.miniBadge, latestGround.active ? styles.miniBadgeActive : styles.miniBadgeInactive]}>
                            <Text style={[styles.miniBadgeText, latestGround.active ? styles.miniBadgeTextActive : styles.miniBadgeTextInactive]}>
                                {latestGround.active ? 'Active' : 'Inactive'}
                            </Text>
                        </View>
                    </View>
                  </View>

                  <View style={[styles.tableCell, styles.colActions]}>
                    <Text style={{ fontSize: 12, color: '#6b7280' }}>Click to manage</Text>
                  </View>
                </TouchableOpacity>

                {/* Modal actions replaced inline expansion */}
              </View>
            );
          }

          if (isWeb && isSmallWeb) {
            return (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} bounces={false}>
                <View style={[styles.tableRowContainer, { minWidth: 1000 }]}>
                  <TouchableOpacity
                    onPress={() => {
                      setSelectedGround(latestGround);
                      setIsActionsModalOpen(true);
                    }}
                    activeOpacity={0.8}
                    style={styles.tableRow}
                  >
                    <View style={[styles.tableCell, styles.colGround]}>
                      <View style={styles.tableGroundInfo}>
                        <Image source={{ uri: primaryImage }} style={styles.tableThumb} />
                        <View style={{ flex: 1 }}>
                          <Text style={styles.groundName} numberOfLines={1} ellipsizeMode="tail">{latestGround.name}</Text>
                          <Text style={styles.groundType} numberOfLines={1}>{latestGround.pitch_type}</Text>
                        </View>
                      </View>
                    </View>

                    <View style={[styles.tableCell, styles.colOwner]}>
                      <Text style={styles.ownerName}>{ownerName}</Text>
                      <Text style={styles.ownerPhone}>{ownerPhone}</Text>
                    </View>

                    <View style={[styles.tableCell, styles.colLocation]}>
                      <Text style={styles.locationText}>{latestGround.city}, {latestGround.state}</Text>
                    </View>

                    <View style={[styles.tableCell, styles.colPrice]}>
                      <Text style={styles.priceText}>Price set in Availability</Text>
                    </View>

                    <View style={[styles.tableCell, styles.colStatus]}>
                      <View style={styles.statusBadges}>
                          <View style={[styles.miniBadge, isApproved ? styles.miniBadgeApproved : styles.miniBadgePending]}>
                              <Text style={[styles.miniBadgeText, isApproved ? styles.miniBadgeTextApproved : styles.miniBadgeTextPending]}>
                                  {isApproved ? 'Approved' : 'Pending'}
                              </Text>
                          </View>
                          <View style={[styles.miniBadge, latestGround.active ? styles.miniBadgeActive : styles.miniBadgeInactive]}>
                              <Text style={[styles.miniBadgeText, latestGround.active ? styles.miniBadgeTextActive : styles.miniBadgeTextInactive]}>
                                  {latestGround.active ? 'Active' : 'Inactive'}
                              </Text>
                          </View>
                      </View>
                    </View>

                    <View style={[styles.tableCell, styles.colActions]}>
                      <Text style={{ fontSize: 12, color: '#6b7280' }}>Click to manage</Text>
                    </View>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            );
          }

          if (viewMode === 'tiles') {
            return (
              <View style={styles.tileItem}>
                <GroundCard
                  ground={latestGround}
                  showBookingSchedule
                  occupancyRate={occupancyRates[item.id] ?? null}
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
                      Price set in Availability
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
                      title={duplicatingId === latestGround.id ? "..." : "Duplicate"}
                      onPress={() => handleDuplicateGround(latestGround)}
                      variant="outline"
                      size="small"
                      style={{ flex: 1 }}
                      disabled={duplicatingId != null}
                    />
                    <Button
                      title="Delete"
                      onPress={() => handleDeleteGround(latestGround.id)}
                      variant="danger"
                      size="small"
                      style={{ flex: 1 }}
                    />
                    <Button
                      title="Export"
                      onPress={() => handleExportGround(latestGround)}
                      variant="outline"
                      size="small"
                      style={{ flex: 1 }}
                    />
                  </View>
                </Card>
              ) : null}
            </View>
          );
        }}
        keyExtractor={(item) => item.id}
        extraData={{ grounds, selectedGround, viewMode, searchQuery }}
        contentContainerStyle={styles.list}
        key={`grounds-${viewMode}-${numColumns}`}
        numColumns={Platform.OS === 'web' ? 1 : numColumns}
        columnWrapperStyle={Platform.OS === 'web' ? undefined : tilesColumnWrapperStyle}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={loadGrounds} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No grounds found</Text>
          </View>
        }
      />

      {/* Actions Modal */}
      <Modal
        transparent
        visible={isActionsModalOpen && !!selectedGround}
        animationType="fade"
        onRequestClose={() => setIsActionsModalOpen(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setIsActionsModalOpen(false)} />
        <View style={styles.actionsModalWrap}>
          <View style={styles.actionsModalHeader}>
            <View>
              <Text style={styles.actionsModalTitle}>{selectedGround?.name}</Text>
              <Text style={styles.actionsModalSubtitle}>Management Options</Text>
            </View>
            <TouchableOpacity onPress={() => setIsActionsModalOpen(false)}>
              <Text style={styles.closeActionsText}>Close</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.actionsModalBody}>
            {showApproveOption && (
              <TouchableOpacity 
                style={styles.actionModalItem}
                onPress={() => {
                  setIsActionsModalOpen(false);
                  updateGroundStatus(selectedGround!.id, true);
                }}
              >
                <View style={[styles.actionIconBox, { backgroundColor: '#DEF7EC' }]}>
                  <Text style={{ color: '#03543F', fontWeight: '800' }}>A</Text>
                </View>
                <View>
                  <Text style={styles.actionItemTitle}>Approve Ground</Text>
                  <Text style={styles.actionItemDesc}>Approve this ground for listings</Text>
                </View>
              </TouchableOpacity>
            )}

            <TouchableOpacity 
              style={styles.actionModalItem}
              onPress={() => {
                setIsActionsModalOpen(false);
                startEditGround(selectedGround!);
              }}
            >
              <View style={[styles.actionIconBox, { backgroundColor: '#DBEAFE' }]}>
                <Text style={{ color: '#2563EB', fontWeight: '800' }}>E</Text>
              </View>
              <View>
                <Text style={styles.actionItemTitle}>Full Edit</Text>
                <Text style={styles.actionItemDesc}>Modify ground details, pricing, and images</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.actionModalItem}
              onPress={() => {
                setIsActionsModalOpen(false);
                handleDuplicateGround(selectedGround!);
              }}
              disabled={duplicatingId != null}
            >
              <View style={[styles.actionIconBox, { backgroundColor: '#F0F9FF' }]}>
                <Text style={{ color: '#0EA5E9', fontWeight: '800' }}>D</Text>
              </View>
              <View>
                <Text style={styles.actionItemTitle}>{duplicatingId === selectedGround?.id ? 'Duplicating...' : 'Duplicate'}</Text>
                <Text style={styles.actionItemDesc}>Create a copy of this ground</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.actionModalItem}
              onPress={() => {
                setIsActionsModalOpen(false);
                handleExportGround(selectedGround!);
              }}
            >
              <View style={[styles.actionIconBox, { backgroundColor: '#FEF3C7' }]}>
                <Text style={{ color: '#D97706', fontWeight: '800' }}>X</Text>
              </View>
              <View>
                <Text style={styles.actionItemTitle}>Export Info</Text>
                <Text style={styles.actionItemDesc}>Download ground data as JSON</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.actionModalItem, { borderBottomWidth: 0 }]}
              onPress={() => {
                setIsActionsModalOpen(false);
                handleDeleteGround(selectedGround!.id);
              }}
            >
              <View style={[styles.actionIconBox, { backgroundColor: '#FEE2E2' }]}>
                <Text style={{ color: '#DC2626', fontWeight: '800' }}>R</Text>
              </View>
              <View>
                <Text style={styles.actionItemTitle}>Remove Ground</Text>
                <Text style={styles.actionItemDesc}>Permanently delete this ground</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

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
              <View style={[styles.formInput, { paddingHorizontal: 0, paddingVertical: 0, zIndex: 100, position: 'relative', overflow: 'visible' }]}>
                <FilterDropdown
                  options={['Select Location', ...allLocations.map(loc => `${loc.city}, ${loc.state}`)]}
                  value={editForm?.city ? `${editForm.city}, ${editForm.state}` : 'Select Location'}
                  onChange={(v) => {
                    if (v === 'Select Location') return;
                    const [city, state] = v.split(', ');
                    setEditForm((prev: any) => ({ ...prev, city, state }));
                  }}
                />
              </View>
              <View style={styles.formRow2}>
                <TextInput
                  style={[styles.formInput, styles.formInputHalf]}
                  value={String(editForm?.pincode ?? '')}
                  onChangeText={(t) => setEditForm((prev: any) => ({ ...prev, pincode: t }))}
                  placeholder="Pincode"
                />
                  {/* base_price_per_hour removed */}
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

  return (
    <>
      {Platform.OS === 'web' ? (
        <WebLayout>{content}</WebLayout>
      ) : (
        <View style={{ flex: 1, backgroundColor: '#F5F5F5' }}>
          <MobileAppNavbar title="PLATFORM GROUNDS" titleColor="#10b981" />
          {content}
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  webHeader: {
    paddingTop: 16,
    paddingBottom: 16,
  },
  compactHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  titleSection: {
    marginRight: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    fontFamily: 'Inter',
  },
  searchSection: {
    flex: 1,
    maxWidth: 400,
  },
  searchInputFlat: {
    height: 36,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 13,
    color: '#111827',
    fontFamily: 'Inter',
  },
  filtersSection: {
    flexDirection: 'row',
    gap: 8,
  },
  importButtonFlat: {
    height: 36,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  importButtonText: {
    color: '#16A34A',
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'Inter',
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
  searchBox: {
    flex: 1,
    minWidth: 280,
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 40,
    justifyContent: 'center',
  },
  searchInput: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
  },
  tableHeaderContainer: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  tableHeaderRow: {
    flexDirection: 'row',
  },
  tableHeaderCell: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontFamily: 'Inter',
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    width: '100%',
  },
  tableRowSelected: {
    backgroundColor: '#F9FAFB',
  },
  tableCell: {
    paddingRight: 12,
  },
  colGround: { flex: 2 },
  colOwner: { flex: 1.5 },
  colLocation: { flex: 1.5 },
  colPrice: { flex: 1 },
  colStatus: { flex: 1.5 },
  colActions: { flex: 1.2 },
  
  tableGroundInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  tableThumb: {
    width: 44,
    height: 36,
    borderRadius: 6,
    backgroundColor: '#E5E7EB',
  },
  groundName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
    fontFamily: 'Inter',
  },
  groundType: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 1,
    fontFamily: 'Inter',
  },
  ownerName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
    fontFamily: 'Inter',
  },
  ownerPhone: {
    fontSize: 11,
    color: '#6B7280',
    fontFamily: 'Inter',
  },
  locationText: {
    fontSize: 12,
    color: '#4B5563',
    fontFamily: 'Inter',
  },
  priceText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#111827',
    fontFamily: 'Inter',
  },
  statusBadges: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
  },
  miniBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  miniBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  miniBadgeApproved: { borderColor: '#bbf7d0', backgroundColor: '#f0fdf4' },
  miniBadgeTextApproved: { color: '#16a34a' },
  miniBadgePending: { borderColor: '#fed7aa', backgroundColor: '#fff7ed' },
  miniBadgeTextPending: { color: '#ea580c' },
  miniBadgeActive: { borderColor: '#bbf7d0', backgroundColor: '#f0fdf4' },
  miniBadgeTextActive: { color: '#10b981' },
  miniBadgeInactive: { borderColor: '#e5e7eb', backgroundColor: '#f9fafb' },
  miniBadgeTextInactive: { color: '#6B7280' },
  
  tableRowActions: {
    flexDirection: 'row',
    gap: 8,
  },
  iconButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  detailsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  detailsTableContent: {
    flexDirection: 'row',
    gap: 20,
  },
  detailsCol: {
    flex: 1,
  },
  detailsColActions: {
    width: 140,
    justifyContent: 'flex-start',
  },
  amenitiesWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  amenityTag: {
    fontSize: 11,
    fontWeight: '600',
    color: '#4b5563',
    backgroundColor: '#fff',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e5e7eb',
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
    zIndex: 100,
  },
  filtersGroup: {
    minWidth: 190,
    zIndex: 50,
  },
  filtersLabel: {
    fontSize: 11,
    fontWeight: '300',
    color: '#374151',
    fontFamily: Platform.OS === 'web' ? '"Inter", sans-serif' : undefined,
  },
  dropdownOuter: {
    position: 'relative',
  },
  dropdownButton: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 0,
    height: 36,
    justifyContent: 'center',
    minWidth: 140,
  },
  dropdownButtonOpen: {
    borderColor: '#10b981',
    backgroundColor: 'rgba(220,141,60,0.08)',
  },
  dropdownButtonText: {
    fontSize: 14,
    fontWeight: '300',
    color: '#374151',
    fontFamily: Platform.OS === 'web' ? '"Inter", sans-serif' : undefined,
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
    fontWeight: '300',
    color: '#111827',
    fontFamily: Platform.OS === 'web' ? '"Inter", sans-serif' : undefined,
  },
  dropdownOptionTextActive: {
    color: '#10b981',
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
    borderColor: '#10b981',
    backgroundColor: 'rgba(220,141,60,0.12)',
  },
  chipText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#374151',
  },
  chipTextActive: {
    color: '#10b981',
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
    borderColor: '#10b981',
    backgroundColor: 'rgba(220,141,60,0.12)',
  },
  viewToggleText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#374151',
  },
  viewToggleTextActive: {
    color: '#10b981',
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
    borderColor: '#10b981',
    color: '#10b981',
    backgroundColor: 'rgba(220,141,60,0.10)',
  },
  badgeInactive: {
    borderColor: '#9CA3AF',
    color: '#6B7280',
    backgroundColor: 'rgba(156,163,175,0.10)',
  },
  tableDetailsSection: {
    padding: 24,
    backgroundColor: '#F9FAFB',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  detailsTitle: {
    fontSize: 14,
    fontWeight: '300',
    color: '#212121',
    fontFamily: Platform.OS === 'web' ? '"Inter", sans-serif' : undefined,
    marginBottom: 8,
  },
  detailsSectionTitle: {
    fontSize: 12,
    fontWeight: '300',
    color: '#374151',
    fontFamily: Platform.OS === 'web' ? '"Inter", sans-serif' : undefined,
    marginTop: 8,
    marginBottom: 4,
  },
  detailsText: {
    fontSize: 13,
    fontWeight: '300',
    color: '#374151',
    fontFamily: Platform.OS === 'web' ? '"Inter", sans-serif' : undefined,
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
    fontWeight: '300',
    color: '#6B7280',
    fontFamily: Platform.OS === 'web' ? '"Inter", sans-serif' : undefined,
    marginBottom: 4,
  },
  detailsGridValue: {
    fontSize: 12,
    fontWeight: '300',
    color: '#111827',
    fontFamily: Platform.OS === 'web' ? '"Inter", sans-serif' : undefined,
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
    fontWeight: '300',
    color: '#212121',
    fontFamily: Platform.OS === 'web' ? '"Inter", sans-serif' : undefined,
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
    fontWeight: '300',
    color: '#111827',
    fontFamily: Platform.OS === 'web' ? '"Inter", sans-serif' : undefined,
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
    fontWeight: '300',
    color: '#374151',
    fontFamily: Platform.OS === 'web' ? '"Inter", sans-serif' : undefined,
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
    fontWeight: '300',
    color: '#374151',
    fontFamily: Platform.OS === 'web' ? '"Inter", sans-serif' : undefined,
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
    fontWeight: '300',
    color: '#374151',
    fontFamily: Platform.OS === 'web' ? '"Inter", sans-serif' : undefined,
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
    fontWeight: '300',
    color: '#B91C1C',
    fontFamily: Platform.OS === 'web' ? '"Inter", sans-serif' : undefined,
  },
  mediaAddButton: {
    alignSelf: 'flex-start',
    marginTop: 4,
    marginBottom: 8,
  },
  mediaAddText: {
    fontSize: 12,
    fontWeight: '300',
    color: '#2563EB',
    fontFamily: Platform.OS === 'web' ? '"Inter", sans-serif' : undefined,
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
    fontWeight: '300',
    color: '#374151',
    fontFamily: Platform.OS === 'web' ? '"Inter", sans-serif' : undefined,
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
    fontWeight: '300',
    color: '#212121',
    fontFamily: Platform.OS === 'web' ? '"Inter", sans-serif' : undefined,
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
  // Actions Modal Styles
  actionsModalWrap: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    width: '90%',
    maxWidth: 440,
    alignSelf: 'center',
    marginTop: '10%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 5,
    overflow: 'hidden',
    zIndex: 1000,
  },
  actionsModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  actionsModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    fontFamily: 'Inter',
  },
  actionsModalSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
    fontFamily: 'Inter',
  },
  closeActionsText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
    fontFamily: 'Inter',
  },
  actionsModalBody: {
    padding: 8,
  },
  actionModalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F9FAFB',
    borderRadius: 12,
  },
  actionIconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionItemTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    fontFamily: 'Inter',
  },
  actionItemDesc: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
    fontFamily: 'Inter',
  },
});

