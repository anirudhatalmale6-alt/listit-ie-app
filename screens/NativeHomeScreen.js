import React, { useEffect, useState, useCallback, useRef, useMemo, memo } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, RefreshControl, Dimensions, TextInput,
  Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CDN = 'https://d3ste2v8jw54du.cloudfront.net/';
const API = 'https://api.listit.ie';
const BLUE = '#1b87f4';
const DARK_BLUE = '#0d47a1';

function getTimeAgo(dateStr) {
  if (!dateStr) return '';
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const mins = Math.floor((now - then) / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return '1 day ago';
  if (days < 7) return `${days} days ago`;
  return `${Math.floor(days / 7)}w ago`;
}

function getValidImages(images) {
  if (!images || images.length === 0) return [];
  return images.filter(img => img && img.trim && img.trim().length > 0).map(img => CDN + img);
}

function formatMileage(val) {
  if (!val) return null;
  const n = parseInt(val, 10);
  if (isNaN(n)) return null;
  return n.toLocaleString('en-IE') + ' km';
}

const CATEGORY_ICONS = {
  'cars-and-motors': 'car-sport',
  'house-diy': 'home',
  'electronics': 'laptop',
  'clothes-lifestyle': 'shirt',
  'sports-hobbies': 'bicycle',
  'services': 'construct',
  'jobs': 'briefcase',
  'baby-kids': 'happy',
  'animals': 'paw',
  'farming': 'leaf',
  'business': 'business',
  'holidays-tickets': 'airplane',
  'lost-found': 'search',
  'music-education': 'musical-notes',
  'property': 'storefront',
  'whats-on': 'calendar',
  'pets': 'paw',
  'wanted': 'megaphone',
};

const CategoryRow = memo(({ cat, onPress }) => {
  const iconName = CATEGORY_ICONS[cat.slug] || 'grid-outline';
  return (
    <TouchableOpacity style={styles.categoryRow} onPress={() => onPress(cat)} activeOpacity={0.6}>
      <View style={styles.categoryIconCircle}>
        {cat.image ? (
          <Image
            source={CDN + cat.image}
            style={styles.categoryIconImage}
            contentFit="cover"
            cachePolicy="memory-disk"
          />
        ) : (
          <Ionicons name={iconName} size={22} color={BLUE} />
        )}
      </View>
      <View style={styles.categoryTextWrap}>
        <Text style={styles.categoryName}>{cat.name}</Text>
        {cat.ad_count > 0 && (
          <Text style={styles.categoryCount}>{cat.ad_count} ads</Text>
        )}
      </View>
      <Ionicons name="chevron-forward" size={18} color="#ccc" />
    </TouchableOpacity>
  );
});

const AD_IMAGE_HEIGHT = Math.floor(SCREEN_WIDTH * 0.58);

const AdCard = memo(({ ad, onPress }) => {
  const validImages = useMemo(() => getValidImages(ad.images), [ad.images]);
  const price = parseFloat(ad.price || 0);
  const priceStr = price > 0 ? `€${price.toLocaleString('en-IE')}` : 'Free';
  const totalImages = validImages.length;
  const mainImage = validImages.length > 0 ? validImages[0] : null;

  const vd = ad.vehicleData || {};
  const isVehicle = ad.is_vehicle === 1 && vd.found !== false;
  const specParts = [];
  if (isVehicle) {
    if (vd.year) specParts.push(vd.year);
    if (vd.engine_size) specParts.push(vd.engine_size + 'L');
    if (vd.fuel) specParts.push(vd.fuel);
    const mileStr = formatMileage(vd.milage);
    if (mileStr) specParts.push(mileStr);
  }
  const specLine = specParts.join(' · ');

  return (
    <TouchableOpacity style={styles.adCard} onPress={() => onPress(ad)} activeOpacity={0.7}>
      <View style={styles.adMainImageWrap}>
        {mainImage ? (
          <Image
            source={mainImage}
            style={styles.adMainImage}
            contentFit="cover"
            recyclingKey={`${ad.id}-main`}
            cachePolicy="memory-disk"
          />
        ) : (
          <View style={styles.noImageWrap}>
            <Ionicons name="image-outline" size={40} color="#ccc" />
          </View>
        )}
        {totalImages > 0 && (
          <View style={styles.photoCountBadge}>
            <Ionicons name="camera-outline" size={14} color="#fff" />
            <Text style={styles.photoCountText}>{totalImages}</Text>
          </View>
        )}
        <TouchableOpacity style={styles.heartBtn} activeOpacity={0.7}>
          <Ionicons name="heart-outline" size={22} color="#666" />
        </TouchableOpacity>
      </View>
      <View style={styles.adCardBody}>
        <Text style={styles.adTitle} numberOfLines={2}>{ad.title}</Text>
        {specLine ? <Text style={styles.adSpec} numberOfLines={1}>{specLine}</Text> : null}
        {ad.location ? <Text style={styles.adLocation}>{ad.location}</Text> : null}
        <Text style={styles.adPrice}>{priceStr}</Text>
      </View>
    </TouchableOpacity>
  );
});

export default function NativeHomeScreen({ onCategoryPress, onAdPress, onSearchPress, onLoginPress }) {
  const [categories, setCategories] = useState([]);
  const [ads, setAds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [featuredDealer, setFeaturedDealer] = useState(null);

  const fetchData = useCallback(async (isRefresh = false) => {
    try {
      if (!isRefresh) setLoading(true);
      const [catRes, adRes, searchRes] = await Promise.all([
        fetch(`${API}/admin/init`),
        fetch(`${API}/api/user/ads?page=1&limit=10`),
        fetch(`${API}/api/user/search`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ page: 1, limit: 200 }),
        }),
      ]);
      const catData = await catRes.json();
      const adData = await adRes.json();
      const searchData = await searchRes.json();

      if (catData.status === 1 && catData.data) {
        const allCats = catData.data.categories || [];
        const topCats = allCats.filter(c => c.parent_id === 0);
        setCategories(topCats);
      }
      if (adData.status === 1 && adData.data) {
        setAds(adData.data.result || []);
      }

      if (searchData.status === 1 && searchData.data) {
        const allAds = searchData.data.result || [];
        const traderAds = allAds.filter(a => a.im_trader === 1 && a.business_name);
        if (traderAds.length > 0) {
          const dealerCounts = {};
          const dealerInfo = {};
          traderAds.forEach(a => {
            const uid = a.user_id;
            dealerCounts[uid] = (dealerCounts[uid] || 0) + 1;
            if (!dealerInfo[uid]) {
              dealerInfo[uid] = {
                user_id: uid,
                business_name: a.business_name,
                location: a.location,
                image: a.images && a.images.length > 0 ? CDN + a.images[0] : null,
              };
            }
          });
          const topDealerId = Object.keys(dealerCounts).sort((a, b) => dealerCounts[b] - dealerCounts[a])[0];
          if (topDealerId) {
            setFeaturedDealer({
              ...dealerInfo[topDealerId],
              ad_count: dealerCounts[topDealerId],
            });
          }
        }
      }
    } catch (e) {
      console.error('Home fetch error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData(true);
  }, [fetchData]);

  const handleCategoryPress = useCallback((cat) => {
    onCategoryPress(`/${cat.slug}`);
  }, [onCategoryPress]);

  const handleAdPress = useCallback((ad) => {
    onAdPress(ad);
  }, [onAdPress]);

  const handleSearchSubmit = useCallback(() => {
    if (searchText.trim()) {
      onSearchPress(`/all?keyword=${encodeURIComponent(searchText.trim())}`);
      setSearchText('');
    }
  }, [searchText, onSearchPress]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={BLUE} />
      </View>
    );
  }

  const renderHeader = () => (
    <View>
      {/* Hero Banner */}
      <View style={styles.heroBanner}>
        <LinearGradient
          colors={['#1565c0', '#1b87f4', '#42a5f5']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroGradient}
        >
          <Image
            source={require('../assets/splash-icon.png')}
            style={styles.heroLogo}
            contentFit="contain"
          />
          <Text style={styles.heroTitle}>Ireland's favourite{'\n'}place to buy and sell</Text>
        </LinearGradient>

        {/* Search Card overlapping hero */}
        <View style={styles.searchCard}>
          <View style={styles.searchBar}>
            <Ionicons name="search" size={20} color="#999" style={{ marginRight: 10 }} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search Listit..."
              placeholderTextColor="#999"
              value={searchText}
              onChangeText={setSearchText}
              onSubmitEditing={handleSearchSubmit}
              returnKeyType="search"
            />
            {searchText.length > 0 && (
              <TouchableOpacity onPress={() => setSearchText('')}>
                <Ionicons name="close-circle" size={18} color="#999" />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>

      {/* Category List */}
      <View style={styles.categoriesSection}>
        {categories.map((cat, idx) => (
          <React.Fragment key={cat.id}>
            <CategoryRow cat={cat} onPress={handleCategoryPress} />
            {idx < categories.length - 1 && <View style={styles.categoryDivider} />}
          </React.Fragment>
        ))}
      </View>

      {/* See All Link */}
      <TouchableOpacity style={styles.seeAllMarketplace} onPress={() => onSearchPress('/all')} activeOpacity={0.7}>
        <Text style={styles.seeAllMarketplaceText}>See all in Marketplace</Text>
        <Ionicons name="chevron-forward" size={18} color="#555" />
      </TouchableOpacity>

      {/* Featured Dealer */}
      {featuredDealer && (
        <View style={styles.featuredDealerSection}>
          <Text style={styles.featuredDealerLabel}>Featured Dealer</Text>
          <TouchableOpacity
            style={styles.featuredDealerCard}
            activeOpacity={0.8}
            onPress={() => onSearchPress(`/all?keyword=${encodeURIComponent(featuredDealer.business_name)}`)}
          >
            {featuredDealer.image ? (
              <Image
                source={featuredDealer.image}
                style={styles.featuredDealerBg}
                contentFit="cover"
                cachePolicy="memory-disk"
              />
            ) : (
              <LinearGradient
                colors={['#2c3e50', '#34495e']}
                style={styles.featuredDealerBg}
              />
            )}
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.7)']}
              style={styles.featuredDealerOverlay}
            >
              <View style={styles.featuredDealerInfo}>
                <View style={styles.featuredDealerLogoWrap}>
                  <Ionicons name="storefront" size={20} color="#fff" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.featuredDealerName}>{featuredDealer.business_name}</Text>
                  <Text style={styles.featuredDealerCount}>{featuredDealer.ad_count} ads</Text>
                </View>
              </View>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      )}

      {/* Go Further Section */}
      <View style={styles.goFurtherList}>
        <Text style={styles.goFurtherTitle}>Go Further</Text>
        <TouchableOpacity
          style={styles.goFurtherRow}
          activeOpacity={0.7}
          onPress={() => onSearchPress('/all?keyword=dealer')}
        >
          <View style={styles.goFurtherIconWrap}>
            <Ionicons name="car-sport" size={22} color={BLUE} />
          </View>
          <Text style={styles.goFurtherRowText}>Find A Dealer</Text>
          <Ionicons name="chevron-forward" size={18} color="#ccc" />
        </TouchableOpacity>
        <View style={styles.goFurtherDivider} />
        <TouchableOpacity
          style={styles.goFurtherRow}
          activeOpacity={0.7}
          onPress={() => onSearchPress('/services')}
        >
          <View style={styles.goFurtherIconWrap}>
            <Ionicons name="construct" size={22} color={BLUE} />
          </View>
          <Text style={styles.goFurtherRowText}>Services</Text>
          <Ionicons name="chevron-forward" size={18} color="#ccc" />
        </TouchableOpacity>
        <View style={styles.goFurtherDivider} />
        <TouchableOpacity
          style={styles.goFurtherRow}
          activeOpacity={0.7}
          onPress={() => onSearchPress('/all')}
        >
          <View style={styles.goFurtherIconWrap}>
            <Ionicons name="shield-checkmark" size={22} color={BLUE} />
          </View>
          <Text style={styles.goFurtherRowText}>Safety Guide</Text>
          <Ionicons name="chevron-forward" size={18} color="#ccc" />
        </TouchableOpacity>
      </View>

      {/* Just Listed Header */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Just Listed</Text>
        <TouchableOpacity onPress={() => onSearchPress('/all')}>
          <Text style={styles.seeAll}>See All</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Static Header - stays pinned at top */}
      <View style={styles.appHeaderBar}>
        <View style={styles.appHeaderLeft}>
          <Image
            source={require('../assets/splash-icon.png')}
            style={styles.appHeaderLogo}
            contentFit="contain"
          />
          <Text style={styles.appHeaderName}>Listit</Text>
        </View>
        <TouchableOpacity activeOpacity={0.7} onPress={onLoginPress}>
          <Text style={styles.appHeaderLogin}>Log In</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={ads}
        keyExtractor={item => String(item.id)}
        renderItem={({ item }) => <AdCard ad={item} onPress={handleAdPress} />}
        ListHeaderComponent={renderHeader}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={BLUE} />
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        maxToRenderPerBatch={6}
        windowSize={5}
        initialNumToRender={4}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f5f5' },
  listContent: { paddingBottom: 20 },

  // Static Header Bar
  appHeaderBar: {
    height: 50,
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e8e8e8',
  },
  appHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  appHeaderLogo: {
    width: 30,
    height: 30,
  },
  appHeaderName: {
    fontSize: 20,
    fontWeight: '800',
    color: BLUE,
    marginLeft: 6,
  },
  appHeaderLogin: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },

  // Hero Banner
  heroBanner: {
    position: 'relative',
    marginBottom: 30,
  },
  heroGradient: {
    paddingTop: 30,
    paddingBottom: 50,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  heroLogo: {
    width: 50,
    height: 50,
    marginBottom: 12,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#fff',
    textAlign: 'center',
    lineHeight: 32,
    textShadowColor: 'rgba(0,0,0,0.15)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },

  // Search Card
  searchCard: {
    position: 'absolute',
    bottom: -22,
    left: 16,
    right: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 6,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 44,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },

  // Categories
  categoriesSection: {
    backgroundColor: '#fff',
    marginHorizontal: 0,
    borderRadius: 0,
    paddingVertical: 4,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  categoryIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#f0f4ff',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    marginRight: 14,
  },
  categoryIconImage: {
    width: 44,
    height: 44,
  },
  categoryTextWrap: {
    flex: 1,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  categoryCount: {
    fontSize: 12,
    color: '#999',
    marginTop: 1,
  },
  categoryDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#f0f0f0',
    marginLeft: 78,
  },

  // See all in Marketplace
  seeAllMarketplace: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#eee',
  },
  seeAllMarketplaceText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },

  // Featured Dealer
  featuredDealerSection: {
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 4,
  },
  featuredDealerLabel: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 12,
  },
  featuredDealerCard: {
    borderRadius: 12,
    overflow: 'hidden',
    height: 160,
    backgroundColor: '#2c3e50',
    position: 'relative',
  },
  featuredDealerBg: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  featuredDealerOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    padding: 16,
  },
  featuredDealerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  featuredDealerLogoWrap: {
    width: 42,
    height: 42,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  featuredDealerName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  featuredDealerCount: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 2,
  },

  // Go Further
  goFurtherSection: {
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 12,
  },
  goFurtherTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a1a1a',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
  },
  goFurtherList: {
    backgroundColor: '#fff',
    marginTop: 24,
  },
  goFurtherRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  goFurtherIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f4ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  goFurtherRowText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: '#1a1a1a',
  },
  goFurtherDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#f0f0f0',
    marginLeft: 74,
  },

  // Section header
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  seeAll: {
    fontSize: 14,
    color: BLUE,
    fontWeight: '600',
  },

  // Ad Cards (DoneDeal style - single large image)
  adCard: {
    backgroundColor: '#fff',
    marginHorizontal: 12,
    marginVertical: 6,
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    position: 'relative',
  },
  adMainImageWrap: {
    width: '100%',
    height: AD_IMAGE_HEIGHT,
    backgroundColor: '#f0f0f0',
    position: 'relative',
  },
  adMainImage: {
    width: '100%',
    height: '100%',
  },
  noImageWrap: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoCountBadge: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 4,
  },
  photoCountText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  heartBtn: {
    position: 'absolute',
    right: 10,
    top: 10,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  adCardBody: {
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 14,
  },
  adTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1a1a',
    lineHeight: 21,
  },
  adSpec: {
    fontSize: 13,
    color: '#777',
    marginTop: 4,
  },
  adLocation: {
    fontSize: 13,
    color: '#999',
    marginTop: 2,
  },
  adPrice: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1a1a1a',
    marginTop: 8,
  },
});
