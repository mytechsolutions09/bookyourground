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
import MobileAppNavbar from '@/components/MobileAppNavbar';

export default function AdminProductsScreen() {
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'products' | 'categories'>('products');
  const [showAddForm, setShowAddForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newColorVariant, setNewColorVariant] = useState({ name: '', hex: '#f8688a' });

  // Form State
  const [newProduct, setNewProduct] = useState({
    name: '',
    price: '',
    stock_quantity: '',
    category_id: '',
    description: '',
    images: [] as string[],
    specifications: {} as any
  });

  useEffect(() => {
    fetchProducts();
    fetchCategories();

    const handleOpenForm = () => setShowAddForm(true);
    const handleSetView = (e: any) => {
      const mode = Platform.OS === 'web' ? e.detail : e;
      if (mode === 'products' || mode === 'categories') {
        setViewMode(mode);
        setShowAddForm(false);
      }
    };

    if (Platform.OS === 'web') {
      window.addEventListener('openAddProduct', handleOpenForm);
      window.addEventListener('setShopView', handleSetView);
    } else if (DeviceEventEmitter) {
      const sub = DeviceEventEmitter.addListener('openAddProduct', handleOpenForm);
      const sub2 = DeviceEventEmitter.addListener('setShopView', handleSetView);
      return () => {
        sub.remove();
        sub2.remove();
      };
    }

    return () => {
      if (Platform.OS === 'web') {
        window.removeEventListener('openAddProduct', handleOpenForm);
        window.removeEventListener('setShopView', handleSetView);
      }
    };
  }, []);

  const fetchCategories = async () => {
    const { data } = await supabase.from('shop_categories').select('*').order('name');
    if (data) setCategories(data);
  };

  const pickImage = async () => {
    if (newProduct.images.length >= 5) {
      const msg = 'You can only add up to 5 images per product.';
      if (Platform.OS === 'web') window.alert(msg);
      else Alert.alert('Limit Reached', msg);
      return;
    }

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.7,
        base64: true,
      });
      
      if (result.canceled) return;

      if (result.assets && result.assets[0].base64) {
        setIsUploadingImage(true);
        const asset = result.assets[0];
        const ext = asset.uri.split('.').pop() || 'jpg';
        const fileName = `${Date.now()}.${ext}`;
        const filePath = `products/${fileName}`;

        const { error } = await supabase.storage
          .from('shop')
          .upload(filePath, decode(asset.base64), {
            contentType: `image/${ext === 'png' ? 'png' : 'jpeg'}`,
            upsert: true
          });

        if (error) throw error;

        const { data: { publicUrl } } = supabase.storage
          .from('shop')
          .getPublicUrl(filePath);

        setNewProduct(prev => ({
          ...prev,
          images: [...prev.images, publicUrl]
        }));
      }
    } catch (err: any) {
      console.error('Pick image error:', err);
      const msg = err.message || 'Failed to upload image';
      if (Platform.OS === 'web') window.alert('Upload Error: ' + msg);
      else Alert.alert('Upload Error', msg);
    } finally {
      setIsUploadingImage(false);
    }
  };

  const removeImage = (index: number) => {
    setNewProduct(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
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
      const msg = 'Please fill in Name, Price, and Category';
      if (Platform.OS === 'web') window.alert(msg);
      else Alert.alert('Missing Info', msg);
      return;
    }

    try {
      setIsSubmitting(true);
      if (editingProduct) {
        if (!editingProduct.id) throw new Error('Product ID is missing');
        
        console.log('Updating product:', editingProduct.id);
        const specifications = {
          ...newProduct.specifications,
          sizes: Array.isArray(newProduct.specifications?.sizes) 
            ? newProduct.specifications.sizes 
            : (typeof newProduct.specifications?.sizes === 'string' 
                ? newProduct.specifications.sizes.split(',').map((s: string) => s.trim()).filter((s: string) => s !== '') 
                : []),
          colors: Array.isArray(newProduct.specifications?.colors) 
            ? newProduct.specifications.colors 
            : (typeof newProduct.specifications?.colors === 'string'
                ? newProduct.specifications.colors.split(',').map((c: string) => {
                    const parts = c.split('|').map(p => p.trim());
                    return { name: parts[0], hex: parts[1] || '#f8688a' };
                  })
                : [])
        };

        const updatePayload = {
          name: newProduct.name,
          price: parseFloat(newProduct.price),
          stock_quantity: parseInt(newProduct.stock_quantity) || 0,
          category_id: newProduct.category_id,
          description: newProduct.description,
          specifications,
          images: newProduct.images.length > 0 ? newProduct.images : ['https://images.unsplash.com/photo-1517466787929-bc90951d0974?q=80&w=1000']
        };
        console.log('Payload:', updatePayload);

        const { error } = await supabase
          .from('shop_products')
          .update(updatePayload)
          .eq('id', editingProduct.id);

        if (error) throw error;
        
        const msg = 'Product updated successfully';
        if (Platform.OS === 'web') window.alert(msg);
        else Alert.alert('Success', msg);
      } else {
        console.log('Adding new product:', newProduct);
        const specifications = {
          ...newProduct.specifications,
          sizes: Array.isArray(newProduct.specifications?.sizes) 
            ? newProduct.specifications.sizes 
            : (typeof newProduct.specifications?.sizes === 'string' 
                ? newProduct.specifications.sizes.split(',').map((s: string) => s.trim()).filter((s: string) => s !== '') 
                : []),
          colors: Array.isArray(newProduct.specifications?.colors) 
            ? newProduct.specifications.colors 
            : (typeof newProduct.specifications?.colors === 'string'
                ? newProduct.specifications.colors.split(',').map((c: string) => {
                    const parts = c.split('|').map(p => p.trim());
                    return { name: parts[0], hex: parts[1] || '#f8688a' };
                  })
                : [])
        };

        const { error } = await supabase
          .from('shop_products')
          .insert([{
            name: newProduct.name,
            price: parseFloat(newProduct.price),
            stock_quantity: parseInt(newProduct.stock_quantity) || 0,
            category_id: newProduct.category_id,
            description: newProduct.description,
            specifications,
            images: newProduct.images.length > 0 ? newProduct.images : ['https://images.unsplash.com/photo-1517466787929-bc90951d0974?q=80&w=1000']
          }]);

        if (error) throw error;
        
        const msg = 'Product added successfully';
        if (Platform.OS === 'web') window.alert(msg);
        else Alert.alert('Success', msg);
      }

      setShowAddForm(false);
      setEditingProduct(null);
      setNewProduct({
        name: '',
        price: '',
        stock_quantity: '',
        category_id: '',
        description: '',
        images: [],
        specifications: {}
      });
      fetchProducts();
    } catch (err: any) {
      console.error('Operation failed:', err);
      const msg = err.message || 'Operation failed';
      if (Platform.OS === 'web') window.alert('Error: ' + msg);
      else Alert.alert('Error', msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditProduct = (product: any) => {
    setEditingProduct(product);
    setNewProduct({
      name: product.name,
      price: product.price.toString(),
      stock_quantity: product.stock_quantity?.toString() || '0',
      category_id: product.category_id,
      description: product.description || '',
      images: product.images || [],
      specifications: product.specifications || {}
    });
    setShowAddForm(true);
  };

  const handleDeleteProduct = async (productId: string) => {
    const confirmDelete = () => {
      Alert.alert(
        'Delete Product',
        'Are you sure you want to delete this product? This action cannot be undone.',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Delete', 
            style: 'destructive',
            onPress: async () => {
              try {
                setIsSubmitting(true);
                const { error } = await supabase
                  .from('shop_products')
                  .delete()
                  .eq('id', productId);
                
                if (error) throw error;
                await fetchProducts();
              } catch (err: any) {
                Alert.alert('Error', err.message);
              } finally {
                setIsSubmitting(false);
              }
            }
          }
        ]
      );
    };

    if (Platform.OS === 'web') {
      if (window.confirm('Are you sure you want to delete this product? This action cannot be undone.')) {
        try {
          setIsSubmitting(true);
          const { error } = await supabase
            .from('shop_products')
            .delete()
            .eq('id', productId);
          
          if (error) throw error;
          await fetchProducts();
        } catch (err: any) {
          console.error('Delete error:', err);
          window.alert('Error deleting product: ' + (err.message || 'Unknown error'));
        } finally {
          setIsSubmitting(false);
        }
      }
    } else {
      confirmDelete();
    }
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.category?.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredCategories = categories.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) return;
    try {
      setIsSubmitting(true);
      const { error } = await supabase
        .from('shop_categories')
        .insert([{ name: newCategoryName.trim(), sort_order: categories.length }]);
      if (error) throw error;
      setNewCategoryName('');
      fetchCategories();
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (Platform.OS === 'web' && !window.confirm('Are you sure? Products in this category might break.')) return;
    try {
      const { error } = await supabase.from('shop_categories').delete().eq('id', id);
      if (error) throw error;
      fetchCategories();
    } catch (err: any) {
      Alert.alert('Error', err.message);
    }
  };

  const content = (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {Platform.OS === 'web' && (
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>{viewMode === 'products' ? 'Shop Products' : 'Shop Categories'}</Text>
            <Text style={styles.subtitle}>
              {viewMode === 'products' ? 'Manage your sports equipment inventory' : 'Organize your shop collections'}
            </Text>
          </View>

        </View>
      )}

      <View style={styles.searchBar}>
        <Search size={20} color="#9CA3AF" />
        <TextInput
          style={styles.searchInput}
          placeholder={viewMode === 'products' ? "Search products..." : "Search categories..."}
          placeholderTextColor="#9CA3AF"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {viewMode === 'categories' ? (
        <View style={styles.categoriesContainer}>
          <View style={styles.addCategorySection}>
            <TextInput 
              style={[styles.input, { flex: 1, marginBottom: 0 }]}
              placeholder="New Category Name..."
              value={newCategoryName}
              onChangeText={setNewCategoryName}
            />
            <Button 
              title={isSubmitting ? "..." : "Add Category"} 
              onPress={handleAddCategory}
              disabled={isSubmitting}
              style={{ width: 150 }}
            />
          </View>

          <View style={styles.categoriesGrid}>
            {filteredCategories.map(cat => (
              <View key={cat.id} style={styles.categoryRow}>
                <View style={styles.categoryInfo}>
                  <Text style={styles.categoryMainName}>{cat.name}</Text>
                  <Text style={styles.categoryStats}>{products.filter(p => p.category_id === cat.id).length} Products</Text>
                </View>
                <TouchableOpacity 
                  style={styles.deleteCategoryBtn}
                  onPress={() => handleDeleteCategory(cat.id)}
                >
                  <Trash2 size={18} color="#EF4444" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </View>
      ) : showAddForm ? (
        <View style={styles.addFormContainer}>
          <View style={styles.formHeader}>
            <Text style={styles.formTitle}>{editingProduct ? 'Edit Product' : 'Add New Product'}</Text>
            <TouchableOpacity onPress={() => { setShowAddForm(false); setEditingProduct(null); }}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.formBody}>
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

 
            {categories.find(c => c.id === newProduct.category_id)?.name === 'Shoes' && (
              <View style={styles.formGroup}>
                <Text style={styles.label}>Available Sizes (comma separated)</Text>
                <TextInput 
                  style={styles.input}
                  placeholder="e.g. 6, 7, 8, 9, 10, 11"
                  value={Array.isArray(newProduct.specifications?.sizes) ? newProduct.specifications.sizes.join(', ') : (newProduct.specifications?.sizes || '')}
                  onChangeText={(val) => {
                    setNewProduct({
                      ...newProduct, 
                      specifications: { ...newProduct.specifications, sizes: val }
                    });
                  }}
                />
                
                <Text style={[styles.label, { marginTop: 12 }]}>Color Variations (Color Rush)</Text>
                <View style={styles.colorBuilder}>
                  <View style={styles.colorBuilderInputs}>
                    <TextInput 
                      style={[styles.input, { flex: 2, marginBottom: 0 }]}
                      placeholder="Color Name (e.g. Coral Rush)"
                      value={newColorVariant.name}
                      onChangeText={(val) => setNewColorVariant({...newColorVariant, name: val})}
                    />
                    <View style={styles.pickerRow}>
                      <TouchableOpacity 
                        style={[styles.colorSquare, { backgroundColor: newColorVariant.hex }]}
                        onPress={() => {
                          if (Platform.OS === 'web') {
                            const input = document.createElement('input');
                            input.type = 'color';
                            input.value = newColorVariant.hex;
                            input.onchange = (e: any) => setNewColorVariant({...newColorVariant, hex: e.target.value});
                            input.click();
                          }
                        }}
                      >
                        <Text style={styles.colorSquareLabel}>Pick</Text>
                      </TouchableOpacity>
                    </View>
                    <TouchableOpacity 
                      style={styles.addColorBtn}
                      onPress={() => {
                        if (!newColorVariant.name) return;
                        const currentColors = Array.isArray(newProduct.specifications.colors) ? newProduct.specifications.colors : [];
                        setNewProduct({
                          ...newProduct,
                          specifications: {
                            ...newProduct.specifications,
                            colors: [...currentColors, { ...newColorVariant }]
                          }
                        });
                        setNewColorVariant({ name: '', hex: '#f8688a' });
                      }}
                    >
                      <Plus size={20} color="#FFFFFF" />
                    </TouchableOpacity>
                  </View>
                  
                  {Array.isArray(newProduct.specifications?.colors) && newProduct.specifications.colors.length > 0 && (
                    <View style={styles.addedColorsList}>
                      {newProduct.specifications.colors.map((c: any, idx: number) => (
                        <View key={idx} style={styles.addedColorItem}>
                          <View style={[styles.addedColorPreview, { backgroundColor: c.hex || c.hex1 }]} />
                          <Text style={styles.addedColorName}>{c.name}</Text>
                          <TouchableOpacity 
                            onPress={() => {
                              setNewProduct({
                                ...newProduct,
                                specifications: {
                                  ...newProduct.specifications,
                                  colors: newProduct.specifications.colors.filter((_: any, i: number) => i !== idx)
                                }
                              });
                            }}
                          >
                            <X size={14} color="#EF4444" />
                          </TouchableOpacity>
                        </View>
                      ))}
                    </View>
                  )}
                </View>

                <Text style={[styles.label, { marginTop: 12 }]}>Short Tagline</Text>
                <TextInput 
                  style={styles.input}
                  placeholder="e.g. Engineered for speed. Built for distance."
                  value={newProduct.specifications?.tagline || ''}
                  onChangeText={(val) => {
                    setNewProduct({
                      ...newProduct, 
                      specifications: { ...newProduct.specifications, tagline: val }
                    });
                  }}
                />
              </View>
            )}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Product Description</Text>
              <TextInput 
                style={[styles.input, styles.textArea]}
                placeholder="Enter detailed product description..."
                multiline
                numberOfLines={4}
                value={newProduct.description}
                onChangeText={(val) => setNewProduct({...newProduct, description: val})}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Product Images ({newProduct.images.length}/5)</Text>
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false} 
                style={styles.imageGrid}
                contentContainerStyle={{ gap: 12, paddingRight: 20 }}
              >
                {newProduct.images.map((img, idx) => (
                  <View key={idx} style={styles.imageSlot}>
                    <Image source={{ uri: img }} style={styles.slotImage} />
                    <TouchableOpacity 
                      style={styles.removeImageBtn} 
                      onPress={() => removeImage(idx)}
                    >
                      <X size={14} color="#FFFFFF" />
                    </TouchableOpacity>
                  </View>
                ))}
                
                {newProduct.images.length < 5 && (
                  <TouchableOpacity 
                    style={[styles.imageSlot, styles.addSlot]} 
                    onPress={pickImage}
                    disabled={isUploadingImage}
                  >
                    {isUploadingImage ? (
                      <ActivityIndicator color="#f8688a" />
                    ) : (
                      <>
                        <Plus size={24} color="#9CA3AF" />
                        <Text style={styles.addSlotText}>Add</Text>
                      </>
                    )}
                  </TouchableOpacity>
                )}
              </ScrollView>
              <Text style={styles.helperText}>Recommended size: 800x600px. First image is used as main cover.</Text>
            </View>

            <View style={styles.formFooter}>
              <Button 
                title="Discard" 
                variant="outline" 
                onPress={() => { setShowAddForm(false); setEditingProduct(null); }}
                style={{ width: 120, marginRight: 12 }}
              />
              <Button 
                title={isSubmitting ? "Saving..." : (editingProduct ? "Update Product" : "Save Product")} 
                onPress={handleAddProduct}
                loading={isSubmitting}
                style={{ width: 200 }}
              />
            </View>
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
                      <TouchableOpacity 
                        style={styles.actionBtn}
                        onPress={() => handleEditProduct(product)}
                        disabled={isSubmitting}
                      >
                        <Edit2 size={16} color="#4B5563" />
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={[styles.actionBtn, styles.deleteBtn]}
                        onPress={() => handleDeleteProduct(product.id)}
                        disabled={isSubmitting}
                      >
                        {isSubmitting ? (
                          <ActivityIndicator size="small" color="#EF4444" />
                        ) : (
                          <Trash2 size={16} color="#EF4444" />
                        )}
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

  return (
    <>
      {Platform.OS === 'web' ? (
        <WebLayout viewMode={viewMode} showAddForm={showAddForm}>{content}</WebLayout>
      ) : (
        <View style={{ flex: 1, backgroundColor: '#F9FAFB' }}>
          <MobileAppNavbar title="SHOP PRODUCTS" titleColor="#10b981" />
          {content}
        </View>
      )}
    </>
  );
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
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteBtn: {
    backgroundColor: '#FEF2F2',
  },
  addFormContainer: {
    marginBottom: 32,
    padding: 0,
    overflow: 'hidden',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 15,
    elevation: 4,
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
    padding: 32,
  },
  formGrid: {
    gap: 20,
  },
  formGroup: {
    marginBottom: 0,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 8,
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
    gap: 20,
  },
  categoryPicker: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 16,
  },
  catChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  catChipActive: {
    backgroundColor: '#00ea6b',
    borderColor: '#00ea6b',
  },
  catChipText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#4B5563',
  },
  catChipTextActive: {
    color: '#FFFFFF',
  },
  headerTabs: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    padding: 4,
    borderRadius: 12,
    gap: 4,
  },
  headerTab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  headerTabActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  headerTabText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748B',
  },
  headerTabTextActive: {
    color: '#111827',
  },
  categoriesContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  addCategorySection: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  categoriesGrid: {
    gap: 12,
  },
  categoryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  categoryInfo: {
    flex: 1,
  },
  categoryMainName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  categoryStats: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  deleteCategoryBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FEF2F2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  formFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 16,
  },
  imageGrid: {
    marginTop: 8,
    marginBottom: 8,
  },
  imageSlot: {
    width: 100,
    height: 100,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    position: 'relative',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  slotImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  removeImageBtn: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addSlot: {
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  addSlotText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#9CA3AF',
  },
  helperText: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 8,
  },
  colorBuilder: {
    backgroundColor: '#F9FAFB',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  colorBuilderInputs: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  pickerRow: {
    flexDirection: 'row',
    gap: 8,
  },
  colorSquare: {
    width: 40,
    height: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  colorSquareLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  addColorBtn: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#01b854',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addedColorsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  addedColorItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 6,
    paddingRight: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 8,
  },
  addedColorPreview: {
    width: 24,
    height: 24,
    borderRadius: 4,
    overflow: 'hidden',
    flexDirection: 'row',
  },
  previewHalf: {
    flex: 1,
  },
  addedColorName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
  },
});
