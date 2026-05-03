import React, { useEffect, useImperativeHandle, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Alert,
  TextInput,
  Platform,
  useWindowDimensions,
  ScrollView,
} from 'react-native';
import { supabase } from '@/lib/supabase';
import { TimeSlot, DayOfWeek } from '@/types';
import Button from '@/components/ui/Button';
import { formatTime12h, normalizeDbTimeToHHMM } from '@/utils/bookingSlots';
import { createTimeSlotsForGround, ensureDefaultTimeSlotsForGround } from '@/utils/timeSlotsDb';
import { Pencil, Trash2, X, Check } from 'lucide-react-native';

const DAY_ORDER: DayOfWeek[] = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
];

function dayLabel(d: DayOfWeek): string {
  return d.charAt(0).toUpperCase() + d.slice(1);
}

function timeLabelFromHHMM(hhmm: string): string {
  return formatTime12h(hhmm);
}

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

/** 08:00 or 8:00 → 08:00 */
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

export type TimeSlotsEditorHandle = {
  save: () => Promise<boolean>;
  hasUnsavedChanges: () => boolean;
};

function TimeSlotsEditorInner(
  props: {
  groundId: string;
  pitchType?: string | null;
  canEdit?: boolean;
    seedDefaults?: boolean;
  /** If false, hide the internal Save button (parent will call ref.save()). */
  showSaveButton?: boolean;
  /** If false, hide the Add/Delete/Configure slots UI, but allow editing price/availability. */
  canConfigure?: boolean;
},
  ref: React.ForwardedRef<TimeSlotsEditorHandle>,
) {
  const { groundId, pitchType, canEdit = true, canConfigure = true, seedDefaults = true, showSaveButton = true } = props;

  const { width } = useWindowDimensions();
  const showRightPreview = Platform.OS === 'web' && width >= 900;

  const [loading, setLoading] = useState(true);
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [saving, setSaving] = useState(false);

  // Map slot.id -> is_available (local edits)
  const [availabilityById, setAvailabilityById] = useState<Record<string, boolean>>({});
  // Map slot.id -> custom_price text (local edits, empty string = use ground default price)
  const [priceTextById, setPriceTextById] = useState<Record<string, string>>({});
  // Track which slots have unsaved changes for availability / price.
  const [dirtyAvailabilityById, setDirtyAvailabilityById] = useState<Record<string, boolean>>({});
  const [dirtyPriceById, setDirtyPriceById] = useState<Record<string, boolean>>({});

  // Add slots UI (applies to all days)
  const [slotStartTimeText, setSlotStartTimeText] = useState<string>('');
  const [slotDaysKey, setSlotDaysKey] = useState<string>('all');
  const [slotDurationMinutesText, setSlotDurationMinutesText] = useState<string>('60');
  const [slotCustomPriceText, setSlotCustomPriceText] = useState<string>('');
  const [addingSlots, setAddingSlots] = useState(false);

  // Edit preview rows
  const [editingPreviewKey, setEditingPreviewKey] = useState<string | null>(null);
  const [editPreviewPrice, setEditPreviewPrice] = useState<string>('');
  const [editPreviewDuration, setEditPreviewDuration] = useState<string>('');
  const [deletingPreviewKey, setDeletingPreviewKey] = useState<string | null>(null);

  const dayPresetDropdownOptions = React.useMemo(
    () => DAY_PRESET_OPTIONS.map(({ key, label }) => ({ key, label })),
    [],
  );

  const startTimeDropdownOptions = React.useMemo(() => {
    const pad2 = (n: number) => String(n).padStart(2, '0');
    const options: { key: string; label: string }[] = [];
    for (let hh = 0; hh <= 23; hh += 1) {
      options.push({ key: `${pad2(hh)}:00`, label: `${pad2(hh)}:00` });
      options.push({ key: `${pad2(hh)}:30`, label: `${pad2(hh)}:30` });
    }
    return options;
  }, []);

  const slotsByDay = useMemo(() => {
    const map: Record<DayOfWeek, TimeSlot[]> = {
      monday: [],
      tuesday: [],
      wednesday: [],
      thursday: [],
      friday: [],
      saturday: [],
      sunday: [],
    };
    for (const s of slots) {
      map[s.day_of_week].push(s);
    }
    for (const d of DAY_ORDER) {
      map[d].sort((a, b) => {
        const ah = normalizeDbTimeToHHMM(a.start_time) ?? '00:00';
        const bh = normalizeDbTimeToHHMM(b.start_time) ?? '00:00';
        return ah.localeCompare(bh);
      });
    }
    return map;
  }, [slots]);

  const savedSlotPreviewRows = useMemo(() => {
    type Row = {
      startHHMM: string;
      endHHMM: string;
      customPrice: number | null;
      availableCount: number;
      total: number;
    };

    const byStart = new Map<string, Row>();

    for (const s of slots) {
      const startHHMM = normalizeDbTimeToHHMM(s.start_time) ?? String(s.start_time ?? '');
      const endHHMM = normalizeDbTimeToHHMM(s.end_time) ?? String(s.end_time ?? '');
      
      let durationMinutes = 60;
      const sh = parseInt(startHHMM.split(':')[0] ?? '0', 10);
      const sm = parseInt(startHHMM.split(':')[1] ?? '0', 10);
      const eh = parseInt(endHHMM.split(':')[0] ?? '0', 10);
      const em = parseInt(endHHMM.split(':')[1] ?? '0', 10);
      if (!Number.isNaN(sh) && !Number.isNaN(eh)) {
        const startMins = sh * 60 + sm;
        let endMins = eh * 60 + em;
        if (endMins < startMins) endMins += 24 * 60; // Crosses midnight
        durationMinutes = endMins - startMins;
      }

      const key = String(startHHMM);
      const existing = byStart.get(key);

      if (!existing) {
        byStart.set(key, {
          startHHMM,
          endHHMM,
          customPrice: s.custom_price ?? null,
          availableCount: s.is_available ? 1 : 0,
          total: 1,
          durationMinutes,
        } as any);
        continue;
      }

      existing.availableCount += s.is_available ? 1 : 0;
      existing.total += 1;

      // Prefer any non-null custom price encountered.
      if (existing.customPrice == null && s.custom_price != null) {
        existing.customPrice = s.custom_price;
      }
    }

    const rows = Array.from(byStart.values());
    rows.sort((a, b) => a.startHHMM.localeCompare(b.startHHMM));
    return rows;
  }, [slots]);

  const loadSlots = React.useCallback(async () => {
    if (!groundId || groundId === 'undefined') return;
    setLoading(true);
    try {
      if (pitchType && seedDefaults) {
        // Seed defaults once (if the ground is new / time_slots are missing).
        await ensureDefaultTimeSlotsForGround({ groundId, pitchType, supabaseClient: supabase });
      }

      const { data, error } = await supabase
        .from('time_slots')
        .select('id, ground_id, day_of_week, start_time, end_time, custom_price, is_available')
        .eq('ground_id', groundId);

      if (error) throw error;

      const rows = (data ?? []) as TimeSlot[];
      setSlots(rows);

      const nextAvailability: Record<string, boolean> = {};
      const nextPriceText: Record<string, string> = {};
      for (const r of rows) {
        nextAvailability[r.id] = !!r.is_available;
        const price = r.custom_price;
        nextPriceText[r.id] =
          price === null || price === undefined || Number.isNaN(price as any) ? '' : String(price);
      }
      setAvailabilityById(nextAvailability);
      setPriceTextById(nextPriceText);
      setDirtyAvailabilityById({});
      setDirtyPriceById({});
    } catch (e: any) {
      console.error('TimeSlotsEditor: load failed', e);
      if (Platform.OS === 'web') alert(e?.message ?? 'Failed to load time slots');
      else Alert.alert('Error', e?.message ?? 'Failed to load time slots');
    } finally {
      setLoading(false);
    }
  }, [groundId, pitchType, seedDefaults]);

  useEffect(() => {
    void loadSlots();
  }, [loadSlots]);

  const setSlotAvailable = (slotId: string, next: boolean) => {
    if (!canEdit) return;
    setAvailabilityById((prev) => ({ ...prev, [slotId]: next }));
    setDirtyAvailabilityById((prev) => ({ ...prev, [slotId]: true }));
    setSlots((prev) => prev.map((s) => (s.id === slotId ? { ...s, is_available: next } : s)));
  };

  const setDayAvailable = (day: DayOfWeek, next: boolean) => {
    if (!canEdit) return;
    const daySlots = slotsByDay[day];
    for (const s of daySlots) {
      setSlotAvailable(s.id, next);
    }
  };

  const deleteSlotsByStartTime = async (startHHMM: string) => {
    if (!canEdit) return;
    const dbTime = `${startHHMM}:00`;
    
    setDeletingPreviewKey(startHHMM);
    try {
      const { error } = await supabase
        .from('time_slots')
        .delete()
        .eq('ground_id', groundId)
        .eq('start_time', dbTime);

      if (error) throw error;
      await loadSlots();
    } catch (e: any) {
      if (Platform.OS === 'web') alert(e?.message ?? 'Failed to delete slots');
      else Alert.alert('Error', e?.message ?? 'Failed to delete slots');
    } finally {
      setDeletingPreviewKey(null);
    }
  };

  const updateSlotsByStartTime = async (startHHMM: string, newPrice: string, newDuration: string) => {
    if (!canEdit) return;
    const priceNum = parseFloat(newPrice.trim());
    const durationNum = parseInt(newDuration.trim(), 10);

    if (isNaN(priceNum) || priceNum < 0) {
      if (Platform.OS === 'web') alert('Price must be a positive number.');
      else Alert.alert('Invalid price', 'Price must be a positive number.');
      return;
    }
    if (isNaN(durationNum) || durationNum <= 0) {
      if (Platform.OS === 'web') alert('Duration must be positive minutes.');
      else Alert.alert('Invalid duration', 'Duration must be positive minutes.');
      return;
    }

    const startDbTime = `${startHHMM}:00`;
    
    // Calculate new end time
    const startParts = startHHMM.split(':');
    const startMins = parseInt(startParts[0], 10) * 60 + parseInt(startParts[1], 10);
    const endMins = (startMins + durationNum) % (24 * 60);
    const endHH = Math.floor(endMins / 60);
    const endMM = endMins % 60;
    const endDbTime = `${String(endHH).padStart(2, '0')}:${String(endMM).padStart(2, '0')}:00`;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('time_slots')
        .update({
          custom_price: priceNum,
          end_time: endDbTime
        })
        .eq('ground_id', groundId)
        .eq('start_time', startDbTime);

      if (error) throw error;
      setEditingPreviewKey(null);
      await loadSlots();
    } catch (e: any) {
      if (Platform.OS === 'web') alert(e?.message ?? 'Failed to update slots');
      else Alert.alert('Error', e?.message ?? 'Failed to update slots');
    } finally {
      setSaving(false);
    }
  };

  function isSlotActive(s: TimeSlot): boolean {
    const v = availabilityById[s.id];
    return typeof v === 'boolean' ? v : !!s.is_available;
  }

  const changedIds = useMemo(() => {
    const ids = new Set<string>();
    Object.keys(dirtyAvailabilityById).forEach((id) => {
      if (dirtyAvailabilityById[id]) ids.add(id);
    });
    Object.keys(dirtyPriceById).forEach((id) => {
      if (dirtyPriceById[id]) ids.add(id);
    });
    return Array.from(ids);
  }, [dirtyAvailabilityById, dirtyPriceById]);

  const saveInternal = async (): Promise<boolean> => {
    if (!canEdit) return false;
    if (!changedIds.length) return true;

    try {
      setSaving(true);

      // Enforce: custom price is mandatory for every *available* slot.
      // If any available slot has empty/invalid price, block saving.
      for (const s of slots) {
        const isAvailable =
          dirtyAvailabilityById[s.id] !== undefined ? !!availabilityById[s.id] : !!s.is_available;

        if (!isAvailable) continue;

        const rawText = priceTextById[s.id] ?? '';
        const trimmed = String(rawText).trim();
        const hhmmLabel = normalizeDbTimeToHHMM(s.start_time) ?? s.start_time;

        if (!trimmed) {
          if (Platform.OS === 'web') alert(`Please enter a custom price for ${hhmmLabel}.`);
          else Alert.alert('Custom price required', `Please enter a custom price for ${hhmmLabel}.`);
          return false;
        }

        const parsed = parseFloat(trimmed);
        if (!Number.isFinite(parsed)) {
          Alert.alert('Invalid custom price', `Custom price must be a number for ${hhmmLabel}.`);
          return false;
        }
      }

      // Update each changed row individually so we never hit NOT NULL / onConflict issues.
      for (const id of changedIds) {
        const slot = slots.find((s) => s.id === id);
        if (!slot) continue;

        // Availability: fall back to the current slot value if not explicitly edited.
        const isAvailable =
          dirtyAvailabilityById[id] !== undefined
            ? !!availabilityById[id]
            : !!slot.is_available;

        // Price: for available slots custom price is mandatory.
        const rawText = priceTextById[id] ?? '';
        const trimmed = String(rawText).trim();
        let customPrice: number | null = null;

        if (isAvailable) {
          const parsed = parseFloat(trimmed);
          customPrice = Number.isFinite(parsed) ? parsed : null;
        } else {
          // If slot is not available, allow empty to become NULL.
          customPrice = trimmed ? parseFloat(trimmed) : null;
        }

        const { error } = await supabase
          .from('time_slots')
          .update({
            is_available: isAvailable,
            custom_price: customPrice,
          })
          .eq('id', id);

        if (error) throw error;
      }

      setDirtyAvailabilityById({});
      setDirtyPriceById({});
      return true;
    } catch (e: any) {
      console.error('TimeSlotsEditor: save failed', e);
      Alert.alert('Save failed', e?.message ?? 'Failed to save time slots');
      return false;
    } finally {
      setSaving(false);
      // Reload to ensure UI matches DB and remove any local drift.
      const { data, error } = await supabase
        .from('time_slots')
        .select('id, ground_id, day_of_week, start_time, end_time, custom_price, is_available')
        .eq('ground_id', groundId);

      if (error) return false;
      const rows = (data ?? []) as TimeSlot[];
      setSlots(rows);

      const nextAvailability: Record<string, boolean> = {};
      const nextPriceText: Record<string, string> = {};
      for (const r of rows) {
        nextAvailability[r.id] = !!r.is_available;
        const price = r.custom_price;
        nextPriceText[r.id] =
          price === null || price === undefined || Number.isNaN(price as any)
            ? ''
            : String(price);
      }
      setAvailabilityById(nextAvailability);
      setPriceTextById(nextPriceText);
      setDirtyAvailabilityById({});
      setDirtyPriceById({});
    }
  };

  useImperativeHandle(
    ref,
    () => ({
      save: async () => {
        // If we are currently saving, wait until it flips (avoid double saves).
        if (saving) return false;
        return await saveInternal();
      },
      hasUnsavedChanges: () => changedIds.length > 0,
    }),
    [saving, canEdit, changedIds, groundId],
  );

  if (loading) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator color="#2196F3" />
        <Text style={styles.loadingText}>Loading availability...</Text>
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Editable availability</Text>
        <Text style={styles.subtitle}>{canEdit ? '' : '(read-only)'}</Text>
      </View>

      {canEdit && canConfigure ? (
        <View style={styles.addSlotsBox}>
          <Text style={styles.addSlotsTitle}>Add time slots (Presets)</Text>
          
          <View style={[styles.draftField, { zIndex: 50 }]}>
            <Text style={styles.draftLabel}>Start time (HH:MM) *</Text>
            <StartTimeDropdown
              options={startTimeDropdownOptions}
              value={slotStartTimeText}
              onChange={setSlotStartTimeText}
              placeholder="Select time"
            />
          </View>

          <View style={[styles.draftField, { zIndex: 40 }]}>
            <Text style={styles.draftLabel}>Days *</Text>
            <StartTimeDropdown
              options={dayPresetDropdownOptions}
              value={slotDaysKey}
              onChange={setSlotDaysKey}
            />
          </View>

          <View style={styles.addSlotsRow}>
            <View style={[styles.draftField, styles.addSlotsDuration, { zIndex: 30 }]}>
              <Text style={styles.draftLabel}>Duration (mins) *</Text>
              <TextInput
                style={styles.addSlotsInput}
                value={slotDurationMinutesText}
                onChangeText={setSlotDurationMinutesText}
                keyboardType="numeric"
                placeholder="60"
                placeholderTextColor="#9CA3AF"
              />
            </View>

            <View style={[styles.draftField, styles.addSlotsPrice, { zIndex: 20 }]}>
              <Text style={styles.draftLabel}>Price (₹) *</Text>
              <TextInput
                style={styles.addSlotsInput}
                value={slotCustomPriceText}
                onChangeText={setSlotCustomPriceText}
                keyboardType="numeric"
                placeholder="e.g. 1500"
                placeholderTextColor="#9CA3AF"
              />
            </View>
          </View>

          <Button
            title={addingSlots ? 'Adding...' : 'Add slots'}
            onPress={async () => {
              if (addingSlots) return;
              
              const hhmm = normalizeHHMM(slotStartTimeText);
              if (!hhmm) {
                Alert.alert('Invalid time', 'Please select a valid start time.');
                return;
              }

              const durationMinutes = parseInt(slotDurationMinutesText.trim(), 10);
              if (!Number.isFinite(durationMinutes) || durationMinutes <= 0) {
                Alert.alert('Invalid duration', 'Duration must be a positive number of minutes.');
                return;
              }

              const trimmedPrice = String(slotCustomPriceText ?? '').trim();
              if (!trimmedPrice) {
                Alert.alert('Custom price required', 'Please enter a custom price.');
                return;
              }
              const parsed = parseFloat(trimmedPrice);
              if (!Number.isFinite(parsed)) {
                Alert.alert('Invalid custom price', 'Enter a valid number for custom price.');
                return;
              }

              setAddingSlots(true);
              try {
                if (changedIds.length > 0) {
                  await saveInternal();
                }

                const res = await createTimeSlotsForGround({
                  groundId,
                  days: daysForPresetKey(slotDaysKey),
                  startTimesHHMM: [hhmm],
                  durationMinutes,
                  isAvailable: true,
                  customPrice: parsed,
                  supabaseClient: undefined,
                });
                
                if (res.created === 0 && res.skipped === 0) {
                  Alert.alert('No slots added', 'No valid slots were created (they might already exist).');
                } else {
                  setSlotStartTimeText('');
                  setSlotCustomPriceText('');
                  await loadSlots();
                }
              } finally {
                setAddingSlots(false);
              }
            }}
            loading={addingSlots}
            disabled={addingSlots}
            size="small"
            fullWidth
            style={{ marginTop: 4 }}
          />

          <Text style={styles.addSlotsFootnote}>Tip: after adding, use the chips to set availability and individual custom prices.</Text>
        </View>
      ) : null}

      <View style={styles.editorCols}>
        <View style={styles.editorLeft}>
          {DAY_ORDER.map((d) => {
            const daySlots = slotsByDay[d];
            if (!daySlots.length) {
              return (
                <View key={d} style={styles.dayBlock}>
                  <View style={styles.dayHeader}>
                    <Text style={styles.dayLabel}>{dayLabel(d)}</Text>
                  </View>
                  <Text style={styles.emptyText}>No slots configured</Text>
                </View>
              );
            }

            return (
              <View key={d} style={styles.dayBlock}>
                <View style={styles.dayHeader}>
                  <Text style={styles.dayLabel}>{dayLabel(d)}</Text>
                  <View style={styles.dayBulkActions}>
                    <Pressable
                      disabled={!canEdit || saving}
                      onPress={() => setDayAvailable(d, true)}
                      style={({ pressed }) => [
                        styles.dayBulkBtn,
                        pressed && styles.dayBulkBtnPressed,
                      ]}
                    >
                      <Text style={styles.dayBulkBtnText}>All</Text>
                    </Pressable>
                    <Pressable
                      disabled={!canEdit || saving}
                      onPress={() => setDayAvailable(d, false)}
                      style={({ pressed }) => [
                        styles.dayBulkBtn,
                        pressed && styles.dayBulkBtnPressed,
                      ]}
                    >
                      <Text style={styles.dayBulkBtnText}>None</Text>
                    </Pressable>
                  </View>
                </View>

                <View style={styles.slotsRow}>
                  {daySlots.map((s) => {
                    const hhmm = normalizeDbTimeToHHMM(s.start_time) ?? '';
                    const active = isSlotActive(s);
                    const priceText = priceTextById[s.id] ?? '';
                    return (
                      <View key={s.id} style={styles.slotItem}>
                        <Pressable
                          disabled={!canEdit || saving}
                          onPress={() => setSlotAvailable(s.id, !active)}
                          style={({ pressed }) => [
                            styles.slotChip,
                            active && styles.slotChipActive,
                            pressed && !active && styles.slotChipPressed,
                          ]}
                        >
                          <Text
                            style={[styles.slotChipText, active && styles.slotChipTextActive]}
                            numberOfLines={1}
                          >
                            {hhmm ? timeLabelFromHHMM(hhmm) : '—'}
                          </Text>
                        </Pressable>
                        {canEdit ? (
                          <View style={styles.priceWrap}>
                            <Text style={styles.priceLabel}>₹</Text>
                            <TextInput
                              style={[
                                styles.priceInput,
                                priceText ? styles.priceInputSet : styles.priceInputUnset,
                              ]}
                              value={priceText}
                              onChangeText={(text) => {
                                setPriceTextById((prev) => ({
                                  ...prev,
                                  [s.id]: text,
                                }));
                                setDirtyPriceById((prev) => ({
                                  ...prev,
                                  [s.id]: true,
                                }));
                              }}
                              keyboardType="numeric"
                              placeholder="default"
                              placeholderTextColor="#9CA3AF"
                            />
                          </View>
                        ) : null}
                      </View>
                    );
                  })}
                </View>
              </View>
            );
          })}
        </View>

        {showRightPreview ? (
          <View style={styles.editorRight}>
            <Text style={styles.previewTitle}>Saved slots</Text>
            {savedSlotPreviewRows.length ? (
              <View style={styles.previewList}>
                {savedSlotPreviewRows.map((r, idx) => {
                  const key = r.startHHMM;
                  const isEditing = editingPreviewKey === key;
                  const isDeleting = deletingPreviewKey === key;

                  if (isEditing) {
                    return (
                      <View key={key + '-' + idx} style={[styles.previewRow, styles.previewRowEditing]}>
                        <View style={styles.previewEditHeader}>
                          <Text style={styles.previewTitleInline}>{r.startHHMM} - {r.endHHMM}</Text>
                          <View style={styles.previewButtons}>
                            <Pressable 
                              onPress={() => updateSlotsByStartTime(key, editPreviewPrice, editPreviewDuration)}
                              style={styles.previewIconBtn}
                              disabled={saving}
                            >
                              <Check size={18} color="#15803D" />
                            </Pressable>
                            <Pressable 
                              onPress={() => setEditingPreviewKey(null)}
                              style={styles.previewIconBtn}
                            >
                              <X size={18} color="#EF4444" />
                            </Pressable>
                          </View>
                        </View>

                        <View style={styles.previewEditForm}>
                          <View style={styles.previewEditInputGroup}>
                            <Text style={styles.previewEditLabel}>Price (₹)</Text>
                            <TextInput
                              style={styles.previewEditInput}
                              value={editPreviewPrice}
                              onChangeText={setEditPreviewPrice}
                              keyboardType="numeric"
                              placeholder="Price"
                            />
                          </View>
                          <View style={styles.previewEditInputGroup}>
                            <Text style={styles.previewEditLabel}>Mins</Text>
                            <TextInput
                              style={styles.previewEditInput}
                              value={editPreviewDuration}
                              onChangeText={setEditPreviewDuration}
                              keyboardType="numeric"
                              placeholder="Mins"
                            />
                          </View>
                        </View>
                      </View>
                    );
                  }

                  return (
                    <View key={key + '-' + idx} style={styles.previewRow}>
                      <View style={styles.previewContent}>
                        <View style={styles.previewTextCol}>
                          <Text style={styles.previewMain}>
                            {r.startHHMM} - {r.endHHMM}
                          </Text>
                          <Text style={styles.previewSub}>
                            {r.customPrice != null
                              ? `₹${Number(r.customPrice).toLocaleString('en-IN')}`
                              : 'default'}{' '}
                            · Available {r.availableCount}/{r.total}
                          </Text>
                        </View>

                        {canEdit && canConfigure && (
                          <View style={styles.previewActions}>
                            <Pressable
                              onPress={() => {
                                setEditingPreviewKey(key);
                                setEditPreviewPrice(r.customPrice != null ? String(r.customPrice) : '');
                                setEditPreviewDuration(String((r as any).durationMinutes || 60));
                              }}
                              style={styles.previewIconBtn}
                              disabled={isDeleting || saving}
                            >
                              <Pencil size={16} color="#4B5563" />
                            </Pressable>
                            <Pressable
                              onPress={() => {
                                const msg = `Are you sure you want to delete all slots starting at ${r.startHHMM}?`;
                                if (Platform.OS === 'web') {
                                  if (window.confirm(msg)) {
                                    deleteSlotsByStartTime(key);
                                  }
                                } else {
                                  Alert.alert('Delete slots?', msg, [
                                    { text: 'Cancel', style: 'cancel' },
                                    { 
                                      text: 'Delete', 
                                      style: 'destructive', 
                                      onPress: () => deleteSlotsByStartTime(key) 
                                    }
                                  ]);
                                }
                              }}
                              style={styles.previewIconBtn}
                              disabled={isDeleting || saving}
                            >
                              {isDeleting ? (
                                <ActivityIndicator size="small" color="#EF4444" />
                              ) : (
                                <Trash2 size={16} color="#EF4444" />
                              )}
                            </Pressable>
                          </View>
                        )}
                      </View>
                    </View>
                  );
                })}
              </View>
            ) : (
              <Text style={styles.previewEmpty}>Add time slots to see preview.</Text>
            )}
          </View>
        ) : null}
      </View>

      {canEdit && showSaveButton ? (
        <View style={styles.saveRow}>
          <Button
            title={saving ? 'Saving...' : 'Save changes'}
            onPress={async () => {
              await saveInternal();
            }}
            loading={saving}
            disabled={!changedIds.length || saving}
            fullWidth
            size="large"
          />
          {!changedIds.length ? <Text style={styles.helperText}>No changes</Text> : <Text style={styles.helperText}>Unsaved changes</Text>}
        </View>
      ) : null}
    </View>
  );
}

const TimeSlotsEditor = React.forwardRef(TimeSlotsEditorInner);
export default TimeSlotsEditor;

const styles = StyleSheet.create({
  wrap: {
    paddingTop: 6,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  title: {
    fontSize: 14,
    fontWeight: '300',
    color: '#212121',
    fontFamily: 'Inter',
  },
  subtitle: {
    fontSize: 12,
    fontWeight: '300',
    color: '#6B7280',
    fontFamily: 'Inter',
  },
  editorCols: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
    zIndex: 1, // Base zIndex for stack
  },
  editorLeft: {
    flex: 1,
    zIndex: 10, // Higher than editorRight
    position: 'relative',
  },
  editorRight: {
    width: 280,
    zIndex: 1,
    position: 'relative',
  },
  previewTitle: {
    fontSize: 13,
    fontWeight: '300',
    color: '#111827',
    fontFamily: 'Inter',
    marginBottom: 8,
  },
  previewList: {
    gap: 8,
  },
  previewRow: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 10,
  },
  previewMain: {
    fontSize: 12,
    fontWeight: '300',
    color: '#374151',
    fontFamily: 'Inter',
  },
  previewSub: {
    marginTop: 4,
    fontSize: 11,
    fontWeight: '300',
    color: '#6B7280',
    fontFamily: 'Inter',
  },
  previewContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  previewTextCol: {
    flex: 1,
  },
  previewActions: {
    flexDirection: 'row',
    gap: 12,
    marginLeft: 10,
  },
  previewIconBtn: {
    padding: 6,
    borderRadius: 6,
    backgroundColor: '#F3F4F6',
  },
  previewRowEditing: {
    borderColor: '#4CAF50',
    backgroundColor: '#F0FDF4',
  },
  previewEditHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  previewTitleInline: {
    fontSize: 12,
    fontWeight: '300',
    color: '#15803D',
  },
  previewButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  previewEditForm: {
    flexDirection: 'row',
    gap: 10,
  },
  previewEditInputGroup: {
    flex: 1,
  },
  previewEditLabel: {
    fontSize: 10,
    color: '#6B7280',
    marginBottom: 2,
    fontWeight: '300',
  },
  previewEditInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#FFFFFF',
    fontSize: 12,
    fontWeight: '300',
    color: '#374151',
  },
  previewEmpty: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: '300',
    color: '#6B7280',
    fontFamily: 'Inter',
    textAlign: 'center',
  },
  dayBlock: {
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    padding: 10,
  },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  dayBulkActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dayBulkBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#F9FAFB',
  },
  dayBulkBtnPressed: {
    opacity: 0.85,
  },
  dayBulkBtnText: {
    fontSize: 12,
    fontWeight: '300',
    color: '#374151',
    fontFamily: 'Inter',
  },
  dayLabel: {
    fontSize: 13,
    fontWeight: '300',
    color: '#374151',
    fontFamily: 'Inter',
  },
  emptyText: {
    fontSize: 12,
    fontWeight: '300',
    color: '#6B7280',
    fontFamily: 'Inter',
    textAlign: 'center',
  },
  slotsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  slotItem: {
    flexDirection: 'column',
    alignItems: 'center',
    gap: 4,
  },
  slotChip: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#F3F4F6',
  },
  slotChipActive: {
    borderColor: '#4CAF50',
    backgroundColor: 'rgba(76,175,80,0.12)',
  },
  slotChipPressed: {
    opacity: 0.85,
  },
  slotChipText: {
    fontSize: 11,
    fontWeight: '300',
    color: '#374151',
    fontFamily: 'Inter',
    maxWidth: 88,
    textAlign: 'center',
  },
  slotChipTextActive: {
    color: '#15803D',
  },
  addSlotsBox: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 8,
    marginBottom: 8,
  },
  addSlotsTitle: {
    fontSize: 13,
    fontWeight: '300',
    color: '#111827',
    fontFamily: 'Inter',
    marginBottom: 4,
  },
  addSlotsHint: {
    fontSize: 12,
    fontWeight: '300',
    color: '#6B7280',
    fontFamily: 'Inter',
    marginBottom: 8,
  },
  addSlotsInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
    backgroundColor: '#FFFFFF',
    fontSize: 12,
    fontWeight: '300',
    color: '#111827',
    fontFamily: 'Inter',
    marginBottom: 4,
  },
  addAnotherBtn: {
    alignSelf: 'flex-start',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    marginBottom: 8,
  },
  addAnotherBtnText: {
    fontSize: 13,
    fontWeight: '300',
    color: '#2563EB',
    fontFamily: 'Inter',
  },
  addSlotsRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  addSlotsDuration: {
    flex: 1,
    marginBottom: 0,
  },
  addSlotsPrice: {
    flex: 1,
    marginBottom: 0,
  },
  addSlotsFootnote: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: '300',
    color: '#6B7280',
    fontFamily: 'Inter',
  },
  priceWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  priceLabel: {
    fontSize: 10,
    fontWeight: '300',
    color: '#4B5563',
    fontFamily: 'Inter',
    marginRight: 2,
  },
  priceInput: {
    minWidth: 40,
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    fontSize: 10,
    fontWeight: '300',
    fontFamily: 'Inter',
    textAlign: 'center',
  },
  priceInputSet: {
    backgroundColor: '#ECFDF3',
    borderColor: '#4CAF50',
    color: '#166534',
  },
  priceInputUnset: {
    backgroundColor: '#F9FAFB',
    color: '#6B7280',
  },
  saveRow: {
    marginTop: 12,
  },
  helperText: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: '300',
    color: '#6B7280',
    fontFamily: 'Inter',
    textAlign: 'center',
  },
  loadingWrap: {
    paddingVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  loadingText: {
    fontSize: 12,
    fontWeight: '300',
    color: '#6B7280',
    fontFamily: 'Inter',
  },
  draftField: {
    marginBottom: 6,
    zIndex: 50,
  },
  draftLabel: {
    fontSize: 11,
    fontWeight: '300',
    color: '#374151',
    fontFamily: 'Inter',
    marginBottom: 2,
  },
});

function StartTimeDropdown({
  options,
  value,
  onChange,
  placeholder = 'Select',
}: {
  options: { key: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.key === value);

  return (
    <View style={startTimeDropdownStyles.outer}>
      <Pressable
        onPress={() => setOpen((v) => !v)}
        style={[startTimeDropdownStyles.button, open && startTimeDropdownStyles.buttonOpen]}
      >
        <Text style={startTimeDropdownStyles.buttonText}>{selected?.label || placeholder}</Text>
      </Pressable>

      {open && (
        <View style={startTimeDropdownStyles.menu}>
          <ScrollView
            style={{ maxHeight: 200 }}
            nestedScrollEnabled={true}
            keyboardShouldPersistTaps="handled"
          >
            {options.map((opt) => (
              <Pressable
                key={opt.key}
                onPress={() => {
                  onChange(opt.key);
                  setOpen(false);
                }}
                style={[
                  startTimeDropdownStyles.option,
                  opt.key === value && startTimeDropdownStyles.optionActive,
                ]}
              >
                <Text
                  style={[
                    startTimeDropdownStyles.optionText,
                    opt.key === value && startTimeDropdownStyles.optionTextActive,
                  ]}
                >
                  {opt.label}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

const startTimeDropdownStyles = StyleSheet.create({
  outer: {
    position: 'relative',
    zIndex: 100,
    width: '100%',
  },
  button: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFFFFF',
  },
  buttonOpen: {
    borderColor: '#10b981',
    backgroundColor: 'rgba(16,185,129,0.05)',
  },
  buttonText: {
    fontSize: 13,
    fontWeight: '300',
    color: '#111827',
    fontFamily: 'Inter',
  },
  menu: {
    position: 'absolute',
    top: 45,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    zIndex: 1000,
    elevation: 10,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  option: {
    padding: 12,
  },
  optionActive: {
    backgroundColor: '#F3F4F6',
  },
  optionText: {
    fontSize: 13,
    fontWeight: '300',
    color: '#374151',
    fontFamily: 'Inter',
  },
  optionTextActive: {
    color: '#10b981',
  },
});

