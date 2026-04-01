import React, { useEffect, useImperativeHandle, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Alert,
  TextInput,
} from 'react-native';
import { supabase } from '@/lib/supabase';
import { TimeSlot, DayOfWeek } from '@/types';
import Button from '@/components/ui/Button';
import { formatSlotLabelHour, normalizeDbTimeToHHMM } from '@/utils/bookingSlots';
import { ensureDefaultTimeSlotsForGround } from '@/utils/timeSlotsDb';

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
  const hh = parseInt(hhmm.split(':')[0] ?? '', 10);
  if (!Number.isFinite(hh)) return hhmm;
  return formatSlotLabelHour(hh);
}

export type TimeSlotsEditorHandle = {
  save: () => Promise<boolean>;
  hasUnsavedChanges: () => boolean;
};

function TimeSlotsEditorInner(
  props: {
  groundId: string;
  pitchType?: string | null;
  canEdit?: boolean;
  /** If false, hide the internal Save button (parent will call ref.save()). */
  showSaveButton?: boolean;
},
  ref: React.ForwardedRef<TimeSlotsEditorHandle>,
) {
  const { groundId, pitchType, canEdit = true, showSaveButton = true } = props;

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

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        if (pitchType) {
          // Seed defaults once (if the ground is new / time_slots are missing).
          await ensureDefaultTimeSlotsForGround({ groundId, pitchType, supabaseClient: supabase });
        }

        const { data, error } = await supabase
          .from('time_slots')
          .select('id, ground_id, day_of_week, start_time, end_time, custom_price, is_available')
          .eq('ground_id', groundId);

        if (cancelled) return;
        if (error) throw error;

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
      } catch (e: any) {
        console.error('TimeSlotsEditor: load failed', e);
        Alert.alert('Error', e?.message ?? 'Failed to load time slots');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [groundId, pitchType]);

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
      // Update each changed row individually so we never hit NOT NULL / onConflict issues.
      for (const id of changedIds) {
        const slot = slots.find((s) => s.id === id);
        if (!slot) continue;

        // Availability: fall back to the current slot value if not explicitly edited.
        const isAvailable =
          dirtyAvailabilityById[id] !== undefined
            ? !!availabilityById[id]
            : !!slot.is_available;

        // Price: parse from text; empty/invalid => null (use ground default).
        const rawText = priceTextById[id];
        let customPrice: number | null = null;
        if (rawText != null && String(rawText).trim() !== '') {
          const parsed = parseFloat(String(rawText).trim());
          customPrice = Number.isFinite(parsed) ? parsed : null;
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
                  style={({ pressed }) => [styles.dayBulkBtn, pressed && styles.dayBulkBtnPressed]}
                >
                  <Text style={styles.dayBulkBtnText}>All</Text>
                </Pressable>
                <Pressable
                  disabled={!canEdit || saving}
                  onPress={() => setDayAvailable(d, false)}
                  style={({ pressed }) => [styles.dayBulkBtn, pressed && styles.dayBulkBtnPressed]}
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
    fontWeight: '900',
    color: '#212121',
  },
  subtitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6B7280',
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
    fontWeight: '800',
    color: '#374151',
  },
  dayLabel: {
    fontSize: 13,
    fontWeight: '900',
    color: '#374151',
  },
  emptyText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6B7280',
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
    fontWeight: '900',
    color: '#374151',
    maxWidth: 88,
    textAlign: 'center',
  },
  slotChipTextActive: {
    color: '#15803D',
  },
  priceWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  priceLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#4B5563',
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
    fontWeight: '700',
    color: '#6B7280',
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
    fontWeight: '700',
    color: '#6B7280',
  },
});

