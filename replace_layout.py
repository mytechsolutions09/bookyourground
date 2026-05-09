import re

file_path = '/Users/arppitmkanotra/Documents/site/bookyourground/app/shop/[slug].tsx'

with open(file_path, 'r') as f:
    content = f.read()

# We need to replace the content inside the `if (Platform.OS === 'web' && !isSmall) {` block.
# Let's find the start of the block
start_marker = "if (Platform.OS === 'web' && !isSmall) {"
start_idx = content.find(start_marker)

if start_idx == -1:
    print("Could not find start marker")
    exit(1)

# Now let's extract the part from start_marker to the end of the `if` block.
# We will just replace everything between `if (Platform.OS === 'web' && !isSmall) {` and `if (Platform.OS === 'web') {` (the next block).
next_block_marker = "if (Platform.OS === 'web') {"
end_idx = content.find(next_block_marker, start_idx)

if end_idx == -1:
    print("Could not find next block marker")
    exit(1)

original_block = content[start_idx:end_idx]

# We want to keep the non-shoes layout but completely replace the shoes layout.
# Actually, the user asked to "design product page like this", they probably meant the entire web layout for this product type.
# Let's just create the new Amazon layout and use it for all products on Web Desktop, or just for shoes.
# It's safer to use it for all products to fully satisfy the prompt, or at least keep the isShoes logic but use the amazon layout for shoes.

new_block = """if (Platform.OS === 'web' && !isSmall) {
    const isShoes = product.category?.name === 'Shoes';
    
    return (
      <WebLayout>
        <Stack.Screen options={{ title: product.name }} />
        <ScrollView style={{ flex: 1, backgroundColor: '#FFFFFF' }} showsVerticalScrollIndicator={false}>
          <View style={[styles.webContainer, { maxWidth: 1500, padding: 20 }]}>
            {isShoes ? (
              <View style={{ flexDirection: 'row', gap: 24, paddingVertical: 20 }}>
                {/* COLUMN 1: IMAGES */}
                <View style={{ flex: 1.2, flexDirection: 'row', gap: 16 }}>
                  {/* Thumbnails */}
                  <View style={{ width: 60, gap: 12 }}>
                    {(product.images || []).map((img: string, i: number) => (
                      <TouchableOpacity 
                        key={i} 
                        style={{ width: 60, height: 60, borderRadius: 8, borderWidth: 1, borderColor: activeImageIndex === i ? '#007185' : '#D5D9D9', overflow: 'hidden' }}
                        onPress={() => setActiveImageIndex(i)}
                      >
                        <Image source={{ uri: img }} style={{ width: '100%', height: '100%', resizeMode: 'cover' }} />
                      </TouchableOpacity>
                    ))}
                  </View>
                  {/* Main Image */}
                  <View style={{ flex: 1, backgroundColor: '#FFFFFF', borderRadius: 8, alignItems: 'center', justifyContent: 'center' }}>
                    <Image 
                      source={{ uri: product.images?.[activeImageIndex] || product.images?.[0] || 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&q=80' }} 
                      style={{ width: '100%', height: '100%', resizeMode: 'contain', maxHeight: 600 }} 
                    />
                  </View>
                </View>

                {/* COLUMN 2: DETAILS */}
                <View style={{ flex: 1.5, paddingHorizontal: 12 }}>
                  <TouchableOpacity>
                    <Text style={{ color: '#007185', fontSize: 14, marginBottom: 8, fontFamily: 'Inter' }}>Visit the adidas Store</Text>
                  </TouchableOpacity>
                  <Text style={{ fontSize: 24, color: '#0F1111', marginBottom: 12, fontFamily: 'Inter', lineHeight: 32 }}>{product.name}</Text>
                  
                  {/* Price */}
                  <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 4 }}>
                    <Text style={{ color: '#CC0C39', fontSize: 28, fontWeight: '300', fontFamily: 'Inter' }}>-60%</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                      <Text style={{ fontSize: 14, color: '#0F1111', marginTop: 4, marginRight: 2 }}>₹</Text>
                      <Text style={{ fontSize: 28, fontWeight: '600', color: '#0F1111', fontFamily: 'Inter' }}>{product.price.toLocaleString('en-IN')}</Text>
                    </View>
                  </View>
                  <Text style={{ color: '#565959', fontSize: 12, marginBottom: 4, fontFamily: 'Inter' }}>
                    M.R.P.: <Text style={{ textDecorationLine: 'line-through' }}>₹{product.discount_price ? product.discount_price.toLocaleString('en-IN') : (product.price * 2.5).toLocaleString('en-IN')}</Text>
                  </Text>
                  <Text style={{ color: '#0F1111', fontSize: 14, marginBottom: 16, fontFamily: 'Inter' }}>Inclusive of all taxes</Text>

                  {/* Badges */}
                  <View style={{ flexDirection: 'row', gap: 24, borderBottomWidth: 1, borderBottomColor: '#E5E7EB', paddingBottom: 16, marginBottom: 16 }}>
                    <View style={{ alignItems: 'center', width: 80 }}>
                      <RotateCcw size={28} color="#007185" strokeWidth={1} />
                      <Text style={{ fontSize: 12, color: '#007185', textAlign: 'center', marginTop: 8, fontFamily: 'Inter' }}>10 days Return & Exchange</Text>
                    </View>
                    <View style={{ alignItems: 'center', width: 80 }}>
                      <Truck size={28} color="#007185" strokeWidth={1} />
                      <Text style={{ fontSize: 12, color: '#007185', textAlign: 'center', marginTop: 8, fontFamily: 'Inter' }}>Free Delivery</Text>
                    </View>
                    <View style={{ alignItems: 'center', width: 80 }}>
                      <ShieldCheck size={28} color="#007185" strokeWidth={1} />
                      <Text style={{ fontSize: 12, color: '#007185', textAlign: 'center', marginTop: 8, fontFamily: 'Inter' }}>Secure transaction</Text>
                    </View>
                  </View>

                  {/* Selection */}
                  <Text style={{ fontSize: 14, color: '#0F1111', marginBottom: 8, fontFamily: 'Inter' }}>
                    Colour: <Text style={{ fontWeight: '700' }}>{selectedColor?.name || 'White'}</Text>
                  </Text>
                  <Text style={{ fontSize: 14, color: '#0F1111', marginBottom: 12, fontFamily: 'Inter' }}>
                    Size: <Text style={{ fontWeight: '700' }}>{selectedSize || '9 UK'}</Text>
                  </Text>
                  
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 24 }}>
                    {((product.specifications?.sizes && product.specifications.sizes.length > 0) ? product.specifications.sizes : [6, 7, 8, 9, 10, 11]).map((size: any, idx: number) => {
                      const isSelected = selectedSize === size;
                      return (
                        <TouchableOpacity 
                          key={idx} 
                          style={{ 
                            borderWidth: isSelected ? 2 : 1, 
                            borderColor: isSelected ? '#007185' : '#D5D9D9', 
                            borderRadius: 4, 
                            padding: 8,
                            width: 80,
                            backgroundColor: isSelected ? '#F0F8FA' : '#FFFFFF'
                          }}
                          onPress={() => setSelectedSize(size)}
                        >
                          <Text style={{ fontSize: 14, fontWeight: isSelected ? '700' : '400', color: '#0F1111', marginBottom: 4, fontFamily: 'Inter' }}>{size} UK</Text>
                          <Text style={{ fontSize: 12, color: '#B12704', fontWeight: '500', fontFamily: 'Inter' }}>₹{product.price.toLocaleString('en-IN')}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                  <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Text style={{ fontSize: 14, color: '#007185', fontFamily: 'Inter' }}>Size Chart</Text>
                  </TouchableOpacity>
                </View>

                {/* COLUMN 3: BUY BOX */}
                <View style={{ width: 280, borderWidth: 1, borderColor: '#D5D9D9', borderRadius: 8, padding: 16 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 }}>
                    <Text style={{ fontSize: 14, color: '#0F1111', marginTop: 2, marginRight: 2 }}>₹</Text>
                    <Text style={{ fontSize: 24, fontWeight: '600', color: '#0F1111', fontFamily: 'Inter' }}>{product.price.toLocaleString('en-IN')}</Text>
                  </View>
                  
                  <Text style={{ fontSize: 14, color: '#0F1111', marginBottom: 8, fontFamily: 'Inter' }}>
                    FREE delivery <Text style={{ fontWeight: '700' }}>Tuesday, 12 May.</Text>
                  </Text>
                  <TouchableOpacity style={{ marginBottom: 16 }}>
                    <Text style={{ fontSize: 14, color: '#007185', fontFamily: 'Inter' }}>Details</Text>
                  </TouchableOpacity>

                  <Text style={{ fontSize: 18, color: '#007600', fontWeight: '500', marginBottom: 16, fontFamily: 'Inter' }}>In stock</Text>
                  
                  <View style={{ marginBottom: 16 }}>
                    <View style={{ flexDirection: 'row', marginBottom: 4 }}>
                      <Text style={{ width: 80, fontSize: 12, color: '#565959', fontFamily: 'Inter' }}>Sold by</Text>
                      <Text style={{ fontSize: 12, color: '#007185', fontFamily: 'Inter' }}>adidas India Marketing Pvt Ltd</Text>
                    </View>
                    <View style={{ flexDirection: 'row', marginBottom: 4 }}>
                      <Text style={{ width: 80, fontSize: 12, color: '#565959', fontFamily: 'Inter' }}>Payment</Text>
                      <Text style={{ fontSize: 12, color: '#007185', fontFamily: 'Inter' }}>Secure transaction</Text>
                    </View>
                  </View>

                  <TouchableOpacity 
                    style={{ backgroundColor: '#FFD814', borderRadius: 100, paddingVertical: 12, alignItems: 'center', marginBottom: 8 }}
                    onPress={addToCart}
                  >
                    <Text style={{ color: '#0F1111', fontSize: 14, fontFamily: 'Inter' }}>Add to cart</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={{ backgroundColor: '#FFA41C', borderRadius: 100, paddingVertical: 12, alignItems: 'center', marginBottom: 16 }}
                    onPress={addToCart}
                  >
                    <Text style={{ color: '#0F1111', fontSize: 14, fontFamily: 'Inter' }}>Buy Now</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={{ borderWidth: 1, borderColor: '#D5D9D9', borderRadius: 8, paddingVertical: 8, alignItems: 'center' }}>
                    <Text style={{ color: '#0F1111', fontSize: 14, fontFamily: 'Inter' }}>Add to Wish List</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View style={[styles.webGrid, isCompact && styles.webGridCompact]}>
                <View style={styles.webImageCol}>
                  <View style={styles.webMainImageWrapper}>
                    <Image source={{ uri: product.images?.[activeImageIndex] || product.images?.[0] || 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&q=80' }} style={styles.webMainImage} />
                  </View>
                  {product.images && product.images.length > 1 && (
                    <View style={styles.webThumbnails}>
                      {(product.images || []).map((img: string, i: number) => (
                        <TouchableOpacity key={i} style={[styles.webThumb, i === activeImageIndex && styles.webThumbActive]} onPress={() => setActiveImageIndex(i)}>
                          <Image source={{ uri: img }} style={styles.webThumbImage} />
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>
                <View style={styles.webInfoCol}>
                  <Text style={styles.webProductName}>{product.name}</Text>
                  <View style={styles.webRatingRow}>
                    <View style={styles.webStars}>
                      {[1,2,3,4,5].map(i => <Star key={i} size={18} color="#f8688a" fill="#f8688a" />)}
                    </View>
                    <Text style={styles.webReviewsText}>({product.review_count || 248})</Text>
                  </View>
                  <View style={styles.webPriceContainer}>
                    <Text style={styles.webCurrentPrice}>₹{Number(product.price).toLocaleString('en-IN')}</Text>
                    {product.discount_price && <Text style={styles.webOriginalPrice}>₹{product.discount_price.toLocaleString('en-IN')}</Text>}
                  </View>
                  <Text style={styles.webDescription}>{product.description}</Text>
                  <View style={styles.webActionRow}>
                    <TouchableOpacity style={styles.webAddToCartBtn} onPress={addToCart}>
                      <Text style={styles.webAddToCartText}>ADD TO CART</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            )}
          </View>
        </ScrollView>
      </WebLayout>
    );
  }
"""

new_content = content[:start_idx] + new_block + "\n  " + content[end_idx:]

with open(file_path, 'w') as f:
    f.write(new_content)

print("Replacement successful")
