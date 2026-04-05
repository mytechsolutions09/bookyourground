import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Alert,
  Pressable,
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
import GroundCard from '@/components/grounds/GroundCard';
import { formatCurrency, getDayOfWeek } from '@/utils/helpers';
import {
  getSlotTemplatesForPitch,
  hoursBetweenBooked,
  formatSlotLabelHour,
  normalizeDbTimeToHHMM,
} from '@/utils/bookingSlots';
import {
  savePendingBookingDraft,
  peekPendingBookingDraft,
  clearPendingBookingDraft,
} from '@/lib/pendingBookingDraft';

type TimeString = string; // expected: "HH:MM"

const DURATION_HOURS = 1;

function makeGroundPath(ground: GroundWithImages): string {
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

/** `HH:MM` → `HH:MM:SS` for Postgres `time` RPC args. */
function hhmmToPgTime(value: string): string {
  const t = String(value ?? '').trim();
  const m = /^(\d{1,2}):(\d{2})$/.exec(t);
  if (!m) return t;
  const hh = Math.min(23, Math.max(0, parseInt(m[1], 10)));
  const mm = Math.min(59, Math.max(0, parseInt(m[2], 10)));
  return `${pad2(hh)}:${pad2(mm)}:00`;
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
  // Optional initial booking date (YYYY-MM-DD) and time (HH:MM) to prefill.
  initialDate?: string;
  initialStartTime?: string;
  // Optional initial team selection for cricket grounds.
  initialTeamType?: 'one' | 'both';
  // When true, expand to full available width (used on /book-my-ground and ground pages).
  fullWidth?: boolean;
  /** When true (e.g. /book-my-ground), render search results in a second card below the form. */
  separateSearchResults?: boolean;
  /** Native-only: render without Card container (used on /book-my-ground). */
  noCard?: boolean;
  /** Hide the "Book a Ground" heading (e.g. on ground detail where the nav title is the ground name). */
  hideTitle?: boolean;
  /** Ground detail page: location/type fields use green/tan accents; Book Now fill `#01b854` (compact on native). */
  groundPageAccent?: boolean;
  /** Native /book-my-ground & Grounds tab: pin form to top with tight spacing (not vertically centered). */
  bookGroundScreenNative?: boolean;
}

export default function LandingBookingForm({
  initialGroundId,
  hideGroundPicker = true,
  initialDate,
  initialStartTime,
  initialTeamType,
  fullWidth = false,
  separateSearchResults = false,
  noCard = false,
  hideTitle = false,
  groundPageAccent = false,
  bookGroundScreenNative = false,
}: LandingBookingFormProps) {
  const { user } = useAuth();
  const { width: windowWidth } = useWindowDimensions();

  /** Landing: Search → pick ground → Book Now. Skip when booking a known ground. */
  const useLandingSearchFlow = hideGroundPicker && !initialGroundId;

  const [grounds, setGrounds] = useState<GroundWithImages[]>([]);
  const [loadingGrounds, setLoadingGrounds] = useState(true);
  const [selectedGroundId, setSelectedGroundId] = useState<string | null>(null);

  const [bookingDate, setBookingDate] = useState(initialDate ?? '');
  /** Landing search: empty until user picks a chip (default 09:00 would enable Search too early). */
  const [startTime, setStartTime] = useState<TimeString>(() => {
    if (initialStartTime) return initialStartTime as TimeString;
    return hideGroundPicker && !initialGroundId ? '' : ('09:00' as TimeString);
  });
  const [teamType, setTeamType] = useState<'one' | 'both'>(initialTeamType ?? 'both');
  /** Cricket only: team slots (0–2) already used for selected ground + date + time; null = not loaded. */
  const [cricketSlotsUsed, setCricketSlotsUsed] = useState<number | null>(null);
  /** True when not waiting on `cricket_team_slots_used_for_slot` (idle or response received). */
  const [cricketSlotsFetched, setCricketSlotsFetched] = useState(false);

  const [submitting, setSubmitting] = useState(false);

  /** After login: re-run Search and optionally re-select a ground from results. */
  const pendingPostLoginSearchRef = useRef(false);
  const pendingReselectGroundIdRef = useRef<string | null>(null);
  const handleSearchRef = useRef<() => Promise<void>>(async () => {});

  const [locationKey, setLocationKey] = useState<string>('');
  const [typeKey, setTypeKey] = useState<string>('');
  const [locationRows, setLocationRows] = useState<Location[]>([]);
  const [groundTypeRows, setGroundTypeRows] = useState<GroundType[]>([]);

  /** Which select menu is open (mutually exclusive; drives z-index + controlled open state). */
  const [openSelectMenu, setOpenSelectMenu] = useState<'location' | 'type' | null>(null);

  const [searchResults, setSearchResults] = useState<GroundWithImages[]>([]);
  const [searching, setSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  // For landing search results: custom price for the chosen slot per ground (if any).
  const [searchSlotPriceByGroundId, setSearchSlotPriceByGroundId] = useState<
    Record<string, number | null>
  >({});

  const clearSearchState = React.useCallback(() => {
    setHasSearched(false);
    setSearchResults([]);
    setSelectedGroundId(null);
    setSearchSlotPriceByGroundId({});
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
            ground_images(*),
            reviews(rating)
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

  // Ground slot availability for the selected `bookingDate` (from `time_slots`).
  // - `allowedStartHHMM`: slots where `is_available = true` (booking allowed)
  // - `allStartHHMM`: all saved slots (for display), regardless of `is_available`
  const [allowedStartHHMM, setAllowedStartHHMM] = useState<Set<string>>(() => new Set());
  const [allStartHHMM, setAllStartHHMM] = useState<Set<string>>(() => new Set());
  // When using the landing search flow (ground not selected yet), show a union of
  // start times from DB across candidate grounds for the chosen location/type/date.
  const [searchAllowedStartHHMM, setSearchAllowedStartHHMM] = useState<Set<string>>(
    () => new Set(),
  );
  const [searchAllStartHHMM, setSearchAllStartHHMM] = useState<Set<string>>(
    () => new Set(),
  );
  /**
   * Search flow (no ground selected yet): start times where at least one candidate ground
   * still has capacity (cricket: 2 team slots per start; box: slot taken only after
   * confirmed/completed booking — see `booked_start_times_for_ground_day`).
   * DB: `booked_start_times_for_ground_day` + per-ground `time_slots` (is_available).
   * `undefined` = not loaded yet (do not filter by capacity).
   */
  const [searchStartTimesWithCapacity, setSearchStartTimesWithCapacity] = useState<
    Set<string> | undefined
  >(undefined);
  // Custom price per slot start time (if set in `time_slots.custom_price`).
  const [slotPriceByStartTime, setSlotPriceByStartTime] = useState<Record<string, number | null>>({});
  // DB end_time per slot start_time, so we can support custom slot durations.
  const [endTimeByStartTime, setEndTimeByStartTime] = useState<Record<string, string>>({});

  const derivedEndTime = useMemo(() => {
    const fromDb = startTime ? endTimeByStartTime[startTime] : undefined;
    if (fromDb) return fromDb;
    return addMinutesToTime(startTime, DURATION_HOURS * 60);
  }, [startTime, endTimeByStartTime]);

  // Search-flow union of available slot start times across candidate grounds.
  // This makes the Start Time chips show your saved `time_slots` (including custom start times)
  // even before a specific ground is selected.
  useEffect(() => {
    if (!useLandingSearchFlow) return;
    if (!locationKey || !typeKey || !bookingDate) {
      setSearchAllowedStartHHMM(new Set());
      setSearchAllStartHHMM(new Set());
      return;
    }

    const parsed = parseISODate(bookingDate);
    if (!parsed) {
      setSearchAllowedStartHHMM(new Set());
      setSearchAllStartHHMM(new Set());
      return;
    }

    const dow = getDayOfWeek(parsed) as any;

    let cancelled = false;
    (async () => {
      const candidates = grounds.filter((g) => {
        const matchesLocation = locationKeyForGround(g) === locationKey;
        const matchesType = (g.pitch_type ?? '') === typeKey;
        return matchesLocation && matchesType;
      });

      if (cancelled) return;
      if (!candidates.length) {
        setSearchAllowedStartHHMM(new Set());
        setSearchAllStartHHMM(new Set());
        return;
      }

      const candidateIds = candidates.map((c) => c.id);
      const { data, error } = await supabase
        .from('time_slots')
        .select('start_time, is_available')
        .in('ground_id', candidateIds)
        .eq('day_of_week', dow)
        .order('start_time', { ascending: true });

      if (cancelled) return;
      if (error) {
        console.warn('landing searchAllowedStartHHMM load failed', error);
        setSearchAllowedStartHHMM(new Set());
        setSearchAllStartHHMM(new Set());
        return;
      }

      const next = new Set<string>();
      const nextAllowed = new Set<string>();
      (data ?? []).forEach((row: any) => {
        const hh = normalizeDbTimeToHHMM(row.start_time);
        if (!hh) return;
        next.add(hh);
        if (row.is_available) nextAllowed.add(hh);
      });
      // Use `is_available` set for enabling booking actions.
      setSearchAllowedStartHHMM(nextAllowed);
      setSearchAllStartHHMM(next);
    })();

    return () => {
      cancelled = true;
    };
  }, [useLandingSearchFlow, locationKey, typeKey, bookingDate, grounds]);

  useEffect(() => {
    if (!useLandingSearchFlow || selectedGround?.id || !locationKey || !typeKey || !bookingDate) {
      setSearchStartTimesWithCapacity(undefined);
      return;
    }

    const parsed = parseISODate(bookingDate);
    if (!parsed) {
      setSearchStartTimesWithCapacity(undefined);
      return;
    }

    const candidates = grounds.filter((g) => {
      const matchesLocation = locationKeyForGround(g) === locationKey;
      const matchesType = (g.pitch_type ?? '') === typeKey;
      return matchesLocation && matchesType;
    });

    if (!candidates.length) {
      setSearchStartTimesWithCapacity(new Set());
      return;
    }

    const dow = getDayOfWeek(parsed) as any;
    let cancelled = false;
    setSearchStartTimesWithCapacity(undefined);

    (async () => {
      try {
        const rows = await Promise.all(
          candidates.map(async (g) => {
            const [slotsRes, bookedRes] = await Promise.all([
              supabase
                .from('time_slots')
                .select('start_time')
                .eq('ground_id', g.id)
                .eq('day_of_week', dow)
                .eq('is_available', true),
              supabase.rpc('booked_start_times_for_ground_day', {
                p_ground_id: g.id,
                p_booking_date: bookingDate,
              }),
            ]);

            if (slotsRes.error || bookedRes.error) {
              console.warn('search capacity slot load', slotsRes.error ?? bookedRes.error);
              return { available: [] as string[] };
            }

            const full = new Set<string>();
            (bookedRes.data as { start_time: string }[] | null)?.forEach((row) => {
              const hh = normalizeDbTimeToHHMM(row.start_time);
              if (hh) full.add(hh);
            });

            const available: string[] = [];
            (slotsRes.data ?? []).forEach((row: { start_time: string }) => {
              const hh = normalizeDbTimeToHHMM(row.start_time);
              if (hh && !full.has(hh)) available.push(hh);
            });
            return { available };
          }),
        );

        if (cancelled) return;
        const union = new Set<string>();
        rows.forEach((r) => r.available.forEach((h) => union.add(h)));
        setSearchStartTimesWithCapacity(union);
      } catch (e) {
        console.warn('searchStartTimesWithCapacity unexpected', e);
        if (!cancelled) setSearchStartTimesWithCapacity(new Set());
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [useLandingSearchFlow, selectedGround?.id, locationKey, typeKey, bookingDate, grounds]);

  const isBoxCricket = useMemo(() => {
    const p = (selectedGround?.pitch_type ?? typeKey ?? '').toLowerCase();
    return p.includes('box');
  }, [selectedGround, typeKey]);

  const shouldFetchCricketSlotUsage =
    !isBoxCricket && !!selectedGround?.id && !!bookingDate && !!startTime;

  const hideBothTeamsOption =
    !isBoxCricket &&
    shouldFetchCricketSlotUsage &&
    (cricketSlotsFetched ? cricketSlotsUsed !== null && cricketSlotsUsed >= 1 : true);

  useEffect(() => {
    if (isBoxCricket || !selectedGround?.id || !bookingDate || !startTime) {
      setCricketSlotsUsed(null);
      setCricketSlotsFetched(true);
      return;
    }
    let cancelled = false;
    setCricketSlotsFetched(false);
    (async () => {
      const { data, error } = await supabase.rpc('cricket_team_slots_used_for_slot', {
        p_ground_id: selectedGround.id,
        p_booking_date: bookingDate,
        p_start_time: hhmmToPgTime(startTime),
      });
      if (cancelled) return;
      if (error) {
        console.warn('cricket_team_slots_used_for_slot', error);
        setCricketSlotsUsed(0);
        setCricketSlotsFetched(true);
        return;
      }
      const n = typeof data === 'number' ? data : Number(data);
      setCricketSlotsUsed(Number.isFinite(n) ? n : 0);
      setCricketSlotsFetched(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [isBoxCricket, selectedGround?.id, bookingDate, startTime]);

  useEffect(() => {
    if (!isBoxCricket && hideBothTeamsOption && teamType === 'both') {
      setTeamType('one');
    }
  }, [isBoxCricket, hideBothTeamsOption, teamType]);

  const computed = useMemo(() => {
    if (!selectedGround) return null;
    if (!startTime || !derivedEndTime) return null;

    const isCricketGround = !isBoxCricket;
    // For cricket grounds, allow per-slot custom pricing as well:
    // - `time_slots.custom_price` (if present) is treated as the price for BOTH teams for that slot
    // - otherwise fall back to the ground's `base_price_per_hour` (also "both teams" price)
    if (isCricketGround) {
      const customMatchPrice = Object.prototype.hasOwnProperty.call(slotPriceByStartTime, startTime)
        ? slotPriceByStartTime[startTime]
        : undefined;
      const baseMatchPrice =
        customMatchPrice == null
          ? selectedGround.base_price_per_hour ?? 0
          : customMatchPrice ?? 0;

      // If user selects only 1 team, charge half of the "both teams" price.
      const pricePerMatch =
        teamType === 'one' ? Math.round((baseMatchPrice / 2) * 100) / 100 : baseMatchPrice;
      const totalAmount = pricePerMatch;

      const _sanity = hoursBetweenBooked(startTime, derivedEndTime);
      if (_sanity === null || !Number.isFinite(_sanity) || _sanity <= 0) return null;
      // Store actual slot span (e.g. 4h window) — price is still per match, not hourly.
      const totalHours = _sanity;

      return { totalHours, totalAmount, pricePerUnit: pricePerMatch, unitLabel: 'match' as const };
    }

    const basePrice = selectedGround.base_price_per_hour;
    const custom = Object.prototype.hasOwnProperty.call(slotPriceByStartTime, startTime)
      ? slotPriceByStartTime[startTime]
      : undefined;
    const pricePerHour = custom == null ? basePrice : custom;
    const _sanity = hoursBetweenBooked(startTime, derivedEndTime);
    if (_sanity === null || !Number.isFinite(_sanity) || _sanity <= 0) return null;

    const totalHours = _sanity;
    const totalAmount = Math.round(totalHours * pricePerHour * 100) / 100;

    return { totalHours, totalAmount, pricePerUnit: pricePerHour, unitLabel: 'hour' as const };
  }, [selectedGround, startTime, derivedEndTime, slotPriceByStartTime, isBoxCricket, teamType]);

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
      setAllStartHHMM(new Set());
      setSlotPriceByStartTime({});
      setEndTimeByStartTime({});
      return;
    }

    const parsed = parseISODate(bookingDate);
    if (!parsed) {
      setAllowedStartHHMM(new Set());
      setAllStartHHMM(new Set());
      setSlotPriceByStartTime({});
      setEndTimeByStartTime({});
      return;
    }

    const dow = getDayOfWeek(parsed) as any;

    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from('time_slots')
        .select('start_time, end_time, custom_price, is_available')
        .eq('ground_id', selectedGround.id)
        .eq('day_of_week', dow)
        .order('start_time', { ascending: true });

      if (cancelled) return;
      if (error) {
        console.warn('time_slots availability load failed', error);
        setAllowedStartHHMM(new Set());
        setAllStartHHMM(new Set());
        setSlotPriceByStartTime({});
        setEndTimeByStartTime({});
        return;
      }

      const nextAllowed = new Set<string>();
      const nextAll = new Set<string>();
      const nextPrices: Record<string, number | null> = {};
      const nextEnds: Record<string, string> = {};
      (data ?? []).forEach((row: any) => {
        const hh = normalizeDbTimeToHHMM(row.start_time);
        if (!hh) return;
        nextAll.add(hh);
        // Only allow booking for slots marked as available.
        if (row.is_available) nextAllowed.add(hh);

        nextPrices[hh] = row.custom_price ?? null;

        const endHHMM = normalizeDbTimeToHHMM(row.end_time);
        if (endHHMM) nextEnds[hh] = endHHMM;
      });

      setAllowedStartHHMM(nextAllowed);
      setAllStartHHMM(nextAll);
      setSlotPriceByStartTime(nextPrices);
      setEndTimeByStartTime(nextEnds);
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
      const fromSelectedGround =
        !!selectedGround?.id && allStartHHMM.size
          ? Array.from(allStartHHMM.values())
              .sort((a, b) => {
                const am = parseTimeToMinutes(a) ?? 0;
                const bm = parseTimeToMinutes(b) ?? 0;
                return am - bm;
              })
              .map((hhmm) => ({
                value: hhmm as TimeString,
                label: hhmm,
              }))
          : null;

      const fromSearchUnion =
        useLandingSearchFlow && !selectedGround?.id && searchAllStartHHMM.size
          ? Array.from(searchAllStartHHMM.values())
              .sort((a, b) => {
                const am = parseTimeToMinutes(a) ?? 0;
                const bm = parseTimeToMinutes(b) ?? 0;
                return am - bm;
              })
              .map((hhmm) => ({
                value: hhmm as TimeString,
                label: hhmm,
              }))
          : null;

      const baseFromDb = fromSelectedGround ?? fromSearchUnion;
      const base = baseFromDb ?? timeSlots;
      let list = base.filter((s) => !bookedStartHHMM.has(s.value));
      if (
        useLandingSearchFlow &&
        !selectedGround?.id &&
        searchStartTimesWithCapacity !== undefined
      ) {
        list = list.filter((s) => searchStartTimesWithCapacity.has(s.value));
      }
      return list;
    },
    [
      timeSlots,
      bookedStartHHMM,
      allowedStartHHMM,
      allStartHHMM,
      searchAllowedStartHHMM,
      searchAllStartHHMM,
      searchStartTimesWithCapacity,
      selectedGround?.id,
      useLandingSearchFlow,
    ],
  );

  useEffect(() => {
    if (useLandingSearchFlow) return;
    if (!availableTimeSlots.length) return;
    if (availableTimeSlots.some((s) => s.value === startTime)) return;

    // Prefer first AVAILABLE slot (is_available = true), not just the first DB slot.
    const firstAllowed = availableTimeSlots.find((s) => allowedStartHHMM.has(s.value));
    if (firstAllowed) {
      setStartTime(firstAllowed.value as TimeString);
    } else {
      // If no slots are currently available, keep `startTime` empty so booking can't proceed.
      setStartTime('');
    }
  }, [useLandingSearchFlow, availableTimeSlots, startTime, allowedStartHHMM]);

  /** Landing: if type/date changes and the previous slot is no longer valid, clear it. */
  useEffect(() => {
    if (!useLandingSearchFlow || !startTime) return;
    if (!availableTimeSlots.length) return;
    if (availableTimeSlots.some((s) => s.value === startTime)) return;
    setStartTime('');
  }, [useLandingSearchFlow, availableTimeSlots, startTime]);

  const isWeb = Platform.OS === 'web';
  const webColumnCount =
    !isWeb ? 1 : windowWidth >= 960 ? 3 : windowWidth >= 640 ? 2 : 1;
  const isSearchTwoColumn = isWeb && windowWidth >= 900;

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

  const upcomingDates = useMemo(() => {
    const today = new Date();
    const items: { iso: string; label: string; weekdayShort: string }[] = [];
    const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const end = new Date(start.getFullYear(), start.getMonth() + 3, start.getDate());

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const iso = formatISODate(d);
      const label = d.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
      });
      const weekdayFull = d.toLocaleDateString('en-IN', { weekday: 'short' });
      const weekdayShort = weekdayFull.slice(0, 3);
      items.push({ iso, label, weekdayShort });
    }

    return items;
  }, []);

  const [datePage, setDatePage] = useState(0);
  const datePageSize = useMemo(() => {
    if (windowWidth >= 1440) return 15;
    if (windowWidth >= 1200) return 13;
    if (windowWidth >= 1024) return 11;
    if (windowWidth >= 768) return 9;
    if (windowWidth >= 640) return 7;
    return 5;
  }, [windowWidth]);

  const { visibleDates, hasPrevDates, hasNextDates } = useMemo(() => {
    const total = upcomingDates.length;
    const maxPage = Math.max(0, Math.ceil(total / datePageSize) - 1);
    const safePage = Math.min(Math.max(datePage, 0), maxPage);
    const start = safePage * datePageSize;
    const end = start + datePageSize;
    return {
      visibleDates: upcomingDates.slice(start, end),
      hasPrevDates: safePage > 0,
      hasNextDates: safePage < maxPage,
    };
  }, [upcomingDates, datePage, datePageSize]);

  function InlineDropdown({
    value,
    options,
    onChange,
    label,
    disabled,
    open: openControlled,
    onOpenChange,
    groundPageDropdown,
    bookGroundNative = false,
  }: {
    value: string;
    options: { key: string; label: string }[];
    onChange: (k: string) => void;
    label: string;
    disabled?: boolean;
    /** When set, menu open state is fully controlled by the parent. */
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    /** Ground detail: #043529 field + #02c259 border/text. */
    groundPageDropdown?: boolean;
    /** Book a ground tab (native): tan text/borders instead of white. */
    bookGroundNative?: boolean;
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
            groundPageDropdown && styles.dropdownButtonGroundPage,
            bookGroundNative && !groundPageDropdown && styles.dropdownButtonBookGroundNative,
            open &&
              (groundPageDropdown ? styles.dropdownButtonOpenGroundPage : styles.dropdownButtonOpen),
            !!value && !disabled &&
              (groundPageDropdown
                ? styles.dropdownButtonSelectedGroundPage
                : styles.dropdownButtonSelected),
            disabled &&
              (groundPageDropdown
                ? styles.dropdownButtonDisabledGroundPage
                : bookGroundNative
                  ? styles.dropdownButtonDisabledBookGroundNative
                  : styles.dropdownButtonDisabled),
          ]}
        >
          <Text
            style={[
              styles.dropdownButtonText,
              groundPageDropdown && styles.dropdownButtonTextGroundPage,
              bookGroundNative &&
                !groundPageDropdown &&
                styles.dropdownButtonTextBookGroundNative,
              !!value &&
                !disabled &&
                (groundPageDropdown
                  ? styles.dropdownButtonTextSelectedGroundPage
                  : styles.dropdownButtonTextSelected),
              disabled &&
                (groundPageDropdown
                  ? styles.dropdownButtonTextDisabledGroundPage
                  : bookGroundNative
                    ? styles.dropdownButtonTextDisabledBookGroundNative
                    : styles.dropdownButtonTextDisabled),
            ]}
          >
            {selectedLabel || label}
          </Text>
        </Pressable>

        {open && !disabled ? (
          <View
            style={[styles.dropdownMenu, groundPageDropdown && styles.dropdownMenuGroundPage]}
          >
            {options.map((opt) => (
              <Pressable
                key={opt.key}
                onPress={() => {
                  onChange(opt.key);
                  setOpenNotify(false);
                }}
                style={[
                  styles.dropdownOption,
                  opt.key === value &&
                    (groundPageDropdown
                      ? styles.dropdownOptionActiveGroundPage
                      : styles.dropdownOptionActive),
                ]}
              >
                <Text
                  style={[
                    styles.dropdownOptionText,
                    groundPageDropdown && styles.dropdownOptionTextGroundPage,
                    bookGroundNative &&
                      !groundPageDropdown &&
                      styles.dropdownOptionTextBookGroundNative,
                    opt.key === value &&
                      (groundPageDropdown
                        ? styles.dropdownOptionTextActiveGroundPage
                        : styles.dropdownOptionTextActive),
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

  /** Availability filtering runs only when both date and start time are chosen. */
  const wantsSlotFilter = !!(bookingDate && startTime);

  const canRunSearch = useMemo(() => {
    if (!locationKey || !typeKey || loadingGrounds) return false;
    if (!wantsSlotFilter) return true;

    const timeIsValidSlot = availableTimeSlots.some((s) => s.value === startTime);
    const slotIsAvailableForSearch =
      useLandingSearchFlow && !selectedGround?.id
        ? searchAllowedStartHHMM.has(startTime)
        : true;
    return timeIsValidSlot && slotIsAvailableForSearch && availableTimeSlots.length > 0;
  }, [
    locationKey,
    typeKey,
    loadingGrounds,
    wantsSlotFilter,
    bookingDate,
    startTime,
    availableTimeSlots,
    useLandingSearchFlow,
    selectedGround?.id,
    searchAllowedStartHHMM,
  ]);

  const groundSelectedFromSearch = useMemo(() => {
    if (!useLandingSearchFlow || !selectedGroundId || !hasSearched) return false;
    return searchResults.some((g) => g.id === selectedGroundId);
  }, [useLandingSearchFlow, selectedGroundId, hasSearched, searchResults]);

  const handleSearch = async () => {
    if (!canRunSearch) {
      Alert.alert(
        'Missing details',
        wantsSlotFilter
          ? 'Please choose location, type, date, and a valid start time.'
          : 'Please choose location and ground type.',
      );
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

    // Browse: list all grounds for location + type (no availability filter).
    if (!wantsSlotFilter) {
      setHasSearched(true);
      setSelectedGroundId(null);
      setSearchSlotPriceByGroundId({});
      setSearchResults(candidates);
      return;
    }

    setSearching(true);
    setHasSearched(true);
    setSelectedGroundId(null);
    setSearchSlotPriceByGroundId({});
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
      let nextResults: GroundWithImages[] = [];
      if (!error && allowed.size > 0) {
        nextResults = candidates.filter((g) => allowed.has(g.id));
      } else {
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
        nextResults = fallbackAvailable;
      }

      setSearchResults(nextResults);

      // Load custom price for the chosen slot per ground so cards can display it.
      try {
        if (!nextResults.length) {
          setSearchSlotPriceByGroundId({});
        } else {
          const parsedDate = parseISODate(bookingDate);
          if (!parsedDate) {
            setSearchSlotPriceByGroundId({});
          } else {
            const dow = getDayOfWeek(parsedDate) as any;
            const { data: slotRows, error: slotErr } = await supabase
              .from('time_slots')
              .select('ground_id, start_time, custom_price')
              .in(
                'ground_id',
                nextResults.map((g) => g.id),
              )
              .eq('day_of_week', dow)
              .eq('is_available', true)
              .eq('start_time', `${startTime}:00`);

            if (slotErr) {
              console.warn('landing search slot prices load failed', slotErr);
              setSearchSlotPriceByGroundId({});
            } else {
              const map: Record<string, number | null> = {};
              (slotRows ?? []).forEach((row: any) => {
                if (!row?.ground_id) return;
                map[row.ground_id] = row.custom_price ?? null;
              });
              setSearchSlotPriceByGroundId(map);
            }
          }
        }
      } catch (e) {
        console.warn('landing search slot prices unexpected error', e);
        setSearchSlotPriceByGroundId({});
      }
    } finally {
      setSearching(false);
    }
  };

  handleSearchRef.current = handleSearch;

  /** Native: restore booking form draft after returning from login (see `handleBook` when !user). */
  useEffect(() => {
    if (Platform.OS === 'web') return;
    if (loadingGrounds) return;

    let cancelled = false;
    (async () => {
      const draft = await peekPendingBookingDraft();
      if (cancelled || !draft) return;

      if (draft.landing && useLandingSearchFlow) {
        await clearPendingBookingDraft();
        const L = draft.landing;
        setLocationKey(L.locationKey);
        setTypeKey(L.typeKey);
        setBookingDate(L.bookingDate);
        setStartTime(L.startTime as TimeString);
        setTeamType(L.teamType);
        if (L.hadCompletedSearch) {
          pendingPostLoginSearchRef.current = true;
          pendingReselectGroundIdRef.current = L.selectedGroundId;
        } else if (L.selectedGroundId) {
          setSelectedGroundId(L.selectedGroundId);
        }
        return;
      }

      if (draft.groundDetail && initialGroundId && draft.groundDetail.groundId === initialGroundId) {
        await clearPendingBookingDraft();
        const g = draft.groundDetail;
        if (g.bookingDate) setBookingDate(g.bookingDate);
        if (g.startTime) setStartTime(g.startTime as TimeString);
        setTeamType(g.teamType);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [loadingGrounds, useLandingSearchFlow, initialGroundId]);

  useEffect(() => {
    if (!pendingPostLoginSearchRef.current) return;
    if (!useLandingSearchFlow) return;
    if (loadingGrounds) return;
    if (!locationKey || !typeKey) return;
    if (!canRunSearch) return;
    pendingPostLoginSearchRef.current = false;
    void handleSearchRef.current();
  }, [useLandingSearchFlow, loadingGrounds, locationKey, typeKey, canRunSearch]);

  useEffect(() => {
    const id = pendingReselectGroundIdRef.current;
    if (!id) return;
    if (!searchResults.some((g) => g.id === id)) return;
    setSelectedGroundId(id);
    pendingReselectGroundIdRef.current = null;
  }, [searchResults]);

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

      if (Platform.OS !== 'web') {
        try {
          if (useLandingSearchFlow) {
            await savePendingBookingDraft({
              landing: {
                locationKey,
                typeKey,
                bookingDate,
                startTime,
                teamType,
                selectedGroundId,
                hadCompletedSearch: hasSearched,
              },
            });
          } else if (initialGroundId) {
            await savePendingBookingDraft({
              groundDetail: {
                groundId: initialGroundId,
                bookingDate,
                startTime,
                teamType,
              },
            });
          }
        } catch (e) {
          console.warn('pending booking draft', e);
        }

        const buildLoginReturnRoute = (): string => {
          if (useLandingSearchFlow) {
            return separateSearchResults ? '/book-my-ground' : '/(tabs)/grounds';
          }
          if (initialGroundId && selectedGround) {
            const q = new URLSearchParams();
            if (bookingDate) q.set('date', bookingDate);
            if (startTime) q.set('time', startTime);
            if (!isBoxCricket) q.set('teams', teamType);
            const qs = q.toString();
            return `${makeGroundPath(selectedGround)}${qs ? `?${qs}` : ''}`;
          }
          if (initialGroundId) {
            const q = new URLSearchParams();
            if (bookingDate) q.set('date', bookingDate);
            if (startTime) q.set('time', startTime);
            if (!isBoxCricket) q.set('teams', teamType);
            const qs = q.toString();
            return `/grounds/${encodeURIComponent(initialGroundId)}${qs ? `?${qs}` : ''}`;
          }
          return '/(tabs)/grounds';
        };

        const loginUrl = `/(auth)/login?redirect=${encodeURIComponent(buildLoginReturnRoute())}`;
        router.push(loginUrl as any);
        return;
      }

      // Web: preserve selection via redirect URL when possible.
      const targetGroundId = initialGroundId ?? selectedGroundId;
      if (targetGroundId && bookingDate && startTime) {
        const redirectPath = `/grounds/${encodeURIComponent(targetGroundId)}`;
        const params = new URLSearchParams();
        params.set('date', bookingDate);
        params.set('time', startTime);
        if (!isBoxCricket) {
          params.set('teams', teamType);
        }
        const redirect = `${redirectPath}?${params.toString()}`;
        const loginUrl = `/(auth)/login?redirect=${encodeURIComponent(redirect)}`;
        router.push(loginUrl as any);
      } else {
        router.push('/(auth)/login' as any);
      }
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
        : isBoxCricket
        ? selectedGround.base_price_per_hour
        : // For cricket grounds, store per-match price in price_per_hour column.
          (computed?.pricePerUnit ?? 0);

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
          notes: isBoxCricket
            ? null
            : teamType === 'one'
              ? 'Teams: 1 Team'
              : 'Teams: Both Teams',
          status: 'confirmed',
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

  const showSearchResults = useLandingSearchFlow && hasSearched;

  const searchResultsBody = showSearchResults ? (
    <>
      <Text
        style={[
          separateSearchResults ? styles.labelOnWhite : styles.label,
          bookGroundScreenNative &&
            !isWeb &&
            !separateSearchResults &&
            styles.labelBookGroundNative,
        ]}
      >
        Available grounds
      </Text>
      {searching ? (
        <ActivityIndicator
          style={styles.searchSpinner}
          color="#10b981"
        />
      ) : null}

      {searchResults.length > 0 ? (
        <View style={styles.searchResultsScroller}>
          <View
            style={[
              styles.searchResultsGrid,
              isSearchTwoColumn && styles.searchResultsGridTwoCol,
            ]}
          >
            {searchResults.map((g) => {
              const isBox = String(g.pitch_type ?? '').toLowerCase().includes('box');
              const slotCustom =
                Object.prototype.hasOwnProperty.call(searchSlotPriceByGroundId, g.id) &&
                searchSlotPriceByGroundId[g.id] != null
                  ? searchSlotPriceByGroundId[g.id]!
                  : null;

              let displayPricePerUnit: number | null = null;
              let unitLabelOverride: string | undefined;

              if (isBox) {
                const base = g.base_price_per_hour ?? 0;
                const perHour = slotCustom != null ? slotCustom : base;
                displayPricePerUnit = perHour;
                unitLabelOverride = '/hr';
              } else {
                const baseBothTeams =
                  slotCustom != null ? slotCustom : g.base_price_per_hour ?? 0;
                const perMatch =
                  teamType === 'one'
                    ? Math.round((baseBothTeams / 2) * 100) / 100
                    : baseBothTeams;
                displayPricePerUnit = perMatch;
                unitLabelOverride = ' / match';
              }

              return (
                <View
                  key={g.id}
                  style={[
                    styles.searchResultTile,
                    isSearchTwoColumn && styles.searchResultTileHalf,
                  ]}
                >
                  <GroundCard
                    ground={g}
                    displayPricePerUnit={displayPricePerUnit}
                    unitLabelOverride={unitLabelOverride}
                    onPress={() => {
                      const query: string[] = [];
                      if (bookingDate) {
                        query.push(`date=${encodeURIComponent(bookingDate)}`);
                      }
                      if (startTime) {
                        query.push(`time=${encodeURIComponent(startTime)}`);
                      }
                      const suffix = query.length ? `?${query.join('&')}` : '';
                      router.push(`${makeGroundPath(g)}${suffix}` as any);
                    }}
                    showBookingSchedule={false}
                  />
                </View>
              );
            })}
          </View>
        </View>
      ) : !searching ? (
        <Text style={separateSearchResults ? styles.smallMutedOnWhite : styles.smallMuted}>
          {wantsSlotFilter
            ? 'No grounds have this slot free. Try another time or date.'
            : 'No grounds match your search.'}
        </Text>
      ) : null}
    </>
  ) : null;

  const fieldLabelStyle = [
    styles.label,
    bookGroundScreenNative && !isWeb && styles.labelBookGroundNative,
    groundPageAccent && !isWeb && styles.labelBookGroundNative,
  ];

  const isCompact = windowWidth < 900;
  const nativeTanChrome =
    (bookGroundScreenNative || groundPageAccent) && (!isWeb || isCompact);

  const formFields = (
    <>
      {!hideGroundPicker && (
        <View style={[styles.section, webGridSectionStyle, webSingleColumnStyle]}>
          <Text style={fieldLabelStyle}>Ground</Text>
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
        <Text style={fieldLabelStyle}>Location</Text>
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
          groundPageDropdown={groundPageAccent}
          bookGroundNative={nativeTanChrome}
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
        <Text style={fieldLabelStyle}>Type</Text>
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
          groundPageDropdown={groundPageAccent}
          bookGroundNative={nativeTanChrome}
        />
      </View>

      {!isBoxCricket ? (
        <View style={[styles.section, webGridSectionStyle, webSingleColumnStyle]}>
          <Text style={fieldLabelStyle}>Teams</Text>
          <View style={styles.teamToggle}>
            <Pressable
              onPress={() => {
                setTeamType('one');
                if (useLandingSearchFlow) clearSearchState();
              }}
              style={[
                styles.teamToggleOption,
                nativeTanChrome && styles.teamToggleOptionBookGroundNative,
                teamType === 'one' && styles.teamToggleOptionActive,
              ]}
            >
              <Text
                style={[
                  styles.teamToggleText,
                  nativeTanChrome && styles.teamToggleTextBookGroundNative,
                  teamType === 'one' && styles.teamToggleTextActive,
                ]}
              >
                1 Team
              </Text>
            </Pressable>
            <Pressable
              disabled={hideBothTeamsOption}
              onPress={() => {
                setTeamType('both');
                if (useLandingSearchFlow) clearSearchState();
              }}
              style={[
                styles.teamToggleOption,
                nativeTanChrome && styles.teamToggleOptionBookGroundNative,
                hideBothTeamsOption && styles.teamToggleOptionDisabled,
                teamType === 'both' && !hideBothTeamsOption && styles.teamToggleOptionActive,
              ]}
            >
              <Text
                style={[
                  styles.teamToggleText,
                  nativeTanChrome && styles.teamToggleTextBookGroundNative,
                  teamType === 'both' && !hideBothTeamsOption && styles.teamToggleTextActive,
                  hideBothTeamsOption && styles.teamToggleTextDisabled,
                ]}
              >
                Both Teams
              </Text>
            </Pressable>
          </View>
          {hideBothTeamsOption ? (
            <Text style={styles.teamToggleHint}>
              One team slot is already booked for this time — only a single-team booking is available.
            </Text>
          ) : null}
        </View>
      ) : null}

      <View
        style={[
          styles.section,
          webGridSectionStyle,
          webSingleColumnStyle,
          webFullSpanStyle,
        ]}
      >
        <Text style={fieldLabelStyle}>Date</Text>

        {/*
         * Web: use paged slices (`visibleDates`) with arrow buttons.
         * Native: show full 3‑month range (`upcomingDates`) in a horizontal scroller.
         */}
        {(() => {
          const webDates = visibleDates;
          const nativeDates = upcomingDates;
          const datesForWeb = webDates;
          const datesForNative = nativeDates;

          if (isWeb && !isCompact) {
            return (
              <View style={styles.datePagerRow}>
                <Pressable
                  onPress={() => {
                    if (!hasPrevDates) return;
                    setDatePage((p) => Math.max(0, p - 1));
                  }}
                  style={[
                    styles.dateArrowButton,
                    !hasPrevDates && styles.dateArrowButtonDisabled,
                  ]}
                >
                  <Text
                    style={[
                      styles.dateArrowText,
                      !hasPrevDates && styles.dateArrowTextDisabled,
                    ]}
                  >
                    {'<'}
                  </Text>
                </Pressable>

                <View style={styles.dateChipsWrap}>
                  {datesForWeb.map((d) => {
                    const isSelected = bookingDate === d.iso;
                    return (
                      <Pressable
                        key={d.iso}
                        onPress={() => {
                          if (useLandingSearchFlow) {
                            clearSearchState();
                            setStartTime('' as TimeString);
                          }
                          setBookingDate(d.iso);
                        }}
                        style={[
                          styles.dateChip,
                          isSelected && styles.dateChipActive,
                        ]}
                      >
                        <View style={styles.dateChipInner}>
                          <Text
                            style={[
                              styles.dateChipText,
                              isSelected && styles.dateChipTextActive,
                            ]}
                          >
                            {d.label}
                          </Text>
                          <Text
                            style={[
                              styles.dateChipWeekday,
                              isSelected && styles.dateChipWeekdayActive,
                            ]}
                          >
                            {d.weekdayShort}
                          </Text>
                        </View>
                      </Pressable>
                    );
                  })}
                </View>

                <Pressable
                  onPress={() => {
                    if (!hasNextDates) return;
                    setDatePage((p) => p + 1);
                  }}
                  style={[
                    styles.dateArrowButton,
                    !hasNextDates && styles.dateArrowButtonDisabled,
                  ]}
                >
                  <Text
                    style={[
                      styles.dateArrowText,
                      !hasNextDates && styles.dateArrowTextDisabled,
                    ]}
                  >
                    {'>'}
                  </Text>
                </Pressable>
              </View>
            );
          }

          return (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.dateChipsScrollContent}
              style={styles.dateScrollNative}
            >
              {datesForNative.map((d) => {
                const isSelected = bookingDate === d.iso;
                return (
                  <Pressable
                    key={d.iso}
                    onPress={() => {
                      if (useLandingSearchFlow) {
                        clearSearchState();
                        setStartTime('' as TimeString);
                      }
                      setBookingDate(d.iso);
                    }}
                    style={[
                      styles.dateChip,
                      styles.dateChipMobile,
                      nativeTanChrome && styles.dateChipBorderBookGroundNative,
                      isSelected && styles.dateChipActive,
                    ]}
                  >
                    <View style={styles.dateChipInner}>
                      <Text
                        style={[
                          styles.dateChipText,
                          styles.dateChipTextMobile,
                          nativeTanChrome && styles.dateChipTextBookGroundNative,
                          isSelected && styles.dateChipTextActive,
                        ]}
                      >
                        {d.label}
                      </Text>
                      <Text
                        style={[
                          styles.dateChipWeekday,
                          styles.dateChipWeekdayMobile,
                          nativeTanChrome && styles.dateChipWeekdayBookGroundNative,
                          isSelected && styles.dateChipWeekdayActive,
                        ]}
                      >
                        {d.weekdayShort}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </ScrollView>
          );
        })()}
      </View>

      <View style={[styles.section, webSingleColumnStyle, webFullSpanStyle]}>
        <Text style={fieldLabelStyle}>Start Time</Text>

        {isWeb && !isCompact ? (
          <View style={[styles.timeSlotsWrap, isBoxCricket && styles.timeSlotsWrapBox]}>
            {!timeSlots.length ? (
              <Text style={styles.smallMuted}>Select a ground type to see time slots.</Text>
            ) : !availableTimeSlots.length ? (
              <Text style={styles.smallMuted}>All slots are booked for this date.</Text>
            ) : (
              availableTimeSlots.map((s) => {
                const active = s.value === startTime;
                const slotIsAvailable = selectedGround?.id
                  ? allowedStartHHMM.has(s.value)
                  : searchAllowedStartHHMM.has(s.value);
                return (
                  <Pressable
                    key={s.value}
                    disabled={submitting || !slotIsAvailable}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active, disabled: submitting || !slotIsAvailable }}
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
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.timeSlotsScrollContent}
          >
            {!timeSlots.length ? (
              <Text style={styles.smallMuted}>Select a ground type to see time slots.</Text>
            ) : !availableTimeSlots.length ? (
              <Text style={styles.smallMuted}>All slots are booked for this date.</Text>
            ) : (
              availableTimeSlots.map((s) => {
                const active = s.value === startTime;
                const slotIsAvailable = selectedGround?.id
                  ? allowedStartHHMM.has(s.value)
                  : searchAllowedStartHHMM.has(s.value);
                return (
                  <Pressable
                    key={s.value}
                    disabled={submitting || !slotIsAvailable}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active, disabled: submitting || !slotIsAvailable }}
                    accessibilityLabel={`${s.label} time slot`}
                    onPress={() => {
                      if (useLandingSearchFlow) clearSearchState();
                      setStartTime(s.value as TimeString);
                    }}
                    style={({ pressed }) => [
                      styles.timeSlotChip,
                      styles.timeSlotChipMobile,
                      isBoxCricket && styles.timeSlotChipDense,
                      nativeTanChrome && styles.timeSlotChipBorderBookGroundNative,
                      active && styles.timeSlotChipActive,
                      pressed &&
                        !active &&
                        (nativeTanChrome
                          ? styles.timeSlotChipPressedBookGroundNative
                          : styles.timeSlotChipPressed),
                    ]}
                  >
                    <Text
                      style={[
                        styles.timeSlotText,
                        styles.timeSlotTextMobile,
                        nativeTanChrome && styles.timeSlotTextBookGroundNative,
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
          </ScrollView>
        )}
      </View>

      {!separateSearchResults && searchResultsBody ? (
        <View style={[styles.section, webFullSpanStyle, styles.searchResultsSection]}>
          {searchResultsBody}
        </View>
      ) : null}
    </>
  );

  const ContainerComponent: React.ComponentType<any> =
    !isWeb && noCard ? View : Card;
  const mainCardStyle = [
    styles.card,
    isWeb && styles.cardWeb,
    fullWidth && !isWeb && styles.cardNativeFull,
    !isWeb && noCard && styles.cardPlainNative,
    !isWeb && noCard && bookGroundScreenNative && styles.cardPlainNativeBookGround,
    !isWeb && noCard && groundPageAccent && styles.cardPlainGroundPage,
    fullWidth && !isWeb && groundPageAccent && !noCard && styles.cardGroundPageNative,
  ];

  return (
    <View
      style={[
        styles.wrapper,
        fullWidth && isWeb && styles.wrapperFull,
        fullWidth && !isWeb && styles.wrapperNativeFull,
        fullWidth && !isWeb && bookGroundScreenNative && styles.wrapperBookGroundScreenNative,
        fullWidth && !isWeb && groundPageAccent && styles.groundPageFormWrapperNative,
        isWeb && windowWidth < 640 && styles.wrapperMobileTight,
      ]}
    >
      <ContainerComponent style={mainCardStyle}>
        {!hideTitle && (
          <Text style={[styles.title, (!isWeb || isCompact) && styles.titleMobile]}>Book a Ground</Text>
        )}
        {isWeb && (
          <Text style={styles.subtitle}>
            {hideGroundPicker
              ? useLandingSearchFlow
                ? 'Choose location and type to search. Optionally add date and time to filter by an open slot.'
                : 'Choose location, ground type, date, and time to request your booking.'
              : 'Pick a ground and time slot to request your booking.'}
          </Text>
        )}

        {isWeb && !isCompact ? (
          <View style={styles.formFieldsWeb}>{formFields}</View>
        ) : isWeb ? (
          <View style={styles.formFieldsNative}>{formFields}</View>
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
          <View
            style={[
              styles.summary,
              groundPageAccent && !isWeb && styles.summaryGroundPageMobile,
            ]}
          >
            <Text
              style={[
                styles.summaryText,
                groundPageAccent && !isWeb && styles.summaryTextGroundMobile,
              ]}
            >
              Total:{' '}
              <Text
                style={[
                  styles.summaryAccent,
                  groundPageAccent && !isWeb && styles.summaryAccentGroundMobile,
                ]}
              >
                {formatCurrency(computed.totalAmount)}
              </Text>
            </Text>
            <Text
              style={[
                styles.summaryMuted,
                groundPageAccent && !isWeb && styles.summaryMutedGroundMobile,
              ]}
            >
              {isBoxCricket
                ? `Duration: ${computed.totalHours} hours @ ${formatCurrency(
                    computed.pricePerUnit,
                  )}/hr`
                : `Cricket ground: ${
                    teamType === 'one' ? '1 team' : 'both teams'
                  } · ${formatCurrency(computed.pricePerUnit)} per match`}
            </Text>
          </View>
        )}

        <View
          style={[
            styles.actions,
            groundPageAccent && !isWeb && styles.actionsGroundPageNative,
          ]}
        >
          {useLandingSearchFlow ? (
            groundSelectedFromSearch ? (
              <View style={styles.actionsColumn}>
                <Button
                  title={submitting ? 'Processing...' : 'Book Now'}
                  onPress={handleBook}
                  disabled={submitting}
                  loading={submitting}
                  fullWidth
                  size="large"
                  style={nativeTanChrome ? { backgroundColor: '#10b981' } : undefined}
                  textStyle={nativeTanChrome ? styles.bookNowPrimaryButtonText : undefined}
                  loadingIndicatorColor={nativeTanChrome ? '#043529' : undefined}
                />
                <Pressable
                  onPress={() => setSelectedGroundId(null)}
                  style={styles.changeGroundPress}
                  disabled={submitting}
                >
                  <Text style={styles.changeGroundText}>Choose a different ground</Text>
                </Pressable>
              </View>
            ) : !hasSearched || searchResults.length === 0 ? (
              <Button
                title="Search"
                onPress={handleSearch}
                disabled={submitting || searching || !canRunSearch}
                loading={searching}
                fullWidth
                size="large"
                style={styles.searchButtonAlignedHeight}
                textStyle={nativeTanChrome ? styles.bookGroundNativeButtonText : undefined}
                loadingIndicatorColor={nativeTanChrome ? '#043529' : undefined}
              />
            ) : null
          ) : (
            <Button
              title={submitting ? 'Processing...' : 'Book Now'}
              onPress={handleBook}
              disabled={submitting}
              loading={submitting}
              fullWidth
              size={groundPageAccent && !isWeb ? 'small' : 'large'}
              style={
                groundPageAccent || nativeTanChrome ? { backgroundColor: '#10b981' } : undefined
              }
              textStyle={
                groundPageAccent || nativeTanChrome
                  ? styles.bookNowPrimaryButtonText
                  : undefined
              }
              loadingIndicatorColor={
                groundPageAccent || nativeTanChrome ? '#043529' : undefined
              }
            />
          )}
        </View>
      </ContainerComponent>

      {separateSearchResults && searchResultsBody ? (
        <Card style={[styles.searchResultsCard, isWeb && styles.cardWeb]}>
          <Text style={styles.searchResultsTitle}>Search results</Text>
          <Text style={styles.searchResultsSubtitle}>
            Grounds that match your location, type, and optional date and time.
          </Text>
          {searchResultsBody}
        </Card>
      ) : null}
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
  wrapperFull: {
    ...Platform.select({
      web: {
        maxWidth: '100%',
        alignSelf: 'stretch',
      },
    }),
  },
  /** Native-only: when `fullWidth` and rendered in dedicated booking screens, stretch to fill. */
  wrapperNativeFull: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#043529',
    paddingHorizontal: 8,
    paddingBottom: 24,
  },
  /** Native Book a Ground stack: align form to top; 8px below nav area (see MobileAppNavbar). */
  wrapperBookGroundScreenNative: {
    justifyContent: 'flex-start',
    paddingTop: 8,
  },
  wrapperMobileTight: {
    paddingHorizontal: 8,
  },
  card: {
    backgroundColor: '#043529',
    borderRadius: 14,
    padding: 16,
    marginTop: 0,
  },
  /** Native-only full-screen card (no rounding, no side margins). */
  cardNativeFull: {
    alignSelf: 'stretch',
  },
  cardWeb: {
    overflow: 'visible',
  },
  /** Ground detail with Card wrapper (e.g. `/grounds/[id]`): remove extra space under Book Now. */
  cardGroundPageNative: {
    paddingBottom: 0,
  },
  /** Native-only plain wrapper when `noCard` is true (e.g. /book-my-ground). */
  cardPlainNative: {
    backgroundColor: 'transparent',
    borderRadius: 0,
    paddingHorizontal: 8,
    paddingTop: 12,
    paddingBottom: 16,
  },
  /** Slightly tighter top padding when pinned to top (book-my-ground / Grounds tab). */
  cardPlainNativeBookGround: {
    paddingTop: 8,
  },
  /** Ground detail native: flush booking block to bottom of scroll. */
  cardPlainGroundPage: {
    paddingBottom: 0,
  },
  /** Override `wrapperNativeFull` flex/center so the strip does not stretch with empty space below the CTA. */
  groundPageFormWrapperNative: {
    paddingBottom: 0,
    flex: 0,
    flexGrow: 0,
    justifyContent: 'flex-start',
    alignItems: 'stretch',
    alignSelf: 'stretch',
    width: '100%',
  },
  actionsGroundPageNative: {
    marginBottom: 0,
    paddingBottom: 0,
  },
  title: {
    fontSize: 20,
    fontWeight: '400',
    fontFamily: 'Inter',
    color: '#F9FAFB',
    marginBottom: 4,
  },
  /** Native-only title accent colour. */
  titleMobile: {
    color: '#02c259',
  },
  subtitle: {
    fontSize: 14,
    fontFamily: 'Inter',
    color: '#E5E7EB',
    marginBottom: 12,
  },
  authRequired: {
    marginBottom: 16,
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(6,57,46,0.12)', // #06392e
  },
  authTitle: {
    fontSize: 16,
    fontWeight: '400',
    fontFamily: 'Inter',
    color: '#043529',
    marginBottom: 4,
  },
  authText: {
    fontSize: 13,
    fontFamily: 'Inter',
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
    fontWeight: '400',
    fontFamily: 'Inter',
    color: '#E5E7EB',
    marginBottom: 6,
  },
  /** Book-a-ground native screen: field headings match neon green section labels. */
  labelBookGroundNative: {
    fontSize: 11,
    fontWeight: '800',
    color: '#9ca3af',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 6,
  },
  /** `separateSearchResults` — heading on light card (e.g. /book-my-ground). */
  labelOnWhite: {
    fontSize: 12,
    fontWeight: '400',
    fontFamily: 'Inter',
    color: '#E5E7EB',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#00ea6b',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 10,
    minHeight: 44,
    fontSize: 14,
    fontFamily: 'Inter',
    backgroundColor: '#06392e',
    color: '#F9FAFB',
  },
  inputWide: {
    width: '100%',
    minWidth: 200,
    alignSelf: 'stretch',
  },
  inputDisabled: {
    borderWidth: 1,
    borderColor: '#64748B',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 10,
    minHeight: 44,
    fontSize: 14,
    fontFamily: 'Inter',
    backgroundColor: '#022c22',
    color: '#9CA3AF',
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
    borderColor: 'rgba(0,234,107,0.15)',
    backgroundColor: '#06392e',
  },
  groundChipActive: {
    borderColor: '#00ea6b',
    backgroundColor: 'rgba(0,234,107,0.12)',
  },
  groundChipText: {
    fontSize: 13,
    fontWeight: '400',
    fontFamily: 'Inter',
    color: '#374151',
  },
  groundChipTextActive: {
    color: '#00ea6b',
  },
  teamToggle: {
    flexDirection: 'row',
    gap: 10,
  },
  teamToggleOption: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 44,
    borderWidth: 1,
    borderColor: '#FFFFFF',
    borderRadius: 10,
    backgroundColor: '#043529',
    alignItems: 'center',
    justifyContent: 'center',
  },
  teamToggleOptionDisabled: {
    backgroundColor: '#F3F4F6',
    borderColor: '#E5E7EB',
    opacity: 0.85,
    ...Platform.select({
      web: { cursor: 'not-allowed' as const },
    }),
  },
  teamToggleHint: {
    marginTop: 8,
    fontSize: 12,
    color: '#6B7280',
    lineHeight: 18,
  },
  teamToggleOptionActive: {
    borderColor: '#00ea6b',
    backgroundColor: '#043529',
  },
  teamToggleText: {
    fontSize: 14,
    fontWeight: '400',
    fontFamily: 'Inter',
    color: '#E5E7EB',
  },
  teamToggleTextActive: {
    color: '#00ea6b',
  },
  teamToggleTextDisabled: {
    color: '#9CA3AF',
  },
  teamToggleOptionBookGroundNative: {
    borderColor: 'rgba(0,234,107,0.2)',
    backgroundColor: '#06392e',
    borderRadius: 999,
  },
  teamToggleTextBookGroundNative: {
    color: '#f9fafb',
    fontWeight: '500',
  },
  /** Search CTA: same row height as Location / Type / Teams (44px min, 10 vertical padding). */
  searchButtonAlignedHeight: {
    minHeight: 44,
    paddingVertical: 10,
    paddingHorizontal: 24,
    backgroundColor: '#02c259',
  },
  summary: {
    marginTop: 12,
    marginBottom: 16,
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(6,57,46,0.18)', // subtle #06392e panel
  },
  summaryText: {
    fontSize: 14,
    fontWeight: '400',
    fontFamily: 'Inter',
    color: '#111827',
  },
  summaryMuted: {
    marginTop: 6,
    fontSize: 12,
    fontFamily: 'Inter',
    color: '#6B7280',
  },
  summaryAccent: {
    color: '#00ea6b',
  },
  /** Ground detail on native: large capsule (tan border/text on mobile only). */
  summaryGroundPageMobile: {
    marginTop: 16,
    paddingVertical: 18,
    paddingHorizontal: 18,
    borderRadius: 28,
    backgroundColor: '#06392e',
    borderWidth: 1,
    ...Platform.select({
      web: { borderColor: '#02c259' },
      default: { borderColor: '#dcc093' },
    }),
  },
  summaryTextGroundMobile: {
    ...Platform.select({
      web: { color: '#F9FAFB' },
      default: { color: '#dcc093' },
    }),
  },
  summaryAccentGroundMobile: {
    fontWeight: '700',
    ...Platform.select({
      web: { color: '#02c259' },
      default: { color: '#dcc093' },
    }),
  },
  summaryMutedGroundMobile: {
    ...Platform.select({
      web: { color: '#E5E7EB' },
      default: { color: 'rgba(220,192,147,0.88)' },
    }),
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
    fontWeight: '400',
    fontFamily: 'Inter',
    color: '#00ea6b',
  },
  searchResultsSection: {
    marginTop: 4,
  },
  /** Second card below the form when `separateSearchResults` (e.g. /book-my-ground). */
  searchResultsCard: {
    marginTop: 20,
    backgroundColor: '#043529',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,234,107,0.15)',
  },
  searchResultsTitle: {
    fontSize: 20,
    fontWeight: '400',
    fontFamily: 'Inter',
    color: '#F9FAFB',
    marginBottom: 4,
  },
  searchResultsSubtitle: {
    fontSize: 14,
    fontFamily: 'Inter',
    color: '#E5E7EB',
    marginBottom: 12,
  },
  searchSpinner: {
    marginVertical: 12,
  },
  searchResultsScroller: {
    marginTop: 8,
  },
  searchResultsGrid: {
    flexDirection: 'column',
    gap: 16,
    paddingBottom: 4,
    width: '100%',
    alignSelf: 'stretch',
    alignItems: 'stretch',
  },
  searchResultsGridTwoCol: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  searchResultTile: {
    width: '100%',
    alignSelf: 'stretch',
  },
  searchResultTileHalf: {
    width: '48%',
    maxWidth: '48%',
  },
  smallMuted: {
    fontSize: 13,
    fontFamily: 'Inter',
    color: '#9CA3AF',
  },
  smallMutedOnWhite: {
    fontSize: 13,
    fontFamily: 'Inter',
    color: '#9CA3AF',
  },
  dropdownOuter: {
    position: 'relative',
  },
  dropdownButton: {
    borderWidth: 1,
    borderColor: '#FFFFFF',
    backgroundColor: '#043529',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 10,
    minHeight: 44,
    justifyContent: 'center',
  },
  dropdownButtonOpen: {
    borderColor: '#00ea6b',
    backgroundColor: '#043529',
  },
  /** After user picks Location / Type — match chip “selected” accent */
  dropdownButtonSelected: {
    borderColor: '#00ea6b',
    backgroundColor: '#043529',
  },
  dropdownButtonDisabled: {
    backgroundColor: '#F3F4F6',
  },
  dropdownButtonText: {
    fontSize: 14,
    fontWeight: '400',
    fontFamily: 'Inter',
    color: '#FFFFFF',
  },
  dropdownButtonTextSelected: {
    color: '#00ea6b',
  },
  dropdownButtonTextDisabled: {
    color: '#6B7280',
  },
  /** Book a ground (native): replace white borders/text with neon green transparent. */
  dropdownButtonBookGroundNative: {
    borderColor: 'rgba(0,234,107,0.2)',
    backgroundColor: '#06392e',
    borderRadius: 999,
    paddingHorizontal: 16,
  },
  dropdownButtonTextBookGroundNative: {
    color: '#f9fafb',
    fontSize: 14,
    fontWeight: '500',
  },
  dropdownOptionTextBookGroundNative: {
    color: '#f9fafb',
  },
  /** Book a ground (native): loading/disabled — match capsule look. */
  dropdownButtonDisabledBookGroundNative: {
    backgroundColor: '#06392e',
    borderColor: 'rgba(0,234,107,0.1)',
    borderRadius: 999,
  },
  dropdownButtonTextDisabledBookGroundNative: {
    color: 'rgba(249,250,251,0.4)',
  },
  dropdownMenu: {
    position: 'absolute',
    top: 44,
    left: 0,
    right: 0,
    backgroundColor: '#043529',
    borderWidth: 1,
    borderColor: '#00ea6b',
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
    backgroundColor: '#043529',
    borderWidth: 1,
    borderColor: '#00ea6b',
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
    backgroundColor: '#043529',
  },
  dropdownOptionText: {
    fontSize: 14,
    fontWeight: '400',
    fontFamily: 'Inter',
    color: '#FFFFFF',
  },
  dropdownOptionTextActive: {
    color: '#00ea6b',
  },
  /** Ground detail: Location / Type — web keeps green accent; native uses tan (#dcc093). */
  dropdownButtonGroundPage: {
    backgroundColor: '#043529',
    ...Platform.select({
      web: { borderColor: '#02c259' },
      default: { borderColor: '#dcc093' },
    }),
  },
  dropdownButtonOpenGroundPage: {
    backgroundColor: '#043529',
    ...Platform.select({
      web: { borderColor: '#02c259' },
      default: { borderColor: '#dcc093' },
    }),
  },
  dropdownButtonSelectedGroundPage: {
    backgroundColor: '#043529',
    ...Platform.select({
      web: { borderColor: '#02c259' },
      default: { borderColor: '#dcc093' },
    }),
  },
  dropdownButtonDisabledGroundPage: {
    backgroundColor: '#043529',
    ...Platform.select({
      web: { borderColor: 'rgba(2,194,89,0.45)' },
      default: { borderColor: 'rgba(220,192,147,0.45)' },
    }),
  },
  dropdownButtonTextGroundPage: {
    ...Platform.select({
      web: { color: '#02c259' },
      default: { color: '#dcc093' },
    }),
  },
  dropdownButtonTextSelectedGroundPage: {
    fontWeight: '600',
    ...Platform.select({
      web: { color: '#02c259' },
      default: { color: '#dcc093' },
    }),
  },
  dropdownButtonTextDisabledGroundPage: {
    ...Platform.select({
      web: { color: 'rgba(2,194,89,0.55)' },
      default: { color: 'rgba(220,192,147,0.55)' },
    }),
  },
  dropdownMenuGroundPage: {
    backgroundColor: '#043529',
    ...Platform.select({
      web: { borderColor: '#02c259' },
      default: { borderColor: '#dcc093' },
    }),
  },
  dropdownOptionActiveGroundPage: {
    ...Platform.select({
      web: { backgroundColor: 'rgba(2,194,89,0.12)' },
      default: { backgroundColor: 'rgba(220,192,147,0.12)' },
    }),
  },
  dropdownOptionTextGroundPage: {
    ...Platform.select({
      web: { color: '#02c259' },
      default: { color: '#dcc093' },
    }),
  },
  dropdownOptionTextActiveGroundPage: {
    fontWeight: '600',
    ...Platform.select({
      web: { color: '#02c259' },
      default: { color: '#dcc093' },
    }),
  },
  dateChipsWrap: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    gap: 6,
    alignItems: 'center',
    justifyContent: 'space-between',
    flex: 1,
    overflow: 'hidden',
  },
  /** Mobile-only: tighter horizontal scroller spacing for dates. */
  dateChipsScrollContent: {
    paddingHorizontal: 2,
    gap: 6,
    alignItems: 'center',
  },
  dateScrollNative: {
    alignSelf: 'stretch',
  },
  dateChip: {
    paddingVertical: 6,
    paddingHorizontal: 22,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#043529',
    alignItems: 'center',
    justifyContent: 'center',
  },
  /** Mobile-only: smaller chip for compact horizontal scrolling. */
  dateChipMobile: {
    paddingVertical: 4,
    paddingHorizontal: 14,
  },
  dateChipInner: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  dateChipActive: {
    borderColor: '#00ea6b',
    backgroundColor: '#043529',
  },
  /** Book a ground (native): inactive chip outline — neon green transparent. */
  dateChipBorderBookGroundNative: {
    borderColor: 'rgba(0,234,107,0.15)',
    backgroundColor: '#06392e',
  },
  dateChipText: {
    fontSize: 12,
    fontWeight: '500',
    fontFamily: 'Inter',
    color: '#FFFFFF',
  },
  dateChipTextMobile: {
    fontSize: 11,
  },
  dateChipTextActive: {
    color: '#00ea6b',
  },
  dateChipTextBookGroundNative: {
    color: '#9ca3af',
  },
  dateChipWeekday: {
    fontSize: 10,
    fontWeight: '600',
    fontFamily: 'Inter',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  dateChipWeekdayMobile: {
    fontSize: 9,
  },
  dateChipWeekdayActive: {
    color: '#00ea6b',
  },
  dateChipWeekdayBookGroundNative: {
    color: '#9ca3af',
  },
  datePagerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    columnGap: 12,
    marginTop: 4,
  },
  dateArrowButton: {
    width: 28,
    height: 28,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  dateArrowButtonDisabled: {
    opacity: 0.4,
  },
  dateArrowText: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'Inter',
    color: '#02c259',
  },
  dateArrowTextDisabled: {
    color: '#9CA3AF',
  },

  timeSlotsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  /** Mobile-only: horizontal scroll spacing for time chips. */
  timeSlotsScrollContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 2,
  },
  /** Box Cricket: many hourly chips; keep full width so all slots wrap visibly. */
  timeSlotsWrapBox: {
    width: '100%',
    alignSelf: 'stretch',
    gap: 6,
  },
  timeSlotChip: {
    paddingVertical: 8,
    paddingHorizontal: 22,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#043529',
  },
  timeSlotChipBorderBookGroundNative: {
    borderColor: 'rgba(0,234,107,0.15)',
    backgroundColor: '#06392e',
  },
  /** Mobile-only: slightly smaller time chip for scrolling. */
  timeSlotChipMobile: {
    paddingVertical: 6,
    paddingHorizontal: 16,
  },
  timeSlotChipDense: {
    paddingVertical: 7,
    paddingHorizontal: 8,
  },
  timeSlotChipActive: {
    borderWidth: 2,
    borderColor: '#00ea6b',
    backgroundColor: '#043529',
  },
  timeSlotChipPressed: {
    backgroundColor: '#06392e',
    borderColor: '#FFFFFF',
  },
  timeSlotChipPressedBookGroundNative: {
    backgroundColor: '#06392e',
    borderColor: '#00ea6b',
  },
  timeSlotText: {
    fontSize: 13,
    fontWeight: '400',
    fontFamily: 'Inter',
    color: '#FFFFFF',
  },
  timeSlotTextMobile: {
    fontSize: 12,
  },
  timeSlotTextDense: {
    fontSize: 11,
  },
  timeSlotTextActive: {
    color: '#00ea6b',
  },
  timeSlotTextBookGroundNative: {
    color: '#9ca3af',
  },
  bookGroundNativeButtonText: {
    color: '#043529',
    fontWeight: '700',
  },
  /** Book Now CTA fill neon green — dark label for classic premium look. */
  bookNowPrimaryButtonText: {
    color: '#043529',
    fontWeight: '700',
  },
});

