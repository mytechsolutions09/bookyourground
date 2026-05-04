import * as React from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
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
  useWindowDimensions,
  Linking,
} from 'react-native';
import { useIsCompact } from '@/hooks/useIsCompact';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import WebLayout from '@/components/web/WebLayout';
import { 
  APIProvider, 
  Map as GoogleMap, 
  Marker, 
  useMap,
  useMapsLibrary
} from '@vis.gl/react-google-maps';
import MobileAppNavbar from '@/components/MobileAppNavbar';
import TimeSlotsEditor, { TimeSlotsEditorHandle } from '@/components/availability/TimeSlotsEditor';
import { createTimeSlotsForGround } from '@/utils/timeSlotsDb';
import { cricketPitchSurfaceForDb, isCricketGroundType } from '@/utils/cricketGround';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import type { DayOfWeek } from '@/types';

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

const DAY_PRESET_OPTIONS: { key: string; label: string; days: DayOfWeek[] }[] = [
  { key: 'all', label: 'Every day (Mon–Sun)', days: [...DAY_ORDER] },
  {
    key: 'weekdays',
    label: 'Weekdays (Mon–Fri)',
    days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
  },
  { key: 'weekend', label: 'Weekend (Sat–Sun)', days: ['saturday', 'sunday'] },
  { key: 'monday', label: 'Monday', days: ['monday'] },
  { key: 'tuesday', label: 'Tuesday', days: ['tuesday'] },
  { key: 'wednesday', label: 'Wednesday', days: ['wednesday'] },
  { key: 'thursday', label: 'Thursday', days: ['thursday'] },
  { key: 'friday', label: 'Friday', days: ['friday'] },
  { key: 'saturday', label: 'Saturday', days: ['saturday'] },
  { key: 'sunday', label: 'Sunday', days: ['sunday'] },
];

function daysForPresetKey(key: string): DayOfWeek[] {
  const row = DAY_PRESET_OPTIONS.find((o) => o.key === key);
  return row?.days ?? DAY_ORDER;
}

function presetKeyForDays(days: DayOfWeek[]): string {
  const norm = [...days].sort().join('|');
  const match = DAY_PRESET_OPTIONS.find((o) => [...o.days].sort().join('|') === norm);
  return match?.key ?? 'all';
}

function labelForSlotDays(days: DayOfWeek[]): string {
  const k = presetKeyForDays(days);
  const opt = DAY_PRESET_OPTIONS.find((o) => o.key === k);
  return opt?.label ?? days.join(', ');
}

export default function AddGroundScreen() {
  const { user } = useAuth();
  const isCompact = useIsCompact();
  const [loading, setLoading] = useState(false);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [locationRows, setLocationRows] = useState<any[]>([]);
  const [locationKey, setLocationKey] = useState<string>('');
  const [createdGroundId, setCreatedGroundId] = useState<string | null>(null);
  const availabilityRef = useRef<TimeSlotsEditorHandle | null>(null);

  type SlotDraft = {
    startHHMM: string;
    durationMinutes: number;
    customPrice: number;
    days: DayOfWeek[];
  };

  const [savedSlots, setSavedSlots] = useState<SlotDraft[]>([]);

  // Draft fields for the next slot to add
  const [slotStartTimeText, setSlotStartTimeText] = useState<string>('');
  const [slotDaysKey, setSlotDaysKey] = useState<string>('all');
  const [slotDurationMinutesText, setSlotDurationMinutesText] = useState<string>('60');
  const [slotCustomPriceText, setSlotCustomPriceText] = useState<string>('');

  // Google Maps link → extract address
  const [googleMapsLinkText, setGoogleMapsLinkText] = useState<string>('');
  const [fetchingMapsAddress, setFetchingMapsAddress] = useState(false);

  const dayPresetDropdownOptions = useMemo(
    () => DAY_PRESET_OPTIONS.map(({ key, label }) => ({ key, label })),
    [],
  );

  const startTimeDropdownOptions = useMemo(() => {
    // 30-minute increments: 12:00 AM (00:00) through 11:30 PM (23:30).
    const pad2 = (n: number) => String(n).padStart(2, '0');
    const options: { key: string; label: string }[] = [];
    for (let hh = 0; hh <= 23; hh += 1) {
      options.push({ key: `${pad2(hh)}:00`, label: `${pad2(hh)}:00` });
      options.push({ key: `${pad2(hh)}:30`, label: `${pad2(hh)}:30` });
    }
    return options;
  }, []);

  const [editingSlotIndex, setEditingSlotIndex] = useState<number | null>(null);
  const [editingSlotStartTimeText, setEditingSlotStartTimeText] = useState<string>('');
  const [editingSlotDaysKey, setEditingSlotDaysKey] = useState<string>('all');
  const [editingSlotDurationMinutesText, setEditingSlotDurationMinutesText] = useState<string>('');
  const [editingSlotCustomPriceText, setEditingSlotCustomPriceText] = useState<string>('');
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    pitch_type: '',
    cricket_pitch_surface: '' as '' | 'Turf' | 'Matting',
    ground_size: '',
    capacity: '',
    has_floodlights: false,
    has_parking: false,
    has_changing_rooms: false,
    has_pavilion: false,
    has_washrooms: false,
    mediaUrls: [] as string[],
    latitude: '',
    longitude: '',
  });

  const trimmedDurationMinutes = String(slotDurationMinutesText ?? '').trim();
  const trimmedCustomPrice = String(slotCustomPriceText ?? '').trim();

  const normalizeHHMM = (value: string): string | null => {
    const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
    if (!match) return null;
    const hh = Number(match[1]);
    const mm = Number(match[2]);
    if (!Number.isFinite(hh) || !Number.isFinite(mm)) return null;
    if (hh < 0 || hh > 23) return null;
    if (mm < 0 || mm > 59) return null;
    return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
  };

  const normalizedDraftStartTime = (() => {
    const value = String(slotStartTimeText ?? '').trim();
    if (!value) return null;
    return normalizeHHMM(value);
  })();

  const draftDurationMinutes = parseInt(trimmedDurationMinutes, 10);
  const draftCustomPrice = parseFloat(trimmedCustomPrice);

  const canAddAnotherSlot =
    normalizedDraftStartTime != null &&
    Number.isFinite(draftDurationMinutes) &&
    draftDurationMinutes > 0 &&
    Number.isFinite(draftCustomPrice) &&
    draftCustomPrice > 0;

  const showPreviewRightPanel = Platform.OS === 'web' && windowWidth >= 900;

  const mapsUrl = useMemo(() => {
    const { address, city, state, pincode, latitude, longitude } = formData;
    const baseUrl = "https://www.google.com/maps/dir/?api=1";
    
    let destination;
    if (latitude && longitude) {
      destination = `${latitude},${longitude}`;
    } else {
      const parts = [address, city, state, pincode].map((v) => String(v ?? '').trim()).filter(Boolean);
      destination = encodeURIComponent(parts.join(', '));
    }
    
    if (!destination) return null;
    return `${baseUrl}&destination=${destination}&travelmode=driving`;
  }, [formData.address, formData.city, formData.state, formData.pincode, formData.latitude, formData.longitude]);

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

      // Handle URLs like: /maps/place/<encoded>/...
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

    // Regex fallback for cases where URL parsing fails or params are missing.
    const m = url.match(/[?&](?:q|query|destination|daddr)=([^&]+)/i);
    if (m?.[1]) {
      try {
        return decodeURIComponent(m[1]).replace(/\+/g, ' ').trim();
      } catch {
        return m[1].replace(/\+/g, ' ').trim();
      }
    }

    // Last resort: parse a place name from `/maps/place/<name>/`
    const placeMatch = url.match(/\/maps\/place\/([^/@?]+)/i);
    if (placeMatch?.[1]) {
      const cleaned = placeMatch[1];
      try {
        return decodeURIComponent(cleaned.replace(/\+/g, ' ')).trim();
      } catch {
        return cleaned.replace(/\+/g, ' ').trim();
      }
    }
    return null;
  };

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
        console.error('Error loading locations for owner add-ground:', e);
      }
    };

    loadLocations();
  }, []);

  const handleSubmit = async () => {
    if (!user) return;

    if (!formData.name || !formData.address || !formData.city || !formData.state || !formData.pincode) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    if (isCricketGroundType(formData.pitch_type)) {
      const s = cricketPitchSurfaceForDb(formData.pitch_type, formData.cricket_pitch_surface);
      if (!s) {
        Alert.alert('Pitch surface', 'Please choose Turf or Matting for this cricket ground.');
        return;
      }
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
          pitch_type: formData.pitch_type || null,
          cricket_pitch_surface: cricketPitchSurfaceForDb(
            formData.pitch_type,
            formData.cricket_pitch_surface,
          ),
          ground_size: formData.ground_size || null,
          capacity: formData.capacity ? parseInt(formData.capacity) : null,
          has_floodlights: formData.has_floodlights,
          has_parking: formData.has_parking,
          has_changing_rooms: formData.has_changing_rooms,
          has_pavilion: formData.has_pavilion,
          has_washrooms: formData.has_washrooms,
          latitude: formData.latitude ? parseFloat(formData.latitude) : null,
          longitude: formData.longitude ? parseFloat(formData.longitude) : null,
        })
        .select('id')
        .single();

      if (error) throw error;

      // Create time slots from the saved slot rows on this page (no hard-coded seeding).
      if (savedSlots.length) {
        let totalCreated = 0;
        let totalSkipped = 0;

        for (const slot of savedSlots) {
          const res = await createTimeSlotsForGround({
            groundId: created.id,
            days: slot.days.length ? slot.days : DAY_ORDER,
            startTimesHHMM: [slot.startHHMM],
            durationMinutes: slot.durationMinutes,
            isAvailable: true,
            customPrice: slot.customPrice,
            supabaseClient: supabase,
          });
          totalCreated += res.created;
          totalSkipped += res.skipped;
        }

        if (totalCreated === 0) {
          Alert.alert(
            'No time slots created',
            totalSkipped > 0
              ? 'The slots already exist (duplicate start times).'
              : 'Please check the time format (HH:MM) and try again.',
          );
          return;
        }
      }

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

      setCreatedGroundId(created.id as string);
      Alert.alert(
        'Ground added',
        'Your ground has been created. You can now adjust hours and availability below.',
      );
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
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

      // Extract filename and extension
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
        // Fallback: XHR blob (works in Expo Go on some platforms)
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

      setFormData((prev) => ({
        ...prev,
        mediaUrls: [...(prev.mediaUrls || []), publicUrl].slice(0, 8),
      }));
    } catch (e: any) {
      console.error('Error picking/uploading media:', e);
      Alert.alert('Upload error', e?.message ?? 'Something went wrong while uploading media.');
    } finally {
      setUploadingMedia(false);
    }
  };

  const content = (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
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
          <View style={styles.locationRow}>
            <View style={styles.locationCol}>
              <Text style={styles.subLabel}>City / State *</Text>
              <LocationDropdown
                value={locationKey}
                options={buildLocationOptions(locationRows)}
                onChange={(k) => {
                  setLocationKey(k);
                  const [city, state] = k.split('__');
                  setFormData((prev) => ({
                    ...prev,
                    city: city || '',
                    state: state || '',
                  }));
                }}
              />
            </View>
          </View>
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
                  // First try to parse directly from the URL (works for links that include `q=`).
                  const direct = extractAddressFromGoogleMapsUrl(raw);
                  if (direct) {
                    setFormData((prev) => ({ ...prev, address: direct }));
                    Alert.alert('Updated', 'Address extracted from the link.');
                    return;
                  }

                  // For short links like `maps.app.goo.gl/...`, the final URL/address
                  // is not readable from the browser due to CORS restrictions.
                  // So we only support links where the share URL already contains
                  // `q=` / `query=` or a `maps/place/`-style address in the URL.
                  Alert.alert(
                    'Could not extract address',
                    'Please paste a full Google Maps link that contains `q=` or `query=` (full share URL). Short links may not be readable in browser.',
                  );
                  return;
                } catch (e: any) {
                  console.warn('extract address failed', e);
                  Alert.alert(
                    'Could not extract address',
                    'Please paste a Google Maps link that contains `q=` / `query=` or a full `maps/place/...` URL.',
                  );
                } finally {
                  setFetchingMapsAddress(false);
                }
              }}
              loading={fetchingMapsAddress}
              disabled={fetchingMapsAddress}
              fullWidth
              size="small"
            />
          </View>
          <Pressable
            onPress={() => {
              if (!mapsUrl) return;
              void Linking.openURL(mapsUrl);
            }}
            style={[styles.mapsLinkButton, !mapsUrl ? styles.mapsLinkButtonDisabled : null]}
          >
            <Text style={styles.mapsLinkButtonText}>View on Google Maps</Text>
          </Pressable>
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
                Click on the map to place a pin at your ground's entrance or center.
              </Text>
              <View style={styles.mapWrapper}>
                <APIProvider apiKey={GOOGLE_MAPS_API_KEY}>
                  <GoogleMap
                    defaultCenter={{ lat: 28.4595, lng: 77.0266 }}
                    center={formData.latitude && formData.longitude ? { lat: parseFloat(formData.latitude), lng: parseFloat(formData.longitude) } : undefined}
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
                        position={{ lat: parseFloat(formData.latitude), lng: parseFloat(formData.longitude) }} 
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
          <Text style={styles.sectionTitle}>Ground Details</Text>
          <Text style={styles.subLabel}>Type *</Text>
          <StartTimeDropdown
            value={formData.pitch_type}
            options={[
              { key: 'Cricket Ground', label: 'Cricket Ground' },
              { key: 'Box Cricket', label: 'Box Cricket' },
            ]}
            onChange={(val) =>
              setFormData({
                ...formData,
                pitch_type: val,
                cricket_pitch_surface: '',
              })
            }
            placeholder="Select Ground Type"
          />
          {formData.pitch_type === 'Cricket Ground' ? (
            <>
              <Text style={styles.subLabel}>Pitch surface</Text>
              <View style={styles.typeChipsRow}>
                {(['Turf', 'Matting'] as const).map((surfaceLabel) => {
                  const active = formData.cricket_pitch_surface === surfaceLabel;
                  return (
                    <Pressable
                      key={surfaceLabel}
                      onPress={() =>
                        setFormData({ ...formData, cricket_pitch_surface: surfaceLabel })
                      }
                      style={[styles.typeChip, active && styles.typeChipActive]}
                    >
                      <Text style={[styles.typeChipText, active && styles.typeChipTextActive]}>
                        {surfaceLabel}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </>
          ) : null}
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
          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Washroom</Text>
            <Switch
              value={formData.has_washrooms}
              onValueChange={(value) => setFormData({ ...formData, has_washrooms: value })}
            />
          </View>
        </Card>

        <Text style={styles.timeSlotsNote}>
          Add time slot start times and which days they apply to below. When you click "Add
          Ground", we will create these slots in the database, and then you can fine-tune
          availability and per-slot custom prices in the editor.
        </Text>

        <Card style={[styles.section, styles.timeSlotsCard]}>
          <Text style={styles.sectionTitle}>Add Time Slots</Text>
          <View style={showPreviewRightPanel ? styles.addTimeSlotsRow : undefined}>
            <View style={showPreviewRightPanel ? styles.addTimeSlotsLeft : undefined}>
              <View style={styles.startTimeFieldBlock}>
                <Text style={styles.subLabel}>Start time (HH:MM) *</Text>
                <StartTimeDropdown
                  value={slotStartTimeText}
                  options={startTimeDropdownOptions}
                  onChange={(v) => setSlotStartTimeText(v)}
                  placeholder="Select time"
                />
              </View>
              <View style={styles.daysFieldBlock}>
                <Text style={styles.subLabel}>Days *</Text>
                <StartTimeDropdown
                  value={slotDaysKey}
                  options={dayPresetDropdownOptions}
                  onChange={setSlotDaysKey}
                  placeholder="Select days"
                />
              </View>
              <View style={styles.timeSlotsFieldsAfterStart}>
                <Input
                  label="Duration (minutes) *"
                  value={slotDurationMinutesText}
                  onChangeText={setSlotDurationMinutesText}
                  placeholder="e.g. 60"
                  keyboardType="numeric"
                />
                <Input
                  label="Custom price per slot (₹) *"
                  value={slotCustomPriceText}
                  onChangeText={setSlotCustomPriceText}
                  placeholder="e.g. 1500"
                  keyboardType="numeric"
                />
              </View>
              {canAddAnotherSlot ? (
                <Pressable
                  style={[styles.addAnotherSlotRow, styles.addAnotherBtn]}
                  onPress={() => {
                    const normalized = normalizeHHMM(String(slotStartTimeText ?? '').trim());
                    const durationMinutes = parseInt(String(slotDurationMinutesText ?? '').trim(), 10);
                    const customPrice = parseFloat(String(slotCustomPriceText ?? '').trim());

                    if (!normalized) {
                      Alert.alert('Invalid start time', 'Enter time in HH:MM format (e.g. 08:00).');
                      return;
                    }
                    if (!Number.isFinite(durationMinutes) || durationMinutes <= 0) {
                      Alert.alert('Invalid duration', 'Duration must be a positive number of minutes.');
                      return;
                    }
                    if (!Number.isFinite(customPrice) || customPrice <= 0) {
                      Alert.alert('Invalid custom price', 'Custom price must be a valid number.');
                      return;
                    }

                    setSavedSlots((prev) => [
                      ...prev,
                      {
                        startHHMM: normalized,
                        durationMinutes,
                        customPrice,
                        days: daysForPresetKey(slotDaysKey),
                      },
                    ]);

                    // Save old slot and clean all fields for next slot.
                    setSlotStartTimeText('');
                    setSlotDurationMinutesText('');
                    setSlotCustomPriceText('');
                  }}
                >
                  <Text style={styles.addAnotherBtnText}>Add another slot</Text>
                </Pressable>
              ) : null}
            </View>

            {showPreviewRightPanel ? (
              <View style={styles.addTimeSlotsRight}>
                <Text style={styles.previewTitle}>Saved slots</Text>
                {savedSlots.length ? (
                  <View style={styles.previewList}>
                    {savedSlots.map((slot, idx) => {
                      const isEditing = editingSlotIndex === idx;
                      return (
                        <View key={`${slot.startHHMM}-${idx}`} style={styles.previewRow}>
                          <View style={styles.previewMeta}>
                            {!isEditing ? (
                              <>
                                <Text style={styles.previewMain}>
                                  {slot.startHHMM} · {slot.durationMinutes} mins
                                </Text>
                                <Text style={styles.previewSub}>{labelForSlotDays(slot.days)}</Text>
                                <Text style={styles.previewSub}>
                                  ₹{slot.customPrice.toLocaleString('en-IN')}
                                </Text>
                              </>
                            ) : (
                              <>
                                <Text style={styles.previewMain}>Edit slot</Text>
                                <TextInput
                                  style={styles.previewEditInput}
                                  value={editingSlotStartTimeText}
                                  onChangeText={setEditingSlotStartTimeText}
                                  keyboardType="default"
                                  placeholder="HH:MM"
                                />
                                <View style={styles.daysFieldBlock}>
                                  <Text style={styles.subLabel}>Days</Text>
                                  <StartTimeDropdown
                                    value={editingSlotDaysKey}
                                    options={dayPresetDropdownOptions}
                                    onChange={setEditingSlotDaysKey}
                                    placeholder="Select days"
                                  />
                                </View>
                                <TextInput
                                  style={styles.previewEditInput}
                                  value={editingSlotDurationMinutesText}
                                  onChangeText={setEditingSlotDurationMinutesText}
                                  keyboardType="numeric"
                                  placeholder="Duration (minutes)"
                                />
                                <TextInput
                                  style={styles.previewEditInput}
                                  value={editingSlotCustomPriceText}
                                  onChangeText={setEditingSlotCustomPriceText}
                                  keyboardType="numeric"
                                  placeholder="Custom price (₹)"
                                />
                              </>
                            )}
                          </View>

                          <View style={styles.previewActions}>
                            {isEditing ? (
                              <>
                                <Pressable
                                  style={styles.actionBtn}
                                  onPress={() => {
                                    const normalized = normalizeHHMM(
                                      String(editingSlotStartTimeText ?? '').trim(),
                                    );
                                    const durationMinutes = parseInt(
                                      String(editingSlotDurationMinutesText ?? '').trim(),
                                      10,
                                    );
                                    const customPrice = parseFloat(
                                      String(editingSlotCustomPriceText ?? '').trim(),
                                    );

                                    if (!normalized) {
                                      Alert.alert(
                                        'Invalid start time',
                                        'Enter time in HH:MM format (e.g. 08:00).',
                                      );
                                      return;
                                    }
                                    if (!Number.isFinite(durationMinutes) || durationMinutes <= 0) {
                                      Alert.alert(
                                        'Invalid duration',
                                        'Duration must be a positive number of minutes.',
                                      );
                                      return;
                                    }
                                    if (!Number.isFinite(customPrice) || customPrice <= 0) {
                                      Alert.alert(
                                        'Invalid custom price',
                                        'Custom price must be a valid number.',
                                      );
                                      return;
                                    }

                                    setSavedSlots((prev) =>
                                      prev.map((s, i) =>
                                        i === idx
                                          ? {
                                              ...s,
                                              startHHMM: normalized,
                                              durationMinutes,
                                              customPrice,
                                              days: daysForPresetKey(editingSlotDaysKey),
                                            }
                                          : s,
                                      ),
                                    );

                                    setEditingSlotIndex(null);
                                    setEditingSlotStartTimeText('');
                                    setEditingSlotDaysKey('all');
                                    setEditingSlotDurationMinutesText('');
                                    setEditingSlotCustomPriceText('');
                                  }}
                                >
                                  <Text style={styles.actionBtnText}>Save</Text>
                                </Pressable>
                                <Pressable
                                  style={styles.actionBtn}
                                  onPress={() => {
                                    setEditingSlotIndex(null);
                                    setEditingSlotStartTimeText('');
                                    setEditingSlotDaysKey('all');
                                    setEditingSlotDurationMinutesText('');
                                    setEditingSlotCustomPriceText('');
                                  }}
                                >
                                  <Text style={styles.actionBtnText}>Cancel</Text>
                                </Pressable>
                              </>
                            ) : (
                              <>
                                <Pressable
                                  style={styles.actionBtn}
                                  onPress={() => {
                                    setEditingSlotIndex(idx);
                                    setEditingSlotStartTimeText(slot.startHHMM);
                                    setEditingSlotDaysKey(presetKeyForDays(slot.days));
                                    setEditingSlotDurationMinutesText(String(slot.durationMinutes));
                                    setEditingSlotCustomPriceText(String(slot.customPrice));
                                  }}
                                >
                                  <Text style={styles.actionBtnText}>Edit</Text>
                                </Pressable>
                                <Pressable
                                  style={styles.actionBtn}
                                  onPress={() => {
                                    setSavedSlots((prev) => {
                                      const copy = {
                                        startHHMM: slot.startHHMM,
                                        durationMinutes: slot.durationMinutes,
                                        customPrice: slot.customPrice,
                                        days: [...slot.days],
                                      };
                                      return [...prev.slice(0, idx + 1), copy, ...prev.slice(idx + 1)];
                                    });
                                    setEditingSlotIndex((editing) =>
                                      editing != null && editing > idx ? editing + 1 : editing,
                                    );
                                  }}
                                >
                                  <Text style={styles.actionBtnText}>Duplicate</Text>
                                </Pressable>
                                <Pressable
                                  style={[styles.actionBtn, styles.actionDangerBtn]}
                                  onPress={() => {
                                    setSavedSlots((prev) => prev.filter((_, i) => i !== idx));
                                    if (editingSlotIndex === idx) {
                                      setEditingSlotIndex(null);
                                      setEditingSlotStartTimeText('');
                                      setEditingSlotDaysKey('all');
                                      setEditingSlotDurationMinutesText('');
                                      setEditingSlotCustomPriceText('');
                                    }
                                  }}
                                >
                                  <Text style={[styles.actionBtnText, styles.actionDangerBtnText]}>
                                    Delete
                                  </Text>
                                </Pressable>
                              </>
                            )}
                          </View>
                        </View>
                      );
                    })}
                  </View>
                ) : (
                  <Text style={styles.previewEmpty}>
                    Add start time, days, duration and price to save.
                  </Text>
                )}
              </View>
            ) : null}
          </View>
        </Card>

        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Images</Text>
          <Text style={styles.helperText}>
            Add 1–8 image or video URLs, or upload files from your device. Files are stored in the
            `ground-images` bucket. First image is used as the primary thumbnail.
          </Text>
          <Pressable
            style={[styles.mediaAddButton, styles.mediaUploadButton]}
            onPress={handlePickMedia}
            disabled={uploadingMedia}
          >
            <Text style={styles.mediaUploadText}>
              {uploadingMedia ? 'Uploading…' : 'Upload from device'}
            </Text>
          </Pressable>
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

        {createdGroundId && (
          <Card style={styles.section}>
            <Text style={styles.sectionTitle}>Hours & Availability</Text>
            <Text style={styles.helperText}>
              Add your preferred time slots first, then adjust which ones are available. You can always change this later from My grounds → Edit.
            </Text>
            <TimeSlotsEditor
              ref={availabilityRef}
              groundId={createdGroundId}
              pitchType={formData.pitch_type || null}
              canEdit
              seedDefaults={false}
            />
          </Card>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );

  return Platform.OS === 'web' ? (
    <WebLayout>{content}</WebLayout>
  ) : (
    <View style={styles.nativeRoot}>
      <MobileAppNavbar title="Add Ground" titleColor="#01b854" />
      {content}
    </View>
  );
}

// Check for web platform
const IS_WEB = Platform.OS === 'web';

const styles = StyleSheet.create({
  nativeRoot: {
    flex: 1,
    backgroundColor: 'transparent',
  },
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
    padding: 0,
    paddingTop: 0,
    overflow: 'visible',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 24,
    fontFamily: 'Inter',
  },
  section: {
    marginBottom: 16,
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  sectionTitle: {
    fontFamily: 'Inter',
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 16,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  subLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748B',
    fontFamily: 'Inter',
    marginBottom: 8,
  },
  helperText: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 8,
    fontFamily: 'Inter',
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
    fontSize: 16,
    color: '#334155',
    fontFamily: 'Inter',
  },
  typeChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  typeChip: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  typeChipActive: {
    backgroundColor: '#FFFFFF',
    borderColor: '#01b854',
    shadowColor: '#01b854',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  typeChipText: {
    fontFamily: 'Inter',
    fontSize: 13,
    fontWeight: '500',
    color: '#64748B',
  },
  typeChipTextActive: {
    color: '#01b854',
    fontWeight: '800',
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
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#F8FAFC',
    fontSize: 14,
    fontWeight: '400',
    color: '#0F172A',
    fontFamily: 'Inter',
  },
  mediaRemove: {
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  mediaRemoveText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#EF4444',
  },
  mediaAddButton: {
    marginTop: 4,
  },
  mediaAddText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#01b854',
  },
  mediaUploadButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#01b854',
    backgroundColor: '#FFFFFF',
    marginBottom: 8,
  },
  mediaUploadText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#01b854',
  },
  locationRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
    zIndex: 20,
  },
  locationCol: {
    flex: 1,
  },
  timeSlotsNote: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 4,
    marginBottom: 24,
  },
  submitButton: {
    marginTop: 8,
    marginBottom: 32,
  },
  addAnotherBtn: {
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    marginBottom: 16,
  },
  addAnotherBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#01b854',
  },
  addTimeSlotsRow: {
    flexDirection: 'row',
    gap: 16,
    ...Platform.select({
      web: {
        position: 'relative' as const,
      },
    }),
  },
  addTimeSlotsLeft: {
    flex: 1,
    minWidth: 0,
    ...Platform.select({
      web: {
        position: 'relative' as const,
        zIndex: 3,
      },
    }),
  },
  addTimeSlotsRight: {
    flex: 1,
    minWidth: 0,
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    alignSelf: 'flex-start',
    ...Platform.select({
      web: {
        zIndex: 1,
      },
    }),
  },
  previewTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 8,
  },
  previewList: {
    gap: 8,
  },
  previewRow: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },
  previewMeta: {
    flex: 1,
    minWidth: 0,
    ...Platform.select({
      web: {
        position: 'relative' as const,
        zIndex: 2,
      },
    }),
  },
  previewActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    alignItems: 'flex-start',
    justifyContent: 'flex-end',
    ...Platform.select({
      web: {
        zIndex: 1,
      },
    }),
  },
  previewMain: {
    fontSize: 13,
    fontWeight: '500',
    color: '#0F172A',
    fontFamily: 'Inter',
  },
  previewSub: {
    fontSize: 12,
    fontWeight: '400',
    color: '#64748B',
    fontFamily: 'Inter',
    marginTop: 4,
  },
  previewEditInput: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#F8FAFC',
    fontSize: 14,
    fontWeight: '500',
    color: '#0F172A',
    fontFamily: 'Inter',
  },
  previewEmpty: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6B7280',
  },
  mapsLinkButton: {
    marginTop: -2,
    marginBottom: 14,
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  mapsLinkButtonDisabled: {
    opacity: 0.5,
  },
  mapsLinkButtonText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#01b854',
  },
  mapsFetchBlock: {
    marginTop: 10,
    marginBottom: 14,
  },
  timeSlotsCard: {
    position: 'relative',
    zIndex: 50,
    overflow: 'visible',
  },
  startTimeFieldBlock: {
    marginBottom: 8,
    position: 'relative',
    overflow: 'visible',
    // Above days row so the start-time menu can overlap the days row when open.
    zIndex: 52,
  },
  daysFieldBlock: {
    marginBottom: 8,
    position: 'relative',
    overflow: 'visible',
    // Flex sibling below start time must still stack above duration/price + add button (see memory.md).
    zIndex: 51,
  },
  timeSlotsFieldsAfterStart: {
    position: 'relative',
    zIndex: 0,
  },
  addAnotherSlotRow: {
    position: 'relative',
    zIndex: 0,
  },
  actionBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#01b854',
  },
  actionDangerBtn: {
    borderColor: '#FEE2E2',
    backgroundColor: '#FFF1F2',
  },
  actionDangerBtnText: {
    color: '#DC2626',
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

function LocationDropdown({
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
    <View style={stylesDropdown.outer}>
      <Pressable
        onPress={() => setOpen((prev) => !prev)}
        style={[stylesDropdown.button, open && stylesDropdown.buttonOpen]}
      >
        <Text style={stylesDropdown.buttonText}>
          {selected?.label || 'Select city and state'}
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

function StartTimeDropdown({
  value,
  options,
  onChange,
  placeholder,
}: {
  value: string;
  options: { key: string; label: string }[];
  onChange: (v: string) => void;
  placeholder: string;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.key === value);

  return (
    <View style={stylesDropdown.outer}>
      <Pressable
        onPress={() => setOpen((prev) => !prev)}
        style={[stylesDropdown.button, open && stylesDropdown.buttonOpen]}
      >
        <Text style={stylesDropdown.buttonText}>{selected?.label || placeholder}</Text>
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
    borderColor: '#01b854',
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
    maxHeight: 260,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    borderRadius: 16,
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
  },
  optionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#0F172A',
    fontFamily: 'Inter',
  },
});
