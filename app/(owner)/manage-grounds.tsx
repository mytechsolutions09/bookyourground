import * as React from 'react';
import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, TouchableOpacity, Platform, Modal, Pressable, ScrollView, TextInput, Switch, Alert, ActivityIndicator, Image, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import { Plus, Pencil, Eye, Calendar, Download } from 'lucide-react-native';
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
  const { width } = useWindowDimensions();
  const isUltraNarrow = width < 350;
  const isTablet = width >= 600 && width < 900;
  const numColumns = Platform.OS === 'web' ? (width > 1100 ? 3 : (width > 768 ? 2 : 1)) : 1;
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
      <FlatList
        data={grounds}
        renderItem={({ item }) => (
          <View style={{ flex: 1 }}>
            <GroundCard
              ground={item}
              onPress={() =>
                setSelectedGroundId((prev) => (prev === item.id ? null : item.id))
              }
              compact={Platform.OS === 'web'}
              occupancyRate={occupancyRates[item.id] ?? null}
              isOwnerView={true}
            />
          </View>
        )}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        numColumns={numColumns}
        key={`columns-${numColumns}`}
        columnWrapperStyle={numColumns > 1 ? styles.listRowWeb : undefined}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={loadGrounds} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>You haven't added any venues yet</Text>
            <Button
              title="Add Your First Venue"
              onPress={() => router.push('/(owner)/add-ground')}
              style={[styles.emptyButton, { backgroundColor: '#FFFFFF', borderWidth: 1.5, borderColor: '#01b854' }]}
              textStyle={{ color: '#01b854' }}
              loadingIndicatorColor="#01b854"
            />
          </View>
        }
      />
    </View>
  );

  const finalContent = (
    <>
      {Platform.OS !== 'web' ? (
        <MobileAppNavbar 
          title="My Venues" 
          titleColor="#01b854" 
        />
      ) : (
        <View style={styles.webHeader}>
          <Text style={styles.webTitle}>My Venues</Text>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <Button
              title="Import Venue"
              onPress={handleImportGround}
              variant="outline"
              size="small"
              style={{ borderColor: '#BBF7D0', backgroundColor: '#F0FDF4' }}
              textStyle={{ color: '#16A34A' }}
            />
            <Button
              title="Add Venue"
              onPress={() => router.push('/(owner)/add-ground')}
              variant="primary"
              size="small"
            />
          </View>
        </View>
      )}

      {content}

      {/* Options Modal */}
      <Modal
        transparent
        visible={!!selectedGroundId && !editOpen}
        animationType="fade"
        onRequestClose={() => setSelectedGroundId(null)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setSelectedGroundId(null)} />
        <View style={styles.modalWrap}>
          <Card style={[styles.modalCard, { width: 400, maxWidth: '90vw' }]}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Manage Venue</Text>
                <Text style={{ fontSize: 13, color: '#64748B' }}>
                  {grounds.find(g => g.id === selectedGroundId)?.name}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setSelectedGroundId(null)}>
                <Text style={{ color: '#64748B', fontWeight: '800' }}>CLOSE</Text>
              </TouchableOpacity>
            </View>

            <View style={{ padding: 16, gap: 8 }}>
              <TouchableOpacity 
                style={styles.compactModalBtn} 
                onPress={() => {
                  const ground = grounds.find(g => g.id === selectedGroundId);
                  if (ground) {
                    if ((ground.pitch_type ?? '').toLowerCase() === 'nets') {
                      setSelectedGroundId(null);
                      router.push(`/(owner)/edit-net?id=${ground.id}`);
                    } else {
                      startEditGround(ground);
                    }
                  }
                }}
              >
                <Pencil size={18} color="#0F172A" />
                <Text style={styles.compactModalBtnText}>Edit Venue & Pricing</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.compactModalBtn} 
                onPress={() => {
                  const ground = grounds.find(g => g.id === selectedGroundId);
                  if (ground) router.push(makeGroundPath(ground) as any);
                }}
              >
                <Eye size={18} color="#0F172A" />
                <Text style={styles.compactModalBtnText}>View Public Page</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.compactModalBtn} 
                onPress={() => router.push('/(owner)/bookings')}
              >
                <Calendar size={18} color="#0F172A" />
                <Text style={styles.compactModalBtnText}>Manage Bookings</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.compactModalBtn} 
                onPress={() => {
                  const ground = grounds.find(g => g.id === selectedGroundId);
                  if (ground) handleExportGround(ground);
                }}
              >
                <Download size={18} color="#0F172A" />
                <Text style={styles.compactModalBtnText}>Export Data (JSON)</Text>
              </TouchableOpacity>
            </View>
          </Card>
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
          <Card style={[styles.modalCard, IS_WEB && { width: 1200, maxWidth: '98vw' }, isUltraNarrow && { padding: 12 }]}>
            <View style={[styles.modalHeader, isUltraNarrow && { marginBottom: 6 }]}>
              <View>
                <Text style={styles.modalTitle}>Edit Venue</Text>
                <Text style={{ fontSize: 11, color: '#64748B' }}>Managing {editForm?.name}</Text>
              </View>
              <Button title="Close" onPress={closeEditModal} variant="outline" size="small" />
            </View>

            <ScrollView style={styles.modalScroll} keyboardShouldPersistTaps="handled">
              <View style={[styles.compactFormGrid, (IS_WEB || isTablet) && { flexDirection: 'row', gap: 24 }, isUltraNarrow && { padding: 8 }]}>
                {/* Left Column: Basic Info & Media */}
                <View style={[styles.compactFormCol, (IS_WEB || isTablet) && { flex: 1 }]}>
                  <Text style={styles.compactSectionTitle}>Basic Details</Text>
                  <TextInput
                    style={styles.compactInput}
                    value={String(editForm?.name ?? '')}
                    onChangeText={(t) => setEditForm((p: any) => ({ ...p, name: t }))}
                    placeholder="Venue Name"
                  />
                  <TextInput
                    style={[styles.compactInput, { height: 60 }]}
                    value={String(editForm?.description ?? '')}
                    onChangeText={(t) => setEditForm((p: any) => ({ ...p, description: t }))}
                    placeholder="Brief Description"
                    multiline
                  />
                  
                  <View style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.locationLabel}>Type</Text>
                      <OwnerLocationDropdown
                        value={editForm?.pitch_type}
                        options={[
                          { key: 'Cricket Ground', label: 'Cricket' },
                          { key: 'Box Cricket', label: 'Box Cricket' },
                        ]}
                        onChange={(t) =>
                          setEditForm((p: any) => ({
                            ...p,
                            pitch_type: t,
                            cricket_pitch_surface: isCricketGroundType(t) ? p.cricket_pitch_surface : '',
                          }))
                        }
                      />
                    </View>
                    {isCricketGroundType(String(editForm?.pitch_type ?? '')) && (
                      <View style={{ flex: 1 }}>
                        <Text style={styles.locationLabel}>Surface</Text>
                        <View style={styles.surfaceChipsRow}>
                          {(['Turf', 'Matting'] as const).map((surfaceLabel) => {
                            const active = String(editForm?.cricket_pitch_surface ?? '') === surfaceLabel;
                            return (
                              <Pressable
                                key={surfaceLabel}
                                onPress={() =>
                                  setEditForm((p: any) => ({ ...p, cricket_pitch_surface: surfaceLabel }))
                                }
                                style={[styles.surfaceChipCompact, active && styles.surfaceChipActive]}
                              >
                                <Text style={[styles.surfaceChipText, active && styles.surfaceChipTextActive]}>
                                  {surfaceLabel}
                                </Text>
                              </Pressable>
                            );
                          })}
                        </View>
                      </View>
                    )}
                  </View>

                  <View style={{ flexDirection: 'row', gap: 12 }}>
                    <TextInput
                      style={[styles.compactInput, { flex: 1 }]}
                      value={String(editForm?.ground_size ?? '')}
                      onChangeText={(t) => setEditForm((p: any) => ({ ...p, ground_size: t }))}
                      placeholder="Size (e.g. 60m)"
                    />
                    <TextInput
                      style={[styles.compactInput, { flex: 1 }]}
                      value={String(editForm?.capacity ?? '')}
                      onChangeText={(t) => setEditForm((p: any) => ({ ...p, capacity: t }))}
                      placeholder="Capacity"
                      keyboardType="numeric"
                    />
                  </View>

                  <Text style={[styles.compactSectionTitle, { marginTop: 12 }]}>Gallery (8 Images, 2 Videos)</Text>
                  <View style={styles.compactMediaGrid}>
                    {(editForm?.mediaUrls ?? []).map((url: string, idx: number) => (
                      <View key={idx} style={[styles.compactMediaItem, isUltraNarrow && { width: 44, height: 44 }]}>
                        <Image source={{ uri: url }} style={styles.compactMediaImg} />
                        <TouchableOpacity 
                          style={styles.compactMediaRemove} 
                          onPress={() => setEditForm((p: any) => ({ ...p, mediaUrls: p.mediaUrls.filter((_: any, i: number) => i !== idx) }))}
                        >
                          <Text style={styles.compactMediaRemoveText}>×</Text>
                        </TouchableOpacity>
                      </View>
                    ))}
                    {(editForm?.mediaUrls ?? []).length < 10 && (
                      <TouchableOpacity style={[styles.compactMediaAdd, isUltraNarrow && { width: 44, height: 44 }]} onPress={handlePickMediaForEdit}>
                        {uploadingMedia ? <ActivityIndicator size="small" color="#64748B" /> : <Plus size={isUltraNarrow ? 16 : 20} color="#64748B" />}
                        <Text style={[styles.compactMediaAddText, isUltraNarrow && { fontSize: 8 }]}>{uploadingMedia ? '...' : 'Add'}</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>

                {/* Right Column: Location & Map */}
                <View style={[styles.compactFormCol, (IS_WEB || isTablet) && { flex: 1 }]}>
                  <Text style={styles.compactSectionTitle}>Location</Text>
                  <TextInput
                    style={styles.compactInput}
                    value={String(editForm?.address ?? '')}
                    onChangeText={(t) => setEditForm((p: any) => ({ ...p, address: t }))}
                    placeholder="Street Address"
                  />
                  <View style={styles.formRow2}>
                    <View style={{ flex: 1.5 }}>
                      <OwnerLocationDropdown
                        value={editLocationKey}
                        options={buildLocationOptions(locationRows)}
                        onChange={(k) => {
                          setEditLocationKey(k);
                          const [city, state] = k.split('__');
                          setEditForm((p: any) => ({ ...p, city, state }));
                        }}
                      />
                    </View>
                    <TextInput
                      style={[styles.compactInput, { flex: 1 }]}
                      value={String(editForm?.pincode ?? '')}
                      onChangeText={(t) => setEditForm((p: any) => ({ ...p, pincode: t }))}
                      placeholder="Pincode"
                    />
                  </View>

                  <View style={styles.compactMapContainer}>
                    {Platform.OS === 'web' ? (
                      <APIProvider apiKey={GOOGLE_MAPS_API_KEY}>
                        <GoogleMap
                          center={editForm?.latitude && editForm?.longitude ? { lat: parseFloat(editForm.latitude), lng: parseFloat(editForm.longitude) } : { lat: 28.4595, lng: 77.0266 }}
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
                    ) : (
                      <Text style={{ fontSize: 11, color: '#64748B' }}>Map available on Web</Text>
                    )}
                  </View>
                  <View style={[styles.formRow2, { marginTop: 8 }]}>
                     <View style={{ flex: 1 }}>
                       <Text style={styles.locationLabel}>Lat</Text>
                       <TextInput
                        style={[styles.compactInput, { fontSize: 12 }]}
                        value={String(editForm?.latitude ?? '')}
                        onChangeText={(t) => setEditForm((p: any) => ({ ...p, latitude: t }))}
                        placeholder="Lat"
                      />
                     </View>
                    <View style={{ flex: 1 }}>
                       <Text style={styles.locationLabel}>Lng</Text>
                       <TextInput
                        style={[styles.compactInput, { fontSize: 12 }]}
                        value={String(editForm?.longitude ?? '')}
                        onChangeText={(t) => setEditForm((p: any) => ({ ...p, longitude: t }))}
                        placeholder="Lng"
                      />
                    </View>
                  </View>
                </View>
              </View>

              <View style={styles.divider} />

              <Text style={styles.compactSectionTitle}>Amenities & Visibility</Text>
              <View style={styles.amenitiesGrid}>
                {[
                  { key: 'has_floodlights', label: 'Floodlights' },
                  { key: 'has_parking', label: 'Parking' },
                  { key: 'has_changing_rooms', label: 'Changing Rms' },
                  { key: 'has_pavilion', label: 'Pavilion' },
                  { key: 'has_washrooms', label: 'Washrooms' },
                  { key: 'active', label: 'Visible' },
                ].map((item) => (
                  <View key={item.key} style={[styles.amenityItemCompact, !IS_WEB && { width: width < 350 ? '100%' : '48%' }]}>
                    <Text style={styles.switchLabelCompact}>{item.label}</Text>
                    <Switch
                      value={!!editForm?.[item.key]}
                      onValueChange={(v) => setEditForm((p: any) => ({ ...p, [item.key]: v }))}
                      thumbColor={!!editForm?.[item.key] ? '#10b981' : '#f4f3f4'}
                      trackColor={{ false: '#767577', true: '#6ee7b7' }}
                      ios_backgroundColor="#3e3e3e"
                      style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
                    />
                  </View>
                ))}
              </View>

              <View style={styles.divider} />

              <Text style={styles.compactSectionTitle}>Weekly Availability & Pricing</Text>
              <View style={styles.compactAvailabilityBox}>
                <TimeSlotsEditor
                  ref={availabilityRef}
                  groundId={editForm?.id}
                  pitchType={editForm?.pitch_type}
                  canEdit
                  canConfigure={true}
                  showSaveButton={false}
                />
              </View>
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
    </>
  );

  if (Platform.OS === 'web') {
    return <WebLayout>{finalContent}</WebLayout>;
  }

  return finalContent;
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
    paddingVertical: 10,
    paddingTop: 0,
    flexDirection: Platform.OS === 'web' ? 'row' : 'column',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    marginBottom: 12,
    gap: 16,
  },
  webTitle: {
    fontFamily: 'Inter',
    fontSize: 22,
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
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 16,
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
    flexWrap: 'wrap',
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
    alignItems: 'center',
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
    fontSize: 16,
    fontWeight: '600',
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
  compactFormGrid: {
    padding: 12,
  },
  compactFormCol: {
    gap: 12,
  },
  compactSectionTitle: {
    fontFamily: 'Inter',
    fontSize: 12,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  compactInput: {
    fontFamily: 'Inter',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#F8FAFC',
    fontSize: 13,
    color: '#0F172A',
  },
  compactMapContainer: {
    height: 140,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  amenitiesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    padding: 12,
    paddingTop: 0,
  },
  amenityItemCompact: {
    width: IS_WEB ? '15%' : '48%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    borderRadius: 6,
    paddingHorizontal: 8,
    backgroundColor: '#F8FAFC',
  },
  switchLabelCompact: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
    fontFamily: 'Inter',
  },
  compactMediaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  compactMediaItem: {
    width: 50,
    height: 50,
    borderRadius: 6,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#F1F5F9',
  },
  compactMediaImg: {
    width: '100%',
    height: '100%',
  },
  compactMediaRemove: {
    position: 'absolute',
    top: 1,
    right: 1,
    backgroundColor: 'rgba(239, 68, 68, 0.9)',
    width: 14,
    height: 14,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactMediaRemoveText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '700',
    lineHeight: 12,
  },
  compactMediaAdd: {
    width: 50,
    height: 50,
    borderRadius: 6,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 1,
  },
  compactMediaAddText: {
    fontSize: 9,
    fontWeight: '600',
    color: '#64748B',
  },
  compactAvailabilityBox: {
    padding: 12,
    paddingTop: 0,
  },
  surfaceChipCompact: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  compactModalBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderWidth: 1,
    borderColor: 'rgba(226, 232, 240, 0.8)',
    gap: 12,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    ...Platform.select({
      web: { backdropFilter: 'blur(8px)' }
    }) as any,
  },
  compactModalBtnText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1E293B',
    fontFamily: 'Inter',
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
