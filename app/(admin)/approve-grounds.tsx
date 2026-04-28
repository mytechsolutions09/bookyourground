import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, Alert, Platform } from 'react-native';
import { supabase } from '@/lib/supabase';
import { GroundWithImages } from '@/types';
import GroundCard from '@/components/grounds/GroundCard';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import WebLayout from '@/components/web/WebLayout';
import MobileAppNavbar from '@/components/MobileAppNavbar';
import { useLocalSearchParams } from 'expo-router';

export default function ApproveGroundsScreen() {
  const params = useLocalSearchParams();
  const ownerIdParam = Array.isArray(params.ownerId) ? params.ownerId[0] : params.ownerId;

  const [grounds, setGrounds] = useState<GroundWithImages[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGround, setSelectedGround] = useState<GroundWithImages | null>(null);

  useEffect(() => {
    loadGrounds();
  }, [ownerIdParam]);

  const loadGrounds = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('grounds')
        .select(`
          *,
          ground_images(*),
          owner:profiles(full_name, phone, business_name)
        `)
        .eq('approved', false);

      if (ownerIdParam) query = query.eq('owner_id', ownerIdParam);

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;
      setGrounds(data || []);
    } catch (error) {
      console.error('Error loading grounds:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateGroundStatus = async (groundId: string, approved: boolean) => {
    try {
      const { error } = await supabase
        .from('grounds')
        .update({ approved })
        .eq('id', groundId);

      if (error) throw error;

      if (Platform.OS === 'web') {
        alert(`Ground ${approved ? 'approved' : 'rejected'} successfully`);
      } else {
        Alert.alert('Success', `Ground ${approved ? 'approved' : 'rejected'} successfully`);
      }
      loadGrounds();
      setSelectedGround(null);
    } catch (error: any) {
      if (Platform.OS === 'web') {
        alert('Error: ' + error.message);
      } else {
        Alert.alert('Error', error.message);
      }
    }
  };

  const renderGroundActions = (ground: GroundWithImages) => {
    return (
      <Card style={styles.actionsCard}>
        <Text style={styles.actionsTitle}>Review Ground</Text>
        {ground.owner && (
          <View style={styles.ownerInfo}>
            <Text style={styles.ownerLabel}>Owner</Text>
            <Text style={styles.ownerText}>
              {ground.owner.business_name || ground.owner.full_name}
            </Text>
            {ground.owner.phone && (
              <Text style={styles.ownerContact}>{ground.owner.phone}</Text>
            )}
          </View>
        )}
        <View style={styles.actionsButtons}>
          <Button
            title="Approve"
            onPress={() => updateGroundStatus(ground.id, true)}
            variant="secondary"
            size="small"
            style={{ flex: 1 }}
          />
          <Button
            title="Reject"
            onPress={() => updateGroundStatus(ground.id, false)}
            variant="danger"
            size="small"
            style={{ flex: 1 }}
          />
        </View>
      </Card>
    );
  };

  const content = (
    <View style={styles.container}>
      {Platform.OS === 'web' && (
        <View style={[styles.header, styles.webHeader]}>
          <Text style={styles.title}>Approve Grounds</Text>
          <Text style={styles.subtitle}>
            {grounds.length} pending approval{grounds.length !== 1 ? 's' : ''}
          </Text>
        </View>
      )}

      <FlatList
        data={grounds}
        renderItem={({ item }) => (
          <View>
            <GroundCard
              ground={item}
              showBookingSchedule
              onPress={() => setSelectedGround(selectedGround?.id === item.id ? null : item)}
            />
            {selectedGround?.id === item.id && renderGroundActions(item)}
          </View>
        )}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={loadGrounds} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No grounds pending approval</Text>
          </View>
        }
      />
    </View>
  );

  return (
    <>
      {Platform.OS === 'web' ? (
        <WebLayout>{content}</WebLayout>
      ) : (
        <View style={{ flex: 1, backgroundColor: '#F5F5F5' }}>
          <MobileAppNavbar title="APPROVE GROUNDS" titleColor="#10b981" />
          {content}
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    backgroundColor: '#FFFFFF',
    padding: 16,
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
  actionsCard: {
    marginTop: -4,
    marginBottom: 12,
    backgroundColor: '#FFF9E6',
  },
  actionsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#212121',
    marginBottom: 12,
  },
  ownerInfo: {
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  ownerLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  ownerText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  ownerContact: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  actionsButtons: {
    flexDirection: 'row',
    gap: 12,
  },
});
