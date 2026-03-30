import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, TouchableOpacity, Platform } from 'react-native';
import { router } from 'expo-router';
import { Plus } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { GroundWithImages } from '@/types';
import GroundCard from '@/components/grounds/GroundCard';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import TimeSlotsEditor from '@/components/availability/TimeSlotsEditor';

export default function OwnerGroundsScreen() {
  const { user } = useAuth();
  const [grounds, setGrounds] = useState<GroundWithImages[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGroundId, setSelectedGroundId] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      loadGrounds();
    }
  }, [user]);

  const loadGrounds = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('grounds')
        .select(`
          *,
          ground_images(*),
          reviews(rating)
        `)
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setGrounds(data || []);
    } catch (error) {
      console.error('Error loading grounds:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>My Grounds</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => router.push('/(owner)/add-ground')}
        >
          <Plus size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={grounds}
        renderItem={({ item }) => (
          <View>
            <GroundCard
              ground={item}
              onPress={() =>
                setSelectedGroundId((prev) => (prev === item.id ? null : item.id))
              }
              showBookingSchedule
            />

            {selectedGroundId === item.id ? (
              <Card style={styles.editorCard}>
                <Text style={styles.editorTitle}>Availability (Days & Slots)</Text>
                <TimeSlotsEditor
                  groundId={item.id}
                  pitchType={item.pitch_type}
                  canEdit
                />
                <Button
                  title="View ground details"
                  onPress={() => router.push(`/grounds/${item.id}`)}
                  variant="outline"
                  size="small"
                  fullWidth
                  style={styles.viewDetailsButton}
                />
              </Card>
            ) : null}
          </View>
        )}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={loadGrounds} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>You haven't added any grounds yet</Text>
            <Button
              title="Add Your First Ground"
              onPress={() => router.push('/(owner)/add-ground')}
              style={styles.emptyButton}
            />
          </View>
        }
      />
    </View>
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
    paddingTop: 48,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#212121',
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Platform.OS === 'web' ? '#dc8d3c' : '#2196F3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: {
    padding: 16,
  },
  editorCard: {
    marginBottom: 16,
    padding: 14,
    backgroundColor: '#FFF9E6',
  },
  editorTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#212121',
    marginBottom: 10,
  },
  viewDetailsButton: {
    marginTop: 10,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 24,
    textAlign: 'center',
  },
  emptyButton: {
    marginTop: 16,
  },
});
