import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Platform, ScrollView, RefreshControl } from 'react-native';
import WebLayout from '@/components/web/WebLayout';
import { supabase } from '@/lib/supabase';
import Card from '@/components/ui/Card';
import { formatCurrency } from '@/utils/helpers';
import { CheckCircle, XCircle, Clock, Eye, Info, X } from 'lucide-react-native';
import { TouchableOpacity, ActivityIndicator, Modal } from 'react-native';

interface WithdrawalRow {
  id: string;
  amount: number;
  status: string;
  created_at: string;
  account_details: string;
  owner: {
    full_name: string | null;
    email: string | null;
  } | null;
}

function AdminWithdrawalsInner() {
  const [rows, setRows] = useState<WithdrawalRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<WithdrawalRow | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('withdrawals')
        .select(`
          id,
          amount,
          status,
          created_at,
          account_details,
          owner:profiles!inner(full_name,email)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRows((data ?? []) as any);
    } catch (e) {
      console.error('Error loading withdrawals for admin:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    try {
      setUpdatingId(id);
      const { error } = await supabase
        .from('withdrawals')
        .update({ status: newStatus })
        .eq('id', id);

      if (error) throw error;
      
      // Update local state
      setRows(rows.map(r => r.id === id ? { ...r, status: newStatus } : r));
    } catch (e) {
      console.error('Error updating status:', e);
      alert('Failed to update status');
    } finally {
      setUpdatingId(null);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return '#22C55E';
      case 'failed': return '#EF4444';
      case 'processing': return '#3B82F6';
      default: return '#EAB308';
    }
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={loadData} />}
    >
      <View style={styles.inner}>
        <Card style={styles.panel}>
          <Text style={styles.title}>Withdrawals</Text>
          <Text style={styles.subtitle}>List of withdrawal requests from ground owners.</Text>

          {rows.length === 0 ? (
            <Text style={styles.emptyText}>No withdrawal requests yet.</Text>
          ) : (
            <View style={styles.table}>
              <View style={styles.headerRow}>
                <Text style={[styles.headerCell, styles.colOwner]}>Owner</Text>
                <Text style={[styles.headerCell, styles.colAmount]}>Amount</Text>
                <Text style={[styles.headerCell, styles.colStatus]}>Status</Text>
                <Text style={[styles.headerCell, styles.colDate]}>Requested at</Text>
                <Text style={[styles.headerCell, styles.colActions]}>Actions</Text>
              </View>

              {rows.map((row) => (
                <View key={row.id} style={styles.row}>
                  <View style={[styles.cell, styles.colOwner]}>
                    <Text style={styles.ownerName}>
                      {row.owner?.full_name || 'Unknown owner'}
                    </Text>
                    <Text style={styles.ownerEmail}>{row.owner?.email}</Text>
                  </View>
                  <Text style={[styles.cell, styles.colAmount]}>
                    {formatCurrency(row.amount || 0)}
                  </Text>
                  <Text style={[styles.cell, styles.colStatus]}>{row.status}</Text>
                  <Text style={[styles.cell, styles.colDate]}>
                    {new Date(row.created_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </Text>
                  <View style={[styles.cell, styles.colActions]}>
                    <TouchableOpacity 
                      style={styles.actionBtn} 
                      onPress={() => setSelectedWithdrawal(row)}
                      title="View Details"
                    >
                      <Eye size={18} color="#64748B" />
                    </TouchableOpacity>

                    {row.status === 'pending' && (
                      <TouchableOpacity 
                        style={styles.actionBtn}
                        onPress={() => handleUpdateStatus(row.id, 'processing')}
                        disabled={!!updatingId}
                      >
                        <Clock size={18} color="#3B82F6" />
                      </TouchableOpacity>
                    )}

                    {row.status === 'processing' && (
                      <View style={{ flexDirection: 'row', gap: 8 }}>
                        <TouchableOpacity 
                          style={styles.actionBtn}
                          onPress={() => handleUpdateStatus(row.id, 'completed')}
                          disabled={!!updatingId}
                        >
                          <CheckCircle size={18} color="#22C55E" />
                        </TouchableOpacity>
                        <TouchableOpacity 
                          style={styles.actionBtn}
                          onPress={() => handleUpdateStatus(row.id, 'failed')}
                          disabled={!!updatingId}
                        >
                          <XCircle size={18} color="#EF4444" />
                        </TouchableOpacity>
                      </View>
                    )}
                    
                    {updatingId === row.id && (
                      <ActivityIndicator size="small" color="#01b854" />
                    )}
                  </View>
                </View>
              ))}
            </View>
          )}
        </Card>
      </View>

      {/* Details Modal */}
      <Modal
        visible={!!selectedWithdrawal}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedWithdrawal(null)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity 
            style={styles.modalBackdrop} 
            activeOpacity={1} 
            onPress={() => setSelectedWithdrawal(null)} 
          />
          <Card style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Withdrawal Details</Text>
              <TouchableOpacity onPress={() => setSelectedWithdrawal(null)}>
                <X size={24} color="#111827" />
              </TouchableOpacity>
            </View>

            {selectedWithdrawal && (
              <View style={styles.modalBody}>
                <View style={styles.detailGroup}>
                  <Text style={styles.detailLabel}>Owner</Text>
                  <Text style={styles.detailValue}>{selectedWithdrawal.owner?.full_name}</Text>
                  <Text style={styles.detailSubValue}>{selectedWithdrawal.owner?.email}</Text>
                </View>

                <View style={styles.detailGroup}>
                  <Text style={styles.detailLabel}>Amount</Text>
                  <Text style={[styles.detailValue, { color: '#01b854', fontSize: 24 }]}>
                    {formatCurrency(selectedWithdrawal.amount)}
                  </Text>
                </View>

                <View style={styles.detailGroup}>
                  <Text style={styles.detailLabel}>Bank Account Details</Text>
                  <View style={styles.bankCard}>
                    {(() => {
                      try {
                        const details = typeof selectedWithdrawal.account_details === 'string' 
                          ? JSON.parse(selectedWithdrawal.account_details) 
                          : selectedWithdrawal.account_details;
                        return (
                          <>
                            <Text style={styles.bankText}>Bank: <Text style={styles.bankValue}>{details.bank_name || 'N/A'}</Text></Text>
                            <Text style={styles.bankText}>A/C No: <Text style={styles.bankValue}>{details.account_number || 'N/A'}</Text></Text>
                            <Text style={styles.bankText}>IFSC: <Text style={styles.bankValue}>{details.ifsc_code || 'N/A'}</Text></Text>
                          </>
                        );
                      } catch (e) {
                        return <Text style={styles.bankText}>Error parsing account details.</Text>;
                      }
                    })()}
                  </View>
                </View>

                <View style={styles.detailGroup}>
                  <Text style={styles.detailLabel}>Status</Text>
                  <View style={[styles.statusBadgeLarge, { backgroundColor: getStatusColor(selectedWithdrawal.status) + '20' }]}>
                    <Text style={[styles.statusTextLarge, { color: getStatusColor(selectedWithdrawal.status) }]}>
                      {selectedWithdrawal.status}
                    </Text>
                  </View>
                </View>
              </View>
            )}
          </Card>
        </View>
      </Modal>
    </ScrollView>
  );
}

export default function AdminWithdrawalsScreen() {
  if (Platform.OS === 'web') {
    return (
      <WebLayout>
        <AdminWithdrawalsInner />
      </WebLayout>
    );
  }

  return <AdminWithdrawalsInner />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    padding: 16,
    ...Platform.select({
      web: {
        paddingLeft: 0,
        paddingRight: 0,
        paddingTop: 0,
      },
    }),
  },
  inner: {
    maxWidth: 1200,
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
  },
  panel: {
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
  },
  table: {
    marginTop: 4,
  },
  headerRow: {
    flexDirection: 'row',
    paddingVertical: 8,
  },
  headerCell: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6B7280',
    textTransform: 'uppercase',
  },
  row: {
    flexDirection: 'row',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  cell: {
    fontSize: 13,
    color: '#111827',
  },
  colOwner: {
    flex: 2,
  },
  colAmount: {
    flex: 1,
  },
  colStatus: {
    flex: 1,
    textTransform: 'capitalize',
  },
  colDate: {
    flex: 1.4,
  },
  ownerName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  ownerEmail: {
    fontSize: 12,
    color: '#6B7280',
  },
  colActions: {
    flex: 1.2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionBtn: {
    padding: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  modalContent: {
    width: '100%',
    maxWidth: 500,
    padding: 24,
    borderRadius: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
  },
  modalBody: {
    gap: 16,
  },
  detailGroup: {
    gap: 4,
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    textTransform: 'uppercase',
  },
  detailValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  detailSubValue: {
    fontSize: 14,
    color: '#4B5563',
  },
  bankCard: {
    backgroundColor: '#F3F4F6',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  bankText: {
    fontSize: 14,
    color: '#4B5563',
    fontWeight: '500',
  },
  bankValue: {
    color: '#111827',
    fontWeight: '700',
  },
  statusBadgeLarge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  statusTextLarge: {
    fontSize: 14,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
});

