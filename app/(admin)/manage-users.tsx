import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, Alert, TouchableOpacity, Platform, TextInput } from 'react-native';
import { User, Shield, Search, X } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { Profile } from '@/types';
import { UserRole } from '@/types/database';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import WebLayout from '@/components/web/WebLayout';
import { useAuth } from '@/contexts/AuthContext';

export default function ManageUsersScreen() {
  const { user } = useAuth();
  const [users, setUsers] = useState<Profile[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (user) loadUsers();
  }, [user]);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredUsers(users);
    } else {
      const query = searchQuery.toLowerCase();
      setFilteredUsers(
        users.filter(u => 
          u.full_name.toLowerCase().includes(query) ||
          (u.phone && u.phone.includes(query)) ||
          (u as any).email?.toLowerCase().includes(query) ||
          u.business_name?.toLowerCase().includes(query)
        )
      );
    }
  }, [searchQuery, users]);

  const loadUsers = async () => {
    try {
      setErrorMessage(null);
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      const rows = (data || []) as Profile[];
      setUsers(rows);
      setFilteredUsers(rows);
    } catch (error) {
      console.error('Error loading users:', error);
      setErrorMessage('Failed to load users. Please check your connection/auth.');
    } finally {
      setLoading(false);
    }
  };

  const updateUserRole = async (userId: string, newRole: UserRole) => {
    Alert.alert(
      'Update User Role',
      `Are you sure you want to change this user's role to ${getRoleLabel(newRole)}?`,
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
              style={{ flex: 1, minWidth: 140 }}
            />
          )}
          {user.role !== 'ground_owner' && (
            <Button
              title="Set as Ground Owner"
              onPress={() => updateUserRole(user.id, 'ground_owner')}
              variant="primary"
              size="small"
              style={{ flex: 1, minWidth: 140 }}
            />
          )}
          {user.role !== 'super_admin' && (
            <Button
              title="Set as Super Admin"
              onPress={() => updateUserRole(user.id, 'super_admin')}
              variant="outline"
              size="small"
              style={{ flex: 1, minWidth: 140 }}
            />
          )}
        </View>
      </Card>
    );
  };

  const renderUser = ({ item }: { item: Profile }) => (
    <View style={styles.userContainer}>
      <TouchableOpacity
        onPress={() => setSelectedUser(selectedUser?.id === item.id ? null : item)}
        activeOpacity={0.8}
      >
        <Card style={styles.userCard}>
          <View style={styles.userHeader}>
            <View style={styles.avatarContainer}>
                <View style={styles.avatarCircle}>
                    <User size={24} color="#10b981" />
                </View>
            </View>
            <View style={styles.userInfo}>
              <Text style={styles.userName}>{item.full_name}</Text>
              {(item as any).email ? (
                <Text style={styles.userEmail}>{(item as any).email}</Text>
              ) : null}
              {item.phone && (
                <Text style={styles.userPhone}>{item.phone}</Text>
              )}
              {item.business_name && (
                <Text style={styles.businessName}>{item.business_name}</Text>
              )}
            </View>
            <View style={styles.roleBadgeContainer}>
                <View style={[styles.roleBadge, { backgroundColor: item.role === 'super_admin' ? '#fee2e2' : '#dcfce7' }]}>
                    <Text style={[styles.roleText, { color: item.role === 'super_admin' ? '#ef4444' : '#10b981' }]}>
                        {getRoleLabel(item.role)}
                    </Text>
                </View>
            </View>
          </View>
        </Card>
      </TouchableOpacity>
      {selectedUser?.id === item.id && renderUserActions(item)}
    </View>
  );

  const content = (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
            <Text style={styles.title}>Manage Users</Text>
            <Text style={styles.subtitle}>{users.length} registered users</Text>
        </View>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchInputWrapper}>
          <Search size={20} color="#6b7280" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name, email or phone..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#9ca3af"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <X size={20} color="#6b7280" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {errorMessage ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{errorMessage}</Text>
        </View>
      ) : null}

      <FlatList
        data={filteredUsers}
        renderItem={renderUser}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={loadUsers} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>{loading ? 'Loading users...' : 'No users found'}</Text>
          </View>
        }
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
    backgroundColor: '#FAFAFA',
  },
  header: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    paddingTop: Platform.OS === 'ios' ? 60 : 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#111827',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
    fontWeight: '500',
  },
  searchContainer: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 40,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
    fontWeight: '500',
  },
  list: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: 40,
  },
  userContainer: {
    marginBottom: 8,
  },
  userCard: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F0F0F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  userHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    marginRight: 12,
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#1f2937',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userInfo: {
    flex: 1,
    paddingTop: 0,
  },
  userName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  userEmail: {
    fontSize: 13,
    color: '#6B7280',
  },
  userPhone: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  businessName: {
    fontSize: 13,
    color: '#10b981',
    fontWeight: '600',
    marginTop: 2,
  },
  roleBadgeContainer: {
    alignItems: 'flex-end',
  },
  roleBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  roleText: {
    fontSize: 12,
    fontWeight: '700',
  },
  actionsCard: {
    marginTop: -8,
    marginHorizontal: 8,
    padding: 16,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FEF3C7',
    borderTopWidth: 0,
    zIndex: -1,
  },
  actionsTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#B45309',
    marginBottom: 16,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  actionsButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  errorContainer: {
    margin: 16,
    padding: 12,
    backgroundColor: '#FEF2F2',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  errorText: {
    color: '#DC2626',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: '#9CA3AF',
    fontWeight: '500',
  },
});
