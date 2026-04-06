import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, Alert, TouchableOpacity, Platform, TextInput } from 'react-native';
import { User, Shield, Search, X, Mail, Phone, Calendar, ChevronRight, UserCircle2 } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { Profile } from '@/types';
import { UserRole } from '@/types/database';
import Card from '@/components/ui/Card';
import WebLayout from '@/components/web/WebLayout';
import { useAuth } from '@/contexts/AuthContext';

export default function ManageUsersScreen() {
  const { user } = useAuth();
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (user) loadUsers();
  }, [user]);

  const loadUsers = async () => {
    try {
      setErrorMessage(null);
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers((data || []) as Profile[]);
    } catch (error) {
      console.error('Error loading users:', error);
      setErrorMessage('Failed to load users. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return users;
    return users.filter(u => {
      const name = u.full_name?.toLowerCase() || '';
      const email = u.email?.toLowerCase() || '';
      const phone = u.phone || '';
      const business = u.business_name?.toLowerCase() || '';
      
      return name.includes(query) || 
             email.includes(query) || 
             phone.includes(query) || 
             business.includes(query);
    });
  }, [users, searchQuery]);

  const updateUserRole = async (userId: string, newRole: UserRole) => {
    const roleLabel = getRoleLabel(newRole);
    
    const performUpdate = async () => {
        try {
          const { error } = await supabase
            .from('profiles')
            .update({ role: newRole })
            .eq('id', userId);

          if (error) throw error;
          
          if (Platform.OS !== 'web') Alert.alert('Success', 'User role updated successfully');
          loadUsers();
          setSelectedUserId(null);
        } catch (error: any) {
          Alert.alert('Error', error.message);
        }
    };

    if (Platform.OS === 'web') {
        if (window.confirm(`Are you sure you want to change this user's role to ${roleLabel}?`)) {
            performUpdate();
        }
    } else {
        Alert.alert(
            'Update User Role',
            `Are you sure you want to change this user's role to ${roleLabel}?`,
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Confirm', onPress: performUpdate },
            ]
          );
    }
  };

  const getRoleLabel = (role: UserRole) => {
    switch (role) {
      case 'ground_owner': return 'Ground Owner';
      case 'super_admin': return 'Super Admin';
      default: return 'Player';
    }
  };

  const renderWebUser = ({ item }: { item: Profile }) => {
    const isExpanded = selectedUserId === item.id;
    
    return (
      <View key={item.id}>
        <TouchableOpacity 
          activeOpacity={0.8}
          onPress={() => setSelectedUserId(isExpanded ? null : item.id)}
          style={[styles.webRow, isExpanded && styles.rowExpanded]}
        >
          <View style={[styles.cell, styles.colUser]}>
            <View style={styles.userProfileInfo}>
               <View style={styles.avatarCircle}>
                  <User size={18} color="#10b981" />
               </View>
               <View>
                  <Text style={styles.userNameText}>{item.full_name}</Text>
                  {item.business_name && <Text style={styles.userBusinessText}>{item.business_name}</Text>}
               </View>
            </View>
          </View>

          <View style={[styles.cell, styles.colContact]}>
             <Text style={styles.contactText}>{item.email || '—'}</Text>
             <Text style={styles.subContactText}>{item.phone || 'No phone'}</Text>
          </View>

          <View style={[styles.cell, styles.colRole]}>
             <View style={[styles.roleBadge, 
                item.role === 'super_admin' ? styles.badgeAdmin : 
                item.role === 'ground_owner' ? styles.badgeOwner : styles.badgePlayer
             ]}>
                <Text style={[styles.roleText, 
                    item.role === 'super_admin' ? styles.textAdmin : 
                    item.role === 'ground_owner' ? styles.textOwner : styles.textPlayer
                ]}>
                    {getRoleLabel(item.role)}
                </Text>
             </View>
          </View>

          <View style={[styles.cell, styles.colActions]}>
             <View style={styles.webIconButton}>
                <Text style={styles.webIconButtonText}>Manage Role</Text>
                <ChevronRight size={14} color="#10b981" />
             </View>
          </View>
        </TouchableOpacity>

        {isExpanded && (
          <View style={styles.expandedContent}>
             <Text style={styles.expandedTitle}>Change Access Level</Text>
             <View style={styles.roleGrid}>
                {[
                  { id: 'user' as UserRole, label: 'Player', icon: UserCircle2, color: '#6B7280' },
                  { id: 'ground_owner' as UserRole, label: 'Ground Owner', icon: Building2, color: '#10b981' },
                  { id: 'super_admin' as UserRole, label: 'Super Admin', icon: Shield, color: '#EF4444' }
                ].map(role => (
                  <TouchableOpacity
                    key={role.id}
                    style={[styles.roleOption, item.role === role.id && styles.activeRoleOption]}
                    onPress={() => item.role !== role.id && updateUserRole(item.id, role.id)}
                  >
                     <Text style={[styles.roleOptionLabel, item.role === role.id && styles.activeRoleOptionLabel]}>
                        Set as {role.label}
                     </Text>
                  </TouchableOpacity>
                ))}
             </View>
             <View style={styles.footerMeta}>
                <Calendar size={12} color="#94A3B8" />
                <Text style={styles.footerMetaText}>Account Created: {new Date(item.created_at).toLocaleDateString()}</Text>
             </View>
          </View>
        )}
      </View>
    );
  };

  const renderMobileUser = ({ item }: { item: Profile }) => (
    <View style={styles.mobileContainer}>
      <Card style={styles.userCard}>
        <View style={styles.userHeader}>
          <View style={styles.avatarCircleMobile}>
            <User size={24} color="#10b981" />
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{item.full_name}</Text>
            <Text style={styles.userEmail}>{item.email}</Text>
          </View>
          <View style={[styles.mobileRoleBadge, item.role === 'super_admin' ? styles.badgeAdmin : item.role === 'ground_owner' ? styles.badgeOwner : styles.badgePlayer]}>
             <Text style={[styles.mobileRoleText, item.role === 'super_admin' ? styles.textAdmin : item.role === 'ground_owner' ? styles.textOwner : styles.textPlayer]}>
                {item.role.charAt(0).toUpperCase()}
             </Text>
          </View>
        </View>

        <View style={styles.mobileActions}>
            <TouchableOpacity 
              style={styles.mobileButton} 
              onPress={() => setSelectedUserId(selectedUserId === item.id ? null : item.id)}
            >
                <Text style={styles.mobileButtonText}>Update Role</Text>
            </TouchableOpacity>
        </View>

        {selectedUserId === item.id && (
            <View style={styles.mobileRolePicker}>
                <TouchableOpacity onPress={() => updateUserRole(item.id, 'user')} style={styles.pickerItem}><Text>Player</Text></TouchableOpacity>
                <TouchableOpacity onPress={() => updateUserRole(item.id, 'ground_owner')} style={styles.pickerItem}><Text>Owner</Text></TouchableOpacity>
                <TouchableOpacity onPress={() => updateUserRole(item.id, 'super_admin')} style={styles.pickerItem}><Text>Admin</Text></TouchableOpacity>
            </View>
        )}
      </Card>
    </View>
  );

  const content = (
    <View style={styles.container}>
      <View style={styles.headerArea}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.title}>Manage Users</Text>
            <Text style={styles.subtitle}>{users.length} registered platform users</Text>
          </View>
          
          <View style={styles.searchContainer}>
            <Search size={18} color="#6B7280" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by name, email or phone..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearButton}>
                <X size={16} color="#9CA3AF" />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>

      {Platform.OS === 'web' && (
        <View style={styles.tableHeader}>
           <Text style={[styles.headerLabel, styles.colUser]}>User Profile</Text>
           <Text style={[styles.headerLabel, styles.colContact]}>Contact info</Text>
           <Text style={[styles.headerLabel, styles.colRole]}>System Role</Text>
           <Text style={[styles.headerLabel, styles.colActions, { textAlign: 'right' }]}>Manage</Text>
        </View>
      )}

      {errorMessage && (
        <View style={styles.errorBanner}><Text style={styles.errorText}>{errorMessage}</Text></View>
      )}

      <FlatList
        data={filteredUsers}
        renderItem={Platform.OS === 'web' ? renderWebUser : renderMobileUser}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={loadUsers} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <UserCircle2 size={48} color="#E5E7EB" />
            <Text style={styles.emptyText}>{loading ? 'Fetching users...' : 'No users found matching your query.'}</Text>
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

// Reuse the Building2 icon locally if needed or import correctly
const Building2 = (props: any) => <View {...props} />;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  headerArea: {
    padding: 24,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 20,
    flexWrap: 'wrap',
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#111827',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 4,
    fontWeight: '500',
  },
  searchContainer: {
    flex: 1,
    minWidth: 300,
    maxWidth: 450,
    height: 42,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#111827',
    fontWeight: '500',
    outlineStyle: 'none', // Removed web focus ring
  } as any,
  clearButton: {
    padding: 4,
    marginLeft: 6,
  },
  tableHeader: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
  },
  headerLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  colUser: { flex: 2 },
  colContact: { flex: 1.5 },
  colRole: { flex: 1, alignItems: 'center' },
  colActions: { flex: 1 },
  
  list: {
    padding: 16,
  },
  webRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  rowExpanded: {
    borderColor: '#10b981',
    backgroundColor: '#F0FDF4',
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    marginBottom: 0,
    borderBottomWidth: 0,
  },
  cell: {
    justifyContent: 'center',
  },
  userProfileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarCircle: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userNameText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  userBusinessText: {
    fontSize: 12,
    color: '#10b981',
    fontWeight: '600',
  },
  contactText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
  },
  subContactText: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  roleBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    alignItems: 'center',
  },
  badgeAdmin: { backgroundColor: '#FEF2F2' },
  badgeOwner: { backgroundColor: '#ECFDF5' },
  badgePlayer: { backgroundColor: '#EFF6FF' },
  roleText: {
    fontSize: 11,
    fontWeight: '700',
  },
  textAdmin: { color: '#EF4444' },
  textOwner: { color: '#10b981' },
  textPlayer: { color: '#3B82F6' },
  
  webIconButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 6,
  },
  webIconButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#10b981',
  },
  expandedContent: {
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#10b981',
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    marginBottom: 10,
    marginTop: -1,
  },
  expandedTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#065F46',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  roleGrid: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
  },
  roleOption: {
    flex: 1,
    minWidth: 140,
    height: 38,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#D1FAE5',
  },
  activeRoleOption: {
    backgroundColor: '#10b981',
    borderColor: '#10b981',
  },
  roleOptionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#374151',
  },
  activeRoleOptionLabel: {
    color: '#FFFFFF',
  },
  footerMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 16,
  },
  footerMetaText: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '500',
  },

  // Mobile Styles
  mobileContainer: {
    marginBottom: 12,
  },
  userCard: {
    padding: 12,
    borderRadius: 12,
  },
  userHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarCircleMobile: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F0FDF4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '700',
  },
  userEmail: {
    fontSize: 12,
    color: '#6B7280',
  },
  mobileRoleBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mobileRoleText: {
    fontSize: 10,
    fontWeight: '900',
  },
  mobileActions: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  mobileButton: {
    backgroundColor: '#10b981',
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mobileButtonText: {
    color: '#FFF',
    fontWeight: '700',
  },
  mobileRolePicker: {
    marginTop: 12,
    flexDirection: 'row',
    gap: 8,
  },
  pickerItem: {
    flex: 1,
    height: 32,
    backgroundColor: '#F3F4F6',
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorBanner: {
    backgroundColor: '#FEF2F2',
    margin: 16,
    padding: 12,
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
    paddingVertical: 80,
    gap: 12,
  },
  emptyText: {
    color: '#9CA3AF',
    fontSize: 14,
  },
});
