import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, ActivityIndicator, Alert, TextInput } from 'react-native';
import { supabase } from '@/lib/supabase';
import { ShoppingBag, Plus, Search, Edit2, Trash2, Package, ClipboardList, X, Image as ImageIcon, Upload, Bold, Italic, List, Eye, Code, Type, Link, Quote, Smile, Undo, Trash, FileText } from 'lucide-react-native';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import WebLayout from '@/components/web/WebLayout';
import { Platform, Modal, DeviceEventEmitter } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { decode } from 'base64-arraybuffer';
import ShopSubbar from '@/components/admin/ShopSubbar';

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

  const params = useLocalSearchParams();

  const [previewMode, setPreviewMode] = useState(false);
  const [selection, setSelection] = useState({ start: 0, end: 0 });

  const applyFormatting = (type: 'bold' | 'italic' | 'list' | 'heading' | 'link' | 'quote' | 'clear') => {
    const text = editingProduct ? editingProduct.description : newProduct.description;
    const currentText = text || '';
    let formattedText = currentText;

    const selectedText = currentText.substring(selection.start, selection.end);
    const beforeSelection = currentText.substring(0, selection.start);
    const afterSelection = currentText.substring(selection.end);

    switch (type) {
      case 'bold':
        formattedText = beforeSelection + `**${selectedText || 'Bold Text'}**` + afterSelection;
        break;
      case 'italic':
        formattedText = beforeSelection + `_${selectedText || 'Italic Text'}_` + afterSelection;
        break;
      case 'list':
        formattedText = beforeSelection + `\n- ${selectedText || 'List Item'}` + afterSelection;
        break;
      case 'heading':
        formattedText = beforeSelection + `\n### ${selectedText || 'Heading'}` + afterSelection;
        break;
      case 'link':
        formattedText = beforeSelection + `[${selectedText || 'Link Title'}](url)` + afterSelection;
        break;
      case 'quote':
        formattedText = beforeSelection + `\n> ${selectedText || 'Quote'}` + afterSelection;
        break;
      case 'clear':
        formattedText = '';
        break;
    }

    if (editingProduct) {
      setEditingProduct({ ...editingProduct, description: formattedText });
    } else {
      setNewProduct({ ...newProduct, description: formattedText });
    }
  };

  const insertEmoji = (emoji: string) => {
    const text = editingProduct ? editingProduct.description : newProduct.description;
    const currentText = text || '';
    const beforeSelection = currentText.substring(0, selection.start);
    const afterSelection = currentText.substring(selection.end);
    const formattedText = beforeSelection + emoji + afterSelection;

    if (editingProduct) {
      setEditingProduct({ ...editingProduct, description: formattedText });
    } else {
      setNewProduct({ ...newProduct, description: formattedText });
    }
  };

  const charCount = (editingProduct ? editingProduct.description : newProduct.description)?.length || 0;

  useEffect(() => {
    fetchProducts();
    fetchCategories();

    // Check for view param from ShopSubbar
    if (params.view === 'categories') {
      setViewMode('categories');
    }

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

  const handleImageUpload = async () => {
    if (newProduct.images.length >= 5) {
      const msg = 'You can only add up to 5 images per product.';
      if (Platform.OS === 'web') window.alert(msg);
      else Alert.alert('Limit Reached', msg);
      return;
    }

    try {
      setIsSubmitting(true);
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.7,
        base64: true,
      });
      
      if (result.canceled) return;

      if (result.assets && result.assets[0].base64) {
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

        const updatedImages = [...newProduct.images, publicUrl];
        setNewProduct(prev => ({
          ...prev,
          images: updatedImages
        }));
        
        if (editingProduct) {
          setEditingProduct((prev: any) => ({
            ...prev,
            images: updatedImages
          }));
        }
      }
    } catch (err: any) {
      console.error('Pick image error:', err);
      const msg = err.message || 'Failed to upload image';
      if (Platform.OS === 'web') window.alert('Upload Error: ' + msg);
      else Alert.alert('Upload Error', msg);
    } finally {
      setIsSubmitting(false);
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

  const [selectedCategory, setSelectedCategory] = useState('all');

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         p.category?.name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || p.category_id === selectedCategory;
    return matchesSearch && matchesCategory;
  });

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
          <View />
        </View>
      )}

      {viewMode === 'categories' ? (
        <View style={styles.categoriesContainer}>
          <View style={styles.combinedCategoryHeader}>
            <View style={styles.searchBarCategories}>
              <Search size={18} color="#9CA3AF" />
              <TextInput
                style={styles.searchInput}
                placeholder="Search categories..."
                placeholderTextColor="#9CA3AF"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>

            <View style={styles.addCategorySection}>
              <TextInput 
                style={[styles.input, { flex: 1, marginBottom: 0, height: 44 }]}
                placeholder="New Category Name..."
                value={newCategoryName}
                onChangeText={setNewCategoryName}
              />
              <Button 
                title={isSubmitting ? "..." : "Add Category"} 
                onPress={handleAddCategory}
                disabled={isSubmitting}
                style={{ width: 140, height: 44 }}
              />
            </View>
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
      ) : (
        <>
          <View style={styles.combinedRow}>
            <View style={styles.filterRow}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <TouchableOpacity 
                  style={[styles.filterChip, selectedCategory === 'all' && styles.filterChipActive]}
                  onPress={() => setSelectedCategory('all')}
                >
                  <Text style={[styles.filterChipText, selectedCategory === 'all' && styles.filterChipTextActive]}>
                    All
                  </Text>
                </TouchableOpacity>
                {categories.map(cat => (
                  <TouchableOpacity 
                    key={cat.id}
                    style={[styles.filterChip, selectedCategory === cat.id && styles.filterChipActive]}
                    onPress={() => setSelectedCategory(cat.id)}
                  >
                    <Text style={[styles.filterChipText, selectedCategory === cat.id && styles.filterChipTextActive]}>
                      {cat.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <View style={styles.searchBarProducts}>
              <Search size={18} color="#9CA3AF" />
              <TextInput
                style={styles.searchInput}
                placeholder="Search products..."
                placeholderTextColor="#9CA3AF"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>
          </View>

          {showAddForm ? (
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
                      value={editingProduct ? editingProduct.name : newProduct.name}
                      onChangeText={(val) => editingProduct ? setEditingProduct({...editingProduct, name: val}) : setNewProduct({...newProduct, name: val})}
                    />
                  </View>

                  <View style={styles.formGroup}>
                    <Text style={styles.label}>Price (₹)</Text>
                    <TextInput 
                      style={styles.input}
                      placeholder="0.00"
                      keyboardType="numeric"
                      value={editingProduct ? String(editingProduct.price) : newProduct.price}
                      onChangeText={(val) => editingProduct ? setEditingProduct({...editingProduct, price: val}) : setNewProduct({...newProduct, price: val})}
                    />
                  </View>

                  <View style={styles.formGroup}>
                    <Text style={styles.label}>Category</Text>
                    <View style={styles.pickerContainer}>
                      <select 
                        style={{ 
                          width: '100%', 
                          height: 38, 
                          border: 'none', 
                          outline: 'none', 
                          backgroundColor: 'transparent',
                          fontSize: 13,
                          color: '#111827',
                          fontFamily: 'Inter'
                        }}
                        value={editingProduct ? editingProduct.category_id : newProduct.category_id}
                        onChange={(e) => editingProduct ? setEditingProduct({...editingProduct, category_id: e.target.value}) : setNewProduct({...newProduct, category_id: e.target.value})}
                      >
                        <option value="">Select Category</option>
                        {categories.map(cat => (
                          <option key={cat.id} value={cat.id}>{cat.name}</option>
                        ))}
                      </select>
                    </View>
                  </View>

                  <View style={styles.formGroup}>
                    <Text style={styles.label}>Stock Quantity</Text>
                    <TextInput 
                      style={styles.input}
                      placeholder="0"
                      keyboardType="numeric"
                      value={editingProduct ? String(editingProduct.stock_quantity) : newProduct.stock_quantity}
                      onChangeText={(val) => editingProduct ? setEditingProduct({...editingProduct, stock_quantity: val}) : setNewProduct({...newProduct, stock_quantity: val})}
                    />
                  </View>
                </View>

                <View style={styles.formGroup}>
                  <View style={styles.editorHeader}>
                    <Text style={styles.label}>Description</Text>
                    <View style={styles.charCountContainer}>
                      <FileText size={12} color="#9CA3AF" />
                      <Text style={styles.charCountText}>{charCount} chars</Text>
                    </View>
                  </View>

                  <View style={styles.editorToolbar}>
                    <View style={styles.toolbarGroup}>
                      <TouchableOpacity style={styles.toolbarBtn} onPress={() => applyFormatting('bold')}>
                        <Bold size={14} color="#4B5563" />
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.toolbarBtn} onPress={() => applyFormatting('italic')}>
                        <Italic size={14} color="#4B5563" />
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.toolbarBtn} onPress={() => applyFormatting('heading')}>
                        <Type size={14} color="#4B5563" />
                      </TouchableOpacity>
                    </View>
                    
                    <View style={styles.toolbarDivider} />
                    
                    <View style={styles.toolbarGroup}>
                      <TouchableOpacity style={styles.toolbarBtn} onPress={() => applyFormatting('list')}>
                        <List size={14} color="#4B5563" />
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.toolbarBtn} onPress={() => applyFormatting('quote')}>
                        <Quote size={14} color="#4B5563" />
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.toolbarBtn} onPress={() => applyFormatting('link')}>
                        <Link size={14} color="#4B5563" />
                      </TouchableOpacity>
                    </View>

                    <View style={styles.toolbarDivider} />

                    <View style={styles.toolbarGroup}>
                      <TouchableOpacity style={styles.toolbarBtn} onPress={() => applyFormatting('clear')}>
                        <Trash size={14} color="#EF4444" />
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={[styles.toolbarBtn, previewMode && styles.toolbarBtnActive]} 
                        onPress={() => setPreviewMode(!previewMode)}
                      >
                        {previewMode ? <Code size={14} color="#00ea6b" /> : <Eye size={14} color="#4B5563" />}
                        <Text style={[styles.toolbarBtnText, previewMode && { color: '#00ea6b' }]}>
                          {previewMode ? 'Edit' : 'Preview'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View style={styles.emojiRow}>
                    {['🔥', '✨', '⚽', '🏏', '👟', '👕', '⭐', '💯'].map(emoji => (
                      <TouchableOpacity key={emoji} style={styles.emojiBtn} onPress={() => insertEmoji(emoji)}>
                        <Text style={styles.emojiText}>{emoji}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  
                  {previewMode ? (
                    <View style={[styles.input, styles.previewContainer]}>
                      <ScrollView showsVerticalScrollIndicator={false}>
                        <Text style={styles.previewText}>
                          {editingProduct ? editingProduct.description : newProduct.description}
                        </Text>
                      </ScrollView>
                    </View>
                  ) : (
                    <TextInput 
                      style={[styles.input, { height: 180, textAlignVertical: 'top', paddingTop: 12 }]}
                      placeholder="Product description..."
                      multiline
                      value={editingProduct ? editingProduct.description : newProduct.description}
                      onChangeText={(val) => editingProduct ? setEditingProduct({...editingProduct, description: val}) : setNewProduct({...newProduct, description: val})}
                      onSelectionChange={(e) => setSelection(e.nativeEvent.selection)}
                    />
                  )}
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.label}>Product Images</Text>
                  <ScrollView horizontal style={styles.imageSlots} showsHorizontalScrollIndicator={false}>
                    {(editingProduct ? editingProduct.images : newProduct.images).map((img: string, idx: number) => (
                      <View key={idx} style={styles.imageSlot}>
                        <Image source={{ uri: img }} style={styles.slotImage} />
                        <TouchableOpacity 
                          style={styles.removeImgBtn}
                          onPress={() => {
                            const currentImages = editingProduct ? [...editingProduct.images] : [...newProduct.images];
                            currentImages.splice(idx, 1);
                            editingProduct ? setEditingProduct({...editingProduct, images: currentImages}) : setNewProduct({...newProduct, images: currentImages});
                          }}
                        >
                          <X size={14} color="#FFFFFF" />
                        </TouchableOpacity>
                      </View>
                    ))}
                    {(editingProduct ? editingProduct.images.length : newProduct.images.length) < 5 && (
                      <TouchableOpacity 
                        style={styles.addSlotBtn}
                        onPress={handleImageUpload}
                        disabled={isSubmitting}
                      >
                        {isSubmitting ? (
                          <ActivityIndicator size="small" color="#9CA3AF" />
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
                    style={{ height: 36, paddingHorizontal: 16 }}
                    textStyle={{ fontSize: 13, fontWeight: '600', fontFamily: 'Inter' }}
                  />
                  <Button 
                    title={isSubmitting ? "Saving..." : (editingProduct ? "Update Product" : "Save Product")} 
                    onPress={handleAddProduct}
                    loading={isSubmitting}
                    style={{ height: 36, paddingHorizontal: 24, marginLeft: 12 }}
                    textStyle={{ fontSize: 13, fontWeight: '600', fontFamily: 'Inter' }}
                  />
                </View>
              </View>
            </View>
          ) : (
            <View style={styles.tableContainer}>
              <View style={styles.tableHeader}>
                <View style={[styles.headerCell, { flex: 0.8 }]}>
                  <Text style={styles.headerLabel}>Image</Text>
                </View>
                <View style={[styles.headerCell, { flex: 2 }]}>
                  <Text style={styles.headerLabel}>Product Name</Text>
                </View>
                <View style={[styles.headerCell, { flex: 1.2 }]}>
                  <Text style={styles.headerLabel}>Category</Text>
                </View>
                <View style={[styles.headerCell, { flex: 1 }]}>
                  <Text style={styles.headerLabel}>Price</Text>
                </View>
                <View style={[styles.headerCell, { flex: 1 }]}>
                  <Text style={styles.headerLabel}>Stock</Text>
                </View>
                <View style={[styles.headerCell, { flex: 0.5, alignItems: 'flex-end' }]}>
                  <Text style={styles.headerLabel}>Action</Text>
                </View>
              </View>

              <View style={styles.tableBody}>
                {loading ? (
                  <ActivityIndicator size="large" color="#00ea6b" style={{ marginTop: 40 }} />
                ) : filteredProducts.length === 0 ? (
                  <View style={styles.emptyState}>
                    <Package size={48} color="#E5E7EB" />
                    <Text style={styles.emptyText}>No products found</Text>
                  </View>
                ) : filteredProducts.map((product) => (
                  <TouchableOpacity 
                    key={product.id} 
                    style={styles.productRow}
                    onPress={() => handleEditProduct(product)}
                  >
                    <View style={[styles.tableCell, { flex: 0.8 }]}>
                      <View style={styles.tableImageContainer}>
                        {(product.images && product.images[0]) ? (
                          <Image source={{ uri: product.images[0] }} style={styles.tableImage} />
                        ) : (
                          <Package size={20} color="#E5E7EB" />
                        )}
                      </View>
                    </View>
                    <View style={[styles.tableCell, { flex: 2 }]}>
                      <Text style={styles.tableProductName}>{product.name}</Text>
                      {product.description && (
                        <Text style={styles.tableDescription} numberOfLines={1}>{product.description}</Text>
                      )}
                    </View>
                    <View style={[styles.tableCell, { flex: 1.2 }]}>
                      <View style={styles.categoryBadge}>
                        <Text style={styles.categoryBadgeText}>{product.category?.name || 'Uncategorized'}</Text>
                      </View>
                    </View>
                    <View style={[styles.tableCell, { flex: 1 }]}>
                      <Text style={styles.tablePrice}>₹{Number(product.price).toLocaleString('en-IN')}</Text>
                    </View>
                    <View style={[styles.tableCell, { flex: 1 }]}>
                      <View style={[
                        styles.stockIndicator, 
                        (product.stock_quantity || 0) <= 5 && styles.stockLow,
                        (product.stock_quantity || 0) === 0 && styles.stockOut
                      ]}>
                        <Text style={[
                          styles.stockIndicatorText,
                          (product.stock_quantity || 0) <= 5 && styles.stockLowText,
                          (product.stock_quantity || 0) === 0 && styles.stockOutText
                        ]}>
                          {product.stock_quantity || 0}
                        </Text>
                      </View>
                    </View>
                    <View style={[styles.tableCell, { flex: 0.5, alignItems: 'flex-end' }]}>
                      <TouchableOpacity 
                        onPress={(e) => {
                          e.stopPropagation();
                          handleDeleteProduct(product.id);
                        }}
                        style={styles.deleteActionBtn}
                      >
                        <Trash2 size={16} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
        </>
      )}
    </ScrollView>
  );

  return (
    <>
      {Platform.OS === 'web' ? (
        <WebLayout viewMode={viewMode} showAddForm={showAddForm}>
          <ShopSubbar onAddProduct={() => setShowAddForm(true)}>
            {content}
          </ShopSubbar>
        </WebLayout>
      ) : (
        <View style={{ flex: 1, backgroundColor: '#F9FAFB' }}>
          {content}
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    padding: 24,
    paddingTop: 0,
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
    fontSize: 14,
    color: '#111827',
    fontFamily: 'Inter',
  },
  tableContainer: {
    backgroundColor: '#FFFFFF',
    marginTop: 8,
  },
  tableHeader: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#F9FAFB',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  headerCell: {
    justifyContent: 'center',
  },
  headerLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontFamily: 'Inter',
  },
  tableBody: {
    backgroundColor: '#FFFFFF',
  },
  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    backgroundColor: '#FFFFFF',
  },
  tableCell: {
    justifyContent: 'center',
    paddingRight: 16,
  },
  tableImageContainer: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  tableImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  tableProductName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
    fontFamily: 'Inter',
  },
  tableDescription: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
    fontFamily: 'Inter',
  },
  categoryBadge: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  categoryBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#4B5563',
    fontFamily: 'Inter',
  },
  tablePrice: {
    fontSize: 13,
    fontWeight: '700',
    color: '#10b981',
    fontFamily: 'Inter',
  },
  stockIndicator: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  stockIndicatorText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
    fontFamily: 'Inter',
  },
  stockLow: {
    backgroundColor: '#FFFBEB',
  },
  stockLowText: {
    color: '#D97706',
  },
  stockOut: {
    backgroundColor: '#FEF2F2',
  },
  stockOutText: {
    color: '#DC2626',
  },
  deleteActionBtn: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#FEF2F2',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 16,
  },
  emptyText: {
    fontSize: 14,
    color: '#9CA3AF',
    fontFamily: 'Inter',
  },
  combinedRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    gap: 16,
  },
  filterRow: {
    flex: 1,
    marginRight: 16,
  },
  searchBarProducts: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 44,
    width: 280,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 12,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 99,
    backgroundColor: '#FFFFFF',
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  filterChipActive: {
    backgroundColor: '#111827',
    borderColor: '#111827',
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    fontFamily: 'Inter',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  imagePlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
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
    fontSize: 10,
    fontWeight: '600',
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
    fontFamily: 'Inter',
  },
  productName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
    fontFamily: 'Inter',
  },
  productPrice: {
    fontSize: 14,
    fontWeight: '700',
    color: '#00ea6b',
    fontFamily: 'Inter',
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
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    fontFamily: 'Inter',
  },
  cancelText: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
    fontFamily: 'Inter',
  },
  formBody: {
    padding: 24,
  },
  formGrid: {
    gap: 16,
  },
  formGroup: {
    marginBottom: 0,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
    fontFamily: 'Inter',
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4B5563',
    marginBottom: 4,
    fontFamily: 'Inter',
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 38,
    fontSize: 13,
    color: '#111827',
    marginBottom: 12,
    fontFamily: 'Inter',
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
    fontSize: 12,
    fontWeight: '600',
    color: '#4B5563',
    fontFamily: 'Inter',
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
    marginTop: 8,
  },
  combinedCategoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 24,
    marginBottom: 24,
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  searchBarCategories: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 44,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  addCategorySection: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    width: '50%',
  },
  categoriesGrid: {
    gap: 0,
  },
  categoryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  categoryInfo: {
    flex: 1,
  },
  categoryMainName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    fontFamily: 'Inter',
  },
  categoryStats: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
    fontFamily: 'Inter',
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
    fontSize: 11,
    fontWeight: '600',
    color: '#9CA3AF',
    fontFamily: 'Inter',
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
  editorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  charCountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  charCountText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#6B7280',
    fontFamily: 'Inter',
  },
  editorToolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    padding: 4,
    borderRadius: 8,
    gap: 0,
    marginBottom: 8,
  },
  toolbarGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 4,
  },
  toolbarBtn: {
    padding: 6,
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  emojiRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  emojiBtn: {
    width: 32,
    height: 32,
    borderRadius: 6,
    backgroundColor: '#F9FAFB',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  emojiText: {
    fontSize: 16,
  },
  toolbarBtnActive: {
    backgroundColor: '#ECFDF5',
    borderColor: '#10B981',
  },
  toolbarBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#4B5563',
    fontFamily: 'Inter',
  },
  toolbarDivider: {
    width: 1,
    height: 16,
    backgroundColor: '#E5E7EB',
    marginHorizontal: 4,
  },
  previewContainer: {
    height: 180,
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderColor: '#E5E7EB',
  },
  previewText: {
    fontSize: 13,
    lineHeight: 20,
    color: '#374151',
    fontFamily: 'Inter',
  },
});
