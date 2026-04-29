import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TextInput,
  Switch,
  Platform,
  Pressable,
  Alert,
} from 'react-native';
import { MapPin, Trash2, Pencil } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { Location } from '@/types';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';

const emptyDraft = () => ({
  city: '',
  state: '',
  label: '',
  sort_order: '0',
  active: true,
});

/**
 * Locations CRUD for super admin. Used inside Settings → Locations (no WebLayout here).
 */
export default function AdminLocationsManage() {
  const [rows, setRows] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [create, setCreate] = useState(emptyDraft);
  const [createLoading, setCreateLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [edit, setEdit] = useState(emptyDraft);
  const [editLoading, setEditLoading] = useState(false);

  useEffect(() => {
    loadRows();
  }, []);

  const loadRows = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('locations')
        .select('*')
        .order('sort_order', { ascending: true })
        .order('city', { ascending: true });

      if (error) throw error;
      setRows((data || []) as Location[]);
    } catch (e) {
      console.error('Error loading locations:', e);
      if (Platform.OS === 'web') alert('Failed to load locations');
    } finally {
      setLoading(false);
    }
  };

  const confirmDelete = (id: string, label: string) => {
    const run = async () => {
      try {
        const { error } = await supabase.from('locations').delete().eq('id', id);
        if (error) throw error;
        if (editingId === id) setEditingId(null);
        loadRows();
      } catch (e: any) {
        if (Platform.OS === 'web') alert(e?.message ?? 'Delete failed');
        else Alert.alert('Error', e?.message ?? 'Delete failed');
      }
    };

    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.confirm(`Remove location "${label}"?`)) run();
    } else {
      Alert.alert('Remove location', `Remove "${label}"?`, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: run },
      ]);
    }
  };

  const handleCreate = async () => {
    const city = create.city.trim();
    const state = create.state.trim();
    if (!city || !state) {
      if (Platform.OS === 'web') alert('City and state are required');
      else Alert.alert('Validation', 'City and state are required');
      return;
    }
    const sort = parseInt(create.sort_order, 10);
    try {
      setCreateLoading(true);
      const { error } = await supabase.from('locations').insert({
        city,
        state,
        label: create.label.trim() || null,
        sort_order: Number.isFinite(sort) ? sort : 0,
        active: create.active,
      });
      if (error) throw error;
      setCreate(emptyDraft());
      loadRows();
    } catch (e: any) {
      if (Platform.OS === 'web') alert(e?.message ?? 'Could not add location');
      else Alert.alert('Error', e?.message ?? 'Could not add location');
    } finally {
      setCreateLoading(false);
    }
  };

  const startEdit = (row: Location) => {
    setEditingId(row.id);
    setEdit({
      city: row.city,
      state: row.state,
      label: row.label ?? '',
      sort_order: String(row.sort_order ?? 0),
      active: row.active,
    });
  };

  const handleSaveEdit = async () => {
    if (!editingId) return;
    const city = edit.city.trim();
    const state = edit.state.trim();
    if (!city || !state) {
      if (Platform.OS === 'web') alert('City and state are required');
      else Alert.alert('Validation', 'City and state are required');
      return;
    }
    const sort = parseInt(edit.sort_order, 10);
    try {
      setEditLoading(true);
      const { error } = await supabase
        .from('locations')
        .update({
          city,
          state,
          label: edit.label.trim() || null,
          sort_order: Number.isFinite(sort) ? sort : 0,
          active: edit.active,
          updated_at: new Date().toISOString(),
        })
        .eq('id', editingId);
      if (error) throw error;
      setEditingId(null);
      loadRows();
    } catch (e: any) {
      if (Platform.OS === 'web') alert(e?.message ?? 'Could not save');
      else Alert.alert('Error', e?.message ?? 'Could not save');
    } finally {
      setEditLoading(false);
    }
  };

  const listHeader = (
    <>
      {Platform.OS === 'web' && (
        <View style={[styles.header, styles.webHeader]}>
          <Text style={styles.title}>Locations</Text>
          <Text style={styles.subtitle}>
            Manage cities shown in booking filters. {rows.length} total
          </Text>
        </View>
      )}

      <Card style={styles.formCard}>
        <Text style={styles.formTitle}>Add location</Text>
        <View style={styles.formRow2}>
          <View style={styles.formHalf}>
            <Text style={styles.label}>City</Text>
            <TextInput
              style={styles.input}
              value={create.city}
              onChangeText={(t) => setCreate({ ...create, city: t })}
              placeholder="e.g. New Delhi"
            />
          </View>
          <View style={styles.formHalf}>
            <Text style={styles.label}>State</Text>
            <TextInput
              style={styles.input}
              value={create.state}
              onChangeText={(t) => setCreate({ ...create, state: t })}
              placeholder="e.g. Delhi"
            />
          </View>
        </View>
        <Text style={styles.label}>Display label (optional)</Text>
        <TextInput
          style={styles.input}
          value={create.label}
          onChangeText={(t) => setCreate({ ...create, label: t })}
          placeholder="Shown in dropdowns, e.g. New Delhi, Delhi"
        />
        <View style={styles.formRow2}>
          <View style={styles.formHalf}>
            <Text style={styles.label}>Sort order</Text>
            <TextInput
              style={styles.input}
              value={create.sort_order}
              onChangeText={(t) => setCreate({ ...create, sort_order: t })}
              keyboardType="numeric"
              placeholder="0"
            />
          </View>
          <View style={[styles.formHalf, styles.switchRow]}>
            <Text style={styles.label}>Active</Text>
            <Switch value={create.active} onValueChange={(v) => setCreate({ ...create, active: v })} />
          </View>
        </View>
        <Button
          title={createLoading ? 'Adding...' : 'Add location'}
          onPress={handleCreate}
          loading={createLoading}
          disabled={createLoading}
        />
      </Card>
    </>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={rows}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={listHeader}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={loadRows} />}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>No locations yet — add one above</Text>
            </View>
          ) : null
        }
        renderItem={({ item }) => {
          const display = item.label?.trim() || `${item.city}, ${item.state}`;
          const isEditing = editingId === item.id;

          return (
            <Card style={styles.rowCard}>
              <View style={styles.rowHeader}>
                <View style={styles.iconPill}>
                  <MapPin size={18} color={Platform.OS === 'web' ? '#10b981' : '#2196F3'} />
                </View>
                <View style={styles.rowMain}>
                  <Text style={styles.rowTitle}>{display}</Text>
                  <Text style={styles.rowSub}>
                    {item.city} · {item.state} · order {item.sort_order}
                  </Text>
                </View>
                <View style={styles.badges}>
                  <Text style={[styles.badge, item.active ? styles.badgeOn : styles.badgeOff]}>
                    {item.active ? 'Active' : 'Off'}
                  </Text>
                </View>
              </View>

              {!isEditing ? (
                <View style={styles.rowActions}>
                  <Pressable style={styles.iconBtn} onPress={() => startEdit(item)}>
                    <Pencil size={18} color="#374151" />
                    <Text style={styles.iconBtnText}>Edit</Text>
                  </Pressable>
                  <Pressable style={styles.iconBtn} onPress={() => confirmDelete(item.id, display)}>
                    <Trash2 size={18} color="#B91C1C" />
                    <Text style={[styles.iconBtnText, { color: '#B91C1C' }]}>Delete</Text>
                  </Pressable>
                </View>
              ) : (
                <View style={styles.editBox}>
                  <View style={styles.formRow2}>
                    <View style={styles.formHalf}>
                      <Text style={styles.label}>City</Text>
                      <TextInput
                        style={styles.input}
                        value={edit.city}
                        onChangeText={(t) => setEdit({ ...edit, city: t })}
                      />
                    </View>
                    <View style={styles.formHalf}>
                      <Text style={styles.label}>State</Text>
                      <TextInput
                        style={styles.input}
                        value={edit.state}
                        onChangeText={(t) => setEdit({ ...edit, state: t })}
                      />
                    </View>
                  </View>
                  <Text style={styles.label}>Display label (optional)</Text>
                  <TextInput
                    style={styles.input}
                    value={edit.label}
                    onChangeText={(t) => setEdit({ ...edit, label: t })}
                  />
                  <View style={styles.formRow2}>
                    <View style={styles.formHalf}>
                      <Text style={styles.label}>Sort order</Text>
                      <TextInput
                        style={styles.input}
                        value={edit.sort_order}
                        onChangeText={(t) => setEdit({ ...edit, sort_order: t })}
                        keyboardType="numeric"
                      />
                    </View>
                    <View style={[styles.formHalf, styles.switchRow]}>
                      <Text style={styles.label}>Active</Text>
                      <Switch value={edit.active} onValueChange={(v) => setEdit({ ...edit, active: v })} />
                    </View>
                  </View>
                  <View style={styles.editActions}>
                    <Button
                      title={editLoading ? 'Saving...' : 'Save'}
                      onPress={handleSaveEdit}
                      loading={editLoading}
                      disabled={editLoading}
                      style={{ flex: 1 }}
                    />
                    <Button
                      title="Cancel"
                      onPress={() => setEditingId(null)}
                      variant="outline"
                      disabled={editLoading}
                      style={{ flex: 1 }}
                    />
                  </View>
                </View>
              )}
            </Card>
          );
        }}
      />
    </View>
  );
}

/** @deprecated Use default export `AdminLocationsManage`; kept for compatibility */
export const AdminLocationsScreen = AdminLocationsManage;

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
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  formCard: {
    marginBottom: 16,
    padding: 14,
  },
  formTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 12,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    fontSize: 14,
    backgroundColor: '#FFF',
    marginBottom: 10,
  },
  formRow2: {
    flexDirection: 'row',
    gap: 12,
  },
  formHalf: {
    flex: 1,
  },
  switchRow: {
    justifyContent: 'space-between',
    alignItems: 'center',
    flexDirection: 'row',
  },
  rowCard: {
    marginBottom: 12,
    padding: 14,
  },
  rowHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  iconPill: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(220,141,60,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowMain: {
    flex: 1,
    minWidth: 0,
  },
  rowTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
  },
  rowSub: {
    marginTop: 4,
    fontSize: 13,
    color: '#6B7280',
  },
  badges: {
    alignItems: 'flex-end',
  },
  badge: {
    fontSize: 12,
    fontWeight: '800',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    overflow: 'hidden',
  },
  badgeOn: {
    color: '#15803D',
    backgroundColor: 'rgba(34,197,94,0.15)',
  },
  badgeOff: {
    color: '#6B7280',
    backgroundColor: '#F3F4F6',
  },
  rowActions: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  iconBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  iconBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#374151',
  },
  editBox: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  editActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  emptyBox: {
    padding: 24,
    alignItems: 'center',
  },
  emptyText: {
    color: '#6B7280',
    fontSize: 15,
  },
});
