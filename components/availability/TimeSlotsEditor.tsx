import React, { useEffect, useImperativeHandle, useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator, Alert } from 'react-native';
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
  const [dirtyById, setDirtyById] = useState<Record<string, boolean>>({});

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
        for (const r of rows) nextAvailability[r.id] = !!r.is_available;
        setAvailabilityById(nextAvailability);
        setDirtyById({});
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
    setDirtyById((prev) => ({ ...prev, [slotId]: next }));
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

  const changedIds = useMemo(() => Object.keys(dirtyById), [dirtyById]);

  const saveInternal = async (): Promise<boolean> => {
    if (!canEdit) return false;
    if (!changedIds.length) return true;

    try {
      setSaving(true);
      const updates = changedIds.map((id) => ({
        id,
        is_available: !!dirtyById[id],
      }));

      // `id` is the primary key, so upsert-by-id will only touch changed rows.
      const { error } = await supabase.from('time_slots').upsert(updates, { onConflict: 'id' });
      if (error) throw error;
      setDirtyById({});
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
      for (const r of rows) nextAvailability[r.id] = !!r.is_available;
      setAvailabilityById(nextAvailability);
      setDirtyById({});
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
      hasUnsavedChanges: () => Object.keys(dirtyById).length > 0,
    }),
    [saving, dirtyById, canEdit, changedIds, groundId],
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
                return (
                  <Pressable
                    key={s.id}
                    disabled={!canEdit || saving}
                    onPress={() => setSlotAvailable(s.id, !active)}
                    style={({ pressed }) => [
                      styles.slotChip,
                      active && styles.slotChipActive,
                      pressed && !active && styles.slotChipPressed,
                    ]}
                  >
                    <Text style={[styles.slotChipText, active && styles.slotChipTextActive]} numberOfLines={1}>
                      {hhmm ? timeLabelFromHHMM(hhmm) : '—'}
                    </Text>
                  </Pressable>
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

