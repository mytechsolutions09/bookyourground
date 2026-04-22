import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, ActivityIndicator, Alert, TextInput } from 'react-native';
import { supabase } from '@/lib/supabase';
import { ShoppingBag, Plus, Search, Edit2, Trash2, Package, ClipboardList, X, Image as ImageIcon, Upload } from 'lucide-react-native';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import WebLayout from '@/components/web/WebLayout';
import { Platform, Modal, DeviceEventEmitter } from 'react-native';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { decode } from 'base64-arraybuffer';

export default function AdminProductsScreen() {
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [newProduct, setNewProduct] = useState({
    name: '',
    price: '',
    stock_quantity: '',
    category_id: '',
    description: '',
    images: [] as string[]
  });

  useEffect(() => {
    fetchProducts();
    fetchCategories();

    const handleOpenForm = () => setShowAddForm(true);

    if (Platform.OS === 'web') {
      window.addEventListener('openAddProduct', handleOpenForm);
    } else if (DeviceEventEmitter) {
      const sub = DeviceEventEmitter.addListener('openAddProduct', handleOpenForm);
      return () => sub.remove();
    }

    return () => {
      if (Platform.OS === 'web') window.removeEventListener('openAddProduct', handleOpenForm);
    };
  }, []);

  const fetchCategories = async () => {
    const { data } = await supabase.from('shop_categories').select('*').order('name');
    if (data) setCategories(data);
  };

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.7,
        base64: true,
      });

      if (!result.canceled && result.assets[0].base64) {
        setIsSubmitting(true);
        const asset = result.assets[0];
        const fileName = `${Date.now()}-${asset.fileName || 'product.jpg'}`;
        const filePath = `products/${fileName}`;

        const { data, error } = await supabase.storage
          .from('shop')
          .upload(filePath, decode(asset.base64), {
            contentType: 'image/jpeg',
          });

        if (error) throw error;

        const { data: { publicUrl } } = supabase.storage
          .from('shop')
          .getPublicUrl(filePath);

        setNewProduct({ ...newProduct, image_url: publicUrl });
      }
    } catch (err: any) {
      Alert.alert('Upload Error', err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('shop_products')
        .select(`
          *,
          category:shop_categories(name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProducts(data || []);
    } catch (err: any) {
      console.error('Error fetching products:', err);
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddProduct = async () => {
    if (!newProduct.name || !newProduct.price || !newProduct.category_id) {
      Alert.alert('Missing Info', 'Please fill in Name, Price, and Category');
      return;
    }

    try {
      setIsSubmitting(true);
      const { error } = await supabase
        .from('shop_products')
        .insert([{
          name: newProduct.name,
          price: parseFloat(newProduct.price),
          stock_quantity: parseInt(newProduct.stock_quantity) || 0,
          category_id: newProduct.category_id,
          description: newProduct.description,
          images: [newProduct.image_url || 'https://images.unsplash.com/photo-1517466787929-bc90951d0974?q=80&w=1000']
        }]);

      if (error) throw error;

      Alert.alert('Success', 'Product added successfully');
      setIsAddModalVisible(false);
      setNewProduct({
        name: '',
        price: '',
        stock_quantity: '',
        category_id: '',
        description: '',
        image_url: ''
      });
      fetchProducts();
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.category?.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const content = (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Shop Products</Text>
          <Text style={styles.subtitle}>Manage your sports equipment inventory</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity 
            style={styles.secondaryHeaderBtn} 
            onPress={() => router.push('/(admin)/orders')}
          >
            <ClipboardList size={18} color="#4B5563" />
            <Text style={styles.secondaryHeaderBtnText}>Shop Orders</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.searchBar}>
        <Search size={20} color="#9CA3AF" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search products or categories..."
          placeholderTextColor="#9CA3AF"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {showAddForm ? (
        <View style={styles.formContainer}>
          <View style={styles.formHeader}>
            <Text style={styles.formTitle}>Add New Product</Text>
            <TouchableOpacity onPress={() => setShowAddForm(false)}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.formGrid}>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Product Name</Text>
              <TextInput 
                style={styles.input}
                placeholder="e.g. Premium Cricket Bat"
                value={newProduct.name}
                onChangeText={(val) => setNewProduct({...newProduct, name: val})}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Category</Text>
              <View style={styles.categoryPicker}>
                {categories.map(cat => (
                  <TouchableOpacity 
                    key={cat.id}
                    style={[styles.catChip, newProduct.category_id === cat.id && styles.catChipActive]}
                    onPress={() => setNewProduct({...newProduct, category_id: cat.id})}
                  >
                    <Text style={[styles.catChipText, newProduct.category_id === cat.id && styles.catChipTextActive]}>
                      {cat.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.formRow}>
              <View style={[styles.formGroup, { flex: 1 }]}>
                <Text style={styles.label}>Price (₹)</Text>
                <TextInput 
                  style={styles.input}
                  placeholder="0.00"
                  keyboardType="numeric"
                  value={newProduct.price}
                  onChangeText={(val) => setNewProduct({...newProduct, price: val})}
                />
              </View>
              <View style={[styles.formGroup, { flex: 1 }]}>
                <Text style={styles.label}>Stock Quantity</Text>
                <TextInput 
                  style={styles.input}
                  placeholder="0"
                  keyboardType="numeric"
                  value={newProduct.stock_quantity}
                  onChangeText={(val) => setNewProduct({...newProduct, stock_quantity: val})}
                />
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Description</Text>
              <TextInput 
                style={[styles.input, styles.textArea]}
                placeholder="Enter product details..."
                multiline
                numberOfLines={3}
                value={newProduct.description}
                onChangeText={(text) => setNewProduct({...newProduct, description: text})}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Product Image</Text>
              <TouchableOpacity 
                style={styles.uploadBtn} 
                onPress={pickImage}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#01b854" />
                ) : (
                  <>
                    <Upload size={18} color="#4B5563" />
                    <Text style={styles.uploadBtnText}>
                      {newProduct.images?.length > 0 ? 'Image Uploaded' : 'Upload Local Image'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
              {newProduct.images?.length > 0 && (
                <Image source={{ uri: newProduct.images[0] }} style={styles.formImagePreview} />
              )}
            </View>

            <View style={styles.formFooter}>
              <Button 
                title="Discard" 
                variant="outline" 
                onPress={() => setShowAddForm(false)}
                style={{ width: 120, marginRight: 12 }}
              />
              <Button 
                title={isSubmitting ? "Adding..." : "Save Product"} 
                onPress={handleAddProduct}
                loading={isSubmitting}
                style={{ width: 200 }}
              />
            </View>
          </View>
        </View>
      ) : (
        <>
          {loading ? (
            <ActivityIndicator size="large" color="#00ea6b" style={{ marginTop: 40 }} />
          ) : (
            <View style={styles.grid}>
              {filteredProducts.map((product) => (
                <Card key={product.id} style={styles.productCard}>
                  <View style={styles.productImageContainer}>
                    {(product.images && product.images[0]) ? (
                      <Image source={{ uri: product.images[0] }} style={styles.productImage} />
                    ) : (
                      <View style={styles.imagePlaceholder}>
                        <Package size={32} color="#E5E7EB" />
                      </View>
                    )}
                    <View style={styles.stockBadge}>
                      <Text style={styles.stockText}>{product.stock_quantity || 0} in stock</Text>
                    </View>
                  </View>
                  
                  <View style={styles.productInfo}>
                    <Text style={styles.categoryName}>{product.category?.name}</Text>
                    <Text style={styles.productName} numberOfLines={1}>{product.name}</Text>
                    <Text style={styles.productPrice}>₹{product.price.toLocaleString('en-IN')}</Text>
                    
                    <View style={styles.actions}>
                      <TouchableOpacity style={styles.actionBtn}>
                        <Edit2 size={16} color="#4B5563" />
                      </TouchableOpacity>
                      <TouchableOpacity style={[styles.actionBtn, styles.deleteBtn]}>
                        <Trash2 size={16} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                  </View>
                </Card>
              ))}
            </View>
          )}
        </>
      )}
    </ScrollView>
  );

  if (Platform.OS === 'web') {
    return <WebLayout>{content}</WebLayout>;
  }

  return content;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  content: {
    padding: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  secondaryHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  secondaryHeaderBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#4B5563',
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#111827',
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 48,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 15,
    color: '#111827',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  productCard: {
    width: '31%', // 3 column grid on web
    padding: 0,
    overflow: 'hidden',
    borderRadius: 16,
  },
  productImageContainer: {
    height: 160,
    backgroundColor: '#F3F4F6',
    position: 'relative',
  },
  productImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  imagePlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stockBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  stockText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  productInfo: {
    padding: 16,
  },
  categoryName: {
    fontSize: 11,
    fontWeight: '700',
    color: '#00ea6b',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  productName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  productPrice: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
  },
  actions: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 8,
    justifyContent: 'flex-end',
  },
  actionBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteBtn: {
    backgroundColor: '#FEF2F2',
  },
  addFormContainer: {
    marginBottom: 24,
    padding: 0,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  formHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#F9FAFB',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  formTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
  },
  formBody: {
    padding: 20,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#4B5563',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 40,
    fontSize: 14,
    color: '#111827',
    marginBottom: 16,
  },
  formRow: {
    flexDirection: 'row',
  },
  categoryPicker: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 16,
  },
  categoryChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  categoryChipActive: {
    backgroundColor: '#00ea6b',
    borderColor: '#00ea6b',
  },
  categoryChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4B5563',
  },
  categoryChipTextActive: {
    color: '#FFFFFF',
  },
  formFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 16,
  },
  imageUploadSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 20,
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  imagePreviewContainer: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  formImagePreview: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  uploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  uploadBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4B5563',
  },
});
