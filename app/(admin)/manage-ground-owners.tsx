import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, TouchableOpacity, Platform } from 'react-native';
import { supabase } from '@/lib/supabase';
import { Profile } from '@/types';
import Card from '@/components/ui/Card';
import WebLayout from '@/components/web/WebLayout';
import { router } from 'expo-router';
import { Building2, Users } from 'lucide-react-native';

type OwnerRow = Profile & {
  pendingGroundsCount?: number;
};

export default function ManageGroundOwnersScreen() {
  const [owners, setOwners] = useState<OwnerRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadOwners();
  }, []);

  const loadOwners = async () => {
    try {
      setLoading(true);

      const { data: ownersRes, error: ownersError } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'ground_owner')
        .order('created_at', { ascending: false });

      if (ownersError) throw ownersError;

      const ownersData = (ownersRes || []) as Profile[];

      if (ownersData.length === 0) {
        setOwners([]);
        return;
      }

      const ownerIds = ownersData.map((o) => o.id);

      // Fetch all pending grounds for these owners, then count on the client.
      let pendingCounts = new Map<string, number>();
      try {
        const { data: pendingRes, error: pendingError } = await supabase
          .from('grounds')
          .select('owner_id')
          .eq('approved', false)
          .in('owner_id', ownerIds);

        if (!pendingError) {
          for (const row of pendingRes || []) {
            const key = row.owner_id as string;
            pendingCounts.set(key, (pendingCounts.get(key) ?? 0) + 1);
          }
        }
      } catch (e) {
        console.error('Error loading pending grounds counts:', e);
        // Fall back to 0 pending counts if RLS prevents reading pending grounds.
        pendingCounts = new Map<string, number>();
      }

      const merged = ownersData.map((o) => ({
        ...o,
        pendingGroundsCount: pendingCounts.get(o.id) ?? 0,
      }));

      setOwners(merged);
    } catch (e) {
      console.error('Error loading ground owners:', e);
    } finally {
      setLoading(false);
    }
  };

  const content = (
    <View style={styles.container}>
      <View style={[styles.header, Platform.OS === 'web' && styles.webHeader]}>
        <Text style={styles.title}>Ground Owners</Text>
        <Text style={styles.subtitle}>{owners.length} total</Text>
      </View>

      <FlatList
        data={owners}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={loadOwners} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No ground owners found</Text>
          </View>
        }
        renderItem={({ item }) => (
          <Card style={styles.ownerCard}>
            <View style={styles.ownerHeader}>
              <View style={styles.iconPill}>
                <Users size={18} color={Platform.OS === 'web' ? '#dc8d3c' : '#2196F3'} />
              </View>
              <View style={styles.ownerInfo}>
                <Text style={styles.ownerName}>{item.business_name || item.full_name}</Text>
                {item.phone && <Text style={styles.ownerPhone}>{item.phone}</Text>}
              </View>
            </View>

            <View style={styles.metaRow}>
              <View style={styles.metaItem}>
                <Text style={styles.metaLabel}>Pending Grounds</Text>
                <Text style={styles.metaValue}>{item.pendingGroundsCount ?? 0}</Text>
              </View>
              <View style={styles.metaItem}>
                <Text style={styles.metaLabel}>Manage</Text>
                <Text style={styles.metaValue}>(Approve)</Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => router.push(`/(admin)/grounds?ownerId=${item.id}`)}
            >
              <Building2 size={18} color="#FFFFFF" />
              <Text style={styles.actionButtonText}>Review Grounds</Text>
            </TouchableOpacity>
          </Card>
        )}
      />
    </View>
  );

  if (Platform.OS === 'web') {
    return <WebLayout>{content}</WebLayout>;
  }

  return content;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    paddingTop: 48,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  webHeader: {
    paddingTop: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#212121',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  list: {
    padding: 16,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
  },
  ownerCard: {
    marginBottom: 12,
  },
  ownerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
  },
  iconPill: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Platform.OS === 'web' ? 'rgba(220,141,60,0.18)' : '#E3F2FD',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ownerInfo: {
    flex: 1,
  },
  ownerName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#212121',
  },
  ownerPhone: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  metaRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  metaItem: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  metaLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '700',
    marginBottom: 6,
  },
  metaValue: {
    fontSize: 18,
    fontWeight: '800',
    color: Platform.OS === 'web' ? '#dc8d3c' : '#2196F3',
  },
  actionButton: {
    backgroundColor: Platform.OS === 'web' ? '#dc8d3c' : '#2196F3',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
});

