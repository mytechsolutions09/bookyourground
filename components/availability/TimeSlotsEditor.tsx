import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Switch, ActivityIndicator, Alert } from 'react-native';
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

export default function TimeSlotsEditor(props: {
  groundId: string;
  pitchType?: string | null;
  canEdit?: boolean;
}) {
  const { groundId, pitchType, canEdit = true } = props;

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

  const dayAvailability = useMemo(() => {
    const result: Record<DayOfWeek, boolean> = {
      monday: false,
      tuesday: false,
      wednesday: false,
      thursday: false,
      friday: false,
      saturday: false,
      sunday: false,
    };
    for (const d of DAY_ORDER) {
      const daySlots = slotsByDay[d];
      if (!daySlots.length) {
        result[d] = false;
        continue;
      }
      result[d] = daySlots.every((s) => {
        const v = availabilityById[s.id];
        return typeof v === 'boolean' ? v : !!s.is_available;
      });
    }
    return result;
  }, [slotsByDay, availabilityById]);

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

  const changedIds = useMemo(() => Object.keys(dirtyById), [dirtyById]);

  const handleSave = async () => {
    if (!canEdit) return;
    if (!changedIds.length) return;

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
    } catch (e: any) {
      console.error('TimeSlotsEditor: save failed', e);
      Alert.alert('Save failed', e?.message ?? 'Failed to save time slots');
    } finally {
      setSaving(false);
      // Reload to ensure UI matches DB and remove any local drift.
      const { data, error } = await supabase
        .from('time_slots')
        .select('id, ground_id, day_of_week, start_time, end_time, custom_price, is_available')
        .eq('ground_id', groundId);

      if (error) return;
      const rows = (data ?? []) as TimeSlot[];
      setSlots(rows);

      const nextAvailability: Record<string, boolean> = {};
      for (const r of rows) nextAvailability[r.id] = !!r.is_available;
      setAvailabilityById(nextAvailability);
      setDirtyById({});
    }
  };

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

      <ScrollView style={styles.scroll} nestedScrollEnabled>
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

          const dayAllAvailable = dayAvailability[d];
          return (
            <View key={d} style={styles.dayBlock}>
              <View style={styles.dayHeader}>
                <Text style={styles.dayLabel}>{dayLabel(d)}</Text>
                <Switch
                  value={dayAllAvailable}
                  disabled={!canEdit || saving}
                  onValueChange={(v) => setDayAvailable(d, v)}
                />
              </View>

              <View style={styles.slotsRow}>
                {daySlots.map((s) => {
                  const hhmm = normalizeDbTimeToHHMM(s.start_time) ?? '';
                  const active = !!availabilityById[s.id];
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
      </ScrollView>

      {canEdit ? (
        <View style={styles.saveRow}>
          <Button
            title={saving ? 'Saving...' : 'Save changes'}
            onPress={handleSave}
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
  scroll: {
    maxHeight: 320,
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

