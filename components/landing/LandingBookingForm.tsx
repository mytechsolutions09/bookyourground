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
import Animated from 'react-native-reanimated';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { GroundWithImages, GroundType, Location } from '@/types';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Modal from '@/components/ui/Modal';
import GroundCard from '@/components/grounds/GroundCard';
import { formatCurrency, getDayOfWeek, formatTime } from '@/utils/helpers';
import {
  getSlotTemplatesForPitch,
  hoursBetweenBooked,
  formatSlotLabelHour,
  normalizeDbTimeToHHMM,
} from '@/utils/bookingSlots';
import {
  peekPendingBookingDraft,
  savePendingBookingDraft,
  clearPendingBookingDraft,
} from '@/lib/pendingBookingDraft';
import BookingFormSkeleton from './BookingFormSkeleton';

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
  /** When true (e.g. joining a match), disable all slot selection fields. */
  lockSlot?: boolean;
  /** Force light theme on App. */
  lightAppTheme?: boolean;
  /** Initial ground type to pre-select. */
  initialType?: string;
  onFinalAmountChange?: (amount: number | null) => void;
  onScroll?: any;
  scrollEventThrottle?: number;
  contentPaddingTop?: number;
  /** Use glass-styled premium cards for search results. */
  premiumCards?: boolean;
}

export default function LandingBookingForm(props: LandingBookingFormProps) {
  const {
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
    lockSlot = false,
    lightAppTheme = true,
    initialType,
    onFinalAmountChange,
    onScroll,
    scrollEventThrottle,
    contentPaddingTop = 0,
    premiumCards = false,
  } = props;
  const { user } = useAuth();
  const { width: windowWidth } = useWindowDimensions();
  const isWeb = Platform.OS === 'web';
  const IS_DARK = !isWeb || windowWidth < 900;
  const isCompact = windowWidth < 900;
  
  const isEffectiveLight = true;
  const isUltraNarrow = !isWeb || windowWidth < 350;
  const styles = React.useMemo(() => getStyles(isWeb, isEffectiveLight, noCard, windowWidth), [isWeb, isEffectiveLight, noCard, windowWidth]);

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

  const [couponCode, setCouponCode] = useState('');
  const [validatingCoupon, setValidatingCoupon] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState<any | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);

  /** After login: re-run Search and optionally re-select a ground from results. */
  const pendingPostLoginSearchRef = useRef(false);
  const pendingReselectGroundIdRef = useRef<string | null>(null);
  const handleSearchRef = useRef<() => Promise<void>>(async () => { });
  const loadMoreSentinelRef = useRef<any>(null);
  const dateScrollRef = useRef<ScrollView>(null);
  const timeScrollRef = useRef<ScrollView>(null);

  const [locationKey, setLocationKey] = useState<string>('New Gurugram__Haryana');
  const [typeKey, setTypeKey] = useState<string>(initialType || 'Cricket Ground');
  const [locationRows, setLocationRows] = useState<Location[]>([]);
  const [groundTypeRows, setGroundTypeRows] = useState<GroundType[]>([]);

  /** Which select menu is open (mutually exclusive; drives z-index + controlled open state). */
  const [openSelectMenu, setOpenSelectMenu] = useState<'location' | 'type' | null>(null);

  const [searchResults, setSearchResults] = useState<GroundWithImages[]>([]);
  const [searching, setSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [searchPage, setSearchPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  // For landing search results: custom price for the chosen slot per ground (if any).
  const [searchSlotPriceByGroundId, setSearchSlotPriceByGroundId] = useState<
    Record<string, number | null>
  >({});

  const clearSearchState = React.useCallback(() => {
    setHasSearched(false);
    setSearchResults([]);
    setSelectedGroundId(null);
    setSearchSlotPriceByGroundId({});
    setCouponCode('');
    setAppliedCoupon(null);
    setCouponError(null);
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
    const options = Array.from(map.entries()).map(([key, label]) => ({ key, label }));
    return [{ key: '', label: 'All Locations' }, ...options];
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
    const options = Array.from(map.entries()).map(([key, label]) => ({ key, label }));
    return [{ key: '', label: 'All Types' }, ...options];
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
    // - otherwise defaults to 0 (all pricing must be set per-slot in Time Slots)
    if (isCricketGround) {
      const customMatchPrice = Object.prototype.hasOwnProperty.call(slotPriceByStartTime, startTime)
        ? slotPriceByStartTime[startTime]
        : undefined;
      const baseMatchPrice = customMatchPrice ?? 0;

      // If user selects only 1 team, charge half of the "both teams" price.
      const pricePerMatch =
        teamType === 'one' ? Math.round((baseMatchPrice / 2) * 100) / 100 : baseMatchPrice;
      const totalAmount = pricePerMatch;

      const _sanity = hoursBetweenBooked(startTime, derivedEndTime);
      if (_sanity === null || !Number.isFinite(_sanity) || _sanity <= 0) return null;
      // Store actual slot span (e.g. 4h window) — price is still per match, not hourly.
      const totalHours = _sanity;

      return { totalHours, totalAmount, pricePerUnit: baseMatchPrice, unitLabel: 'match' as const };
    }

    const pricePerHour = slotPriceByStartTime[startTime] ?? 0;
    const _sanity = hoursBetweenBooked(startTime, derivedEndTime);
    if (_sanity === null || !Number.isFinite(_sanity) || _sanity <= 0) return null;

    const totalHours = _sanity;
    const totalAmount = Math.round(totalHours * pricePerHour * 100) / 100;

    return { totalHours, totalAmount, pricePerUnit: pricePerHour, unitLabel: 'hour' as const };
  }, [selectedGround, startTime, derivedEndTime, slotPriceByStartTime, isBoxCricket, teamType]);

  const discountAmount = useMemo(() => {
    if (!appliedCoupon || !computed) return 0;
    const { discount_type, discount_value, max_discount } = appliedCoupon;
    let disc = 0;
    if (discount_type === 'percentage') {
      disc = (computed.totalAmount * (discount_value || 0)) / 100;
      if (max_discount && disc > max_discount) {
        disc = max_discount;
      }
    } else {
      disc = discount_value || 0;
    }
    return Math.min(disc, computed.totalAmount);
  }, [appliedCoupon, computed]);

  const finalAmount = useMemo(() => {
    if (!computed) return 0;
    return Math.max(0, computed.totalAmount - discountAmount);
  }, [computed, discountAmount]);

  useEffect(() => {
    if (props.onFinalAmountChange) {
      props.onFinalAmountChange(computed ? finalAmount : null);
    }
  }, [finalAmount, computed, props.onFinalAmountChange]);


  const handleApplyCoupon = async () => {
    if (!user || !couponCode || !computed) return;

    setValidatingCoupon(true);
    setCouponError(null);
    try {
      const { data, error } = await supabase.rpc('validate_coupon', {
        p_code: couponCode,
        p_user_id: user.id,
        p_booking_amount: computed.totalAmount,
        p_ground_id: selectedGround?.id,
      });

      if (error) throw error;

      if (data && data.valid) {
        setAppliedCoupon(data);
      } else {
        setAppliedCoupon(null);
        setCouponError(data?.message || 'Invalid coupon code');
      }
    } catch (e: any) {
      console.error('Error validating coupon:', e);
      setAppliedCoupon(null);
      setCouponError('Failed to validate coupon');
    } finally {
      setValidatingCoupon(false);
    }
  };

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
        
        // Only allow booking for slots marked as available, 
        // OR if this is the specifically pre-selected slot for joining a match.
        const isPreSelected = lockSlot && hh === initialStartTime;
        if (row.is_available || isPreSelected) {
          nextAllowed.add(hh);
        }

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
              label: formatTime(hhmm),
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
              label: formatTime(hhmm),
            }))
          : null;

      const baseFromDb = fromSelectedGround ?? fromSearchUnion;
      const base = baseFromDb ?? timeSlots;
      let list = base.filter((s) => {
        const isPreSelected = lockSlot && s.value === initialStartTime;
        if (isPreSelected) return true;

        const isBooked = bookedStartHHMM.has(s.value);
        if (isBooked) return false;

        const isAllowed = selectedGround?.id
          ? allowedStartHHMM.has(s.value)
          : searchAllowedStartHHMM.has(s.value);

        return isAllowed;
      });
      if (
        useLandingSearchFlow &&
        !selectedGround?.id &&
        searchStartTimesWithCapacity !== undefined
      ) {
        list = list.filter((s) => {
          const isPreSelected = lockSlot && s.value === initialStartTime;
          return isPreSelected || searchStartTimesWithCapacity.has(s.value);
        });
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
    if (useLandingSearchFlow || lockSlot) return;
    
    // If we have an initial start time from the URL/props, give it priority.
    // Don't auto-correct to the first available slot if the initial one is still being validated.
    const isInitialLoading = initialStartTime && allowedStartHHMM.size === 0 && !isBoxCricket;
    if (isInitialLoading) return;

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
  }, [useLandingSearchFlow, availableTimeSlots, startTime, allowedStartHHMM, initialStartTime, isBoxCricket]);

  /** Landing: if type/date changes and the previous slot is no longer valid, clear it. */
  useEffect(() => {
    if (!useLandingSearchFlow || !startTime) return;
    if (!availableTimeSlots.length) return;
    if (availableTimeSlots.some((s) => s.value === startTime)) return;
    setStartTime('');
  }, [useLandingSearchFlow, availableTimeSlots, startTime]);

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

  const webGridHalfWidthStyle = useMemo(() => {
    if (!isWeb || windowWidth < 900) return undefined;
    return {
      flexGrow: 1,
      flexShrink: 1,
      flexBasis: '48.5%',
      maxWidth: '50%',
    };
  }, [isWeb, windowWidth]);

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

  const [dateOffset, setDateOffset] = useState(0);
  const datePageSize = useMemo(() => {
    if (windowWidth >= 1440) return 15;
    if (windowWidth >= 1200) return 13;
    if (windowWidth >= 1024) return 11;
    if (windowWidth >= 768) return 9;
    if (windowWidth >= 640) return 7;
    return 5;
  }, [windowWidth]);

  const moveStep = 3;

  const { visibleDates, hasPrevDates, hasNextDates } = useMemo(() => {
    const total = upcomingDates.length;
    const maxOffset = Math.max(0, total - datePageSize);
    const safeOffset = Math.min(Math.max(dateOffset, 0), maxOffset);
    const start = safeOffset;
    const end = Math.min(start + datePageSize, total);
    return {
      visibleDates: upcomingDates.slice(start, end),
      hasPrevDates: safeOffset > 0,
      hasNextDates: safeOffset < maxOffset,
    };
  }, [upcomingDates, dateOffset, datePageSize]);

  useEffect(() => {
    if (!bookingDate || upcomingDates.length === 0) return;

    // Use a small delay to ensure layout and state are fully synchronized
    const timer = setTimeout(() => {
      const idx = upcomingDates.findIndex(d => d.iso === bookingDate);
      if (idx === -1) return;

      // 1. Web pager logic (offset-based)
      if (isWeb && !isCompact) {
        // Position the selected date as the first visible item in the list
        const targetOffset = idx;
        const maxOffset = Math.max(0, upcomingDates.length - datePageSize);
        const finalOffset = Math.min(Math.max(0, targetOffset), maxOffset);
        setDateOffset(finalOffset);
      } 
      // 2. ScrollView logic (scrollTo-based for mobile/compact)
      else if (dateScrollRef.current) {
        // Approximate chip width: 64 (minWidth) + 6 (gap) = 70
        const chipWidth = 70;
        dateScrollRef.current.scrollTo({
          // Scroll so the selected date is at the start of the visible area
          x: Math.max(0, idx * chipWidth),
          animated: true,
        });
      }
    }, 150);

    return () => clearTimeout(timer);
  }, [bookingDate, upcomingDates, datePageSize, isWeb, isCompact]);

  useEffect(() => {
    if (!startTime || availableTimeSlots.length === 0) return;

    const timer = setTimeout(() => {
      const idx = availableTimeSlots.findIndex(s => s.value === startTime);
      if (idx === -1) return;

      if (timeScrollRef.current) {
        // Approximate chip width: 80 (minWidth) + 12 (gap) = 92
        const chipWidth = isBoxCricket ? 70 : 92;
        timeScrollRef.current.scrollTo({
          x: Math.max(0, idx * chipWidth),
          animated: true,
        });
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [startTime, availableTimeSlots, isBoxCricket]);

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
    /** Ground detail: #043529 field + #01b854 border/text. */
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
          <>
            <Pressable
              style={styles.dropdownOverlay}
              onPress={() => setOpenNotify(false)}
            />
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
                {opt.key === value && <View style={styles.dropdownOptionDot} />}
              </Pressable>
            ))}
          </View>
        </>
      ) : null}
      </View>
    );
  }

  function ModalSelector({
    visible,
    onClose,
    title,
    value,
    options,
    onChange
  }: {
    visible: boolean;
    onClose: () => void;
    title: string;
    value: string;
    options: { key: string; label: string }[];
    onChange: (k: string) => void;
  }) {
    return (
      <Modal visible={visible} onClose={onClose} title={title}>
        <View style={styles.modalOptionList}>
          {options.map((opt) => (
            <Pressable
              key={opt.key}
              onPress={() => {
                onChange(opt.key);
                onClose();
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
              {opt.key === value && <View style={styles.dropdownOptionDot} />}
            </Pressable>
          ))}
        </View>
      </Modal>
    );
  }

  /** Availability filtering runs only when both date and start time are chosen. */
  const wantsSlotFilter = !!(bookingDate && startTime);

  const canRunSearch = useMemo(() => {
    // We allow searching with just location and type (to browse)
    // or with fully specified slots (to narrow down).
    return !!(locationKey && typeKey) && !loadingGrounds;
  }, [locationKey, typeKey, loadingGrounds]);

  const groundSelectedFromSearch = useMemo(() => {
    if (!useLandingSearchFlow || !selectedGroundId || !hasSearched) return false;
    return searchResults.some((g) => g.id === selectedGroundId);
  }, [useLandingSearchFlow, selectedGroundId, hasSearched, searchResults]);

  const handleSearch = React.useCallback(async (pageIdx = 0) => {
    if (!canRunSearch) return;

    const isInitial = pageIdx === 0;
    if (isInitial) {
      setSearchPage(0);
      setHasMore(true);
      setSearchResults([]);
      setSearchSlotPriceByGroundId({});
    }

    setSearching(true);
    setHasSearched(true);
    
    // If user is searching a new batch, do not clear selection IF they already picked one from previous batch
    // unless it's a completely new initial search.
    if (isInitial) {
      setSelectedGroundId(null);
    }

    try {
      const limit = 12;
      const offset = pageIdx * limit;

      // 1. Build Query
      let query = supabase
        .from('grounds')
        .select(`
          *,
          ground_images(*),
          reviews(rating)
        `)
        .eq('active', true)
        .eq('approved', true);

      if (locationKey) {
        const [city, state] = locationKey.split('__');
        query = query.eq('city', city).eq('state', state);
      }
      if (typeKey) {
        query = query.eq('pitch_type', typeKey);
      }

      const { data: candidates, error: candError } = await query
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (candError) throw candError;

      if (!candidates || candidates.length < limit) {
        setHasMore(false);
      }

      if (!candidates || candidates.length === 0) {
        if (isInitial) setSearchResults([]);
        return;
      }

      let nextBatch = candidates as GroundWithImages[];

      // 2. Filter by slot (if chosen)
      if (wantsSlotFilter) {
        const candidateIds = candidates.map((c) => c.id);
        const { data: allowedData, error: allowedErr } = await supabase.rpc('available_ground_ids_for_slot', {
          p_ground_ids: candidateIds,
          p_booking_date: bookingDate,
          p_start_time: `${startTime}:00`,
        });

        if (!allowedErr && allowedData) {
          const allowedSet = new Set((allowedData as any[]).map(r => r.ground_id));
          nextBatch = candidates.filter((g) => allowedSet.has(g.id));
        }
      }

      setSearchResults((prev) => (isInitial ? nextBatch : [...prev, ...nextBatch]));
      setSearchPage(pageIdx);

      // 3. Load prices for the batch
      if (nextBatch.length > 0) {
        const parsedDate = parseISODate(bookingDate);
        if (parsedDate && startTime) {
          const dow = getDayOfWeek(parsedDate) as any;
          const { data: slotRows } = await supabase
            .from('time_slots')
            .select('ground_id, custom_price')
            .in('ground_id', nextBatch.map((g) => g.id))
            .eq('day_of_week', dow)
            .eq('is_available', true)
            .eq('start_time', `${startTime}:00`);

          if (slotRows) {
            setSearchSlotPriceByGroundId(prev => {
              const map = { ...prev };
              slotRows.forEach((row: any) => {
                map[row.ground_id] = row.custom_price ?? null;
              });
              return map;
            });
          }
        }
      }
    } catch (e) {
      console.error('Search unexpected error', e);
    } finally {
      setSearching(false);
    }
  }, [canRunSearch, locationKey, typeKey, wantsSlotFilter, bookingDate, startTime]);

  /** Re-run search whenever core filters change. */
  useEffect(() => {
    if (useLandingSearchFlow && canRunSearch) {
      const timer = setTimeout(() => {
        handleSearch(0);
      }, 300); // debounce slightly
      return () => clearTimeout(timer);
    }
  }, [locationKey, typeKey, bookingDate, startTime, useLandingSearchFlow, canRunSearch, handleSearch]);

  /** Web-only: automatic load more via IntersectionObserver */
  useEffect(() => {
    if (Platform.OS !== 'web' || !hasMore || searching || !hasSearched) return;
    if (typeof IntersectionObserver === 'undefined') return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          handleSearch(searchPage + 1);
        }
      },
      { threshold: 0.1 }
    );

    const target = loadMoreSentinelRef.current;
    if (target) {
      observer.observe(target);
    }

    return () => observer.disconnect();
  }, [hasMore, searching, hasSearched, searchPage, handleSearch]);

  handleSearchRef.current = handleSearch as any;

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

    if (!isBoxCricket && cricketSlotsFetched) {
      if (teamType === 'both' && (cricketSlotsUsed ?? 0) >= 1) {
        Alert.alert('Slot partially booked', 'This slot already has 1 team booked. Please choose "1 team" or a different slot.');
        return;
      }
      if ((cricketSlotsUsed ?? 0) >= 2) {
        Alert.alert('Slot full', 'This slot is already fully booked. Please choose a different time slot.');
        return;
      }
    }
    // Submitting...
    try {
      setSubmitting(true);
      const params = new URLSearchParams();
      params.set('groundId', selectedGround.id);
      params.set('date', bookingDate);
      params.set('time', startTime);
      params.set('teamType', teamType);
      if (computed) {
        params.set('amount', computed.totalAmount.toString());
        params.set('pricePerHour', computed.pricePerUnit.toString());
        params.set('endTime', derivedEndTime);
      }
      if (appliedCoupon) params.set('couponId', appliedCoupon.id);
      if (discountAmount > 0) params.set('discount', discountAmount.toString());

      router.push(`/checkout/new?${params.toString()}` as any);
    } catch (e: any) {
      console.error('Error initiating booking:', e);
      Alert.alert('Booking failed', e?.message ?? 'Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const showSearchResults = useLandingSearchFlow && hasSearched;

  const searchResultsBody = showSearchResults ? (
    <>
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

              const currentBasePrice = slotCustom ?? g.base_price_per_hour ?? 0;
              let displayPricePerUnit: number;
              let unitLabelOverride: string;

              if (isBox) {
                displayPricePerUnit = currentBasePrice;
                unitLabelOverride = '/hr';
              } else {
                displayPricePerUnit =
                  teamType === 'one'
                    ? Math.round((currentBasePrice / 2) * 100) / 100
                    : currentBasePrice;
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
                    lightMode={isEffectiveLight}
                    onPress={() => {
                      const query: string[] = [];
                      if (bookingDate) {
                        query.push(`date=${encodeURIComponent(bookingDate)}`);
                      }
                      if (startTime) {
                        query.push(`time=${encodeURIComponent(startTime)}`);
                      }
                      if (teamType) {
                        query.push(`teams=${encodeURIComponent(teamType)}`);
                      }
                      const suffix = query.length ? `?${query.join('&')}` : '';
                      router.push(`${makeGroundPath(g)}${suffix}` as any);
                    }}
                    showBookingSchedule={false}
                    showBookButton={wantsSlotFilter}
                    glass={premiumCards}
                  />
                </View>
              );
            })}
          </View>
        </View>
      ) : !searching ? (
        <View>
          <Text style={separateSearchResults ? styles.smallMutedOnWhite : styles.smallMuted}>
            {wantsSlotFilter
              ? 'No grounds have this slot free. Try another time or date.'
              : 'No grounds match your search.'}
          </Text>
        </View>
      ) : null}

      {hasMore && searchResults.length > 0 && (
        <View style={styles.loadMoreWrap} ref={loadMoreSentinelRef}>
          <Button
            title={searching ? "Loading..." : "Load More Grounds"}
            onPress={() => handleSearch(searchPage + 1)}
            variant="outline"
            size="small"
            disabled={searching}
            loading={searching}
            style={styles.loadMoreBtn}
          />
        </View>
      )}
    </>
  ) : null;

  const fieldLabelStyle = [
    styles.label,
    bookGroundScreenNative && !isWeb && styles.labelBookGroundNative,
    groundPageAccent && !isWeb && styles.labelBookGroundNative,
  ];


  const nativeTanChrome =
    (bookGroundScreenNative || groundPageAccent) && (!isWeb || isCompact) && !lightAppTheme;

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
                      onPress={() => !lockSlot && setSelectedGroundId(g.id)}
                      disabled={lockSlot}
                      style={[
                        styles.groundChip,
                        active && styles.groundChipActive,
                        lockSlot && styles.groundChipDisabled,
                      ]}
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

      <View style={[styles.row, isWeb && webGridHalfWidthStyle, !!openSelectMenu && styles.sectionDropdownOpen]}>
        <View
          style={[
            styles.section,
            styles.flex1,
          ]}
        >
          <Text style={fieldLabelStyle}>Location</Text>
          <Pressable
            onPress={() => setOpenSelectMenu('location')}
            disabled={lockSlot || isLockedByInitialGround || loadingGrounds}
            style={[
              styles.dropdownButton,
              groundPageAccent && styles.dropdownButtonGroundPage,
              nativeTanChrome && !groundPageAccent && styles.dropdownButtonBookGroundNative,
              !!locationKey && !loadingGrounds && (groundPageAccent ? styles.dropdownButtonSelectedGroundPage : styles.dropdownButtonSelected),
            ]}
          >
            <Text style={[
              styles.dropdownButtonText,
              groundPageAccent && styles.dropdownButtonTextGroundPage,
              nativeTanChrome && !groundPageAccent && styles.dropdownButtonTextBookGroundNative,
              !!locationKey && (groundPageAccent ? styles.dropdownButtonTextSelectedGroundPage : styles.dropdownButtonTextSelected),
            ]}>
              {locationOptions.find(o => o.key === locationKey)?.label || 'Location'}
            </Text>
          </Pressable>

          <ModalSelector
            visible={openSelectMenu === 'location'}
            onClose={() => setOpenSelectMenu(null)}
            title="Select Location"
            value={locationKey}
            options={locationOptions}
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
            styles.flex1,
          ]}
        >
          <Text style={fieldLabelStyle}>Type</Text>
          <Pressable
            onPress={() => setOpenSelectMenu('type')}
            disabled={lockSlot || isLockedByInitialGround || loadingGrounds}
            style={[
              styles.dropdownButton,
              groundPageAccent && styles.dropdownButtonGroundPage,
              nativeTanChrome && !groundPageAccent && styles.dropdownButtonBookGroundNative,
              !!typeKey && !loadingGrounds && (groundPageAccent ? styles.dropdownButtonSelectedGroundPage : styles.dropdownButtonSelected),
            ]}
          >
            <Text style={[
              styles.dropdownButtonText,
              groundPageAccent && styles.dropdownButtonTextGroundPage,
              nativeTanChrome && !groundPageAccent && styles.dropdownButtonTextBookGroundNative,
              !!typeKey && (groundPageAccent ? styles.dropdownButtonTextSelectedGroundPage : styles.dropdownButtonTextSelected),
            ]}>
              {typeOptions.find(o => o.key === typeKey)?.label || 'Type'}
            </Text>
          </Pressable>

          <ModalSelector
            visible={openSelectMenu === 'type'}
            onClose={() => setOpenSelectMenu(null)}
            title="Select Type"
            value={typeKey}
            options={typeOptions}
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
      </View>

      {!isBoxCricket ? (
        <View style={[styles.section, isWeb ? webGridHalfWidthStyle : webGridSectionStyle, webSingleColumnStyle]}>
          <Text style={fieldLabelStyle}>Teams</Text>
          <View style={styles.teamToggle}>
            <Pressable
              disabled={lockSlot}
              onPress={() => {
                if (lockSlot) return;
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
              disabled={lockSlot || hideBothTeamsOption}
              onPress={() => {
                if (lockSlot) return;
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
                    setDateOffset((o) => Math.max(0, o - moveStep));
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
                          if (lockSlot) return;
                          if (useLandingSearchFlow) {
                            clearSearchState();
                            setStartTime('' as TimeString);
                          }
                          setBookingDate(d.iso);
                        }}
                        disabled={lockSlot}
                        style={[
                          styles.dateChip,
                          isSelected && styles.dateChipActive,
                          lockSlot && !isSelected && styles.dateChipDisabled,
                          lockSlot && isSelected && { opacity: 0.8 },
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
                    setDateOffset((o) => Math.min(upcomingDates.length - datePageSize, o + moveStep));
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
              ref={dateScrollRef}
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
                      if (lockSlot) return;
                      if (useLandingSearchFlow) {
                        clearSearchState();
                        setStartTime('' as TimeString);
                      }
                      setBookingDate(d.iso);
                    }}
                    disabled={lockSlot}
                    style={({ pressed }) => [
                      styles.dateChip,
                      styles.dateChipMobile,
                      isSelected && styles.dateChipActive,
                      lockSlot && !isSelected && styles.dateChipDisabled,
                      lockSlot && isSelected && { opacity: 0.8 },
                      nativeTanChrome && !isSelected && styles.dateChipBorderBookGroundNative,
                      pressed && !isSelected && !lockSlot && styles.dateChipPressed,
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

      {(!useLandingSearchFlow || bookingDate) && (
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
                      onPress={() => {
                        if (lockSlot) return;
                        if (useLandingSearchFlow) clearSearchState();
                        setStartTime(s.value as TimeString);
                      }}
                      disabled={lockSlot || submitting || !slotIsAvailable}
                      accessibilityRole="button"
                      accessibilityState={{ selected: active, disabled: lockSlot || submitting || !slotIsAvailable }}
                      accessibilityLabel={`${s.label} time slot`}
                      style={({ pressed }) => [
                        styles.timeSlotChip,
                        isBoxCricket && styles.timeSlotChipDense,
                        active && styles.timeSlotChipActive,
                        lockSlot && !active && styles.timeSlotChipDisabled,
                        lockSlot && active && { opacity: 0.8 },
                        ...(Platform.OS === 'web' ? [{ cursor: 'pointer' } as object] : []),
                        pressed && !active && !lockSlot && styles.timeSlotChipPressed,
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
              ref={timeScrollRef}
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
                      onPress={() => {
                        if (lockSlot) return;
                        if (useLandingSearchFlow) clearSearchState();
                        setStartTime(s.value as TimeString);
                      }}
                      disabled={lockSlot || submitting || !slotIsAvailable}
                      accessibilityRole="button"
                      accessibilityState={{ selected: active, disabled: lockSlot || submitting || !slotIsAvailable }}
                      accessibilityLabel={`${s.label} time slot`}
                      style={({ pressed }) => [
                        styles.timeSlotChip,
                        styles.timeSlotChipMobile,
                        isBoxCricket && styles.timeSlotChipDense,
                        active && styles.timeSlotChipActive,
                        lockSlot && !active && styles.timeSlotChipDisabled,
                        lockSlot && active && { opacity: 0.8 },
                        nativeTanChrome && !active && styles.timeSlotChipBorderBookGroundNative,
                        pressed &&
                        !active &&
                        !lockSlot &&
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
      )}

      {/* Coupon Code Section */}
      {user && (!useLandingSearchFlow || groundSelectedFromSearch) && (
        <View style={[styles.section, webGridSectionStyle, webSingleColumnStyle]}>
          <Text style={fieldLabelStyle}>Coupon Code</Text>
          <View style={styles.couponRow}>
            <TextInput
              style={[
                styles.input,
                { flex: 1 },
                nativeTanChrome && styles.inputBookGroundNative,
                appliedCoupon && styles.couponInputApplied,
              ]}
              placeholder="Enter coupon code"
              placeholderTextColor={Platform.OS === 'web' ? '#9CA3AF' : '#9ca3af'}
              value={couponCode}
              onChangeText={(text) => {
                setCouponCode(text.toUpperCase());
                setAppliedCoupon(null);
                setCouponError(null);
              }}
              autoCapitalize="characters"
              autoCorrect={false}
              editable={!validatingCoupon}
            />
            <Pressable
              onPress={handleApplyCoupon}
              disabled={!couponCode || !!appliedCoupon || validatingCoupon || !computed}
              style={({ pressed }) => [
                styles.applyBtn,
                (!couponCode || !!appliedCoupon || validatingCoupon || !computed) && styles.applyBtnDisabled,
                appliedCoupon && styles.applyBtnApplied,
                pressed && { opacity: 0.8 },
              ]}
            >
              {validatingCoupon ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <Text style={[styles.applyBtnText, appliedCoupon && styles.applyBtnTextApplied]}>
                  {appliedCoupon ? 'Applied' : 'Apply'}
                </Text>
              )}
            </Pressable>
          </View>
          {appliedCoupon && (
            <Text style={styles.couponSuccess}>
              Coupon applied! You saved {formatCurrency(discountAmount)}
            </Text>
          )}
          {couponError && (
            <Text style={styles.couponError}>{couponError}</Text>
          )}
        </View>
      )}

      {!separateSearchResults && searchResultsBody ? (
        <View style={[styles.section, webFullSpanStyle, styles.searchResultsSection]}>
          {searchResultsBody}
        </View>
      ) : null}
    </>
  );

  const ContainerComponent: React.ComponentType<any> =
    noCard ? View : Card;
  const mainCardStyle = [
    !noCard && styles.card,
    !noCard && isWeb && styles.cardWeb,
    noCard && styles.cardPlain,
    fullWidth && !isWeb && styles.cardNativeFull,
    !isWeb && noCard && styles.cardPlainNative,
    !isWeb && noCard && bookGroundScreenNative && styles.cardPlainNativeBookGround,
    !isWeb && noCard && groundPageAccent && styles.cardPlainGroundPage,
    fullWidth && !isWeb && groundPageAccent && !noCard && styles.cardGroundPageNative,
  ];

  if (loadingGrounds) {
    return (
      <View style={[styles.wrapper, fullWidth && styles.wrapperFull]}>
        <BookingFormSkeleton />
      </View>
    );
  }

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

        {isWeb && !isCompact ? (
          <View style={styles.formFieldsWeb}>{formFields}</View>
        ) : isWeb ? (
          <View style={styles.formFieldsNative}>{formFields}</View>
        ) : (
          <Animated.ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[styles.formFieldsNative, { paddingTop: contentPaddingTop }]}
            onScroll={onScroll}
            scrollEventThrottle={scrollEventThrottle}
          >
            {formFields}
          </Animated.ScrollView>
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
                {formatCurrency(finalAmount)}
              </Text>
              {discountAmount > 0 && (
                <Text style={styles.originalAmountLineThrough}>
                  {' '}{formatCurrency(computed.totalAmount)}
                </Text>
              )}
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
                : `Cricket ground: ${teamType === 'one' ? '1 team' : 'Both teams'} • ${formatCurrency(teamType === 'one' ? computed.pricePerUnit / 2 : computed.pricePerUnit)} ${teamType === 'one' ? 'per team' : 'per match'}`}
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
                  title={submitting ? 'Processing...' : 'Checkout'}
                  onPress={handleBook}
                  disabled={submitting}
                  loading={submitting}
                  fullWidth
                  size="large"
                  style={styles.premiumGlassButton}
                  textStyle={styles.premiumGlassButtonText}
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
                style={styles.premiumGlassButton}
                textStyle={styles.premiumGlassButtonText}
              />
            ) : null
          ) : (
            <Button
              title={submitting ? 'Processing...' : 'Checkout'}
              onPress={handleBook}
              disabled={submitting}
              loading={submitting}
              fullWidth
              size={groundPageAccent && !isWeb ? 'small' : 'large'}
              style={styles.premiumGlassButton}
              textStyle={styles.premiumGlassButtonText}
            />
          )}
        </View>
      </ContainerComponent>

      {separateSearchResults && searchResultsBody ? (
        <ContainerComponent
          style={[
            styles.searchResultsCard,
            isWeb && styles.cardWeb,
            noCard && styles.cardPlain,
            noCard && { marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#F1F5F9' }
          ]}
        >
          <Text style={styles.searchResultsTitle}>Search results</Text>
          <Text style={styles.searchResultsSubtitle}>
            Grounds that match your location, type, and optional date and time.
          </Text>
          {searchResultsBody}
        </ContainerComponent>
      ) : null}
    </View>
  );
}

const getStyles = (isWeb: boolean, isLight: boolean, noCard: boolean = false, windowWidth: number) => StyleSheet.create({
  wrapper: {
    paddingHorizontal: noCard ? 0 : 16,
    paddingBottom: noCard ? 0 : 28,
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
    backgroundColor: 'transparent',
    paddingHorizontal: 0,
    paddingBottom: 24,
  },
  /** Native Book a Ground stack: align form to top; 8px below nav area (see MobileAppNavbar). */
  wrapperBookGroundScreenNative: {
    justifyContent: 'flex-start',
    paddingTop: 8,
  },
  wrapperMobileTight: {
    paddingHorizontal: 16,
  },
  premiumGlassButton: {
    backgroundColor: 'rgba(1, 184, 84, 0.85)',
    borderRadius: 100,
    borderWidth: 1.5,
    borderColor: '#00ea6b',
    ...Platform.select({
      web: {
        backdropFilter: 'blur(8px)',
        boxShadow: '0 4px 20px rgba(1, 184, 84, 0.4)',
        transition: 'all 0.2s ease',
      },
      ios: {
        shadowColor: '#01b854',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.4,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
    }) as any,
  },
  premiumGlassButtonText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 16,
    fontFamily: 'Inter',
    letterSpacing: -0.2,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    marginTop: 0,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.04,
    shadowRadius: 20,
    elevation: 2,
  },
  cardPlain: {
    backgroundColor: 'transparent',
    borderWidth: 0,
    shadowOpacity: 0,
    elevation: 0,
    padding: 0,
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
    paddingHorizontal: 0,
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
    fontWeight: '800',
    fontFamily: 'Inter',
    color: '#0F172A',
    marginBottom: 4,
  },
  /** Native-only title accent colour. */
  titleMobile: {
    color: '#0F172A',
  },
  subtitle: {
    fontSize: 13,
    fontFamily: 'Inter',
    color: '#64748B',
    marginBottom: 20,
    fontWeight: '500',
  },
  authRequired: {
    marginBottom: 16,
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  authTitle: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'Inter',
    color: '#0F172A',
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
    minWidth: 140,
    alignSelf: 'stretch',
  },
  row: {
    flexDirection: windowWidth < 350 ? 'column' : 'row',
    gap: windowWidth < 350 ? 8 : 12,
  },
  flex1: {
    flex: 1,
  },
  /** Entire field column must stack above later flex rows so the menu isn’t covered by Date/Time. */
  sectionDropdownOpen: {
    position: 'relative',
    zIndex: 10000,
    elevation: 24,
    overflow: 'visible',
  },
  label: {
    fontSize: 10,
    fontWeight: '600',
    fontFamily: 'Inter',
    color: '#475569',
    marginBottom: 4,
    textTransform: isWeb ? 'uppercase' : 'none',
    letterSpacing: isWeb ? 1 : 0,
  },
  /** Book-a-ground native screen: field headings match neon green section labels. */
  labelBookGroundNative: {
    fontSize: 11,
    fontWeight: '800',
    color: '#334155',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: 6,
  },
  /** `separateSearchResults` — heading on light card (e.g. /book-my-ground). */
  labelOnWhite: {
    fontSize: 11,
    fontWeight: '800',
    fontFamily: 'Inter',
    color: '#9CA3AF',
    marginBottom: 16,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: isWeb ? 8 : 12,
    minHeight: isWeb ? 38 : 48,
    fontSize: 15,
    fontFamily: 'Inter',
    backgroundColor: '#F8FAFC',
    color: '#0F172A',
  },
  inputWide: {
    width: '100%',
    minWidth: 200,
    alignSelf: 'stretch',
  },
  inputBookGroundNative: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  inputDisabled: {
    borderWidth: 1,
    borderColor: '#F1F5F9',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 48,
    fontSize: 15,
    fontFamily: 'Inter',
    backgroundColor: '#F1F5F9',
    color: '#94A3B8',
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
    borderColor: '#F1F5F9',
    backgroundColor: '#FFFFFF',
  },
  groundChipActive: {
    borderColor: '#F1F5F9',
    backgroundColor: 'rgba(216, 247, 157, 0.08)',
  },
  groundChipText: {
    fontSize: 13,
    fontWeight: '400',
    fontFamily: 'Inter',
    color: '#374151',
  },
  groundChipTextActive: {
    color: '#01b854',
    fontWeight: '700',
  },
  teamToggle: {
    flexDirection: 'row',
    gap: 10,
  },
  loadMoreWrap: {
    paddingVertical: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadMoreBtn: {
    minWidth: 200,
  },
  teamToggleOption: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 48,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  teamToggleOptionDisabled: {
    backgroundColor: '#F3F4F6',
    borderColor: '#E5E7EB',
    opacity: 0.85,
    ...Platform.select({
      web: { cursor: 'not-allowed' as any },
    }),
  },
  teamToggleHint: {
    marginTop: 8,
    fontSize: 12,
    color: '#6B7280',
    lineHeight: 18,
  },
  teamToggleOptionActive: {
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  teamToggleText: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Inter',
    color: '#64748B',
  },
  teamToggleTextActive: {
    color: '#01b854',
    fontWeight: '800',
  },
  teamToggleTextDisabled: {
    color: '#9CA3AF',
  },
  teamToggleOptionBookGroundNative: {
    borderColor: isLight ? '#E5E7EB' : 'rgba(0,234,107,0.2)',
    backgroundColor: isLight ? '#FFFFFF' : '#06392e',
    borderRadius: 999,
  },
  teamToggleTextBookGroundNative: {
    color: isLight ? '#374151' : '#f9fafb',
    fontWeight: '500',
  },
  /** Search CTA: same row height as Location / Type / Teams (44px min, 10 vertical padding). */
  searchButtonAlignedHeight: {
    minHeight: 48,
    paddingVertical: 8,
    paddingHorizontal: 24,
    backgroundColor: '#01b854',
  },
  summary: {
    marginTop: 12,
    marginBottom: 16,
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'transparent',
    borderWidth: 0,
    borderColor: '#E5E7EB',
  },
  summaryText: {
    fontSize: 14,
    fontWeight: '400',
    fontFamily: 'Inter',
    color: isLight ? '#111827' : '#F9FAFB',
  },
  summaryMuted: {
    marginTop: 6,
    fontSize: 12,
    fontFamily: 'Inter',
    color: '#9CA3AF',
  },
  summaryAccent: {
    color: '#01b854',
    fontWeight: '800',
  },
  /** Ground detail on native: large capsule (tan border/text on mobile only). */
  summaryGroundPageMobile: {
    marginTop: 16,
    paddingVertical: 18,
    paddingHorizontal: 0,
    borderRadius: 28,
    backgroundColor: 'transparent',
    borderWidth: 0,
  },
  summaryTextGroundMobile: {
    ...Platform.select({
      web: { color: '#F9FAFB' },
      default: { color: isLight ? '#111827' : '#dcc093' },
    }),
  },
  summaryAccentGroundMobile: {
    fontWeight: '800',
    ...Platform.select({
      web: { color: '#01b854' },
      default: { color: isLight ? '#01b854' : '#dcc093' },
    }),
  },
  summaryMutedGroundMobile: {
    ...Platform.select({
      web: { color: '#E5E7EB' },
      default: { color: isLight ? '#94A3B8' : 'rgba(220,192,147,0.88)' },
    }),
  },
  couponRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    marginTop: 4,
  },
  applyBtn: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 16,
    paddingVertical: isWeb ? 6 : 10,
    borderRadius: 10,
    minHeight: isWeb ? 38 : 44,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 80,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  applyBtnDisabled: {
    backgroundColor: '#E5E7EB',
    opacity: 0.6,
  },
  applyBtnApplied: {
    backgroundColor: '#F8FAFC',
    borderColor: '#10b981',
    borderWidth: 1.5,
  },
  applyBtnText: {
    color: '#0F172A',
    fontWeight: '800',
    fontSize: 14,
  },
  applyBtnTextApplied: {
    color: '#043529',
  },
  couponSuccess: {
    color: '#10b981',
    fontSize: 12,
    marginTop: 6,
    fontWeight: '600',
  },
  couponError: {
    color: '#EF4444',
    fontSize: 12,
    marginTop: 6,
    fontWeight: '600',
  },
  originalAmountLineThrough: {
    textDecorationLine: 'line-through',
    color: '#9CA3AF',
    fontSize: 14,
    fontWeight: '400',
  },
  couponInputApplied: {
    borderColor: '#10b981',
    borderWidth: 2,
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
    fontWeight: '800',
    fontFamily: 'Inter',
    color: '#01b854',
  },
  dateChipPressed: {
    backgroundColor: '#F1F5F9',
    borderColor: '#01b854',
  },
  searchResultsSection: {
    marginTop: 4,
  },
  /** Second card below the form when `separateSearchResults` (e.g. /book-my-ground). */
  searchResultsCard: {
    marginTop: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingVertical: 20,
    paddingRight: 20,
    paddingLeft: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 20,
    elevation: 3,
  },
  searchResultsTitle: {
    fontSize: 20,
    fontWeight: '700',
    fontFamily: 'Inter',
    color: isLight ? '#111827' : '#F9FAFB',
    marginBottom: 4,
  },
  searchResultsSubtitle: {
    fontSize: 14,
    fontFamily: 'Inter',
    color: isLight ? '#64748B' : '#E5E7EB',
    marginBottom: 16,
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
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    minHeight: 48,
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.02,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 1,
  },
  dropdownButtonOpen: {
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  /** After user picks Location / Type — match chip “selected” accent */
  dropdownButtonSelected: {
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  dropdownButtonDisabled: {
    backgroundColor: '#F1F5F9',
    borderColor: '#F1F5F9',
  },
  dropdownButtonText: {
    fontSize: 14,
    fontWeight: '400',
    fontFamily: 'Inter',
    color: isLight ? '#111827' : '#FFFFFF',
  },
  dropdownButtonTextSelected: {
    color: '#01b854',
    fontWeight: '500',
    fontSize: 14,
    marginTop: 0,
  },
  dropdownButtonTextDisabled: {
    color: '#6B7280',
  },
  /** Book a ground (native): replace white borders/text with neon green transparent. */
  dropdownButtonBookGroundNative: {
    borderWidth: 1,
    borderColor: isLight ? '#E5E7EB' : 'rgba(0,234,107,0.2)',
    backgroundColor: isLight ? '#FFFFFF' : '#06392e',
    borderRadius: 999,
    paddingHorizontal: 16,
  },
  dropdownButtonTextBookGroundNative: {
    color: isLight ? '#1F2937' : '#f9fafb',
    fontSize: 14,
    fontWeight: '500',
  },
  dropdownOptionTextBookGroundNative: {
    color: '#f9fafb',
  },
  /** Book a ground (native): loading/disabled — match capsule look. */
  dropdownButtonDisabledBookGroundNative: {
    backgroundColor: isLight ? '#F3F4F6' : '#06392e',
    borderColor: isLight ? '#E5E7EB' : 'rgba(0,234,107,0.1)',
    borderRadius: 999,
  },
  dropdownButtonTextDisabledBookGroundNative: {
    color: isLight ? '#9CA3AF' : 'rgba(249,250,251,0.4)',
  },
  dropdownOverlay: {
    position: 'absolute',
    top: -2000,
    left: -2000,
    right: -2000,
    bottom: -2000,
    backgroundColor: 'transparent',
    zIndex: 90,
  },
  dropdownMenu: {
    position: 'absolute',
    top: '100%',
    marginTop: 8,
    left: 0,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    padding: 6,
    zIndex: 100,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    minWidth: 220,
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
  modalOptionList: {
    gap: 8,
  },
  dropdownOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
  },
  dropdownOptionActive: {
    backgroundColor: '#F1F5F9',
  },
  dropdownOptionText: {
    fontFamily: 'Inter',
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
  },
  dropdownOptionTextActive: {
    color: '#06392e',
    fontWeight: '700',
  },
  dropdownOptionDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#01b854',
  },

  /** Ground detail: Location / Type — web keeps green accent; native uses tan (#dcc093). */
  dropdownButtonGroundPage: {
    backgroundColor: isLight ? 'transparent' : '#043529',
    ...Platform.select({
      web: { borderColor: isLight ? 'transparent' : '#01b854' },
      default: { borderColor: isLight ? 'transparent' : '#dcc093' },
    }),
    borderWidth: isLight ? 0 : 1,
    paddingHorizontal: 0,
  },
  dropdownButtonOpenGroundPage: {
    backgroundColor: isLight ? 'transparent' : '#043529',
    ...Platform.select({
      web: { borderColor: isLight ? '#01b854' : '#01b854' },
      default: { borderColor: isLight ? '#01b854' : '#dcc093' },
    }),
    borderWidth: isLight ? 0 : 1,
  },
  dropdownButtonSelectedGroundPage: {
    backgroundColor: isLight ? 'transparent' : '#043529',
    ...Platform.select({
      web: { borderColor: isLight ? 'transparent' : '#01b854' },
      default: { borderColor: isLight ? 'transparent' : '#dcc093' },
    }),
    borderWidth: isLight ? 0 : 1,
  },
  dropdownButtonDisabledGroundPage: {
    backgroundColor: 'transparent',
    ...Platform.select({
      web: { borderColor: '#E5E7EB' },
      default: { borderColor: 'rgba(220,192,147,0.45)' },
    }),
  },
  dropdownButtonTextGroundPage: {
    ...Platform.select({
      web: { color: isLight ? '#01b854' : '#01b854' },
      default: { color: isLight ? '#01b854' : '#dcc093' },
    }),
  },
  dropdownButtonTextSelectedGroundPage: {
    fontWeight: '800',
    ...Platform.select({
      web: { color: isLight ? '#64748B' : '#64748B' },
      default: { color: isLight ? '#64748B' : '#dcc093' },
    }),
  },
  dropdownButtonTextDisabledGroundPage: {
    ...Platform.select({
      web: { color: isLight ? '#94A3B8' : '#06392e' },
      default: { color: isLight ? '#94A3B8' : 'rgba(220,192,147,0.55)' },
    }),
  },
  dropdownMenuGroundPage: {
    backgroundColor: '#FFFFFF',
    borderColor: '#01b854',
  },
  dropdownOptionActiveGroundPage: {
    backgroundColor: '#F1F5F9',
  },
  dropdownOptionTextGroundPage: {
    ...Platform.select({
      web: { color: isLight ? '#000000' : '#01b854' },
      default: { color: isLight ? '#000000' : '#dcc093' },
    }),
  },
  dropdownOptionTextActiveGroundPage: {
    fontWeight: '800',
    ...Platform.select({
      web: { color: '#01b854' },
      default: { color: isLight ? '#01b854' : '#dcc093' },
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
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 64,
    minHeight: 48,
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
    borderColor: '#01b854',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  dateChipDisabled: {
    opacity: 0.5,
    borderColor: '#64748B',
  },
  /** Book a ground (native): inactive chip outline — neon green transparent. */
  dateChipBorderBookGroundNative: {
    borderColor: isLight ? '#E5E7EB' : 'rgba(0,234,107,0.15)',
    backgroundColor: isLight ? '#FFFFFF' : '#06392e',
  },
  dateChipText: {
    fontSize: 11,
    fontWeight: '600',
    fontFamily: 'Inter',
    color: isLight ? '#374151' : '#FFFFFF',
  },
  dateChipTextMobile: {
    fontSize: 11,
  },
  dateChipTextActive: {
    color: '#01b854',
    fontWeight: '800',
  },
  dateChipTextBookGroundNative: {
    color: Platform.OS === 'web' ? '#374151' : '#9ca3af',
  },
  dateChipWeekday: {
    fontSize: 9,
    fontWeight: '600',
    fontFamily: 'Inter',
    color: isLight ? '#6B7280' : '#FFFFFF',
    letterSpacing: 0.1,
  },
  dateChipWeekdayMobile: {
    fontSize: 9,
  },
  dateChipWeekdayActive: {
    color: '#01b854',
    fontWeight: '800',
  },
  dateChipWeekdayBookGroundNative: {
    color: Platform.OS === 'web' ? '#6B7280' : '#9ca3af',
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
    fontWeight: '800',
    fontFamily: 'Inter',
    color: '#01b854',
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
    paddingHorizontal: 18,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    minHeight: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  timeSlotChipBorderBookGroundNative: {
    borderColor: '#E5E7EB',
    backgroundColor: isLight ? '#FFFFFF' : '#06392e',
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
    borderWidth: 1.5,
    borderColor: '#01b854',
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  timeSlotChipDisabled: {
    opacity: 0.5,
    borderColor: '#64748B',
  },
  timeSlotChipPressed: {
    backgroundColor: isLight ? '#F3F4F6' : '#06392e',
    borderColor: isLight ? '#01b854' : '#FFFFFF',
  },
  timeSlotChipPressedBookGroundNative: {
    backgroundColor: '#06392e',
    borderColor: '#01b854',
  },
  groundChipDisabled: {
    opacity: 0.6,
    borderColor: '#64748B',
  },
  timeSlotText: {
    fontSize: 13,
    fontWeight: '400',
    fontFamily: 'Inter',
    color: isLight ? '#374151' : '#FFFFFF',
  },
  timeSlotTextMobile: {
    fontSize: 12,
  },
  timeSlotTextDense: {
    fontSize: 11,
  },
  timeSlotTextActive: {
    color: '#01b854',
    fontWeight: '800',
  },
  timeSlotTextBookGroundNative: {
    color: Platform.OS === 'web' ? '#374151' : '#9ca3af',
  },
  bookGroundNativeButtonText: {
    color: '#043529',
    fontWeight: '700',
  },
  /** Book Now CTA fill neon green — dark label for classic premium look. */
  bookNowPrimaryButtonText: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
});

