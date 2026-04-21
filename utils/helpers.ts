import { Platform } from 'react-native';

export const formatCurrency = (amount: number | null | undefined): string => {
  if (amount == null) return '₹0.00';
  return `₹${amount.toFixed(2)}`;
};

export const formatDateDDMMYY = (date: string | null | undefined): string => {
  if (!date) return '';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  const day = d.getDate().toString().padStart(2, '0');
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const year = d.getFullYear().toString().slice(-2);
  return `${day}/${month}/${year}`;
};

export const formatDateDDMMYYYY = (date: string | null | undefined): string => {
  if (!date) return '';
  const d = new Date(date);
  const day = d.getDate().toString().padStart(2, '0');
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
};

export const formatDate = (date: string): string => {
  return new Date(date).toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

export const formatTime = (time: string): string => {
  const s = String(time ?? '').trim();
  const m = /^(\d{1,2}):(\d{2})(?::(\d{2}))?/.exec(s);
  if (!m) return s;
  const hour = parseInt(m[1], 10);
  const minutes = m[2];
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${minutes} ${ampm}`;
};

export const formatDateTime = (datetime: string): string => {
  return new Date(datetime).toLocaleString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const calculateHoursBetween = (startTime: string, endTime: string): number => {
  const parseHm = (t: string) => {
    const m = /^(\d{1,2}):(\d{2})(?::(\d{2}))?/.exec(String(t).trim());
    if (!m) return NaN;
    return Number(m[1]) * 60 + Number(m[2]);
  };
  const a = parseHm(startTime);
  const b = parseHm(endTime);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return NaN;
  let diff = b - a;
  if (diff <= 0) diff += 24 * 60;
  return diff / 60;
};

export const getStatusColor = (status: string): string => {
  switch (status) {
    case 'pending':
      return '#FFA500';
    case 'confirmed':
      return Platform.OS === 'web' ? '#10b981' : '#2196F3';
    case 'completed':
      return '#4CAF50';
    case 'cancelled':
    case 'rejected':
      return '#F44336';
    default:
      return '#757575';
  }
};

export const getStatusLabel = (status: string): string => {
  if (status === 'confirmed') return 'Confirmed';
  return status.charAt(0).toUpperCase() + status.slice(1);
};

export const getDayOfWeek = (date: Date): string => {
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  return days[date.getDay()];
};

export const isDateInPast = (date: string): boolean => {
  const inputDate = new Date(date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return inputDate < today;
};

export const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};
