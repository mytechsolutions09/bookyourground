import * as React from 'react';
import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, TouchableOpacity, Platform, Modal, Pressable, ScrollView, TextInput, Switch, Alert } from 'react-native';
import { router } from 'expo-router';
import { Plus } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { GroundWithImages } from '@/types';
import GroundCard from '@/components/grounds/GroundCard';
import type { GroundWithImages as GroundWithImagesType } from '@/types';
import WebLayout from '@/components/web/WebLayout';
import MobileAppNavbar from '@/components/MobileAppNavbar';
import { createTimeSlotsForGround } from '@/utils/timeSlotsDb';
import type { DayOfWeek } from '@/types';
import { 
  APIProvider, 
  Map as GoogleMap, 
  Marker, 
  useMap,
  useMapsLibrary
} from '@vis.gl/react-google-maps';

const GOOGLE_MAPS_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || '';
const MAP_ID = "DEMO_MAP_ID";

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
  const [occupancyRates, setOccupancyRates] = useState<Record<string, number>>({});

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

      // Fetch occupancy rates
      const { data: occData, error: occError } = await supabase.rpc('get_owner_grounds_occupancy', { 
        target_owner_id: user.id 
      });
      if (!occError && occData) {
        const mapping: Record<string, number> = {};
        occData.forEach((row: any) => {
          mapping[row.ground_id] = row.occupancy_percentage;
        });
        setOccupancyRates(mapping);
      }
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
      latitude: ground.latitude ? String(ground.latitude) : '',
      longitude: ground.longitude ? String(ground.longitude) : '',
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
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images', 'videos'] as const,
        quality: 0.8,
      });

      if (result.canceled || !result.assets?.length) {
        return;
      }

      setUploadingMedia(true);
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

      // Extract extension
      const extension = uri.split('.').pop() || 'jpg';
      const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${extension}`;
      const filePath = `owner-media/${user.id}/${fileName}`;

      // Determine MIME type
      const mimeType = asset.mimeType || (extension === 'mp4' || extension === 'mov' ? 'video/mp4' : 'image/jpeg');

      // Use fetch → arrayBuffer to avoid the '.blob()' issue in some RN environments
      let uploadBody: ArrayBuffer | Blob;
      try {
        const resp = await fetch(uri);
        uploadBody = await resp.arrayBuffer();
      } catch {
        // Fallback: XHR blob
        uploadBody = await new Promise<Blob>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.onload = () => resolve(xhr.response);
          xhr.onerror = () => reject(new TypeError('Network request failed'));
          xhr.responseType = 'blob';
          xhr.open('GET', uri, true);
          xhr.send(null);
        });
      }

      const { error: uploadError } = await supabase.storage
        .from('ground-images')
        .upload(filePath, uploadBody, {
          contentType: mimeType,
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
        const imgCount = urls.filter((u: string) => !isVideoUrl(u)).length;
        const vidCount = urls.filter((u: string) => isVideoUrl(u)).length;
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

  useEffect(() => {
    (async () => {
      if (Platform.OS !== 'web') {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          // Alert.alert('Permission required', 'We need access to your photos to upload ground images.');
        }
      }
    })();
  }, []);

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
        latitude: editForm.latitude ? parseFloat(editForm.latitude) : null,
        longitude: editForm.longitude ? parseFloat(editForm.longitude) : null,
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

            const ok = window.confirm(`Import ground "${data.Name}" to your account?`);
            if (!ok) return;

            setLoading(true);
            const payload: any = {
              owner_id: user?.id,
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
              verified: false,
              approved: false,
              active: true,
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
               // Delete defaults if any
               await supabase.from('time_slots').delete().eq('ground_id', created.id);
               
               const slotsToInsert = data.Time_Slots.map((s: any) => ({
                 ground_id: created.id,
                 day_of_week: s.day_of_week,
                 start_time: s.start_time,
                 end_time: s.end_time,
                 custom_price: s.custom_price,
                 is_available: s.is_available,
               }));
               
               await supabase.from('time_slots').insert(slotsToInsert);
            } else {
               await createTimeSlotsForGround(created.id, payload.pitch_type);
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

            alert(`Ground "${data.Name}" imported successfully! It will be visible once approved by an admin.`);
            loadGrounds();
          } catch (err: any) {
            alert('Error: ' + err.message);
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

  const handleExportGround = async (ground: GroundWithImages) => {
    // Fetch time slots
    const { data: slots } = await supabase
      .from('time_slots')
      .select('day_of_week, start_time, end_time, custom_price, is_available')
      .eq('ground_id', ground.id);

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
      Active: (ground as any).active ? 'Yes' : 'No',
      Latitude: (ground as any).latitude,
      Longitude: (ground as any).longitude,
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

  const content = (
    <View style={styles.container}>
      {Platform.OS !== 'web' ? (
        <MobileAppNavbar 
          title="My Grounds" 
          titleColor="#01b854" 
        />
      ) : (
        <View style={styles.webHeader}>
          <Text style={styles.webTitle}>My Grounds</Text>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <Button
              title="Import Ground"
              onPress={handleImportGround}
              variant="outline"
              size="small"
              style={{ borderColor: '#BBF7D0', backgroundColor: '#F0FDF4' }}
              textStyle={{ color: '#16A34A' }}
            />
            <Button
              title="Add Ground"
              onPress={() => router.push('/(owner)/add-ground')}
              variant="primary"
              size="small"
            />
          </View>
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
              compact={Platform.OS === 'web'}
              occupancyRate={occupancyRates[item.id] ?? null}
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
                    onPress={() => router.push(makeGroundPath(item) as any)}
                    variant="outline"
                    size="small"
                    style={{ flex: 1 }}
                  />
                </View>
                <View style={[styles.actionsRow, { marginTop: 10 }]}>
                    <Button
                    title="Manage bookings"
                    onPress={() => router.push('/(owner)/bookings')}
                    variant="outline"
                    size="small"
                    style={{ flex: 1 }}
                    />
                    <Button
                    title="Export Ground"
                    onPress={() => handleExportGround(item)}
                    variant="outline"
                    size="small"
                    style={{ flex: 1 }}
                    />
                </View>
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
              style={[styles.emptyButton, { backgroundColor: '#FFFFFF', borderWidth: 1.5, borderColor: '#01b854' }]}
              textStyle={{ color: '#01b854' }}
              loadingIndicatorColor="#01b854"
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
              {/* ── Map Picker for Edit (Force Visible at Top) ── */}
              <View style={{ 
                marginVertical: 20, 
                padding: 16, 
                backgroundColor: '#ecfdf5', 
                borderRadius: 20, 
                borderWidth: 2, 
                borderColor: '#10b981',
                minHeight: 400 
              }}>
                <Text style={{ fontFamily: 'Inter', fontSize: 18, fontWeight: '800', color: '#064e3b', marginBottom: 4 }}>Set Exact Location (Pin on Map)</Text>
                <Text style={{ fontFamily: 'Inter', fontSize: 14, color: '#065f46', marginBottom: 16 }}>Click on the map to update your ground's exact GPS location.</Text>
                <View style={{ height: 300, borderRadius: 16, overflow: 'hidden', marginBottom: 16, backgroundColor: '#cbd5e1' }}>
                  <APIProvider apiKey={GOOGLE_MAPS_API_KEY}>
                    <GoogleMap
                      defaultCenter={{ lat: 28.4595, lng: 77.0266 }}
                      center={editForm?.latitude && editForm?.longitude ? { lat: parseFloat(editForm.latitude), lng: parseFloat(editForm.longitude) } : undefined}
                      defaultZoom={15}
                      mapId={MAP_ID}
                      onClick={(e) => {
                        if (e.detail.latLng) {
                          setEditForm((p: any) => ({
                            ...p,
                            latitude: String(e.detail.latLng!.lat),
                            longitude: String(e.detail.latLng!.lng)
                          }));
                        }
                       }}
                      style={{ width: '100%', height: '100%' }}
                    >
                        {editForm?.latitude && editForm?.longitude && (
                          <Marker 
                            position={{ lat: parseFloat(editForm.latitude), lng: parseFloat(editForm.longitude) }} 
                            icon="https://maps.google.com/mapfiles/ms/icons/green-dot.png"
                          />
                        )}
                    </GoogleMap>
                  </APIProvider>
                </View>
                <View style={{ flexDirection: 'row', display: 'flex', gap: 12 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontFamily: 'Inter', fontSize: 12, fontWeight: '600', color: '#065f46', marginBottom: 4 }}>Latitude</Text>
                    <TextInput
                      style={[styles.formInput, { marginBottom: 0, backgroundColor: '#ffffff' }]}
                      value={String(editForm?.latitude ?? '')}
                      onChangeText={(t) => setEditForm((p: any) => ({ ...p, latitude: t }))}
                      placeholder="Latitude"
                      keyboardType="numeric"
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontFamily: 'Inter', fontSize: 12, fontWeight: '600', color: '#065f46', marginBottom: 4 }}>Longitude</Text>
                    <TextInput
                      style={[styles.formInput, { marginBottom: 0, backgroundColor: '#ffffff' }]}
                      value={String(editForm?.longitude ?? '')}
                      onChangeText={(t) => setEditForm((p: any) => ({ ...p, longitude: t }))}
                      placeholder="Longitude"
                      keyboardType="numeric"
                    />
                  </View>
                </View>
              </View>

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

const IS_WEB = Platform.OS === 'web';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
    padding: 0,
  },
  header: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    paddingTop: Platform.OS === 'web' ? 48 : 64,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  webHeader: {
    paddingVertical: 16,
    paddingTop: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    marginBottom: 16,
  },
  webTitle: {
    fontFamily: 'Inter',
    fontSize: 28,
    fontWeight: '700',
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  title: {
    fontFamily: 'Inter',
    fontSize: 24,
    fontWeight: '600',
    color: IS_WEB ? '#212121' : '#f9fafb',
    letterSpacing: -0.3,
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#01b854',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#01b854',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  list: {
    padding: 16,
    paddingBottom: 100,
  },
  listRowWeb: {
    gap: 12,
  },
  editorCard: {
    marginBottom: 16,
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    borderRadius: 20,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  editorTitle: {
    fontFamily: 'Inter',
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
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
    padding: 20,
    borderRadius: 24,
    overflow: 'visible',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 10 },
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  modalTitle: {
    fontFamily: 'Inter',
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    flex: 1,
    letterSpacing: -0.5,
  },
  modalScroll: {
    overflow: 'visible',
  },
  modalSectionTitle: {
    fontFamily: 'Inter',
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 20,
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  modalFooter: {
    marginTop: 12,
  },
  formInput: {
    fontFamily: 'Inter',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#F8FAFC',
    fontSize: 15,
    fontWeight: '500',
    color: '#0F172A',
    marginBottom: 12,
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
    fontFamily: 'Inter',
    fontSize: 12,
    fontWeight: '500',
    color: IS_WEB ? '#374151' : '#9ca3af',
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
    fontWeight: '300',
    color: IS_WEB ? '#374151' : '#e5e7eb',
    fontFamily: IS_WEB ? '"Inter", sans-serif' : undefined,
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
    borderColor: IS_WEB ? '#E5E7EB' : '#00ea6b',
    backgroundColor: IS_WEB ? '#FFFFFF' : 'rgba(0,234,107,0.1)',
    marginBottom: 10,
  },
  mediaUploadText: {
    fontSize: 13,
    fontWeight: '300',
    color: IS_WEB ? '#374151' : '#00ea6b',
    fontFamily: IS_WEB ? '"Inter", sans-serif' : undefined,
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
    borderColor: IS_WEB ? '#E5E7EB' : 'rgba(0,234,107,0.25)',
    backgroundColor: IS_WEB ? '#FFFFFF' : 'rgba(4,53,41,0.6)',
  },
  surfaceChipActive: {
    borderColor: IS_WEB ? '#2563EB' : '#00ea6b',
    backgroundColor: IS_WEB ? '#EFF6FF' : '#00ea6b',
  },
  surfaceChipText: {
    fontSize: 13,
    fontWeight: '300',
    color: IS_WEB ? '#374151' : '#f9fafb',
    fontFamily: IS_WEB ? '"Inter", sans-serif' : undefined,
  },
  surfaceChipTextActive: {
    color: IS_WEB ? '#1D4ED8' : '#043529',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 16,
    color: IS_WEB ? '#666' : '#9ca3af',
    marginBottom: 24,
    textAlign: 'center',
  },
  emptyButton: {
    marginTop: 16,
  },
  subLabel: {
    fontSize: 14,
    fontWeight: '300',
    color: IS_WEB ? '#374151' : '#9ca3af',
    fontFamily: IS_WEB ? '"Inter", sans-serif' : undefined,
    marginBottom: 8,
  },
  timeSlotsCard: {
    position: 'relative',
    zIndex: 50,
    overflow: 'visible',
    padding: 12,
    borderWidth: 1,
    borderColor: IS_WEB ? '#E5E7EB' : 'rgba(0,234,107,0.2)',
    borderRadius: 12,
    backgroundColor: IS_WEB ? '#FFFFFF' : '#043529',
    marginBottom: 16,
  },
  startTimeFieldBlock: {
    marginBottom: 8,
    position: 'relative',
    overflow: 'visible',
    zIndex: 52,
  },
  daysFieldBlock: {
    marginBottom: 8,
    position: 'relative',
    overflow: 'visible',
    zIndex: 51,
  },
  timeSlotsFieldsAfterStart: {
    position: 'relative',
    zIndex: 0,
  },
  addAnotherSlotRow: {
    position: 'relative',
    zIndex: 0,
    marginTop: 8,
  },
  actionBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: IS_WEB ? '#E5E7EB' : 'rgba(0,234,107,0.3)',
    backgroundColor: IS_WEB ? '#FFFFFF' : 'transparent',
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: '300',
    color: IS_WEB ? '#2563EB' : '#00ea6b',
    fontFamily: IS_WEB ? '"Inter", sans-serif' : undefined,
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
    borderColor: IS_WEB ? '#E5E7EB' : 'rgba(0,234,107,0.25)',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 10,
    backgroundColor: IS_WEB ? '#FFFFFF' : 'rgba(4,53,41,0.6)',
  },
  buttonOpen: {
    borderColor: IS_WEB ? '#10b981' : '#00ea6b',
    backgroundColor: IS_WEB ? 'rgba(220,141,60,0.05)' : 'rgba(0,234,107,0.1)',
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '300',
    color: IS_WEB ? '#111827' : '#f9fafb',
    fontFamily: IS_WEB ? '"Inter", sans-serif' : undefined,
  },
  menu: {
    position: 'relative' as any,
    maxHeight: 260,
    backgroundColor: IS_WEB ? '#FFFFFF' : '#06392e',
    borderWidth: 1,
    borderColor: IS_WEB ? '#E5E7EB' : 'rgba(0,234,107,0.25)',
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
    fontWeight: '300',
    color: IS_WEB ? '#111827' : '#f9fafb',
    fontFamily: IS_WEB ? '"Inter", sans-serif' : undefined,
  },
});
