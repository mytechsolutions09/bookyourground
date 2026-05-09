import re

file_path = '/Users/arppitmkanotra/Documents/site/bookyourground/app/shop/[slug].tsx'

with open(file_path, 'r') as f:
    content = f.read()

# 1. Remove `{isShoes ? (`
old_str_1 = """          <View style={[styles.webContainer, { maxWidth: 1500, padding: 20 }]}>
            {isShoes ? (
              <View style={{ flexDirection: 'row', gap: 24, paddingVertical: 20 }}>"""
new_str_1 = """          <View style={[styles.webContainer, { maxWidth: 1500, padding: 20 }]}>
            <View style={{ flexDirection: 'row', gap: 24, paddingVertical: 20 }}>"""
content = content.replace(old_str_1, new_str_1)


# 2. Wrap the selection block with {isShoes && ( ... )}
old_str_2 = """                  {/* Selection */}
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
                  <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 24 }}>
                    <Text style={{ fontSize: 14, color: '#007185', fontFamily: 'Inter' }}>Size Chart</Text>
                  </TouchableOpacity>"""

new_str_2 = """                  {/* Selection */}
                  {isShoes && (
                    <>
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
                      <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 24 }}>
                        <Text style={{ fontSize: 14, color: '#007185', fontFamily: 'Inter' }}>Size Chart</Text>
                      </TouchableOpacity>
                    </>
                  )}"""

content = content.replace(old_str_2, new_str_2)

# 3. Remove the old layout block
old_str_3 = """                </View>
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
          </View>"""

new_str_3 = """                </View>
              </View>
          </View>"""
content = content.replace(old_str_3, new_str_3)

# 4. Remove 'adidas' hardcode if we want it for all categories, let's change it to generic brand
content = content.replace('Visit the adidas Store', f'Visit the {product.brand || "BookYourGround"} Store'.replace('product.brand', '${product.brand}'))
# Actually the code doesn't have `product.brand`. Let's just use the category name.
content = content.replace('Visit the ${product.brand} || "BookYourGround"} Store', f'Visit the {product.category?.name || "Official"} Store'.replace('product.category?.name', '${product.category?.name}'))
# It's inside a string. I'll just do a simpler replace.
old_brand = """<Text style={{ color: '#007185', fontSize: 14, marginBottom: 8, fontFamily: 'Inter' }}>Visit the adidas Store</Text>"""
new_brand = """<Text style={{ color: '#007185', fontSize: 14, marginBottom: 8, fontFamily: 'Inter' }}>{`Visit the ${product.category?.name || 'Official'} Store`}</Text>"""
content = content.replace(old_brand, new_brand)

with open(file_path, 'w') as f:
    f.write(content)

print("Replacement successful")
