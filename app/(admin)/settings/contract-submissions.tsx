import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, Platform, ScrollView,
  TouchableOpacity, RefreshControl, ActivityIndicator,
  Modal, Image,
} from 'react-native';
import {
  FileText, CheckCircle, Clock, XCircle, Eye,
  User, MapPin, Phone, Mail, Building2, Calendar,
  X, Percent, IndianRupee, Settings2,
} from 'lucide-react-native';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import WebLayout from '@/components/web/WebLayout';
import SettingsSubbar from '@/components/admin/SettingsSubbar';

// ---------- Types ----------
interface ContractSubmission {
  id: string;
  owner_name: string;
  company: string;
  venue_name: string;
  address: string;
  city: string;
  state: string;
  phone: string;
  email: string;
  commission_type: '%' | '₹';
  commission_value: string;
  gst_included: boolean;
  signature_data: string;   // base64 png
  submitted_at: string;
  status: 'pending' | 'approved' | 'rejected';
}

const STATUS_CONFIG = {
  pending:  { color: '#D97706', bg: '#FFFBEB', border: '#FDE68A', icon: Clock,       label: 'Pending'  },
  approved: { color: '#059669', bg: '#ECFDF5', border: '#A7F3D0', icon: CheckCircle, label: 'Approved' },
  rejected: { color: '#DC2626', bg: '#FEF2F2', border: '#FECACA', icon: XCircle,     label: 'Rejected' },
};

// ---------- Detail Modal ----------
function SubmissionModal({
  item,
  onClose,
  onApprove,
  onReject,
}: {
  item: ContractSubmission;
  onClose: () => void;
  onApprove: () => void;
  onReject: () => void;
}) {
  const sc = STATUS_CONFIG[item.status];
  const Icon = sc.icon;

  return (
    <Modal transparent animationType="fade" onRequestClose={onClose}>
      <View style={modal.overlay}>
        <View style={modal.sheet}>
          {/* Header */}
          <View style={modal.header}>
            <View>
              <Text style={modal.title}>{item.venue_name}</Text>
              <Text style={modal.sub}>{item.owner_name}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={modal.closeBtn}>
              <X size={18} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={modal.body}>
            {/* Status badge */}
            <View style={[modal.statusBadge, { backgroundColor: sc.bg, borderColor: sc.border }]}>
              <Icon size={14} color={sc.color} />
              <Text style={[modal.statusText, { color: sc.color }]}>{sc.label}</Text>
            </View>

            {/* Info grid */}
            <View style={modal.grid}>
              <InfoRow icon={<User size={14} color="#6B7280" />} label="Owner Name" value={item.owner_name} />
              {item.company ? <InfoRow icon={<Building2 size={14} color="#6B7280" />} label="Company" value={item.company} /> : null}
              <InfoRow icon={<FileText size={14} color="#6B7280" />} label="Venue" value={item.venue_name} />
              <InfoRow icon={<MapPin size={14} color="#6B7280" />} label="Location" value={`${item.city || '—'}, ${item.state || '—'}`} />
              {item.address ? <InfoRow icon={<MapPin size={14} color="#6B7280" />} label="Address" value={item.address} /> : null}
              <InfoRow icon={<Phone size={14} color="#6B7280" />} label="Phone" value={item.phone} />
              <InfoRow icon={<Mail size={14} color="#6B7280" />} label="Email" value={item.email} />
              <InfoRow
                icon={item.commission_type === '%'
                  ? <Percent size={14} color="#6B7280" />
                  : <IndianRupee size={14} color="#6B7280" />}
                label="Commission"
                value={
                  item.commission_type === '%'
                    ? `${item.commission_value}% per booking`
                    : `₹${item.commission_value} flat fee`
                }
              />
              {item.gst_included && (
                <InfoRow icon={<CheckCircle size={14} color="#10b981" />} label="GST" value="+ GST applicable" />
              )}
              <InfoRow
                icon={<Calendar size={14} color="#6B7280" />}
                label="Submitted"
                value={new Date(item.submitted_at).toLocaleString('en-IN', {
                  dateStyle: 'medium', timeStyle: 'short',
                })}
              />
            </View>

            {/* Signature */}
            {item.signature_data ? (
              <View style={modal.sigSection}>
                <Text style={modal.sigLabel}>Owner Signature</Text>
                <View style={modal.sigBox}>
                  <Image
                    source={{ uri: item.signature_data }}
                    style={modal.sigImage}
                    resizeMode="contain"
                  />
                </View>
              </View>
            ) : null}
          </ScrollView>

          {/* Actions */}
          {item.status === 'pending' && (
            <View style={modal.actions}>
              <TouchableOpacity style={modal.rejectBtn} onPress={onReject}>
                <XCircle size={15} color="#DC2626" />
                <Text style={modal.rejectText}>Reject</Text>
              </TouchableOpacity>
              <TouchableOpacity style={modal.approveBtn} onPress={onApprove}>
                <CheckCircle size={15} color="#fff" />
                <Text style={modal.approveText}>Approve</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <View style={modal.infoRow}>
      {icon}
      <Text style={modal.infoLabel}>{label}</Text>
      <Text style={modal.infoValue}>{value}</Text>
    </View>
  );
}

// ---------- Main Page ----------
export default function ContractSubmissionsPage() {
  const [data, setData]             = useState<ContractSubmission[]>([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selected, setSelected]     = useState<ContractSubmission | null>(null);
  const [filter, setFilter]         = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [comm, setComm]             = useState<{ type: string; value: string; gst: boolean } | null>(null);

  const load = useCallback(async (isRefresh = false) => {
    isRefresh ? setRefreshing(true) : setLoading(true);
    try {
      const { data: rows, error } = await supabase
        .from('contract_submissions')
        .select('*')
        .order('submitted_at', { ascending: false });
      if (error) throw error;
      setData(rows || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
    // Fetch current platform commission
    (async () => {
      try {
        const { data: rows } = await supabase
          .from('platform_settings')
          .select('key,value')
          .in('key', ['contract_commission_type', 'contract_commission_value', 'contract_commission_gst']);
        if (!rows) return;
        const map = Object.fromEntries(rows.map((r: any) => [r.key, r.value]));
        setComm({
          type:  String(map['contract_commission_type'] ?? 'percent'),
          value: String(map['contract_commission_value'] ?? '—'),
          gst:   map['contract_commission_gst'] === true || map['contract_commission_gst'] === 'true',
        });
      } catch (e) { console.error(e); }
    })();
  }, [load]);

  const updateStatus = async (id: string, status: 'approved' | 'rejected') => {
    try {
      const { error } = await supabase
        .from('contract_submissions')
        .update({ status })
        .eq('id', id);
      if (error) throw error;
      setData((prev) => prev.map((r) => r.id === id ? { ...r, status } : r));
      setSelected((prev) => prev ? { ...prev, status } : null);
    } catch (e) {
      console.error(e);
    }
  };

  const filtered = filter === 'all' ? data : data.filter((r) => r.status === filter);

  const counts = {
    all:      data.length,
    pending:  data.filter((r) => r.status === 'pending').length,
    approved: data.filter((r) => r.status === 'approved').length,
    rejected: data.filter((r) => r.status === 'rejected').length,
  };

  const FILTERS: { key: typeof filter; label: string }[] = [
    { key: 'all',      label: `All (${counts.all})`            },
    { key: 'pending',  label: `Pending (${counts.pending})`    },
    { key: 'approved', label: `Approved (${counts.approved})`  },
    { key: 'rejected', label: `Rejected (${counts.rejected})`  },
  ];

  const inner = (
    <View style={styles.container}>
      {/* ── Single toolbar row: title | filters | refresh ── */}
      <View style={styles.toolbar}>
        {/* Left: title */}
        <View style={styles.toolbarLeft}>
          <Text style={styles.title}>Contract Submissions</Text>
          <Text style={styles.subtitle}>Signed venue owner partnership agreements</Text>
        </View>

        {/* Centre: filter pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filters}
          style={styles.filtersScroll}
        >
          {FILTERS.map((f) => (
            <TouchableOpacity
              key={f.key}
              style={[styles.filterPill, filter === f.key && styles.filterPillActive]}
              onPress={() => setFilter(f.key)}
            >
              <Text style={[styles.filterText, filter === f.key && styles.filterTextActive]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Right: refresh */}
        <TouchableOpacity style={styles.refreshBtn} onPress={() => load(true)}>
          <Text style={styles.refreshText}>↻ Refresh</Text>
        </TouchableOpacity>
      </View>

      {/* ── Commission banner ── */}
      {comm && (
        <View style={styles.commBanner}>
          <View style={styles.commBannerLeft}>
            {comm.type === 'percent'
              ? <Percent size={14} color="#059669" />
              : <IndianRupee size={14} color="#059669" />}
            <View>
              <Text style={styles.commBannerLabel}>Active Commission Rate</Text>
              <Text style={styles.commBannerValue}>
                {comm.type === 'percent'
                  ? `${comm.value}% per booking`
                  : `₹${comm.value} flat fee / booking`}
                {comm.gst ? ' + GST' : ''}
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.commBannerBtn}
            onPress={() => router.push('/(admin)/settings/platform-fees' as any)}
          >
            <Settings2 size={12} color="#059669" />
            <Text style={styles.commBannerBtnText}>Edit</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Table */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#10b981" />
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.center}>
          <FileText size={40} color="#D1D5DB" />
          <Text style={styles.emptyText}>No submissions yet</Text>
        </View>
      ) : (
        <ScrollView
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />}
        >
          {/* Table head */}
          <View style={styles.tableHead}>
            <Text style={[styles.col, { flex: 2 }]}>OWNER / VENUE</Text>
            <Text style={[styles.col, { flex: 1.5 }]}>LOCATION</Text>
            <Text style={[styles.col, { flex: 1, textAlign: 'center' }]}>COMMISSION</Text>
            <Text style={[styles.col, { flex: 1, textAlign: 'center' }]}>STATUS</Text>
            <Text style={[styles.col, { flex: 1, textAlign: 'center' }]}>DATE</Text>
            <Text style={[styles.col, { flex: 0.5, textAlign: 'center' }]}>VIEW</Text>
          </View>

          {filtered.map((row) => {
            const sc = STATUS_CONFIG[row.status];
            const StatusIcon = sc.icon;
            return (
              <View key={row.id} style={styles.tableRow}>
                {/* Owner / venue */}
                <View style={[styles.cell, { flex: 2 }]}>
                  <Text style={styles.cellBold} numberOfLines={1}>{row.venue_name}</Text>
                  <Text style={styles.cellSub} numberOfLines={1}>{row.owner_name}</Text>
                </View>

                {/* Location */}
                <Text style={[styles.cellText, { flex: 1.5 }]} numberOfLines={1}>
                  {[row.city, row.state].filter(Boolean).join(', ') || '—'}
                </Text>

                {/* Commission */}
                <View style={[styles.cell, { flex: 1, alignItems: 'center' }]}>
                  <View style={styles.commBadge}>
                    {row.commission_type === '%'
                      ? <Percent size={10} color="#6B7280" />
                      : <IndianRupee size={10} color="#6B7280" />}
                    <Text style={styles.commText}>
                      {row.commission_type === '%'
                        ? `${row.commission_value}%`
                        : `₹${row.commission_value}`}
                    </Text>
                  </View>
                </View>

                {/* Status */}
                <View style={[styles.cell, { flex: 1, alignItems: 'center' }]}>
                  <View style={[styles.statusBadge, { backgroundColor: sc.bg, borderColor: sc.border }]}>
                    <StatusIcon size={10} color={sc.color} />
                    <Text style={[styles.statusText, { color: sc.color }]}>{sc.label}</Text>
                  </View>
                </View>

                {/* Date */}
                <Text style={[styles.cellText, { flex: 1, textAlign: 'center' }]}>
                  {new Date(row.submitted_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })}
                </Text>

                {/* View */}
                <TouchableOpacity
                  style={[styles.cell, { flex: 0.5, alignItems: 'center' }]}
                  onPress={() => setSelected(row)}
                >
                  <Eye size={16} color="#10b981" />
                </TouchableOpacity>
              </View>
            );
          })}
        </ScrollView>
      )}

      {/* Detail modal */}
      {selected && (
        <SubmissionModal
          item={selected}
          onClose={() => setSelected(null)}
          onApprove={() => updateStatus(selected.id, 'approved')}
          onReject={() => updateStatus(selected.id, 'rejected')}
        />
      )}
    </View>
  );

  if (Platform.OS === 'web') {
    return (
      <WebLayout noCard>
        <SettingsSubbar>{inner}</SettingsSubbar>
      </WebLayout>
    );
  }

  return (
    <SettingsSubbar>
      <View style={{ flex: 1, backgroundColor: '#fff' }}>{inner}</View>
    </SettingsSubbar>
  );
}

// ---------- Styles ----------
const styles = StyleSheet.create({
  container:  { flex: 1, backgroundColor: '#fff' },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    gap: 12,
    height: 64,
  },
  toolbarLeft: {
    flexShrink: 0,
    justifyContent: 'center',
  },
  title:      { fontSize: 15, fontWeight: '700', color: '#111827', fontFamily: 'Inter' },
  subtitle:   { fontSize: 11, color: '#6B7280', fontFamily: 'Inter', marginTop: 1 },
  filtersScroll: { flex: 1 },
  filters: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 2,
  },
  filterPill: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#fff',
    alignSelf: 'center',
  },
  filterPillActive: { backgroundColor: '#10b981', borderColor: '#10b981' },
  filterText:       { fontSize: 12, fontWeight: '600', color: '#6B7280', fontFamily: 'Inter' },
  filterTextActive: { color: '#fff' },
  refreshBtn: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8, borderWidth: 1, borderColor: '#E5E7EB', flexShrink: 0 },
  refreshText:{ fontSize: 12, fontWeight: '600', color: '#374151', fontFamily: 'Inter' },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 60 },
  emptyText: { fontSize: 14, color: '#9CA3AF', fontFamily: 'Inter', marginTop: 12 },

  tableHead: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 10,
    backgroundColor: '#F9FAFB', borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
  },
  col: { fontSize: 11, fontWeight: '600', color: '#6B7280', fontFamily: 'Inter', letterSpacing: 0.5 },

  tableRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#F9FAFB',
  },
  cell:     { justifyContent: 'center' },
  cellBold: { fontSize: 13, fontWeight: '600', color: '#111827', fontFamily: 'Inter' },
  cellSub:  { fontSize: 11, color: '#9CA3AF', fontFamily: 'Inter', marginTop: 2 },
  cellText: { fontSize: 12, color: '#374151', fontFamily: 'Inter' },

  commBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#F3F4F6', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6,
  },
  commText: { fontSize: 11, fontWeight: '600', color: '#374151', fontFamily: 'Inter' },

  statusBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1,
  },
  statusText: { fontSize: 10, fontWeight: '700', fontFamily: 'Inter' },

  // Commission banner
  commBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#DCFCE7',
  },
  commBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  commBannerLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#059669',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  commBannerValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#065F46',
    marginTop: 1,
  },
  commBannerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  commBannerBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#059669',
  },
});

const modal = StyleSheet.create({
  overlay:  { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  sheet:    { backgroundColor: '#fff', borderRadius: 20, width: '100%', maxWidth: 520, maxHeight: '90%' },
  header:   {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    padding: 20, borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
  },
  title:    { fontSize: 16, fontWeight: '700', color: '#111827', fontFamily: 'Inter' },
  sub:      { fontSize: 12, color: '#6B7280', fontFamily: 'Inter', marginTop: 2 },
  closeBtn: { padding: 6, borderRadius: 8, backgroundColor: '#F3F4F6' },
  body:     { padding: 20, paddingBottom: 8 },

  statusBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 999, borderWidth: 1, marginBottom: 16,
  },
  statusText: { fontSize: 12, fontWeight: '700', fontFamily: 'Inter' },

  grid:     { gap: 12, marginBottom: 20 },
  infoRow:  { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  infoLabel:{ fontSize: 12, color: '#9CA3AF', fontFamily: 'Inter', width: 88, flexShrink: 0 },
  infoValue:{ fontSize: 12, color: '#111827', fontFamily: 'Inter', flex: 1, fontWeight: '500' },

  sigSection: { marginTop: 4, marginBottom: 16 },
  sigLabel:   { fontSize: 12, fontWeight: '600', color: '#374151', fontFamily: 'Inter', marginBottom: 10 },
  sigBox:     {
    borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 12,
    backgroundColor: '#FAFAFA', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 16, overflow: 'hidden',
  },
  sigImage:   { width: '100%', height: 100 },

  actions:    {
    flexDirection: 'row', gap: 12, padding: 16,
    borderTopWidth: 1, borderTopColor: '#F3F4F6',
  },
  rejectBtn:  {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 12, borderRadius: 12, borderWidth: 1.5, borderColor: '#FECACA',
    backgroundColor: '#FEF2F2',
  },
  rejectText: { fontSize: 14, fontWeight: '700', color: '#DC2626', fontFamily: 'Inter' },
  approveBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 12, borderRadius: 12, backgroundColor: '#10b981',
  },
  approveText:{ fontSize: 14, fontWeight: '700', color: '#fff', fontFamily: 'Inter' },
});
