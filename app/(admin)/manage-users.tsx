import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, Alert, TouchableOpacity, Platform, TextInput } from 'react-native';
import { User, Shield, Search, X, Mail, Phone, Calendar, ChevronRight, UserCircle2 } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { Profile } from '@/types';
import { UserRole } from '@/types/database';
import Card from '@/components/ui/Card';
import WebLayout from '@/components/web/WebLayout';
import { useAuth } from '@/contexts/AuthContext';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';

export default function ManageUsersScreen() {
  const { user } = useAuth();
  const [users, setUsers] = useState<(Profile & { 
    wallets?: { balance: number }[],
    bank_details?: { bank_name: string; account_number: string; ifsc: string; upi_id: string } 
  })[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [creditAmount, setCreditAmount] = useState('');
  const [isCrediting, setIsCrediting] = useState(false);
  const [roleFilter, setRoleFilter] = useState<'all' | UserRole>('all');
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [selectedBankUser, setSelectedBankUser] = useState<any | null>(null);

  useEffect(() => {
    if (user) loadUsers();
  }, [user]);

  const loadUsers = async () => {
    try {
      setErrorMessage(null);
      setLoading(true);
      
      // 1. Fetch profiles
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profileError) throw profileError;

      // 2. Fetch wallets separately to bypass join/recursion RLS issues
      const { data: walletData, error: walletError } = await supabase
        .from('wallets')
        .select('user_id, balance');

      if (walletError) {
        console.warn('Could not fetch wallets:', walletError);
      }

      // 3. Fetch bank details for owners
      const { data: bankData, error: bankError } = await supabase
        .from('owner_bank_details')
        .select('*');

      if (bankError) {
        console.warn('Could not fetch bank details:', bankError);
      }

      // 4. Merge data
      const merged = (profileData || []).map(p => ({
        ...p,
        wallets: walletData?.filter(w => w.user_id === p.id) || [],
        bank_details: bankData?.find(b => b.owner_id === p.id) || null
      }));

      setUsers(merged as any);
    } catch (error) {
      console.error('Error loading users:', error);
      setErrorMessage('Failed to load users. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    return users.filter(u => {
      const name = u.full_name?.toLowerCase() || '';
      const email = u.email?.toLowerCase() || '';
      const phone = u.phone || '';
      const business = u.business_name?.toLowerCase() || '';
      const team = u.team_name?.toLowerCase() || '';
      const serial = (u as any).serial_id?.toLowerCase() || '';
      const uuid = u.id?.toLowerCase() || '';
      
      const matchesSearch = query === '' || 
             name.includes(query) || 
             email.includes(query) || 
             phone.includes(query) || 
             business.includes(query) ||
             team.includes(query) ||
             serial.includes(query) ||
             uuid.includes(query);
             
      const matchesRole = roleFilter === 'all' || u.role === roleFilter;
      
      return matchesSearch && matchesRole;
    });
  }, [users, searchQuery, roleFilter]);

  const FilterDropdown = ({ id, label, value, options, onSelect }: any) => {
    const isOpen = activeDropdown === id;
    const selectedLabel = options.find((o: any) => o.key === value)?.label || label;

    return (
      <View style={{ zIndex: isOpen ? 1000 : 1 }}>
        <TouchableOpacity
          style={[styles.dropdownTrigger, isOpen && styles.dropdownTriggerActive]}
          onPress={() => setActiveDropdown(isOpen ? null : id)}
        >
          <Text style={[styles.dropdownLabel, value !== 'all' && styles.dropdownLabelActive]}>{selectedLabel}</Text>
          <ChevronRight size={14} color={value !== 'all' ? '#10b981' : '#6B7280'} style={{ transform: [{ rotate: '90deg' }] }} />
        </TouchableOpacity>

        {isOpen && (
          <View style={styles.dropdownMenu}>
            {options.map((opt: any) => (
              <TouchableOpacity
                key={opt.key}
                style={styles.dropdownOption}
                onPress={() => {
                  onSelect(opt.key);
                  setActiveDropdown(null);
                }}
              >
                <Text style={[styles.dropdownOptionText, value === opt.key && styles.dropdownOptionTextActive]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    );
  };

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

  const handleCreditWallet = async (userId: string) => {
    const amount = parseFloat(creditAmount);
    if (!creditAmount || isNaN(amount) || amount <= 0) {
      if (Platform.OS === 'web') alert('Please enter a valid positive amount');
      else Alert.alert('Invalid Amount', 'Please enter a valid positive amount');
      return;
    }
    
    try {
      setIsCrediting(true);
      const { data, error } = await supabase.rpc('add_money_to_wallet', {
          target_user_id: userId,
          amount_to_add: amount,
          description_text: 'Admin System Credit'
      });
      
      if (error) throw error;
      
      if (data && data.success) {
          const msg = `Successfully credited ₹${amount} to user's wallet. New balance: ₹${data.new_balance}`;
          if (Platform.OS === 'web') alert(msg);
          else Alert.alert('Success', msg);
          setCreditAmount('');
          loadUsers(); // Refresh the list to show new balance
      } else {
          throw new Error(data?.error || 'Unknown error');
      }
    } catch (error: any) {
      if (Platform.OS === 'web') alert('Error: ' + error.message);
      else Alert.alert('Error', error.message);
    } finally {
      setIsCrediting(false);
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
               <View>
                  <Text style={styles.userNameText}>{item.full_name}</Text>
                  <Text style={styles.userIdText}>{item.serial_id || item.id}</Text>
                  {item.business_name && <Text style={styles.userBusinessText}>{item.business_name}</Text>}
               </View>
            </View>
          </View>

          <View style={[styles.cell, styles.colContact]}>
             <Text style={styles.contactText}>{item.email || '—'}</Text>
             <Text style={styles.subContactText}>{item.phone || 'No phone'}</Text>
          </View>
          
          <View style={[styles.cell, styles.colTeam]}>
             <Text style={styles.teamText}>{item.team_name || 'Individual'}</Text>
          </View>

          <View style={[styles.cell, styles.colWallet]}>
             <Text style={styles.walletValue}>₹{item.wallets?.[0]?.balance?.toFixed(2) || '0.00'}</Text>
          </View>

          <View style={[styles.cell, styles.colBank]}>
             {item.role === 'ground_owner' && item.bank_details ? (
                <TouchableOpacity 
                  onPress={() => setSelectedBankUser(item)}
                  style={styles.viewBankBtn}
                >
                   <Text style={styles.viewBankBtnText}>View Details</Text>
                </TouchableOpacity>
             ) : (
                <Text style={styles.noBankText}>—</Text>
             )}
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
            <View style={styles.expandedPanels}>
              <View style={styles.rolesPanel}>
                <Text style={styles.expandedTitle}>Change Access Level</Text>
                <View style={styles.roleGrid}>
                  {[
                    { id: 'user' as UserRole, label: 'Player', color: '#6B7280' },
                    { id: 'ground_owner' as UserRole, label: 'Ground Owner', color: '#10b981' },
                    { id: 'super_admin' as UserRole, label: 'Super Admin', color: '#EF4444' }
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
              </View>

              <View style={styles.walletPanel}>
                <Text style={[styles.expandedTitle, { color: '#B45309' }]}>Wallet Credit</Text>
                <View style={styles.creditInputRow}>
                  <View style={styles.creditInputWrapper}>
                    <Text style={styles.currencyPrefix}>₹</Text>
                    <TextInput
                      style={styles.creditInput}
                      placeholder="0.00"
                      value={creditAmount}
                      onChangeText={setCreditAmount}
                      keyboardType="numeric"
                    />
                  </View>
                  <TouchableOpacity 
                    style={[styles.creditButton, isCrediting && { opacity: 0.7 }]}
                    onPress={() => handleCreditWallet(item.id)}
                    disabled={isCrediting}
                  >
                    <Text style={styles.creditButtonText}>{isCrediting ? '...' : 'Credit Wallet'}</Text>
                  </TouchableOpacity>
                </View>
              </View>
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
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{item.full_name}</Text>
            <Text style={styles.userIdTextMobile}>{item.serial_id || item.id}</Text>
            <Text style={styles.userEmail}>{item.email}</Text>
            {item.team_name && <Text style={styles.mobileTeamText}>Team: {item.team_name}</Text>}
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
            <View style={styles.mobileExpanded}>
                <View style={styles.mobileRolePicker}>
                    <TouchableOpacity onPress={() => updateUserRole(item.id, 'user')} style={styles.pickerItem}><Text style={styles.pickerText}>Player</Text></TouchableOpacity>
                    <TouchableOpacity onPress={() => updateUserRole(item.id, 'ground_owner')} style={styles.pickerItem}><Text style={styles.pickerText}>Owner</Text></TouchableOpacity>
                    <TouchableOpacity onPress={() => updateUserRole(item.id, 'super_admin')} style={styles.pickerItem}><Text style={styles.pickerText}>Admin</Text></TouchableOpacity>
                </View>
                
                <View style={styles.mobileWalletCredit}>
                   <View style={styles.mobileCreditInputRow}>
                      <TextInput
                        style={styles.mobileCreditInput}
                        placeholder="Amount (₹)"
                        value={creditAmount}
                        onChangeText={setCreditAmount}
                        keyboardType="numeric"
                      />
                      <TouchableOpacity 
                         style={styles.mobileCreditButton}
                         onPress={() => handleCreditWallet(item.id)}
                         disabled={isCrediting}
                      >
                         <Text style={styles.mobileCreditButtonText}>Add Cash</Text>
                      </TouchableOpacity>
                   </View>
                </View>
            </View>
        )}
      </Card>
    </View>
  );

  const content = (
    <View style={styles.container}>
      <View style={styles.headerArea}>
        <View style={styles.headerFiltersRow}>
          <View style={styles.searchContainer}>
            <Search size={16} color="#6B7280" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search users..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearButton}>
                <X size={14} color="#9CA3AF" />
              </TouchableOpacity>
            )}
          </View>

          <FilterDropdown 
            id="role" 
            label="System Role" 
            value={roleFilter}
            options={[
              { key: 'all', label: 'All Roles' },
              { key: 'user', label: 'Players' },
              { key: 'ground_owner', label: 'Owners' },
              { key: 'super_admin', label: 'Admins' },
            ]}
            onSelect={setRoleFilter}
          />
        </View>
      </View>

      {Platform.OS === 'web' && (
        <View style={styles.tableHeader}>
           <Text style={[styles.headerLabel, styles.colUser]}>User Profile</Text>
           <Text style={[styles.headerLabel, styles.colContact]}>Contact info</Text>
           <Text style={[styles.headerLabel, styles.colTeam]}>Team</Text>
           <Text style={[styles.headerLabel, styles.colWallet]}>Wallet</Text>
           <Text style={[styles.headerLabel, styles.colBank]}>Bank Details</Text>
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

      <Modal
        visible={!!selectedBankUser}
        onClose={() => setSelectedBankUser(null)}
        title="Bank Details"
        maxWidth={450}
      >
        {selectedBankUser && (
          <View style={styles.modalContent}>
            <View style={styles.modalUserHeader}>
              <Text style={styles.modalUserName}>{selectedBankUser.full_name}</Text>
              <Text style={styles.modalUserRole}>Ground Owner</Text>
            </View>

            <View style={styles.modalDetailsGrid}>
              {selectedBankUser.bank_details?.upi_id && (
                <View style={styles.modalDetailItem}>
                  <Text style={styles.modalDetailLabel}>UPI ID</Text>
                  <Text style={styles.modalDetailValue}>{selectedBankUser.bank_details.upi_id}</Text>
                </View>
              )}
              
              <View style={styles.modalDetailRow}>
                <View style={styles.modalDetailItem}>
                  <Text style={styles.modalDetailLabel}>Bank Name</Text>
                  <Text style={styles.modalDetailValue}>{selectedBankUser.bank_details?.bank_name || '—'}</Text>
                </View>
                <View style={styles.modalDetailItem}>
                  <Text style={styles.modalDetailLabel}>IFSC Code</Text>
                  <Text style={styles.modalDetailValue}>{selectedBankUser.bank_details?.ifsc || '—'}</Text>
                </View>
              </View>

              <View style={styles.modalDetailItem}>
                <Text style={styles.modalDetailLabel}>Account Number</Text>
                <Text style={[styles.modalDetailValue, { fontSize: 18, color: '#10b981' }]}>
                  {selectedBankUser.bank_details?.account_number || '—'}
                </Text>
              </View>
            </View>

            <TouchableOpacity 
              style={styles.modalCloseBtn}
              onPress={() => setSelectedBankUser(null)}
            >
              <Text style={styles.modalCloseBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        )}
      </Modal>
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    zIndex: 10,
  },
  headerFiltersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
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
    maxWidth: 300,
    height: 36,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#111827',
    fontWeight: '500',
    outlineStyle: 'none',
  } as any,
  clearButton: {
    padding: 2,
    marginLeft: 4,
  },
  // Dropdown Styles
  dropdownTrigger: {
    height: 36,
    paddingHorizontal: 12,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  dropdownTriggerActive: {
    backgroundColor: '#ECFDF5',
    borderColor: '#10b981',
  },
  dropdownLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
  },
  dropdownLabelActive: {
    color: '#059669',
  },
  dropdownMenu: {
    position: 'absolute',
    top: 40,
    left: 0,
    minWidth: 160,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  dropdownOption: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  dropdownOptionText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#374151',
  },
  dropdownOptionTextActive: {
    color: '#10b981',
    fontWeight: '700',
  },
  tableHeader: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
  },
  headerLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  colUser: { flex: 2 },
  colContact: { flex: 1.5 },
  colTeam: { flex: 1 },
  colWallet: { flex: 0.8 },
  colBank: { flex: 2 },
  colRole: { flex: 1, alignItems: 'center' },
  colActions: { flex: 1 },
  
  list: {
    padding: 16,
  },
  webRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
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
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  userIdText: {
    fontSize: 9,
    color: '#9CA3AF',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    marginTop: 1,
  },
  userBusinessText: {
    fontSize: 11,
    color: '#10b981',
    fontWeight: '600',
  },
  contactText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
  },
  subContactText: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
  },
  teamText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#10b981',
  },
  walletValue: {
    fontSize: 13,
    fontWeight: '800',
    color: '#B45309',
  },
  viewBankBtn: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1FAE5',
    alignSelf: 'flex-start',
  },
  viewBankBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
  },
  noBankText: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  modalContent: {
    padding: 4,
  },
  modalUserHeader: {
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  modalUserName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
  },
  modalUserRole: {
    fontSize: 12,
    fontWeight: '600',
    color: '#10b981',
    marginTop: 2,
  },
  modalDetailsGrid: {
    gap: 20,
  },
  modalDetailRow: {
    flexDirection: 'row',
    gap: 20,
  },
  modalDetailItem: {
    flex: 1,
  },
  modalDetailLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  modalDetailValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  modalCloseBtn: {
    marginTop: 32,
    backgroundColor: '#111827',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalCloseBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
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
    fontSize: 10,
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
    fontSize: 12,
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
  expandedPanels: {
    flexDirection: 'row',
    gap: 32,
  },
  rolesPanel: {
    flex: 1.5,
  },
  walletPanel: {
    flex: 1,
    paddingLeft: 24,
    borderLeftWidth: 1,
    borderLeftColor: '#D1FAE5',
  },
  creditInputRow: {
    flexDirection: 'row',
    gap: 8,
  },
  creditInputWrapper: {
    flex: 1,
    height: 38,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1FAE5',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  currencyPrefix: {
    fontSize: 14,
    fontWeight: '700',
    color: '#065F46',
    marginRight: 4,
  },
  creditInput: {
    flex: 1,
    height: '100%',
    fontSize: 14,
    fontWeight: '600',
    color: '#065F46',
  } as any,
  creditButton: {
    backgroundColor: '#059669',
    borderRadius: 8,
    paddingHorizontal: 16,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  creditButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  footerMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(16, 185, 129, 0.1)',
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
  userIdTextMobile: {
    fontSize: 10,
    color: '#9CA3AF',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    marginBottom: 2,
  },
  userEmail: {
    fontSize: 12,
    color: '#6B7280',
  },
  mobileTeamText: {
    fontSize: 12,
    color: '#10b981',
    fontWeight: '600',
    marginTop: 2,
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
  mobileExpanded: {
    gap: 12,
  },
  mobileRolePicker: {
    marginTop: 12,
    flexDirection: 'row',
    gap: 8,
  },
  pickerItem: {
    flex: 1,
    height: 36,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  pickerText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
  },
  mobileWalletCredit: {
    backgroundColor: '#FFFBEB',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FEF3C7',
  },
  mobileCreditInputRow: {
    flexDirection: 'row',
    gap: 8,
  },
  mobileCreditInput: {
    flex: 1,
    height: 40,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FDE68A',
    paddingHorizontal: 12,
    fontSize: 14,
  },
  mobileCreditButton: {
    backgroundColor: '#D97706',
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mobileCreditButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
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
