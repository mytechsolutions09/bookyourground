import * as React from 'react';
import { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Switch,
  TextInput,
  Pressable,
  Modal,
} from 'react-native';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import { Trash2, Edit, Plus } from 'lucide-react-native';
import type { DayOfWeek } from '@/types';
import WebLayout from '@/components/web/WebLayout';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { ActivityIndicator, Image } from 'react-native';
import { 
  APIProvider, 
  Map as GoogleMap, 
  Marker, 
  useMap,
  useMapsLibrary
} from '@vis.gl/react-google-maps';

const GOOGLE_MAPS_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || '';
const MAP_ID = "DEMO_MAP_ID";


const DAY_ORDER: DayOfWeek[] = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
];

interface SavedSlot {
  startHHMM: string;
  durationMinutes: number;
  customPrice: number;
  days: DayOfWeek[];
  oversCount?: number;
}

export default function AddNetPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    lanes_count: '1',
    is_indoor: false,
    has_bowling_machine: false,
    has_floodlights: false,
    has_manual_throwdown: false,
    has_umpires: false,
    has_new_balls: false,
    has_scoring: false,
    has_practice_nets: false,
    has_swimming_pool: false,
    pricing_model: 'hours' as 'hours' | 'overs',
    surface_type: 'Turf', // Default
    latitude: '',
    longitude: '',
  });

  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const [uploadingMedia, setUploadingMedia] = useState(false);

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

  const [locationRows, setLocationRows] = useState<any[]>([]);
  const [selectedLocationKey, setSelectedLocationKey] = useState<string>('');

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
        console.error('Error loading locations for add net:', e);
      }
    };

    loadLocations();
  }, []);

  // Google Maps State
  const [googleMapsLinkText, setGoogleMapsLinkText] = useState<string>('');
  const [fetchingMapsAddress, setFetchingMapsAddress] = useState<boolean>(false);

  // Time Slot State
  const [savedSlots, setSavedSlots] = useState<SavedSlot[]>([]);
  const [editingSlotIdx, setEditingSlotIdx] = useState<number | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedDayForModal, setSelectedDayForModal] = useState<DayOfWeek | null>(null);
  const [sourceDayForEdit, setSourceDayForEdit] = useState<DayOfWeek | null>(null);
  const [slotStartTimeText, setSlotStartTimeText] = useState('');
  const [slotEndTimeText, setSlotEndTimeText] = useState('');
  const [slotDurationMinutesText, setSlotDurationMinutesText] = useState('60'); // Default 60 for hours
  const [slotOversCountText, setSlotOversCountText] = useState('10'); // Default 10 for overs
  const [slotCustomPriceText, setSlotCustomPriceText] = useState('');
  const [slotSelectedDays, setSlotSelectedDays] = useState<DayOfWeek[]>(DAY_ORDER);
  const [laneSurfaces, setLaneSurfaces] = useState<string[]>([]);

  useEffect(() => {
    const count = parseInt(formData.lanes_count, 10) || 1;
    setLaneSurfaces(prev => {
      const next = [...prev];
      if (next.length < count) {
        for (let i = next.length; i < count; i++) {
          next.push(formData.surface_type || 'AstroTurf');
        }
      } else if (next.length > count) {
        return next.slice(0, count);
      }
      return next;
    });
  }, [formData.lanes_count, formData.surface_type]);

  const durationForTimeOptions = useMemo(() => parseInt(slotDurationMinutesText, 10) || 60, [slotDurationMinutesText]);
  const timeOptions = useMemo(() => generateTimeOptions(durationForTimeOptions), [durationForTimeOptions]);

  // Effect to update default duration when pricing model changes
  useEffect(() => {
    if (formData.pricing_model === 'overs') {
      setSlotDurationMinutesText('20'); // Default 20 mins for 10 overs
    } else {
      setSlotDurationMinutesText('60');
    }
  }, [formData.pricing_model]);

  const extractAddressFromGoogleMapsUrl = (rawUrl: string): string | null => {
    let url = rawUrl?.trim();
    if (!url) return null;

    try {
      if (!/^https?:\/\//i.test(url)) {
        url = `https://${url}`;
      }

      const u = new URL(url);

      const q =
        u.searchParams.get('q') ||
        u.searchParams.get('query') ||
        u.searchParams.get('destination') ||
        u.searchParams.get('daddr');
      if (q) return q.replace(/\+/g, ' ').trim();

      const marker = '/maps/place/';
      const idx = u.pathname.indexOf(marker);
      if (idx >= 0) {
        const after = u.pathname.slice(idx + marker.length);
        const beforeAt = after.split('/@')[0] ?? '';
        const cleaned = beforeAt.split('/')[0] ?? '';
        if (cleaned) {
          try {
            return decodeURIComponent(cleaned.replace(/\+/g, ' ')).trim();
          } catch {
            return cleaned.replace(/\+/g, ' ').trim();
          }
        }
      }
    } catch {
      // ignore URL parsing errors
    }

    const m = url.match(/[?&](?:q|query|destination|daddr)=([^&]+)/i);
    if (m?.[1]) {
      try {
        return decodeURIComponent(m[1]).replace(/\+/g, ' ').trim();
      } catch {
        return m[1].replace(/\+/g, ' ').trim();
      }
    }
    return null;
  };

  const handlePickMedia = async () => {
    if (!user) {
      Alert.alert('Login required', 'Please sign in again to upload media.');
      return;
    }

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

      const isImage = asset.mimeType?.startsWith('image/') || 
                     !asset.mimeType?.startsWith('video/');

      if (isImage) {
        try {
          const manipResult = await ImageManipulator.manipulateAsync(
            uri,
            [{ resize: { width: 1000 } }],
            { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
          );
          uri = manipResult.uri;
        } catch (manipError) {
          console.warn('Image manipulation failed, using original:', manipError);
        }
      }

      const extension = uri.split('.').pop() || 'jpg';
      const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${extension}`;
      const filePath = `owner-media/${user.id}/${fileName}`;
      const mimeType = asset.mimeType || (extension === 'mp4' || extension === 'mov' ? 'video/mp4' : 'image/jpeg');

      let uploadBody: ArrayBuffer | Blob;
      try {
        const resp = await fetch(uri);
        uploadBody = await resp.arrayBuffer();
      } catch {
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

      setMediaUrls((prev) => [...prev, publicUrl]);
    } catch (e: any) {
      console.error('Error picking/uploading media:', e);
      Alert.alert('Upload error', e?.message ?? 'Something went wrong while uploading media.');
    } finally {
      setUploadingMedia(false);
    }
  };

  const handleSubmit = async () => {
    if (!user) return;

    if (!formData.name || !formData.address || !formData.city || !formData.state || !formData.pincode) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      const count = laneSurfaces.length || 1;
      const surfacesToUse = laneSurfaces.length > 0 ? laneSurfaces : [formData.surface_type || 'AstroTurf'];

      for (let i = 0; i < surfacesToUse.length; i++) {
        const surface = surfacesToUse[i];
        const name = count > 1 ? `${formData.name} - Lane ${i + 1} (${surface})` : formData.name;

        // 1. Insert Ground (Net) for this lane
        const { data: created, error } = await supabase
          .from('grounds')
          .insert({
            owner_id: user.id,
            name: name,
            description: formData.description || null,
            address: formData.address,
            city: formData.city,
            state: formData.state,
            pincode: formData.pincode,
            pitch_type: 'Nets',
            cricket_pitch_surface: surface,
            has_floodlights: formData.has_floodlights,
            pricing_model: formData.pricing_model,
            is_indoor: formData.is_indoor,
            has_bowling_machine: formData.has_bowling_machine,
            has_manual_throwdown: formData.has_manual_throwdown,
            has_umpires: formData.has_umpires,
            has_new_balls: formData.has_new_balls,
            has_scoring: formData.has_scoring,
            has_practice_nets: formData.has_practice_nets,
            has_swimming_pool: formData.has_swimming_pool,
            lanes_count: 1, // Each listing represents 1 lane
            base_price_per_hour: 0,
            latitude: formData.latitude ? parseFloat(formData.latitude) : null,
            longitude: formData.longitude ? parseFloat(formData.longitude) : null,
          })
          .select('id')
          .single();

        if (error) throw error;

        // 1.5 Insert Media for this lane
        const cleaned = mediaUrls.map((u) => String(u ?? '').trim()).filter(Boolean);
        const imageUrls = cleaned.filter((u) => !isVideoUrl(u)).slice(0, 8);
        const videoUrls = cleaned.filter(isVideoUrl).slice(0, 2);
        const finalUrls = [...imageUrls, ...videoUrls];

        if (finalUrls.length > 0) {
          const rows = finalUrls.map((url, index) => ({
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

        // 2. Insert Time Slots for this lane
        if (savedSlots.length > 0) {
          const slotRows: any[] = [];
          for (const slot of savedSlots) {
            for (const day of slot.days) {
              slotRows.push({
                ground_id: created.id,
                day_of_week: day,
                start_time: slot.startHHMM,
                end_time: calculateEndTime(slot.startHHMM, slot.durationMinutes),
                custom_price: slot.customPrice,
                is_available: true,
                overs_count: slot.oversCount || null,
              });
            }
          }

          if (slotRows.length > 0) {
            const { error: slotError } = await supabase
              .from('time_slots')
              .insert(slotRows);
            if (slotError) {
              console.error('Error creating slots:', slotError);
              throw slotError;
            }
          }
        }
      }

      Alert.alert('Success', 'Cricket Net added successfully!');
      router.replace('/(owner)/manage-grounds');
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const calculateEndTime = (startHHMM: string, durationMins: number): string => {
    const [hours, minutes] = startHHMM.split(':').map(Number);
    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    date.setMinutes(date.getMinutes() + durationMins);
    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  };

  const addSlot = () => {
    const duration = parseInt(slotDurationMinutesText, 10);
    const price = parseFloat(slotCustomPriceText);
    const overs = formData.pricing_model === 'overs' ? parseInt(slotOversCountText, 10) : undefined;

    if (!slotStartTimeText || !duration || !price) {
      Alert.alert('Error', 'Please fill all slot fields');
      return;
    }

    // Bulk add logic if end time is specified
    if (slotEndTimeText) {
      const [startH, startM] = slotStartTimeText.split(':').map(Number);
      const [endH, endM] = slotEndTimeText.split(':').map(Number);
      
      let currentTotalMins = startH * 60 + startM;
      const endTotalMins = endH * 60 + endM;
      
      if (endTotalMins <= currentTotalMins) {
        Alert.alert('Error', 'End time must be later than start time');
        return;
      }
      
      const newSlots: SavedSlot[] = [];
      
      while (currentTotalMins + duration <= endTotalMins) {
        const h = Math.floor(currentTotalMins / 60);
        const m = currentTotalMins % 60;
        const startHHMM = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
        
        newSlots.push({
          startHHMM: startHHMM,
          durationMinutes: duration,
          customPrice: price,
          days: slotSelectedDays,
          oversCount: overs,
        });
        
        currentTotalMins += duration;
      }
      
      if (newSlots.length === 0) {
        Alert.alert('Error', 'No slots could be generated in this range');
        return;
      }
      
      setSavedSlots([...savedSlots, ...newSlots]);
      
      // Reset
      setSlotStartTimeText('');
      setSlotEndTimeText('');
      setSlotCustomPriceText('');
      setSlotSelectedDays(DAY_ORDER);
      return;
    }

    const newSlot = {
      startHHMM: slotStartTimeText,
      durationMinutes: duration,
      customPrice: price,
      days: slotSelectedDays,
      oversCount: overs,
    };

    if (editingSlotIdx !== null) {
      const updated = [...savedSlots];
      
      if (sourceDayForEdit) {
        const originalSlot = updated[editingSlotIdx];
        const updatedDaysForOriginal = originalSlot.days.filter(d => d !== sourceDayForEdit);
        
        if (updatedDaysForOriginal.length === 0) {
          // If it only applied to this day, replace it
          updated[editingSlotIdx] = newSlot;
        } else {
          // Otherwise, update the original to not include this day
          updated[editingSlotIdx] = { ...originalSlot, days: updatedDaysForOriginal };
          // AND add the new slot as a NEW entry
          updated.push(newSlot);
        }
        setSourceDayForEdit(null); // Clear source day
      } else {
        // Normal update (if no source day)
        updated[editingSlotIdx] = newSlot;
      }
      
      setSavedSlots(updated);
      setEditingSlotIdx(null);
    } else {
      setSavedSlots([...savedSlots, newSlot]);
    }

    // Reset slot inputs
    setSlotStartTimeText('');
    setSlotEndTimeText('');
    setSlotCustomPriceText('');
    setSlotSelectedDays(DAY_ORDER);
  };

  const deleteSlot = (idx: number) => {
    setSavedSlots(savedSlots.filter((_, i) => i !== idx));
    if (editingSlotIdx === idx) {
      setEditingSlotIdx(null);
      setSlotStartTimeText('');
      setSlotCustomPriceText('');
      setSlotSelectedDays(DAY_ORDER);
    }
  };

  const editSlot = (idx: number) => {
    const slot = savedSlots[idx];
    setSlotStartTimeText(slot.startHHMM);
    setSlotDurationMinutesText(slot.durationMinutes.toString());
    if (slot.oversCount) setSlotOversCountText(slot.oversCount.toString());
    setSlotCustomPriceText(slot.customPrice.toString());
    setSlotSelectedDays(slot.days);
    setEditingSlotIdx(idx);
  };

  return (
    <WebLayout hideHeader={true}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>Add Cricket Net</Text>

        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Basic Information</Text>
          <Input
            label="Net/Academy Name *"
            value={formData.name}
            onChangeText={(text) => setFormData({ ...formData, name: text })}
            placeholder="e.g., Star Cricket Academy - Net 1"
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
          <Text style={styles.sectionTitle}>Attributes</Text>
          <Input
            label="Number of Lanes *"
            value={formData.lanes_count}
            onChangeText={(text) => setFormData({ ...formData, lanes_count: text })}
            keyboardType="numeric"
            placeholder="e.g., 3"
          />
          
          {/* Lane specific surfaces */}
          <View style={{ marginTop: 10 }}>
            <Text style={styles.subLabel}>Surfaces for each lane:</Text>
            {laneSurfaces.map((surface, idx) => (
              <View key={idx} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <Text style={{ fontSize: 14, color: '#0F172A', fontFamily: 'Inter' }}>Lane {idx + 1}</Text>
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  {['Concrete', 'Turf', 'Astroturf', 'Matting'].map((s) => {
                    const active = surface === s;
                    return (
                      <Pressable
                        key={s}
                        onPress={() => {
                          const updated = [...laneSurfaces];
                          updated[idx] = s;
                          setLaneSurfaces(updated);
                        }}
                        style={[
                          styles.typeChip, 
                          { paddingVertical: 4, paddingHorizontal: 8 }, 
                          active && styles.typeChipActive
                        ]}
                      >
                        <Text style={[styles.typeChipText, { fontSize: 12 }, active && styles.typeChipTextActive]}>
                          {s}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            ))}
          </View>

          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Bowling Machine</Text>
            <Switch
              value={formData.has_bowling_machine}
              onValueChange={(val) => setFormData({ ...formData, has_bowling_machine: val })}
            />
          </View>
          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Manual Throwdown</Text>
            <Switch
              value={formData.has_manual_throwdown}
              onValueChange={(val) => setFormData({ ...formData, has_manual_throwdown: val })}
            />
          </View>
          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Indoor</Text>
            <Switch
              value={formData.is_indoor}
              onValueChange={(val) => setFormData({ ...formData, is_indoor: val })}
            />
          </View>
          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Floodlights</Text>
            <Switch
              value={formData.has_floodlights}
              onValueChange={(val) => setFormData({ ...formData, has_floodlights: val })}
            />
          </View>
          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>2 Umpires</Text>
            <Switch
              value={formData.has_umpires}
              onValueChange={(val) => setFormData({ ...formData, has_umpires: val })}
            />
          </View>
          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>2 New Balls</Text>
            <Switch
              value={formData.has_new_balls}
              onValueChange={(val) => setFormData({ ...formData, has_new_balls: val })}
            />
          </View>
          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Scoring</Text>
            <Switch
              value={formData.has_scoring}
              onValueChange={(val) => setFormData({ ...formData, has_scoring: val })}
            />
          </View>
          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Practice Nets</Text>
            <Switch
              value={formData.has_practice_nets}
              onValueChange={(val) => setFormData({ ...formData, has_practice_nets: val })}
            />
          </View>
          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Swimming Pool</Text>
            <Switch
              value={formData.has_swimming_pool}
              onValueChange={(val) => setFormData({ ...formData, has_swimming_pool: val })}
            />
          </View>
        </Card>

        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Location</Text>
          <Input
            label="Address *"
            value={formData.address}
            onChangeText={(text) => setFormData({ ...formData, address: text })}
            placeholder="Street address"
          />
          <View style={styles.mapsFetchBlock}>
            <Input
              label="Google Maps link"
              value={googleMapsLinkText}
              onChangeText={setGoogleMapsLinkText}
              placeholder="Paste the Google Maps share link"
            />
            <Button
              title={fetchingMapsAddress ? 'Fetching...' : 'Fetch address'}
              onPress={async () => {
                const raw = googleMapsLinkText.trim();
                if (!raw) {
                  Alert.alert('Missing link', 'Paste a Google Maps link first.');
                  return;
                }

                setFetchingMapsAddress(true);
                try {
                  let urlToParse = raw;
                  if (raw.includes('maps.app.goo.gl') || raw.includes('goo.gl/maps')) {
                    try {
                      // Try to fetch to resolve redirect (works on Native, fails on Web due to CORS)
                      const response = await fetch(raw, { method: 'GET' });
                      urlToParse = response.url;
                    } catch (fetchErr) {
                      console.log('CORS block or network error on short link, falling back to regex.');
                    }
                  }

                  const direct = extractAddressFromGoogleMapsUrl(urlToParse);
                  if (direct) {
                    setFormData((prev) => ({ ...prev, address: direct }));
                    Alert.alert('Updated', 'Address extracted from the link.');
                    return;
                  }
                  Alert.alert(
                    'Could not extract address',
                    'Short links (like maps.app.goo.gl) cannot be read directly in the browser due to security (CORS). Please paste the full URL from your browser or search query.',
                  );
                  return;
                } catch (error: any) {
                  Alert.alert('Error', error.message);
                } finally {
                  setFetchingMapsAddress(false);
                }
              }}
              loading={fetchingMapsAddress}
              disabled={fetchingMapsAddress}
              style={{ marginTop: 10 }}
            />
          </View>
          <Text style={styles.subLabel}>City & State *</Text>
          <OwnerLocationDropdown
            value={selectedLocationKey}
            options={buildLocationOptions(locationRows)}
            onChange={(k) => {
              setSelectedLocationKey(k);
              const [city, state] = k.split('__');
              setFormData((prev) => ({ ...prev, city, state }));
            }}
          />
          <Input
            label="Pincode *"
            value={formData.pincode}
            onChangeText={(text) => setFormData({ ...formData, pincode: text })}
            placeholder="Pincode"
            keyboardType="numeric"
          />

          {/* ── Map Picker ── */}
          {Platform.OS === 'web' && (
            <View style={styles.mapPickerContainer}>
              <Text style={styles.mapPickerTitle}>Set Exact Location (Pin on Map)</Text>
              <Text style={styles.mapPickerSubtitle}>
                Click on the map to place a pin at your academy's entrance or center.
              </Text>
              <View style={styles.mapWrapper}>
                <APIProvider apiKey={GOOGLE_MAPS_API_KEY}>
                  <GoogleMap
                    defaultCenter={{ lat: 28.4595, lng: 77.0266 }}
                    center={(() => {
                      const lat = parseFloat(formData.latitude || '');
                      const lng = parseFloat(formData.longitude || '');
                      return (!isNaN(lat) && !isNaN(lng)) ? { lat, lng } : undefined;
                    })()}
                    defaultZoom={13}
                    mapId={MAP_ID}
                    onClick={(e) => {
                      if (e.detail.latLng) {
                        setFormData(prev => ({
                          ...prev,
                          latitude: String(e.detail.latLng!.lat),
                          longitude: String(e.detail.latLng!.lng)
                        }));
                      }
                    }}
                    style={{ width: '100%', height: '100%' }}
                  >
                    {formData.latitude && formData.longitude && (
                      <Marker 
                        position={(() => {
                          const lat = parseFloat(formData.latitude || '');
                          const lng = parseFloat(formData.longitude || '');
                          return (!isNaN(lat) && !isNaN(lng)) ? { lat, lng } : { lat: 28.4595, lng: 77.0266 };
                        })()} 
                        icon="https://maps.google.com/mapfiles/ms/icons/green-dot.png"
                      />
                    )}
                  </GoogleMap>
                </APIProvider>
              </View>
              <View style={styles.coordsRow}>
                <View style={{ flex: 1 }}>
                  <Input
                    label="Latitude"
                    value={formData.latitude}
                    onChangeText={(text) => setFormData({ ...formData, latitude: text })}
                    placeholder="0.0000"
                    keyboardType="numeric"
                  />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Input
                    label="Longitude"
                    value={formData.longitude}
                    onChangeText={(text) => setFormData({ ...formData, longitude: text })}
                    placeholder="0.0000"
                    keyboardType="numeric"
                  />
                </View>
              </View>
            </View>
          )}
        </Card>

        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Gallery (Max 8 Images, 2 Videos)</Text>
          <View style={styles.compactMediaGrid}>
            {mediaUrls.map((url, idx) => (
              <View key={idx} style={styles.compactMediaItem}>
                <Image source={{ uri: url }} style={styles.compactMediaImg} />
                <Pressable 
                  style={styles.compactMediaRemove} 
                  onPress={() => setMediaUrls(mediaUrls.filter((_, i) => i !== idx))}
                >
                  <Text style={styles.compactMediaRemoveText}>×</Text>
                </Pressable>
              </View>
            ))}
            {mediaUrls.length < 10 && (
              <Pressable style={styles.compactMediaAdd} onPress={handlePickMedia}>
                {uploadingMedia ? <ActivityIndicator size="small" color="#64748B" /> : <Plus size={20} color="#64748B" />}
                <Text style={styles.compactMediaAddText}>{uploadingMedia ? '...' : 'Add'}</Text>
              </Pressable>
            )}
          </View>
        </Card>

        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Pricing Model</Text>
          <View style={styles.typeChipsRow}>
            {[
              { key: 'hours', label: 'Hours' },
              { key: 'overs', label: 'Overs' },
            ].map((model) => {
              const active = formData.pricing_model === model.key;
              return (
                <Pressable
                  key={model.key}
                  onPress={() => setFormData({ ...formData, pricing_model: model.key as 'hours' | 'overs' })}
                  style={[styles.typeChip, active && styles.typeChipActive]}
                >
                  <Text style={[styles.typeChipText, active && styles.typeChipTextActive]}>
                    {model.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </Card>

        <Card style={[styles.section, { marginBottom: 0 }]}>
          <Text style={styles.sectionTitle}>Add Time Slots</Text>
          
          <View style={styles.splitRow}>
            {/* Left Form */}
            <View style={styles.leftCol}>
              <Text style={styles.subLabel}>Duration (minutes) *</Text>
              <SimpleDropdown
                value={slotDurationMinutesText}
                options={DURATION_OPTIONS}
                onChange={setSlotDurationMinutesText}
                placeholder="Select duration"
              />

              <Text style={styles.subLabel}>Start Time *</Text>
              <SimpleDropdown
                value={slotStartTimeText}
                options={timeOptions}
                onChange={setSlotStartTimeText}
                placeholder="Select start time"
              />

              <Text style={styles.subLabel}>End Time (Optional for bulk add)</Text>
              <SimpleDropdown
                value={slotEndTimeText}
                options={timeOptions}
                onChange={setSlotEndTimeText}
                placeholder="Select end time"
              />

              {formData.pricing_model === 'overs' && (
                <>
                  <Text style={styles.subLabel}>Number of Overs *</Text>
                  <SimpleDropdown
                    value={slotOversCountText}
                    options={OVERS_OPTIONS}
                    onChange={setSlotOversCountText}
                    placeholder="Select overs"
                  />
                </>
              )}

              <Input
                label={formData.pricing_model === 'overs' ? "Price per Slot (₹) *" : "Price per Hour (₹) *"}
                value={slotCustomPriceText}
                onChangeText={setSlotCustomPriceText}
                keyboardType="numeric"
                placeholder="e.g., 500"
              />

              <Text style={styles.subLabel}>Apply to Days *</Text>
              <View style={[styles.typeChipsRow, { marginBottom: 16 }]}>
                {DAY_ORDER.map((day) => {
                  const active = slotSelectedDays.includes(day);
                  const dayLabel = day.charAt(0).toUpperCase() + day.slice(1, 3); // Mon, Tue, etc.
                  return (
                    <Pressable
                      key={day}
                      onPress={() => {
                        if (active) {
                          setSlotSelectedDays(slotSelectedDays.filter((d) => d !== day));
                        } else {
                          setSlotSelectedDays([...slotSelectedDays, day]);
                        }
                      }}
                      style={[styles.typeChip, active && styles.typeChipActive, { paddingHorizontal: 12 }]}
                    >
                      <Text style={[styles.typeChipText, active && styles.typeChipTextActive]}>
                        {dayLabel}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <Button 
                title={editingSlotIdx !== null ? "Update Slot" : "Add Slot"} 
                onPress={addSlot} 
                fullWidth 
              />
            </View>

            {/* Right Slots */}
            <View style={styles.rightCol}>
              <Text style={styles.subLabel}>Saved Slots (Click Day)</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                {DAY_ORDER.map((day) => {
                  const hasSlots = savedSlots.some(slot => slot.days.includes(day));
                  const dayLabel = day.charAt(0).toUpperCase() + day.slice(1, 3); // Mon, Tue...
                  
                  return (
                    <Pressable
                      key={day}
                      onPress={() => {
                        if (hasSlots) {
                          setSelectedDayForModal(day);
                          setModalVisible(true);
                        }
                      }}
                      style={[
                        styles.typeChip, 
                        hasSlots && { borderColor: '#00ea6b', borderWidth: 1, backgroundColor: '#E6FBF0' },
                        !hasSlots && { opacity: 0.5 }
                      ]}
                    >
                      <Text style={[styles.typeChipText, hasSlots && { color: '#01B55B', fontWeight: '600' }]}>
                        {dayLabel}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </View>
        </Card>

        <Button
          title={loading ? 'Adding Net...' : 'Add Net'}
          onPress={handleSubmit}
          loading={loading}
          disabled={loading}
          fullWidth
          size="large"
          style={styles.submitBtn}
        />

        <Modal
          animationType="fade"
          transparent={true}
          visible={modalVisible}
          onRequestClose={() => setModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  Slots for {selectedDayForModal ? selectedDayForModal.charAt(0).toUpperCase() + selectedDayForModal.slice(1) : ''}
                </Text>
                <Pressable onPress={() => setModalVisible(false)}>
                  <Text style={{ fontSize: 24, color: '#64748B' }}>×</Text>
                </Pressable>
              </View>
              
              <ScrollView style={{ maxHeight: 300 }}>
                {selectedDayForModal && savedSlots.map((slot, originalIdx) => {
                  if (!slot.days.includes(selectedDayForModal)) return null;

                  const parts = slot.startHHMM.split(':');
                  const h24 = parseInt(parts[0], 10);
                  const mins = parts[1];
                  const ampm = h24 >= 12 ? 'PM' : 'AM';
                  const h12 = h24 % 12 || 12;
                  const timeStr = `${h12.toString().padStart(2, '0')}:${mins} ${ampm}`;

                  return (
                    <View key={originalIdx} style={styles.modalSlotRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.modalSlotTime}>{timeStr}</Text>
                        <Text style={styles.modalSlotDetails}>
                          {slot.durationMinutes} mins
                          {slot.oversCount ? ` (${slot.oversCount} overs)` : ''}
                        </Text>
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                        <Text style={styles.modalSlotPrice}>₹{slot.customPrice}</Text>
                        
                        <View style={{ flexDirection: 'row', gap: 12 }}>
                          <Pressable 
                            onPress={() => {
                              setSourceDayForEdit(selectedDayForModal);
                              editSlot(originalIdx);
                              setSlotSelectedDays([selectedDayForModal!]);
                              setModalVisible(false); // Close modal to show edit form
                            }}
                          >
                            <Edit size={18} color="#64748B" />
                          </Pressable>
                          <Pressable onPress={() => deleteSlot(originalIdx)}>
                            <Trash2 size={18} color="#EF4444" />
                          </Pressable>
                        </View>
                      </View>
                    </View>
                  );
                })}
              </ScrollView>
              
              <Button title="Close" onPress={() => setModalVisible(false)} fullWidth style={{ marginTop: 16 }} />
            </View>
          </View>
        </Modal>
      </ScrollView>
    </KeyboardAvoidingView>
    </WebLayout>
  );
}

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
    marginBottom: 12,
  },
  button: {
    borderWidth: 1,
    borderColor: Platform.OS === 'web' ? '#E5E7EB' : 'rgba(0,234,107,0.25)',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 10,
    backgroundColor: Platform.OS === 'web' ? '#FFFFFF' : 'rgba(4,53,41,0.6)',
  },
  buttonOpen: {
    borderColor: Platform.OS === 'web' ? '#10b981' : '#00ea6b',
    backgroundColor: Platform.OS === 'web' ? 'rgba(220,141,60,0.05)' : 'rgba(0,234,107,0.1)',
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '300',
    color: Platform.OS === 'web' ? '#111827' : '#f9fafb',
    fontFamily: Platform.OS === 'web' ? '"Inter", sans-serif' : undefined,
  },
  menu: {
    position: 'relative' as any,
    maxHeight: 260,
    backgroundColor: Platform.OS === 'web' ? '#FFFFFF' : '#06392e',
    borderWidth: 1,
    borderColor: Platform.OS === 'web' ? '#E5E7EB' : 'rgba(0,234,107,0.25)',
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
    color: Platform.OS === 'web' ? '#111827' : '#f9fafb',
    fontFamily: Platform.OS === 'web' ? '"Inter", sans-serif' : undefined,
  },
});

const generateTimeOptions = (durationMins: number) => {
  const options = [];
  const totalMinutesInDay = 24 * 60;
  
  for (let i = 0; i < totalMinutesInDay; i += durationMins) {
    const hours24 = Math.floor(i / 60);
    const minutes = (i % 60).toString().padStart(2, '0');
    
    const ampm = hours24 >= 12 ? 'PM' : 'AM';
    const hours12 = hours24 % 12 || 12; // convert 0 to 12
    const label = `${hours12.toString().padStart(2, '0')}:${minutes} ${ampm}`;
    
    options.push({ key: `${hours24.toString().padStart(2, '0')}:${minutes}`, label: label });
  }
  return options;
};

const OVERS_OPTIONS = [
  { key: '5', label: '5 Overs' },
  { key: '10', label: '10 Overs' },
  { key: '15', label: '15 Overs' },
  { key: '20', label: '20 Overs' },
];

const DURATION_OPTIONS = [
  { key: '10', label: '10 Mins' },
  { key: '20', label: '20 Mins' },
  { key: '30', label: '30 Mins' },
  { key: '60', label: '60 Mins' },
  { key: '90', label: '90 Mins' },
  { key: '120', label: '120 Mins' },
];

function SimpleDropdown({
  value,
  options,
  onChange,
  placeholder,
}: {
  value: string;
  options: { key: string; label: string }[];
  onChange: (k: string) => void;
  placeholder: string;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.key === value);

  return (
    <View style={[stylesDropdown.outer, open && { zIndex: 100000 }]}>
      <Pressable
        onPress={() => setOpen((prev) => !prev)}
        style={[stylesDropdown.button, open && stylesDropdown.buttonOpen]}
      >
        <Text style={stylesDropdown.buttonText}>
          {selected?.label || placeholder}
        </Text>
      </Pressable>
      {open && (
        <View style={stylesDropdown.menu}>
          <ScrollView>
            {options.map((opt) => (
              <Pressable
                key={opt.key}
                onPress={() => {
                  onChange(opt.key);
                  setOpen(false);
                }}
                style={stylesDropdown.option}
              >
                <Text style={stylesDropdown.optionText}>{opt.label}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

const stylesDropdown = StyleSheet.create({
  outer: {
    position: 'relative',
    zIndex: 9999,
    overflow: 'visible',
    marginBottom: 16,
  },
  button: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#F8FAFC',
  },
  buttonOpen: {
    borderColor: '#00ea6b',
    backgroundColor: '#FFFFFF',
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#0F172A',
    fontFamily: 'Inter',
  },
  menu: {
    position: 'absolute',
    top: 52,
    left: 0,
    right: 0,
    maxHeight: 200,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    borderRadius: 12,
    zIndex: 99999,
    elevation: 50,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
  },
  option: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  optionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#0F172A',
    fontFamily: 'Inter',
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  mapPickerContainer: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  mapPickerTitle: {
    fontFamily: 'Inter',
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 4,
  },
  mapPickerSubtitle: {
    fontFamily: 'Inter',
    fontSize: 14,
    color: '#64748b',
    marginBottom: 16,
  },
  mapWrapper: {
    height: 300,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#f1f5f9',
    marginBottom: 16,
  },
  coordsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  scrollContent: {
    paddingTop: 24,
    paddingHorizontal: 24,
    paddingBottom: 0,
  },
  title: {
    fontSize: 22,
    fontWeight: '600',
    color: '#0F172A', // Dark text
    marginBottom: 24,
    textAlign: 'center',
    fontFamily: 'Inter',
  },
  section: {
    backgroundColor: '#FFFFFF', // White card
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0', // Light border
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 16,
    fontFamily: 'Inter',
  },
  subLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#64748B',
    marginBottom: 8,
    marginTop: 12,
    fontFamily: 'Inter',
  },
  typeChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  typeChip: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#F1F5F9', // Light gray chip
    borderWidth: 1,
    borderColor: 'transparent',
  },
  typeChipActive: {
    backgroundColor: 'rgba(0, 234, 107, 0.1)',
    borderColor: '#00ea6b',
  },
  typeChipText: {
    color: '#64748B',
    fontSize: 13,
    fontWeight: '600',
    fontFamily: 'Inter',
  },
  typeChipTextActive: {
    color: '#00ea6b',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  switchLabel: {
    fontSize: 14,
    color: '#0F172A',
    fontFamily: 'Inter',
  },
  previewContainer: {
    marginTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 16,
  },
  previewTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 10,
    fontFamily: 'Inter',
  },
  previewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  previewText: {
    color: '#64748B',
    fontSize: 13,
    fontFamily: 'Inter',
  },
  previewPrice: {
    color: '#00ea6b',
    fontWeight: '600',
    fontSize: 13,
    fontFamily: 'Inter',
  },
  mapsFetchBlock: {
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingBottom: 16,
  },
  compactMediaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 8,
  },
  compactMediaItem: {
    width: 60,
    height: 60,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  compactMediaImg: {
    width: '100%',
    height: '100%',
  },
  compactMediaRemove: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  compactMediaRemoveText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  compactMediaAdd: {
    width: 60,
    height: 60,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  compactMediaAddText: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 2,
    fontFamily: 'Inter',
  },
  splitRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 20,
  },
  leftCol: {
    flex: 1,
    minWidth: 300,
  },
  rightCol: {
    flex: 1,
    minWidth: 300,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    width: '90%',
    maxWidth: 700,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    fontFamily: 'Inter',
  },
  modalSlotRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalSlotTime: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0F172A',
    fontFamily: 'Inter',
  },
  modalSlotDetails: {
    fontSize: 13,
    color: '#64748B',
    fontFamily: 'Inter',
  },
  modalSlotPrice: {
    fontSize: 15,
    fontWeight: '700',
    color: '#00ea6b',
    fontFamily: 'Inter',
  },
  submitBtn: {
    marginTop: 10,
    backgroundColor: '#00ea6b',
  },
});
