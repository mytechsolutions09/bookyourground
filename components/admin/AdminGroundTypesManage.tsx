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
  Modal,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Tag, Trash2, Pencil, Plus, X } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { GroundType } from '@/types';
import Button from '@/components/ui/Button';

const emptyDraft = () => ({
  name: '',
  label: '',
  sort_order: '0',
  active: true,
});

export default function AdminGroundTypesManage() {
  const [rows, setRows] = useState<GroundType[]>([]);
  const [loading, setLoading] = useState(true);
  const [create, setCreate] = useState(emptyDraft);
  const [createLoading, setCreateLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [edit, setEdit] = useState(emptyDraft);
  const [editLoading, setEditLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    loadRows();
  }, []);

  const loadRows = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('ground_types')
        .select('*')
        .order('sort_order', { ascending: true })
        .order('name', { ascending: true });

      if (error) throw error;
      setRows((data || []) as GroundType[]);
    } catch (e) {
      console.error('Error loading ground types:', e);
      if (Platform.OS === 'web') alert('Failed to load ground types');
    } finally {
      setLoading(false);
    }
  };

  const confirmDelete = (id: string, label: string) => {
    const run = async () => {
      try {
        const { error } = await supabase.from('ground_types').delete().eq('id', id);
        if (error) throw error;
        if (editingId === id) setEditingId(null);
        loadRows();
      } catch (e: any) {
        if (Platform.OS === 'web') alert(e?.message ?? 'Delete failed');
        else Alert.alert('Error', e?.message ?? 'Delete failed');
      }
    };

    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.confirm(`Remove type "${label}"?`)) run();
    } else {
      Alert.alert('Remove type', `Remove "${label}"?`, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: run },
      ]);
    }
  };

  const handleCreate = async () => {
    const name = create.name.trim();
    if (!name) {
      if (Platform.OS === 'web') alert('Name is required');
      else Alert.alert('Validation', 'Name is required');
      return;
    }
    const sort = parseInt(create.sort_order, 10);
    try {
      setCreateLoading(true);
      const { error } = await supabase.from('ground_types').insert({
        name,
        label: create.label.trim() || null,
        sort_order: Number.isFinite(sort) ? sort : 0,
        active: create.active,
      });
      if (error) throw error;
      setCreate(emptyDraft());
      setShowAddModal(false);
      loadRows();
    } catch (e: any) {
      if (Platform.OS === 'web') alert(e?.message ?? 'Could not add type');
      else Alert.alert('Error', e?.message ?? 'Could not add type');
    } finally {
      setCreateLoading(false);
    }
  };

  const startEdit = (row: GroundType) => {
    setEditingId(row.id);
    setEdit({
      name: row.name,
      label: row.label ?? '',
      sort_order: String(row.sort_order ?? 0),
      active: row.active,
    });
  };

  const handleSaveEdit = async () => {
    if (!editingId) return;
    const name = edit.name.trim();
    if (!name) {
      if (Platform.OS === 'web') alert('Name is required');
      else Alert.alert('Validation', 'Name is required');
      return;
    }
    const sort = parseInt(edit.sort_order, 10);
    try {
      setEditLoading(true);
      const { error } = await supabase
        .from('ground_types')
        .update({
          name,
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

  const renderListHeader = () => (
    <View style={[styles.header, styles.webHeader]}>
      <View style={styles.headerTop}>
        <View>
          <Text style={styles.title}>Ground Types</Text>
          <Text style={styles.subtitle}>
            Pitch / ground categories for filters and booking. {rows.length} total
          </Text>
        </View>
        <Button
          title="Add Ground Type"
          icon={Plus}
          size="small"
          onPress={() => setShowAddModal(true)}
        />
      </View>
    </View>
  );

  const renderTableHeader = () => (
    <View style={styles.tableHeader}>
      <Text style={[styles.columnHeader, { flex: 3 }]}>Name</Text>
      <Text style={[styles.columnHeader, { flex: 3 }]}>Display Label</Text>
      <Text style={[styles.columnHeader, { flex: 1, textAlign: 'center' }]}>Order</Text>
      <Text style={[styles.columnHeader, { flex: 1.5, textAlign: 'center' }]}>Status</Text>
      <Text style={[styles.columnHeader, { flex: 1.5, textAlign: 'right' }]}>Actions</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={rows}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={() => (
          <View>
            {renderListHeader()}
            {rows.length > 0 && renderTableHeader()}
          </View>
        )}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={loadRows} />}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>No ground types yet — add one above</Text>
            </View>
          ) : null
        }
        renderItem={({ item }) => {
          const isEditing = editingId === item.id;

          if (isEditing) {
            return (
              <View style={styles.editRow}>
                <View style={styles.editForm}>
                  <Text style={styles.label}>Name</Text>
                  <TextInput
                    style={styles.input}
                    value={edit.name}
                    onChangeText={(t) => setEdit({ ...edit, name: t })}
                  />
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
                      size="small"
                      style={{ flex: 1 }}
                    />
                    <Button
                      title="Cancel"
                      onPress={() => setEditingId(null)}
                      variant="outline"
                      disabled={editLoading}
                      size="small"
                      style={{ flex: 1 }}
                    />
                  </View>
                </View>
              </View>
            );
          }

          return (
            <View style={styles.tableRow}>
              <Text numberOfLines={1} style={[styles.cellText, { flex: 3 }]}>{item.name}</Text>
              <Text numberOfLines={1} style={[styles.cellText, { flex: 3, color: item.label ? '#111827' : '#9CA3AF' }]}>
                {item.label || 'None'}
              </Text>
              <Text style={[styles.cellText, { flex: 1, textAlign: 'center' }]}>{item.sort_order}</Text>
              <View style={[styles.cell, { flex: 1.5, alignItems: 'center' }]}>
                <Text style={[styles.tableBadge, item.active ? styles.badgeOn : styles.badgeOff]}>
                  {item.active ? 'Active' : 'Off'}
                </Text>
              </View>
              <View style={[styles.cell, { flex: 1.5, flexDirection: 'row', justifyContent: 'flex-end', gap: 12 }]}>
                <TouchableOpacity onPress={() => startEdit(item)}>
                  <Pencil size={14} color="#6B7280" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => confirmDelete(item.id, item.label || item.name)}>
                  <Trash2 size={14} color="#EF4444" />
                </TouchableOpacity>
              </View>
            </View>
          );
        }}
      />

      <Modal
        visible={showAddModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity 
            style={styles.modalBlur} 
            activeOpacity={1} 
            onPress={() => setShowAddModal(false)} 
          />
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Ground Type</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <X size={20} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <ScrollView bounces={false}>
              <Text style={styles.label}>Name (internal)</Text>
              <TextInput
                style={styles.input}
                value={create.name}
                onChangeText={(t) => setCreate({ ...create, name: t })}
                placeholder="e.g. Cricket Ground"
              />

              <Text style={styles.label}>Display label (optional)</Text>
              <TextInput
                style={styles.input}
                value={create.label}
                onChangeText={(t) => setCreate({ ...create, label: t })}
                placeholder="Shown in dropdowns"
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
                  <Switch 
                    value={create.active} 
                    onValueChange={(v) => setCreate({ ...create, active: v })}
                    trackColor={{ false: '#E5E7EB', true: '#D1FAE5' }}
                    thumbColor={create.active ? '#10b981' : '#9CA3AF'}
                  />
                </View>
              </View>

              <Button
                title={createLoading ? 'Adding...' : 'Create Type'}
                onPress={handleCreate}
                loading={createLoading}
                disabled={createLoading}
                fullWidth
                style={{ marginTop: 24 }}
              />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  webHeader: {
    paddingTop: 20,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    fontFamily: 'Inter',
  },
  subtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 4,
    fontFamily: 'Inter',
  },
  listContent: {
    padding: 20,
    paddingBottom: 40,
  },
  tableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    marginBottom: 8,
  },
  columnHeader: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B7280',
    fontFamily: 'Inter',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  cell: {
    justifyContent: 'center',
  },
  cellText: {
    fontSize: 12,
    fontWeight: '400',
    color: '#111827',
    fontFamily: 'Inter',
  },
  tableBadge: {
    fontSize: 10,
    fontWeight: '600',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    overflow: 'hidden',
    fontFamily: 'Inter',
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
    fontFamily: 'Inter',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    fontSize: 12,
    backgroundColor: '#F9FAFB',
    marginBottom: 16,
    fontFamily: 'Inter',
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
    marginBottom: 16,
  },
  badgeOn: {
    color: '#15803D',
    backgroundColor: 'rgba(34,197,94,0.1)',
  },
  badgeOff: {
    color: '#6B7280',
    backgroundColor: '#F3F4F6',
  },
  editRow: {
    padding: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    marginVertical: 8,
  },
  editForm: {
    width: '100%',
  },
  editActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  emptyBox: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    color: '#6B7280',
    fontSize: 14,
    fontFamily: 'Inter',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
    padding: 20,
  },
  modalBlur: {
    ...StyleSheet.absoluteFillObject,
  },
  modalContent: {
    width: '100%',
    maxWidth: 500,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    fontFamily: 'Inter',
  },
});
