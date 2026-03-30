import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Alert,
  Pressable,
  Modal,
  Platform,
  useWindowDimensions,
  ActivityIndicator,
  Image,
} from 'react-native';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { GroundWithImages, GroundType, Location } from '@/types';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import { formatCurrency, getDayOfWeek } from '@/utils/helpers';
import {
  getSlotTemplatesForPitch,
  hoursBetweenBooked,
  formatSlotLabelHour,
  normalizeDbTimeToHHMM,
} from '@/utils/bookingSlots';

type TimeString = string; // expected: "HH:MM"

const DURATION_HOURS = 1;

function parseTimeToMinutes(time: string): number | null {
  const match = /^(\d{2}):(\d{2})$/.exec(time.trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  if (hours < 0 || hours > 23) return null;
  if (minutes < 0 || minutes > 59) return null;
  return hours * 60 + minutes;
}

function addMinutesToTime(time: string, minutesToAdd: number): string | null {
  const startMinutes = parseTimeToMinutes(time);
  if (startMinutes === null) return null;
  const totalMinutes = (startMinutes + minutesToAdd) % (24 * 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const hh = `${hours}`.padStart(2, '0');
  const mm = `${minutes}`.padStart(2, '0');
  return `${hh}:${mm}`;
}

function pad2(n: number): string {
  return `${n}`.padStart(2, '0');
}

function parseISODate(iso: string): Date | null {
  // Expects `YYYY-MM-DD`.
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.trim());
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null;
  // JS months are 0-based.
  const d = new Date(year, month - 1, day);
  if (d.getFullYear() !== year || d.getMonth() !== month - 1 || d.getDate() !== day) return null;
  return d;
}

function formatISODate(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function formatDateButtonLabel(iso: string): string {
  const d = parseISODate(iso);
  if (!d) return '';
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

type CalendarCell = {
  iso: string;
  inMonth: boolean;
  dayNum: number;
};

/** Full weeks for the month; leading/trailing cells use adjacent month days (not negative / 33+ junk). */
function buildCalendarCells(year: number, month: number): CalendarCell[] {
  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const prevMonthDays = new Date(year, month, 0).getDate();
  const cellCount = Math.ceil((firstWeekday + daysInMonth) / 7) * 7;
  const cells: CalendarCell[] = [];
  for (let i = 0; i < cellCount; i++) {
    if (i < firstWeekday) {
      const day = prevMonthDays - firstWeekday + i + 1;
      const d = new Date(year, month - 1, day);
      cells.push({ iso: formatISODate(d), inMonth: false, dayNum: day });
    } else if (i < firstWeekday + daysInMonth) {
      const day = i - firstWeekday + 1;
      const d = new Date(year, month, day);
      cells.push({ iso: formatISODate(d), inMonth: true, dayNum: day });
    } else {
      const day = i - firstWeekday - daysInMonth + 1;
      const d = new Date(year, month + 1, day);
      cells.push({ iso: formatISODate(d), inMonth: false, dayNum: day });
    }
  }
  return cells;
}

interface LandingBookingFormProps {
  // Used when booking is created from a specific ground screen.
  initialGroundId?: string;
  // When true, the ground picker chips are hidden (ground is assumed from `initialGroundId`).
  hideGroundPicker?: boolean;
}

export default function LandingBookingForm({
  initialGroundId,
  hideGroundPicker = true,
}: LandingBookingFormProps) {
  const { user } = useAuth();
  const { width: windowWidth } = useWindowDimensions();

  /** Landing: Search → pick ground → Request Booking. Skip when booking a known ground. */
  const useLandingSearchFlow = hideGroundPicker && !initialGroundId;

  const [grounds, setGrounds] = useState<GroundWithImages[]>([]);
  const [loadingGrounds, setLoadingGrounds] = useState(true);
  const [selectedGroundId, setSelectedGroundId] = useState<string | null>(null);

  const [bookingDate, setBookingDate] = useState('');
  /** Landing search: empty until user picks a chip (default 09:00 would enable Search too early). */
  const [startTime, setStartTime] = useState<TimeString>(() =>
    hideGroundPicker && !initialGroundId ? '' : '09:00',
  );
  const [notes, setNotes] = useState('');
  const [teamType, setTeamType] = useState<'one' | 'both'>('both');

  const [submitting, setSubmitting] = useState(false);

  const [locationKey, setLocationKey] = useState<string>('');
  const [typeKey, setTypeKey] = useState<string>('');
  const [locationRows, setLocationRows] = useState<Location[]>([]);
  const [groundTypeRows, setGroundTypeRows] = useState<GroundType[]>([]);

  /** Which select menu is open (mutually exclusive; drives z-index + controlled open state). */
  const [openSelectMenu, setOpenSelectMenu] = useState<'location' | 'type' | 'date' | null>(null);

  const [calendarMonth, setCalendarMonth] = useState<Date>(() => new Date());
  const [dateMenuAnchor, setDateMenuAnchor] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);

  const dateButtonRef = React.useRef<View>(null);

  const [searchResults, setSearchResults] = useState<GroundWithImages[]>([]);
  const [searching, setSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const clearSearchState = React.useCallback(() => {
    setHasSearched(false);
    setSearchResults([]);
    setSelectedGroundId(null);
  }, []);

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
        setLocationRows((data || []) as Location[]);
      } catch (e) {
        console.error('Error loading locations:', e);
      }
    };

    loadLocations();
  }, []);

  useEffect(() => {
    const loadGroundTypes = async () => {
      try {
        const { data, error } = await supabase
          .from('ground_types')
          .select('*')
          .eq('active', true)
          .order('sort_order', { ascending: true })
          .order('name', { ascending: true });

        if (error) throw error;
        setGroundTypeRows((data || []) as GroundType[]);
      } catch (e) {
        console.error('Error loading ground types:', e);
      }
    };

    loadGroundTypes();
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        setLoadingGrounds(true);
        let query = supabase
          .from('grounds')
          .select(`
            *,
            ground_images(*)
          `)
          .eq('active', true)
          .eq('approved', true)
          .order('created_at', { ascending: false });

        if (initialGroundId) {
          query = query.eq('id', initialGroundId);
        }

        const { data, error } = await query.limit(30);

        if (error) throw error;

        setGrounds((data || []) as GroundWithImages[]);
      } catch (e) {
        console.error('Error loading grounds:', e);
        Alert.alert('Error', 'Failed to load grounds for booking.');
      } finally {
        setLoadingGrounds(false);
      }
    };

    load();
  }, [initialGroundId]);

  useEffect(() => {
    if (initialGroundId) {
      if (grounds.some((g) => g.id === initialGroundId)) {
        setSelectedGroundId(initialGroundId);
      }
      return;
    }

    if (useLandingSearchFlow) {
      return;
    }

    if (!selectedGroundId && grounds.length > 0) {
      setSelectedGroundId(grounds[0].id);
    }
  }, [grounds, selectedGroundId, initialGroundId, useLandingSearchFlow]);

  const selectedGround = useMemo(
    () => grounds.find((g) => g.id === selectedGroundId) ?? null,
    [grounds, selectedGroundId],
  );

  const locationKeyForGround = (g: GroundWithImages) => `${g.city}__${g.state}`;

  const locationOptions = useMemo(() => {
    const map = new Map<string, string>();
    locationRows.forEach((row) => {
      const key = `${row.city}__${row.state}`;
      map.set(key, row.label?.trim() || `${row.city}, ${row.state}`);
    });
    grounds.forEach((g) => {
      const key = locationKeyForGround(g);
      if (!map.has(key)) map.set(key, `${g.city}, ${g.state}`);
    });
    return Array.from(map.entries()).map(([key, label]) => ({ key, label }));
  }, [locationRows, grounds]);

  const typeOptions = useMemo(() => {
    const map = new Map<string, string>();
    groundTypeRows.forEach((r) => {
      map.set(r.name, r.label?.trim() || r.name);
    });
    grounds.forEach((g) => {
      const p = g.pitch_type;
      if (p && !map.has(p)) map.set(p, p);
    });
    return Array.from(map.entries()).map(([key, label]) => ({ key, label }));
  }, [groundTypeRows, grounds]);

  useEffect(() => {
    if (!selectedGround) return;
    setLocationKey(locationKeyForGround(selectedGround));
    setTypeKey(selectedGround.pitch_type ?? '');
  }, [selectedGroundId]);

  const isLockedByInitialGround = !!initialGroundId;

  const selectGroundByLocationAndType = (nextLocationKey: string, nextTypeKey: string) => {
    if (useLandingSearchFlow) return;
    const matches = grounds.filter((g) => {
      const matchesLocation = !nextLocationKey || locationKeyForGround(g) === nextLocationKey;
      const matchesType = !nextTypeKey || (g.pitch_type ?? '') === nextTypeKey;
      return matchesLocation && matchesType;
    });
    setSelectedGroundId(matches[0]?.id ?? null);
  };

  const derivedEndTime = useMemo(() => {
    return addMinutesToTime(startTime, DURATION_HOURS * 60);
  }, [startTime]);

  // Ground availability for the selected `bookingDate` (from `time_slots`).
  // If nothing exists in DB yet, we fall back to pitch templates.
  const [allowedStartHHMM, setAllowedStartHHMM] = useState<Set<string>>(() => new Set());
  // Custom price per slot start time (if set in `time_slots.custom_price`).
  const [slotPriceByStartTime, setSlotPriceByStartTime] = useState<Record<string, number | null>>({});

  const computed = useMemo(() => {
    if (!selectedGround) return null;
    if (!startTime || !derivedEndTime) return null;

    const totalHours = DURATION_HOURS;
    const basePrice = selectedGround.base_price_per_hour;
    const custom = Object.prototype.hasOwnProperty.call(slotPriceByStartTime, startTime)
      ? slotPriceByStartTime[startTime]
      : undefined;
    const pricePerHour = custom == null ? basePrice : custom;
    const totalAmount = Math.round(totalHours * pricePerHour * 100) / 100;

    const _sanity = hoursBetweenBooked(startTime, derivedEndTime);
    if (_sanity === null || !Number.isFinite(_sanity) || _sanity <= 0) return null;

    return { totalHours, totalAmount };
  }, [selectedGround, startTime, derivedEndTime, slotPriceByStartTime]);

  useEffect(() => {
    const parsed = parseISODate(bookingDate);
    if (!parsed) return;
    setCalendarMonth(new Date(parsed.getFullYear(), parsed.getMonth(), 1));
  }, [bookingDate]);

  const isBoxCricket = useMemo(() => {
    const p = (selectedGround?.pitch_type ?? typeKey ?? '').toLowerCase();
    return p.includes('box');
  }, [selectedGround, typeKey]);

  const timeSlots = useMemo(
    () => getSlotTemplatesForPitch(selectedGround?.pitch_type ?? typeKey),
    [selectedGround, typeKey],
  );

  const [bookedStartHHMM, setBookedStartHHMM] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    if (!selectedGround?.id || !bookingDate) {
      setBookedStartHHMM(new Set());
      return;
    }
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase.rpc('booked_start_times_for_ground_day', {
        p_ground_id: selectedGround.id,
        p_booking_date: bookingDate,
      });
      if (cancelled) return;
      if (error) {
        console.warn('booked_start_times_for_ground_day', error);
        setBookedStartHHMM(new Set());
        return;
      }
      const next = new Set<string>();
      (data as { start_time: string }[] | null)?.forEach((row) => {
        const hh = normalizeDbTimeToHHMM(row.start_time);
        if (hh) next.add(hh);
      });
      setBookedStartHHMM(next);
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedGround?.id, bookingDate]);

  // Pull which slot start-times are currently available for the selected ground/day.
  // This is what the ground-owner can edit in the admin/owner dashboards (`time_slots.is_available`).
  useEffect(() => {
    if (!selectedGround?.id || !bookingDate) {
      setAllowedStartHHMM(new Set());
      setSlotPriceByStartTime({});
      return;
    }

    const parsed = parseISODate(bookingDate);
    if (!parsed) {
      setAllowedStartHHMM(new Set());
      setSlotPriceByStartTime({});
      return;
    }

    const dow = getDayOfWeek(parsed) as any;

    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from('time_slots')
        .select('start_time, custom_price')
        .eq('ground_id', selectedGround.id)
        .eq('day_of_week', dow)
        .eq('is_available', true)
        .order('start_time', { ascending: true });

      if (cancelled) return;
      if (error) {
        console.warn('time_slots availability load failed', error);
        setAllowedStartHHMM(new Set());
        setSlotPriceByStartTime({});
        return;
      }

      const nextAllowed = new Set<string>();
      const nextPrices: Record<string, number | null> = {};
      (data ?? []).forEach((row: any) => {
        const hh = normalizeDbTimeToHHMM(row.start_time);
        if (!hh) return;
        nextAllowed.add(hh);
        nextPrices[hh] = row.custom_price ?? null;
      });

      setAllowedStartHHMM(nextAllowed);
      setSlotPriceByStartTime(nextPrices);
    })();

    return () => {
      cancelled = true;
    };
  }, [selectedGround?.id, bookingDate]);

  /**
   * Before search picks a ground, do not constrain chips to one ground's `time_slots`
   * (avoids empty intersection / stale selection). After a ground is chosen from results,
   * `selectedGroundId` is set and DB-backed availability applies.
   */
  const constrainSlotsToDb = useMemo(() => {
    if (!useLandingSearchFlow) return true;
    return !!selectedGroundId;
  }, [useLandingSearchFlow, selectedGroundId]);

  const availableTimeSlots = useMemo(
    () => {
      const base =
        constrainSlotsToDb && allowedStartHHMM.size
          ? timeSlots.filter((s) => allowedStartHHMM.has(s.value))
          : timeSlots;
      return base.filter((s) => !bookedStartHHMM.has(s.value));
    },
    [timeSlots, bookedStartHHMM, allowedStartHHMM, constrainSlotsToDb],
  );

  useEffect(() => {
    if (useLandingSearchFlow) return;
    if (!availableTimeSlots.length) return;
    if (availableTimeSlots.some((s) => s.value === startTime)) return;
    setStartTime(availableTimeSlots[0].value as TimeString);
  }, [useLandingSearchFlow, availableTimeSlots, startTime]);

  /** Landing: if type/date changes and the previous slot is no longer valid, clear it. */
  useEffect(() => {
    if (!useLandingSearchFlow || !startTime) return;
    if (!availableTimeSlots.length) return;
    if (availableTimeSlots.some((s) => s.value === startTime)) return;
    setStartTime('');
  }, [useLandingSearchFlow, availableTimeSlots, startTime]);

  const finalNotes = useMemo(() => {
    const trimmed = notes.trim();
    if (isBoxCricket) {
      return trimmed || null;
    }
    const teamLine = teamType === 'one' ? 'Teams: 1 Team' : 'Teams: Both Teams';
    if (!trimmed) return teamLine;
    return `${trimmed}\n${teamLine}`;
  }, [notes, teamType, isBoxCricket]);

  const isWeb = Platform.OS === 'web';
  const webColumnCount =
    !isWeb ? 1 : windowWidth >= 960 ? 3 : windowWidth >= 640 ? 2 : 1;

  const webGridSectionStyle = useMemo(() => {
    if (!isWeb || webColumnCount <= 1) return undefined;
    return {
      flexGrow: 1,
      flexShrink: 1,
      minWidth: 200,
      maxWidth: '100%' as const,
      flexBasis: (webColumnCount === 3 ? '31%' : '48%') as `${number}%`,
    };
  }, [isWeb, webColumnCount]);

  const webFullSpanStyle = useMemo(() => {
    if (!isWeb || webColumnCount <= 1) return undefined;
    return { width: '100%' as const, flexBasis: '100%' as const };
  }, [isWeb, webColumnCount]);

  const webSingleColumnStyle = useMemo(() => {
    if (!isWeb || webColumnCount > 1) return undefined;
    return { width: '100%' as const };
  }, [isWeb, webColumnCount]);

  function InlineDropdown({
    value,
    options,
    onChange,
    label,
    disabled,
    open: openControlled,
    onOpenChange,
  }: {
    value: string;
    options: { key: string; label: string }[];
    onChange: (k: string) => void;
    label: string;
    disabled?: boolean;
    /** When set, menu open state is fully controlled by the parent. */
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
  }) {
    const [internalOpen, setInternalOpen] = useState(false);
    const controlled = openControlled !== undefined;
    const open = controlled ? openControlled : internalOpen;
    const selectedLabel = options.find((o) => o.key === value)?.label ?? '';

    const setOpenNotify = (next: boolean) => {
      if (!controlled) setInternalOpen(next);
      onOpenChange?.(next);
    };

    return (
      <View style={styles.dropdownOuter}>
        <Pressable
          onPress={() => {
            if (disabled) return;
            setOpenNotify(!open);
          }}
          style={[
            styles.dropdownButton,
            open && styles.dropdownButtonOpen,
            disabled && styles.dropdownButtonDisabled,
          ]}
        >
          <Text
            style={[
              styles.dropdownButtonText,
              disabled && styles.dropdownButtonTextDisabled,
            ]}
          >
            {selectedLabel || label}
          </Text>
        </Pressable>

        {open && !disabled ? (
          <View style={styles.dropdownMenu}>
            {options.map((opt) => (
              <Pressable
                key={opt.key}
                onPress={() => {
                  onChange(opt.key);
                  setOpenNotify(false);
                }}
                style={[
                  styles.dropdownOption,
                  opt.key === value && styles.dropdownOptionActive,
                ]}
              >
                <Text
                  style={[
                    styles.dropdownOptionText,
                    opt.key === value && styles.dropdownOptionTextActive,
                  ]}
                >
                  {opt.label}
                </Text>
              </Pressable>
            ))}
          </View>
        ) : null}
      </View>
    );
  }

  const canRunSearch = useMemo(() => {
    const timeIsValidSlot =
      !!startTime && availableTimeSlots.some((s) => s.value === startTime);
    return (
      !!locationKey &&
      !!typeKey &&
      !!bookingDate &&
      timeIsValidSlot &&
      availableTimeSlots.length > 0 &&
      !loadingGrounds
    );
  }, [
    locationKey,
    typeKey,
    bookingDate,
    startTime,
    availableTimeSlots,
    loadingGrounds,
  ]);

  const groundSelectedFromSearch = useMemo(() => {
    if (!useLandingSearchFlow || !selectedGroundId || !hasSearched) return false;
    return searchResults.some((g) => g.id === selectedGroundId);
  }, [useLandingSearchFlow, selectedGroundId, hasSearched, searchResults]);

  const handleSearch = async () => {
    if (!canRunSearch) {
      Alert.alert('Missing details', 'Please choose location, type, date, and start time.');
      return;
    }

    const candidates = grounds.filter((g) => {
      const matchesLocation = locationKeyForGround(g) === locationKey;
      const matchesType = (g.pitch_type ?? '') === typeKey;
      return matchesLocation && matchesType;
    });

    if (!candidates.length) {
      Alert.alert('No grounds', 'No grounds match this location and type.');
      setSearchResults([]);
      setHasSearched(true);
      return;
    }

    setSearching(true);
    setHasSearched(true);
    setSelectedGroundId(null);
    try {
      const candidateIds = candidates.map((c) => c.id);
      const startTimeDb = `${startTime}:00`;
      const { data, error } = await supabase.rpc('available_ground_ids_for_slot', {
        p_ground_ids: candidateIds,
        p_booking_date: bookingDate,
        p_start_time: startTimeDb,
      });

      if (error) {
        console.warn('available_ground_ids_for_slot', error);
        Alert.alert(
          'Search failed',
          'Availability check failed. Please try again.',
        );
      }

      const allowed = new Set<string>();
      (data as { ground_id: string }[] | null)?.forEach((row) => {
        if (row?.ground_id) allowed.add(row.ground_id);
      });

      // Fallback: if RPC is missing/misconfigured and returns no rows, use the old per-ground check.
      if (!error && allowed.size > 0) {
        setSearchResults(candidates.filter((g) => allowed.has(g.id)));
        return;
      }

      const fallbackAvailable: GroundWithImages[] = [];
      for (const g of candidates) {
        const { data: bookedRows, error: bookedErr } = await supabase.rpc('booked_start_times_for_ground_day', {
          p_ground_id: g.id,
          p_booking_date: bookingDate,
        });
        if (bookedErr) continue;
        const booked = new Set<string>();
        (bookedRows as { start_time: string }[] | null)?.forEach((row) => {
          const hh = normalizeDbTimeToHHMM(row.start_time);
          if (hh) booked.add(hh);
        });
        if (!booked.has(startTime)) fallbackAvailable.push(g);
      }
      setSearchResults(fallbackAvailable);
    } finally {
      setSearching(false);
    }
  };

  const handleBook = async () => {
    if (useLandingSearchFlow && !groundSelectedFromSearch) {
      Alert.alert('Select a ground', 'Search and choose a ground from the list first.');
      return;
    }
    if (!user) {
      if (Platform.OS === 'web') {
        Alert.alert('Login required', 'Please sign in to create a booking.');
      } else {
        Alert.alert('Login required', 'Please sign in to create a booking.');
      }
      router.push('/(auth)/login');
      return;
    }

    if (!selectedGround) {
      Alert.alert('Select a ground', 'Please choose a ground to book.');
      return;
    }
    if (!bookingDate) {
      Alert.alert('Missing date', 'Please enter a booking date (YYYY-MM-DD).');
      return;
    }

    if (!computed) {
      Alert.alert('Invalid start time', 'Please enter a valid start time (HH:MM).');
      return;
    }

    if (allowedStartHHMM.size && !allowedStartHHMM.has(startTime)) {
      Alert.alert('Unavailable slot', 'Please choose a different time slot.');
      return;
    }

    const pricePerHour =
      Object.prototype.hasOwnProperty.call(slotPriceByStartTime, startTime) &&
      slotPriceByStartTime[startTime] != null
        ? slotPriceByStartTime[startTime]!
        : selectedGround.base_price_per_hour;

    try {
      setSubmitting(true);
      const { data, error } = await supabase
        .from('bookings')
        .insert({
          user_id: user.id,
          ground_id: selectedGround.id,
          booking_date: bookingDate,
          start_time: startTime,
          end_time: derivedEndTime!,
          total_hours: computed.totalHours,
          price_per_hour: pricePerHour,
          total_amount: computed.totalAmount,
          notes: finalNotes || null,
          status: 'pending',
        })
        .select('id')
        .single();

      if (error) throw error;

      const bookingId = (data as { id: string }).id;
      router.push(`/bookings/${bookingId}`);
    } catch (e: any) {
      console.error('Error creating booking:', e);
      Alert.alert('Booking failed', e?.message ?? 'Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const formFields = (
    <>
      {!hideGroundPicker && (
        <View style={[styles.section, webGridSectionStyle, webSingleColumnStyle]}>
          <Text style={styles.label}>Ground</Text>
          {user ? (
            <View style={styles.groundsRow}>
              {loadingGrounds ? (
                <Text style={styles.smallMuted}>Loading grounds...</Text>
              ) : (
                grounds.map((g) => {
                  const active = g.id === selectedGroundId;
                  return (
                    <Pressable
                      key={g.id}
                      onPress={() => setSelectedGroundId(g.id)}
                      style={[styles.groundChip, active && styles.groundChipActive]}
                    >
                      <Text style={[styles.groundChipText, active && styles.groundChipTextActive]}>
                        {g.name}
                      </Text>
                    </Pressable>
                  );
                })
              )}
            </View>
          ) : (
            <TextInput editable={false} style={styles.inputDisabled} value="Login required" />
          )}
        </View>
      )}

      <View
        style={[
          styles.section,
          webGridSectionStyle,
          webSingleColumnStyle,
          openSelectMenu === 'location' && styles.sectionDropdownOpen,
        ]}
      >
        <Text style={styles.label}>Location</Text>
        <InlineDropdown
          label="Location"
          value={locationKey}
          options={locationOptions}
          disabled={isLockedByInitialGround || loadingGrounds}
          open={openSelectMenu === 'location'}
          onOpenChange={(o) => {
            setOpenSelectMenu(o ? 'location' : (prev) => (prev === 'location' ? null : prev));
          }}
          onChange={(k) => {
            setLocationKey(k);
            if (useLandingSearchFlow) {
              clearSearchState();
            } else {
              selectGroundByLocationAndType(k, typeKey);
            }
          }}
        />
      </View>

      <View
        style={[
          styles.section,
          webGridSectionStyle,
          webSingleColumnStyle,
          openSelectMenu === 'type' && styles.sectionDropdownOpen,
        ]}
      >
        <Text style={styles.label}>Type</Text>
        <InlineDropdown
          label="Type"
          value={typeKey}
          options={typeOptions}
          disabled={isLockedByInitialGround || loadingGrounds}
          open={openSelectMenu === 'type'}
          onOpenChange={(o) => {
            setOpenSelectMenu(o ? 'type' : (prev) => (prev === 'type' ? null : prev));
          }}
          onChange={(t) => {
            setTypeKey(t);
            if (useLandingSearchFlow) {
              clearSearchState();
            } else {
              selectGroundByLocationAndType(locationKey, t);
            }
          }}
        />
      </View>

      {!isBoxCricket ? (
        <View style={[styles.section, webGridSectionStyle, webSingleColumnStyle]}>
          <Text style={styles.label}>Teams</Text>
          <View style={styles.teamToggle}>
            <Pressable
              onPress={() => {
                setTeamType('one');
                if (useLandingSearchFlow) clearSearchState();
              }}
              style={[styles.teamToggleOption, teamType === 'one' && styles.teamToggleOptionActive]}
            >
              <Text style={[styles.teamToggleText, teamType === 'one' && styles.teamToggleTextActive]}>
                1 Team
              </Text>
            </Pressable>
            <Pressable
              onPress={() => {
                setTeamType('both');
                if (useLandingSearchFlow) clearSearchState();
              }}
              style={[styles.teamToggleOption, teamType === 'both' && styles.teamToggleOptionActive]}
            >
              <Text style={[styles.teamToggleText, teamType === 'both' && styles.teamToggleTextActive]}>
                Both Teams
              </Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      <View
        style={[
          styles.section,
          webGridSectionStyle,
          webSingleColumnStyle,
          webFullSpanStyle,
          openSelectMenu === 'date' && styles.sectionDropdownOpen,
        ]}
      >
        <Text style={styles.label}>Date</Text>

        <View style={styles.dropdownOuter}>
          <Pressable
            ref={dateButtonRef}
            onPress={() => {
              if (submitting) return;
              setOpenSelectMenu((prev) => {
                const next = prev === 'date' ? null : 'date';
                if (next === 'date') {
                  // Measure anchor for portal positioning.
                  requestAnimationFrame(() => {
                    (dateButtonRef.current as any)?.measureInWindow?.(
                      (x: number, y: number, width: number, height: number) => {
                        if (Number.isFinite(x) && Number.isFinite(y) && Number.isFinite(width) && Number.isFinite(height)) {
                          setDateMenuAnchor({ x, y, width, height });
                        }
                      },
                    );
                  });
                } else {
                  setDateMenuAnchor(null);
                }
                return next;
              });
            }}
            style={[
              styles.dropdownButton,
              openSelectMenu === 'date' && styles.dropdownButtonOpen,
              submitting && styles.dropdownButtonDisabled,
            ]}
          >
            <Text
              style={[
                styles.dropdownButtonText,
                (!bookingDate || submitting) && styles.dropdownButtonTextDisabled,
              ]}
            >
              {bookingDate ? formatDateButtonLabel(bookingDate) : 'Select date'}
            </Text>
          </Pressable>
        </View>
      </View>

      <View style={[styles.section, webSingleColumnStyle, webFullSpanStyle]}>
        <Text style={styles.label}>Start Time</Text>

        <View style={[styles.timeSlotsWrap, isBoxCricket && styles.timeSlotsWrapBox]}>
          {!timeSlots.length ? (
            <Text style={styles.smallMuted}>Select a ground type to see time slots.</Text>
          ) : !availableTimeSlots.length ? (
            <Text style={styles.smallMuted}>All slots are booked for this date.</Text>
          ) : (
            availableTimeSlots.map((s) => {
              const active = s.value === startTime;
              return (
                <Pressable
                  key={s.value}
                  disabled={submitting}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active, disabled: submitting }}
                  accessibilityLabel={`${s.label} time slot`}
                  onPress={() => {
                    if (useLandingSearchFlow) clearSearchState();
                    setStartTime(s.value as TimeString);
                  }}
                  style={({ pressed }) => [
                    styles.timeSlotChip,
                    isBoxCricket && styles.timeSlotChipDense,
                    ...(Platform.OS === 'web' ? [{ cursor: 'pointer' } as object] : []),
                    active && styles.timeSlotChipActive,
                    pressed && !active && styles.timeSlotChipPressed,
                  ]}
                >
                  <Text
                    style={[
                      styles.timeSlotText,
                      isBoxCricket && styles.timeSlotTextDense,
                      active && styles.timeSlotTextActive,
                    ]}
                  >
                    {s.label}
                  </Text>
                </Pressable>
              );
            })
          )}
        </View>
      </View>

      <View style={[styles.section, webGridSectionStyle, webSingleColumnStyle, webFullSpanStyle]}>
        <Text style={styles.label}>Notes (optional)</Text>
        <TextInput
          style={[styles.input, styles.inputWide]}
          placeholder="Any special requests"
          value={notes}
          onChangeText={setNotes}
          editable={!submitting}
        />
      </View>

      {useLandingSearchFlow && hasSearched ? (
        <View style={[styles.section, webFullSpanStyle, styles.searchResultsSection]}>
          <Text style={styles.label}>Available grounds</Text>
          {searching ? (
            <ActivityIndicator style={styles.searchSpinner} color={Platform.OS === 'web' ? '#dc8d3c' : '#2196F3'} />
          ) : null}
          {searchResults.map((g) => {
            const thumb = g.ground_images?.[0]?.image_url;
            const active = selectedGroundId === g.id;
            return (
              <Pressable
                key={g.id}
                onPress={() => setSelectedGroundId(g.id)}
                style={({ pressed }) => [
                  styles.searchResultRow,
                  active && styles.searchResultRowActive,
                  pressed && styles.searchResultRowPressed,
                  ...(Platform.OS === 'web' ? [{ cursor: 'pointer' } as object] : []),
                ]}
              >
                {thumb ? <Image source={{ uri: thumb }} style={styles.searchResultThumb} /> : (
                  <View style={[styles.searchResultThumb, styles.searchResultThumbPlaceholder]} />
                )}
                <View style={styles.searchResultTextCol}>
                  <Text style={styles.searchResultName}>{g.name}</Text>
                  <Text style={styles.searchResultMeta}>
                    {g.city}, {g.state}
                  </Text>
                </View>
                <Text style={styles.searchResultPrice}>{formatCurrency(g.base_price_per_hour)}/hr</Text>
              </Pressable>
            );
          })}
          {!searching && searchResults.length === 0 ? (
            <Text style={styles.smallMuted}>
              No grounds have this slot free. Try another time or date.
            </Text>
          ) : null}
        </View>
      ) : null}
    </>
  );

  return (
    <View style={styles.wrapper}>
      <Card style={[styles.card, isWeb && styles.cardWeb]}>
        <Text style={styles.title}>Book a Ground</Text>
        <Text style={styles.subtitle}>
          {hideGroundPicker
            ? useLandingSearchFlow
              ? 'Choose location, type, date, and time, then search and pick a ground to book.'
              : 'Choose location, ground type, date, and time to request your booking.'
            : 'Pick a ground and time slot to request your booking.'}
        </Text>

        {isWeb ? (
          <View style={styles.formFieldsWeb}>{formFields}</View>
        ) : (
          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.formFieldsNative}
          >
            {formFields}
          </ScrollView>
        )}

        {computed && (!useLandingSearchFlow || groundSelectedFromSearch) && (
          <View style={styles.summary}>
            <Text style={styles.summaryText}>
              Total: <Text style={styles.summaryAccent}>{formatCurrency(computed.totalAmount)}</Text>
            </Text>
            <Text style={styles.summaryMuted}>
              Duration: {computed.totalHours} hours @ {formatCurrency(selectedGround!.base_price_per_hour)}/hr
            </Text>
          </View>
        )}

        <View style={styles.actions}>
          {useLandingSearchFlow ? (
            groundSelectedFromSearch ? (
              <View style={styles.actionsColumn}>
                <Button
                  title={submitting ? 'Creating...' : 'Request Booking'}
                  onPress={handleBook}
                  disabled={submitting}
                  loading={submitting}
                  fullWidth
                  size="large"
                />
                <Pressable
                  onPress={() => setSelectedGroundId(null)}
                  style={styles.changeGroundPress}
                  disabled={submitting}
                >
                  <Text style={styles.changeGroundText}>Choose a different ground</Text>
                </Pressable>
              </View>
            ) : (
              <Button
                title="Search"
                onPress={handleSearch}
                disabled={submitting || searching || !canRunSearch}
                loading={searching}
                fullWidth
                size="large"
              />
            )
          ) : (
            <Button
              title={submitting ? 'Creating...' : 'Request Booking'}
              onPress={handleBook}
              disabled={submitting}
              loading={submitting}
              fullWidth
              size="large"
            />
          )}
        </View>
      </Card>

      <Modal
        transparent
        visible={openSelectMenu === 'date' && !submitting}
        animationType="fade"
        onRequestClose={() => {
          setOpenSelectMenu(null);
          setDateMenuAnchor(null);
        }}
      >
        <Pressable
          style={styles.portalBackdrop}
          onPress={() => {
            setOpenSelectMenu(null);
            setDateMenuAnchor(null);
          }}
        >
          <Pressable
            onPress={() => {}}
            style={[
              styles.portalMenu,
              dateMenuAnchor
                ? {
                    top: dateMenuAnchor.y + dateMenuAnchor.height + 6,
                    left: dateMenuAnchor.x,
                    width: Math.max(220, dateMenuAnchor.width),
                  }
                : { top: 120, left: 20, width: 240 },
            ]}
          >
            {(() => {
              const month = calendarMonth.getMonth();
              const year = calendarMonth.getFullYear();
              const todayISO = formatISODate(new Date());
              const selectedISO = bookingDate;
              const cells = buildCalendarCells(year, month);
              const monthLabel = calendarMonth.toLocaleString('en-IN', { month: 'long', year: 'numeric' });

              return (
                <View style={styles.calendarWrap}>
                  <View style={styles.calendarHeader}>
                    <Pressable
                      onPress={() => {
                        const prev = new Date(year, month - 1, 1);
                        setCalendarMonth(prev);
                      }}
                      style={styles.calendarNav}
                    >
                      <Text style={styles.calendarNavText}>{'<'}</Text>
                    </Pressable>

                    <Text style={styles.calendarTitle}>{monthLabel}</Text>

                    <Pressable
                      onPress={() => {
                        const next = new Date(year, month + 1, 1);
                        setCalendarMonth(next);
                      }}
                      style={styles.calendarNav}
                    >
                      <Text style={styles.calendarNavText}>{'>'}</Text>
                    </Pressable>
                  </View>

                  <View style={styles.calendarWeekdays}>
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((w) => (
                      <Text key={w} style={styles.calendarWeekday}>
                        {w}
                      </Text>
                    ))}
                  </View>

                  <View style={styles.calendarGrid}>
                    {cells.map((c, i) => {
                      const isSelected = selectedISO === c.iso;
                      const isToday = todayISO === c.iso;

                      return (
                        <Pressable
                          key={`${c.iso}-${i}`}
                          onPress={() => {
                            if (useLandingSearchFlow) {
                              clearSearchState();
                              setStartTime('');
                            }
                            setBookingDate(c.iso);
                            const d = parseISODate(c.iso);
                            if (d) setCalendarMonth(new Date(d.getFullYear(), d.getMonth(), 1));
                            setOpenSelectMenu(null);
                            setDateMenuAnchor(null);
                          }}
                          style={[
                            styles.calendarDayCell,
                            !c.inMonth && styles.calendarDayCellOut,
                            isSelected && styles.calendarDayCellSelected,
                            isToday && !isSelected && styles.calendarDayCellToday,
                          ]}
                        >
                          <Text
                            style={[
                              styles.calendarDayText,
                              isSelected && styles.calendarDayTextSelected,
                              !c.inMonth && styles.calendarDayTextOut,
                            ]}
                          >
                            {c.dayNum}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              );
            })()}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: 16,
    paddingBottom: 28,
    ...Platform.select({
      web: {
        maxWidth: 1120,
        width: '100%',
        alignSelf: 'center',
      },
      default: {},
    }),
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    marginTop: 0,
  },
  cardWeb: {
    overflow: 'visible',
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 12,
  },
  authRequired: {
    marginBottom: 16,
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(220,141,60,0.12)',
  },
  authTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  authText: {
    fontSize: 13,
    color: '#6B7280',
  },
  formFieldsWeb: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: '100%',
    gap: 12,
    paddingBottom: 4,
    overflow: 'visible',
  },
  formFieldsNative: {
    gap: 12,
    paddingBottom: 4,
  },
  section: {
    minWidth: 180,
    alignSelf: 'stretch',
  },
  /** Entire field column must stack above later flex rows so the menu isn’t covered by Date/Time. */
  sectionDropdownOpen: {
    position: 'relative',
    zIndex: 10000,
    elevation: 24,
    overflow: 'visible',
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 10,
    paddingVertical: 9,
    paddingHorizontal: 10,
    fontSize: 14,
    backgroundColor: '#FFF',
    color: '#111827',
  },
  inputWide: {
    width: '100%',
    minWidth: 200,
    alignSelf: 'stretch',
  },
  inputDisabled: {
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 10,
    paddingVertical: 9,
    paddingHorizontal: 10,
    fontSize: 14,
    backgroundColor: '#F3F4F6',
    color: '#6B7280',
  },
  groundsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  groundChip: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  groundChipActive: {
    borderColor: '#dc8d3c',
    backgroundColor: 'rgba(220,141,60,0.12)',
  },
  groundChipText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#374151',
  },
  groundChipTextActive: {
    color: '#dc8d3c',
  },
  teamToggle: {
    flexDirection: 'row',
    gap: 10,
  },
  teamToggleOption: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
  },
  teamToggleOptionActive: {
    borderColor: '#dc8d3c',
    backgroundColor: 'rgba(220,141,60,0.12)',
  },
  teamToggleText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#374151',
  },
  teamToggleTextActive: {
    color: '#dc8d3c',
  },
  summary: {
    marginTop: 12,
    marginBottom: 16,
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(220,141,60,0.10)',
  },
  summaryText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  summaryMuted: {
    marginTop: 6,
    fontSize: 12,
    color: '#6B7280',
  },
  summaryAccent: {
    color: '#dc8d3c',
  },
  actions: {
    marginTop: 8,
  },
  actionsColumn: {
    gap: 10,
    width: '100%',
  },
  changeGroundPress: {
    alignSelf: 'center',
    paddingVertical: 8,
  },
  changeGroundText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#dc8d3c',
  },
  searchResultsSection: {
    marginTop: 4,
  },
  searchSpinner: {
    marginVertical: 12,
  },
  searchResultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    marginBottom: 8,
  },
  searchResultRowActive: {
    borderColor: '#dc8d3c',
    borderWidth: 2,
    backgroundColor: 'rgba(220,141,60,0.08)',
  },
  searchResultRowPressed: {
    backgroundColor: '#F9FAFB',
  },
  searchResultThumb: {
    width: 56,
    height: 56,
    borderRadius: 8,
    backgroundColor: '#E5E7EB',
  },
  searchResultThumbPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchResultTextCol: {
    flex: 1,
    minWidth: 0,
  },
  searchResultName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#111827',
  },
  searchResultMeta: {
    marginTop: 2,
    fontSize: 13,
    color: '#6B7280',
  },
  searchResultPrice: {
    fontSize: 14,
    fontWeight: '800',
    color: '#dc8d3c',
  },
  smallMuted: {
    fontSize: 13,
    color: '#6B7280',
  },
  dropdownOuter: {
    position: 'relative',
  },
  dropdownButton: {
    borderWidth: 1,
    borderColor: '#DDD',
    backgroundColor: '#FFF',
    borderRadius: 10,
    paddingVertical: 9,
    paddingHorizontal: 10,
  },
  dropdownButtonOpen: {
    borderColor: '#dc8d3c',
    backgroundColor: 'rgba(220,141,60,0.08)',
  },
  dropdownButtonDisabled: {
    backgroundColor: '#F3F4F6',
  },
  dropdownButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  dropdownButtonTextDisabled: {
    color: '#6B7280',
  },
  dropdownMenu: {
    position: 'absolute',
    top: 44,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingVertical: 6,
    zIndex: 10000,
    elevation: 50,
  },
  dateDropdownMenu: {
    position: 'absolute',
    top: 44,
    left: 0,
    right: 0,
    zIndex: 10000,
    elevation: 50,
  },
  portalBackdrop: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  portalMenu: {
    position: 'absolute',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 8,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 60,
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

  calendarWrap: {
    alignSelf: 'stretch',
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 6,
  },
  calendarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
    alignSelf: 'center',
  },
  calendarNav: {
    width: 24,
    height: 24,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendarNavText: {
    color: '#6B7280',
    fontSize: 12,
    fontWeight: '700',
  },
  calendarTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#111827',
  },
  calendarWeekdays: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    width: 222,
    columnGap: 2,
    marginBottom: 2,
    alignSelf: 'center',
  },
  calendarWeekday: {
    width: 30,
    textAlign: 'center',
    fontSize: 9,
    fontWeight: '500',
    color: '#9CA3AF',
    letterSpacing: 0.2,
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: 222,
    rowGap: 2,
    columnGap: 2,
    alignSelf: 'center',
  },
  calendarDayCell: {
    width: 30,
    height: 30,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendarDayCellOut: {
    backgroundColor: '#FAFAFA',
    borderColor: '#F3F4F6',
  },
  calendarDayCellSelected: {
    borderColor: '#dc8d3c',
    backgroundColor: 'rgba(220,141,60,0.12)',
  },
  calendarDayCellToday: {
    borderColor: '#dc8d3c',
  },
  calendarDayText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#111827',
  },
  calendarDayTextOut: {
    color: '#9CA3AF',
  },
  calendarDayTextSelected: {
    color: '#dc8d3c',
  },

  timeSlotsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  /** Box Cricket: many hourly chips; keep full width so all slots wrap visibly. */
  timeSlotsWrapBox: {
    width: '100%',
    alignSelf: 'stretch',
    gap: 6,
  },
  timeSlotChip: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  timeSlotChipDense: {
    paddingVertical: 7,
    paddingHorizontal: 8,
  },
  timeSlotChipActive: {
    borderWidth: 2,
    borderColor: '#dc8d3c',
    backgroundColor: 'rgba(220,141,60,0.16)',
  },
  timeSlotChipPressed: {
    backgroundColor: '#F3F4F6',
    borderColor: '#D1D5DB',
  },
  timeSlotText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#374151',
  },
  timeSlotTextDense: {
    fontSize: 11,
  },
  timeSlotTextActive: {
    color: '#dc8d3c',
  },
});

