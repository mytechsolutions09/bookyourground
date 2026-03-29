import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, Alert, TouchableOpacity } from 'react-native';
import { User, Shield } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { Profile } from '@/types';
import { UserRole } from '@/types/database';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';

export default function ManageUsersScreen() {
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateUserRole = async (userId: string, newRole: UserRole) => {
    Alert.alert(
      'Update User Role',
      `Are you sure you want to change this user's role to ${newRole.replace('_', ' ')}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('profiles')
                .update({ role: newRole })
                .eq('id', userId);

              if (error) throw error;

              Alert.alert('Success', 'User role updated successfully');
              loadUsers();
              setSelectedUser(null);
            } catch (error: any) {
              Alert.alert('Error', error.message);
            }
          },
        },
      ]
    );
  };

  const getRoleLabel = (role: UserRole) => {
    switch (role) {
      case 'ground_owner':
        return 'Ground Owner';
      case 'super_admin':
        return 'Super Admin';
      default:
        return 'Player';
    }
  };

  const getRoleColor = (role: UserRole) => {
    switch (role) {
      case 'ground_owner':
        return '#4CAF50';
      case 'super_admin':
        return '#F44336';
      default:
        return '#2196F3';
    }
  };

  const renderUserActions = (user: Profile) => {
    return (
      <Card style={styles.actionsCard}>
        <Text style={styles.actionsTitle}>Change User Role</Text>
        <View style={styles.actionsButtons}>
          {user.role !== 'user' && (
            <Button
              title="Set as Player"
              onPress={() => updateUserRole(user.id, 'user')}
              variant="outline"
              size="small"
              style={{ flex: 1 }}
            />
          )}
          {user.role !== 'ground_owner' && (
            <Button
              title="Set as Ground Owner"
              onPress={() => updateUserRole(user.id, 'ground_owner')}
              variant="secondary"
              size="small"
              style={{ flex: 1 }}
            />
          )}
        </View>
      </Card>
    );
  };

  const renderUser = ({ item }: { item: Profile }) => (
    <View>
      <TouchableOpacity
        onPress={() => setSelectedUser(selectedUser?.id === item.id ? null : item)}
        activeOpacity={0.8}
      >
        <Card style={styles.userCard}>
          <View style={styles.userHeader}>
            <View style={styles.avatarContainer}>
              <User size={24} color="#2196F3" />
            </View>
            <View style={styles.userInfo}>
              <Text style={styles.userName}>{item.full_name}</Text>
              {item.business_name && (
                <Text style={styles.businessName}>{item.business_name}</Text>
              )}
              {item.phone && (
                <Text style={styles.userPhone}>{item.phone}</Text>
              )}
            </View>
            <View style={[styles.roleBadge, { backgroundColor: getRoleColor(item.role) + '20' }]}>
              {item.role === 'super_admin' && <Shield size={14} color={getRoleColor(item.role)} />}
              <Text style={[styles.roleText, { color: getRoleColor(item.role) }]}>
                {getRoleLabel(item.role)}
              </Text>
            </View>
          </View>
          {item.business_verified && (
            <View style={styles.verifiedBadge}>
              <Text style={styles.verifiedText}>Verified Business</Text>
            </View>
          )}
        </Card>
      </TouchableOpacity>
      {selectedUser?.id === item.id && renderUserActions(item)}
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Manage Users</Text>
        <Text style={styles.subtitle}>{users.length} total users</Text>
      </View>

      <FlatList
        data={users}
        renderItem={renderUser}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={loadUsers} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No users found</Text>
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
  userCard: {
    marginBottom: 12,
  },
  userHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E3F2FD',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#212121',
  },
  businessName: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  userPhone: {
    fontSize: 13,
    color: '#999',
    marginTop: 2,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  roleText: {
    fontSize: 12,
    fontWeight: '600',
  },
  verifiedBadge: {
    marginTop: 8,
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  verifiedText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#4CAF50',
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
    fontSize: 14,
    fontWeight: '600',
    color: '#F57C00',
    marginBottom: 12,
  },
  actionsButtons: {
    flexDirection: 'row',
    gap: 12,
  },
});
