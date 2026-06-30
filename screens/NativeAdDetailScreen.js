import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  ActivityIndicator, Dimensions, Linking, Share, FlatList, Alert,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CDN = 'https://d3ste2v8jw54du.cloudfront.net/';
const API = 'https://api.listit.ie';
const BLUE = '#1b87f4';

function ImageGallery({ images }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const flatListRef = useRef(null);

  const validImages = (images || []).filter(img => img && img.trim && img.trim().length > 0);

  if (validImages.length === 0) {
    return (
      <View style={galleryStyles.placeholder}>
        <Ionicons name="image-outline" size={48} color="#ccc" />
      </View>
    );
  }

  const onScroll = useCallback((e) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    setActiveIndex(idx);
  }, []);

  return (
    <View>
      <FlatList
        ref={flatListRef}
        data={validImages}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        keyExtractor={(_, i) => String(i)}
        renderItem={({ item }) => (
          <Image source={CDN + item} style={galleryStyles.image} contentFit="cover" cachePolicy="memory-disk" />
        )}
      />
      {validImages.length > 1 && (
        <View style={galleryStyles.pagination}>
          {validImages.map((_, i) => (
            <View key={i} style={[galleryStyles.dot, i === activeIndex && galleryStyles.activeDot]} />
          ))}
        </View>
      )}
      <View style={galleryStyles.counter}>
        <Ionicons name="camera-outline" size={13} color="#fff" />
        <Text style={galleryStyles.counterText}> {activeIndex + 1}/{validImages.length}</Text>
      </View>
    </View>
  );
}

const galleryStyles = StyleSheet.create({
  placeholder: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH * 0.7,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH * 0.7,
  },
  pagination: {
    position: 'absolute',
    bottom: 12,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.5)',
    marginHorizontal: 3,
  },
  activeDot: {
    backgroundColor: '#fff',
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  counter: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  counterText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
});

function CollapsibleSection({ title, icon, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <View style={styles.collapsible}>
      <TouchableOpacity style={styles.collapsibleHeader} onPress={() => setOpen(!open)} activeOpacity={0.7}>
        {icon && <Ionicons name={icon} size={20} color="#333" style={{ marginRight: 10 }} />}
        <Text style={styles.collapsibleTitle}>{title}</Text>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={22} color="#555" />
      </TouchableOpacity>
      {open && <View style={styles.collapsibleBody}>{children}</View>}
    </View>
  );
}

function DetailRow({ icon, label, value }) {
  if (!value) return null;
  return (
    <View style={styles.detailRow}>
      <View style={styles.detailRowLeft}>
        <Ionicons name={icon} size={18} color="#777" style={{ marginRight: 12, width: 22 }} />
        <Text style={styles.detailRowLabel}>{label}</Text>
      </View>
      <Text style={styles.detailRowValue}>{value}</Text>
    </View>
  );
}

function formatMileage(val) {
  if (!val) return null;
  const n = parseInt(val, 10);
  if (isNaN(n)) return null;
  return n.toLocaleString('en-IE') + ' km';
}

function formatDate(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[d.getMonth()]} ${d.getFullYear()}`;
}

function VehicleOverview({ data }) {
  if (!data || data.found === false || (!data.make && !data.model && !data.year)) return null;

  return (
    <CollapsibleSection title="Vehicle Overview" defaultOpen={true}>
      <DetailRow icon="car-outline" label="Make" value={data.make} />
      <DetailRow icon="pricetag-outline" label="Model" value={data.model} />
      <DetailRow icon="calendar-outline" label="Year" value={data.year} />
      <DetailRow icon="speedometer-outline" label="Mileage" value={formatMileage(data.milage)} />
      <DetailRow icon="flash-outline" label="Fuel Type" value={data.fuel_type} />
      <DetailRow icon="cog-outline" label="Transmission" value={data.transmission || data.gearbox} />
      <DetailRow icon="construct-outline" label="Engine" value={data.engine_size ? `${data.engine_size} L ${data.fuel_type || ''}`.trim() : null} />
      <DetailRow icon="car-sport-outline" label="Body Type" value={data.body_type} />
      <DetailRow icon="people-outline" label="Seats" value={data.number_of_seats} />
      <DetailRow icon="albums-outline" label="Doors" value={data.number_of_doors} />
      <DetailRow icon="color-palette-outline" label="Colour" value={data.colour} />
      <DetailRow icon="ribbon-outline" label="Trim" value={data.trim} />
    </CollapsibleSection>
  );
}

function OwnershipHistory({ data }) {
  if (!data || data.found === false) return null;
  const hasData = data.nct_expiry || data.tax_expiry || data.registration_number;
  if (!hasData) return null;

  return (
    <CollapsibleSection title="Ownership & History">
      <DetailRow icon="document-text-outline" label="NCT Expiry" value={formatDate(data.nct_expiry)} />
      <DetailRow icon="receipt-outline" label="Tax Expiry" value={formatDate(data.tax_expiry)} />
      <DetailRow icon="card-outline" label="Registration" value={data.registration_number} />
      <DetailRow icon="finger-print-outline" label="VIN" value={data.VIN} />
    </CollapsibleSection>
  );
}

function PerformanceSection({ data }) {
  if (!data || data.found === false) return null;
  const hasPerfData = data.bhp || data.co2 || data.engineInCC;
  if (!hasPerfData) return null;

  return (
    <CollapsibleSection title="Performance">
      <DetailRow icon="flame-outline" label="Power" value={data.bhp ? `${data.bhp} BHP` : null} />
      <DetailRow icon="leaf-outline" label="CO2 Emissions" value={data.co2 ? `${data.co2} g/km` : null} />
      <DetailRow icon="hardware-chip-outline" label="Engine (cc)" value={data.engineInCC ? `${data.engineInCC} cc` : null} />
    </CollapsibleSection>
  );
}

function DescriptionSection({ text }) {
  const [expanded, setExpanded] = useState(false);
  if (!text) return null;

  const isLong = text.length > 300;
  const displayText = expanded || !isLong ? text : text.substring(0, 300) + '...';

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Description</Text>
      <Text style={styles.descText}>{displayText}</Text>
      {isLong && (
        <TouchableOpacity onPress={() => setExpanded(!expanded)} style={styles.readMoreBtn} activeOpacity={0.6}>
          <Text style={styles.readMoreText}>{expanded ? 'Show Less' : 'Read More'}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

function SellerSection({ ad }) {
  const user = ad.userDetails || {};
  const isDealer = user.user_type === 'dealer' || user.user_type === 'trader' ||
    ad.im_trader === 1 || !!ad.business_name || !!ad.dealer_name;
  const sellerName = ad.business_name || ad.dealer_name || user.business_name || ad.full_name || 'Seller';
  const logo = user.logo || user.image;
  const logoUri = logo ? (logo.startsWith('http') ? logo : CDN + logo) : null;

  if (isDealer) {
    return (
      <View style={styles.section}>
        <View style={styles.dealerCard}>
          {logoUri ? (
            <Image source={logoUri} style={styles.dealerCardLogo} contentFit="cover" />
          ) : (
            <View style={[styles.dealerCardLogo, styles.dealerCardLogoFallback]}>
              <Ionicons name="storefront" size={22} color={BLUE} />
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Text style={styles.dealerCardName}>{sellerName}</Text>
            <View style={styles.dealerBadgeRow}>
              <Ionicons name="shield-checkmark" size={14} color="#27ae60" />
              <Text style={styles.dealerBadgeText}>Verified Dealer</Text>
            </View>
          </View>
        </View>

        {user.average_rating && parseFloat(user.average_rating) > 0 && (
          <View style={styles.dealerStatsRow}>
            <Ionicons name="star" size={15} color="#f5a623" />
            <Text style={styles.dealerRatingNum}>{parseFloat(user.average_rating).toFixed(1)}</Text>
            {user.total_reviews > 0 && (
              <Text style={styles.dealerReviewCount}>({user.total_reviews} reviews)</Text>
            )}
          </View>
        )}

        {(user.business_address || ad.business_address || ad.location) && (
          <View style={styles.dealerInfoRow}>
            <Ionicons name="location-outline" size={16} color="#666" />
            <Text style={styles.dealerInfoText}>{user.business_address || ad.business_address || ad.location}</Text>
          </View>
        )}

        {user.website && (
          <TouchableOpacity style={styles.dealerInfoRow} onPress={() => Linking.openURL(user.website)}>
            <Ionicons name="globe-outline" size={16} color="#666" />
            <Text style={[styles.dealerInfoText, { color: BLUE }]}>{user.website}</Text>
          </TouchableOpacity>
        )}

        {(ad.live_ads_count > 0 || ad.total_ads_count > 0) && (
          <View>
            <View style={styles.dealerInfoRow}>
              <Ionicons name="car-outline" size={16} color="#666" />
              <Text style={styles.dealerInfoText}>
                {ad.live_ads_count || 0} Active ad{ad.live_ads_count !== 1 ? 's' : ''}{ad.total_ads_count ? `  |  ${ad.total_ads_count} Total ads` : ''}
              </Text>
            </View>
            <TouchableOpacity style={styles.dealerInfoRow}>
              <Ionicons name="open-outline" size={16} color={BLUE} />
              <Text style={[styles.dealerInfoText, { color: BLUE, textDecorationLine: 'underline' }]}>View all ads</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.verifiedBadges}>
          {ad.phone_verified === 1 && (
            <View style={styles.verifiedRow}>
              <Ionicons name="checkmark-circle" size={16} color="#27ae60" />
              <Text style={styles.verifiedText}>Phone verified</Text>
            </View>
          )}
          {ad.email && (
            <View style={styles.verifiedRow}>
              <Ionicons name="checkmark-circle" size={16} color="#27ae60" />
              <Text style={styles.verifiedText}>Email verified</Text>
            </View>
          )}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.section}>
      <View style={styles.sellerRow}>
        <View style={styles.sellerAvatar}>
          {logoUri ? (
            <Image source={logoUri} style={{ width: 48, height: 48, borderRadius: 24 }} contentFit="cover" />
          ) : (
            <Ionicons name="person" size={24} color="#888" />
          )}
        </View>
        <View style={styles.sellerInfo}>
          <Text style={styles.sellerName}>{sellerName}</Text>
          <Text style={styles.sellerType}>
            Private Seller{ad.location ? ` · ${ad.location}` : ''}
          </Text>
          {user.average_rating && parseFloat(user.average_rating) > 0 && (
            <View style={styles.ratingRow}>
              <Ionicons name="star" size={14} color="#f5a623" />
              <Text style={styles.ratingText}> {parseFloat(user.average_rating).toFixed(1)}</Text>
              {user.total_reviews > 0 && (
                <Text style={styles.reviewCount}> ({user.total_reviews} reviews)</Text>
              )}
            </View>
          )}
        </View>
      </View>

      <View style={styles.verifiedBadges}>
        {ad.phone_verified === 1 && (
          <View style={styles.verifiedRow}>
            <Ionicons name="checkmark-circle" size={16} color="#27ae60" />
            <Text style={styles.verifiedText}>Phone verified</Text>
          </View>
        )}
        {ad.email && (
          <View style={styles.verifiedRow}>
            <Ionicons name="checkmark-circle" size={16} color="#27ae60" />
            <Text style={styles.verifiedText}>Email verified</Text>
          </View>
        )}
      </View>

      {ad.live_ads_count > 1 && (
        <Text style={styles.liveAdsText}>
          {ad.live_ads_count} Active ads | {ad.total_ads_count || ad.live_ads_count} Total ads
        </Text>
      )}
    </View>
  );
}

export default function NativeAdDetailScreen({ adId, onBack, onRelatedAdPress }) {
  const insets = useSafeAreaInsets();
  const [ad, setAd] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [relatedAds, setRelatedAds] = useState([]);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch(`${API}/api/user/ads/${adId}`)
      .then(r => r.json())
      .then(data => {
        if (data.status === 1 && data.data) {
          setAd(data.data);
        } else {
          setError('Ad not found');
        }
      })
      .catch(e => setError('Failed to load ad'))
      .finally(() => setLoading(false));
  }, [adId]);

  useEffect(() => {
    if (!ad) return;
    const user = ad.userDetails || {};
    const dealer = user.user_type === 'dealer' || user.user_type === 'trader' ||
      ad.im_trader === 1 || !!ad.business_name || !!ad.dealer_name;
    const dealerName = ad.business_name || ad.dealer_name || user.business_name;
    const body = { page: 1, limit: 12 };
    if (dealer && dealerName) body.keyword = dealerName;
    fetch(`${API}/api/user/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
      .then(r => r.json())
      .then(data => {
        if (data.status === 1 && data.data?.result) {
          setRelatedAds(data.data.result.filter(a => a.id !== ad.id).slice(0, 8));
        }
      })
      .catch(() => {});
  }, [ad]);

  const handleCall = useCallback(() => {
    if (ad?.phone) {
      const phoneCode = ad.phone_code || '353';
      Linking.openURL(`tel:+${phoneCode}${ad.phone}`);
    }
  }, [ad]);

  const handleShare = useCallback(async () => {
    if (!ad) return;
    try {
      await Share.share({
        message: `${ad.title} - €${ad.price} on Listit Ireland\nhttps://listit.ie/ad/${ad.id}`,
      });
    } catch (e) {}
  }, [ad]);

  const handleReport = useCallback(() => {
    Alert.alert('Report this Ad', 'Why are you reporting this ad?', [
      { text: 'Spam or scam', onPress: () => submitReport('spam') },
      { text: 'Incorrect information', onPress: () => submitReport('incorrect') },
      { text: 'Offensive content', onPress: () => submitReport('offensive') },
      { text: 'Already sold', onPress: () => submitReport('sold') },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }, []);

  const submitReport = useCallback(async (reason) => {
    try {
      await fetch(`${API}/api/user/ads/${adId}/report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });
    } catch (e) {}
    Alert.alert('Report Submitted', 'Thank you for reporting. We will review this ad.');
  }, [adId]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <View style={[styles.headerBar, { paddingTop: 10 }]}>
          <TouchableOpacity onPress={onBack} style={styles.headerBtn}>
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
        </View>
        <ActivityIndicator size="large" color={BLUE} style={{ marginTop: 100 }} />
      </View>
    );
  }

  if (error || !ad) {
    return (
      <View style={styles.loadingContainer}>
        <View style={[styles.headerBar, { paddingTop: 10 }]}>
          <TouchableOpacity onPress={onBack} style={styles.headerBtn}>
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
        </View>
        <View style={styles.errorWrap}>
          <Ionicons name="alert-circle-outline" size={48} color="#ccc" />
          <Text style={styles.errorText}>{error || 'Ad not found'}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => {
            setLoading(true);
            fetch(`${API}/api/user/ads/${adId}`)
              .then(r => r.json())
              .then(data => { if (data.status === 1) setAd(data.data); })
              .finally(() => setLoading(false));
          }}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const price = parseFloat(ad.price || 0);
  const priceStr = price > 0 ? `€${price.toLocaleString('en-IE')}` : 'Free';
  const allowContact = String(ad.allow_contact || '').split(',').map(s => s.trim());
  const canCall = allowContact.includes('1') && ad.phone;
  const canMessage = allowContact.includes('2');
  const timeAgo = getTimeAgo(ad.created_at);
  const vd = ad.vehicleData;
  const isVehicle = ad.is_vehicle === 1 && vd && vd.found !== false;
  const adUser = ad.userDetails || {};
  const isDealerAd = adUser.user_type === 'dealer' || adUser.user_type === 'trader' ||
    ad.im_trader === 1 || !!ad.business_name || !!ad.dealer_name;
  const dealerDisplayName = ad.business_name || ad.dealer_name || adUser.business_name || ad.full_name || '';
  const dealerLogo = adUser.logo || adUser.image;

  return (
    <View style={styles.container}>
      <View style={[styles.headerBar, { paddingTop: 10 }]}>
        <TouchableOpacity onPress={onBack} style={styles.headerBtn}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={handleShare} style={styles.headerBtn}>
            <Ionicons name="share-social-outline" size={22} color="#333" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerBtn}>
            <Ionicons name="heart-outline" size={22} color="#333" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {isDealerAd && dealerDisplayName ? (
          <View style={styles.dealerBanner}>
            {dealerLogo ? (
              <Image source={dealerLogo.startsWith('http') ? dealerLogo : CDN + dealerLogo}
                style={styles.dealerBannerLogo} contentFit="cover" />
            ) : (
              <View style={[styles.dealerBannerLogo, { backgroundColor: '#e8f0fe', justifyContent: 'center', alignItems: 'center' }]}>
                <Ionicons name="storefront" size={16} color={BLUE} />
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={styles.dealerBannerName} numberOfLines={1}>{dealerDisplayName}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Ionicons name="shield-checkmark" size={12} color="#27ae60" />
                <Text style={styles.dealerBannerBadge}>Verified Dealer</Text>
                {adUser.average_rating && parseFloat(adUser.average_rating) > 0 && (
                  <>
                    <Text style={{ color: '#ddd', fontSize: 12 }}>|</Text>
                    <Ionicons name="star" size={11} color="#f5a623" />
                    <Text style={styles.dealerBannerRating}>{parseFloat(adUser.average_rating).toFixed(1)}/5</Text>
                  </>
                )}
              </View>
            </View>
          </View>
        ) : null}
        <ImageGallery images={ad.images} />

        {/* Main info */}
        <View style={styles.mainInfo}>
          <Text style={styles.titleText}>{ad.title}</Text>
          <View style={styles.metaRow}>
            <Text style={styles.metaText}>{timeAgo}</Text>
            <Text style={styles.metaTextDim}> · {ad.view_count || 0} Views</Text>
            {ad.location && <Text style={styles.metaTextDim}> · {ad.location}</Text>}
          </View>
          <View style={styles.priceRow}>
            <Text style={styles.priceText}>{priceStr}</Text>
            <View style={styles.priceActions}>
              <TouchableOpacity onPress={handleShare} style={styles.priceActionBtn}>
                <Ionicons name="share-social-outline" size={20} color="#555" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.priceActionBtn}>
                <Ionicons name="heart-outline" size={20} color="#555" />
              </TouchableOpacity>
            </View>
          </View>
          {ad.old_price && parseFloat(ad.old_price) > price && (
            <Text style={styles.oldPrice}>Was €{parseFloat(ad.old_price).toLocaleString('en-IE')}</Text>
          )}
          {ad.under_offer === 1 && (
            <View style={styles.underOfferInline}>
              <Ionicons name="checkmark-circle" size={14} color="#e74c3c" />
              <Text style={styles.underOfferInlineText}>Under Offer</Text>
            </View>
          )}
        </View>

        {/* Vehicle sections */}
        {isVehicle && (
          <View style={styles.vehicleSections}>
            <VehicleOverview data={vd} />
            <OwnershipHistory data={vd} />
            <PerformanceSection data={vd} />
          </View>
        )}

        {/* Warranty & Verification */}
        {(ad.warrenty_type || ad.history_check || ad.delievry_available) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Warranty & Verification</Text>
            {ad.warrenty_type && (
              <DetailRow icon="shield-checkmark-outline" label="Warranty" value={`${ad.warrenty_type}${ad.warrenty_duration ? ' - ' + ad.warrenty_duration : ''}`} />
            )}
            {ad.history_check && (
              <DetailRow icon="document-text-outline" label="History Check" value={ad.history_check} />
            )}
            {ad.delievry_available && (
              <DetailRow icon="car-outline" label="Delivery" value="Available" />
            )}
          </View>
        )}

        {/* Description */}
        <DescriptionSection text={ad.description} />

        {/* Attributes */}
        {ad.attributes && ad.attributes.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Additional Details</Text>
            {ad.attributes.map((attr, i) => (
              <View key={i} style={styles.attrRow}>
                <Text style={styles.attrLabel}>{attr.attribute_name}</Text>
                <Text style={styles.attrValue}>{attr.option_value}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Report Ad */}
        <TouchableOpacity style={styles.reportAdRow} activeOpacity={0.7}
          onPress={handleReport}>
          <Ionicons name="flag-outline" size={18} color="#888" />
          <Text style={styles.reportAdText}>Report this Ad</Text>
        </TouchableOpacity>

        {/* Seller */}
        <SellerSection ad={ad} />

        {/* Related Ads */}
        {relatedAds.length > 0 && (
          <View style={styles.relatedSection}>
            <Text style={styles.relatedTitle}>
              {isDealerAd ? 'OUR STOCK' : 'YOU MAY ALSO LIKE'}
            </Text>
            <View style={styles.relatedDivider} />
            <View style={styles.relatedGrid}>
              {relatedAds.map(item => {
                const img = item.images?.[0] ? CDN + item.images[0] : null;
                const p = parseFloat(item.price || 0);
                const ps = p > 0 ? `€${p.toLocaleString('en-IE')}` : 'Free';
                const iv = item.vehicleData || {};
                const sp = [];
                if (iv.year) sp.push(iv.year);
                if (iv.engine_size) sp.push(iv.engine_size + 'L');
                if (iv.fuel_type || iv.fuel) sp.push(iv.fuel_type || iv.fuel);
                const ml = iv.milage ? parseInt(iv.milage, 10) : null;
                if (ml) sp.push(ml.toLocaleString('en-IE'));
                return (
                  <TouchableOpacity key={item.id} style={styles.relatedCard}
                    onPress={() => onRelatedAdPress && onRelatedAdPress(item)} activeOpacity={0.7}>
                    {img ? (
                      <Image source={img} style={styles.relatedCardImage} contentFit="cover" cachePolicy="memory-disk" />
                    ) : (
                      <View style={[styles.relatedCardImage, styles.relatedCardNoImage]}>
                        <Ionicons name="image-outline" size={28} color="#ccc" />
                      </View>
                    )}
                    <View style={styles.relatedCardBody}>
                      <Text style={styles.relatedCardTitle} numberOfLines={2}>{item.title}</Text>
                      {sp.length > 0 && <Text style={styles.relatedCardSpec} numberOfLines={1}>{sp.join(' · ')}</Text>}
                      <Text style={styles.relatedCardPriceLabel}>Price</Text>
                      <Text style={styles.relatedCardPrice}>{ps}</Text>
                    </View>
                    <TouchableOpacity style={styles.relatedCardHeart} activeOpacity={0.7}>
                      <Ionicons name="heart-outline" size={18} color="#999" />
                    </TouchableOpacity>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Contact bar with safe area */}
      <View style={[styles.contactBar, { paddingBottom: Math.max(insets.bottom, 16) + 4 }]}>
        {canMessage && (
          <TouchableOpacity style={[styles.messageBtn, !canCall && { flex: 1, marginRight: 0 }]} onPress={() => {}}>
            <Ionicons name="chatbubble-outline" size={18} color="#fff" />
            <Text style={styles.messageBtnText}>Message</Text>
          </TouchableOpacity>
        )}
        {canCall && (
          <TouchableOpacity style={[styles.callBtn, !canMessage && { flex: 1 }]} onPress={handleCall}>
            <Ionicons name="call-outline" size={18} color={BLUE} />
            <Text style={styles.callBtnText}>Call</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  loadingContainer: { flex: 1, backgroundColor: '#fff' },
  headerBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerBtn: { padding: 6 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  scrollView: { flex: 1 },

  // Main info
  mainInfo: {
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 8,
    borderBottomColor: '#f5f5f5',
  },
  titleText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a1a1a',
    lineHeight: 26,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  metaText: { fontSize: 13, color: '#888' },
  metaTextDim: { fontSize: 13, color: '#aaa' },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  priceText: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1a1a1a',
  },
  priceActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  priceActionBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  oldPrice: {
    fontSize: 15,
    color: '#999',
    textDecorationLine: 'line-through',
    marginTop: 4,
  },
  underOfferInline: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    backgroundColor: '#fef5f5',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  underOfferInlineText: {
    color: '#e74c3c',
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 4,
  },

  // Vehicle sections
  vehicleSections: {
    borderBottomWidth: 8,
    borderBottomColor: '#f5f5f5',
  },
  collapsible: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#eee',
  },
  collapsibleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 18,
  },
  collapsibleTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  collapsibleBody: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },

  // Detail rows
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#f0f0f0',
  },
  detailRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  detailRowLabel: {
    fontSize: 15,
    color: '#666',
  },
  detailRowValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1a1a1a',
    textAlign: 'right',
    maxWidth: '50%',
  },

  // Section
  section: {
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 8,
    borderBottomColor: '#f5f5f5',
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 12,
  },
  descText: {
    fontSize: 15,
    color: '#444',
    lineHeight: 23,
  },
  readMoreBtn: {
    marginTop: 10,
    paddingVertical: 8,
  },
  readMoreText: {
    fontSize: 15,
    fontWeight: '600',
    color: BLUE,
    textDecorationLine: 'underline',
  },

  // Attributes
  attrRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#f0f0f0',
  },
  attrLabel: { fontSize: 15, color: '#666' },
  attrValue: { fontSize: 15, fontWeight: '600', color: '#1a1a1a' },

  // Dealer banner (above images)
  dealerBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#f8fafc',
    borderBottomWidth: 1,
    borderBottomColor: '#e8e8e8',
    gap: 10,
  },
  dealerBannerLogo: {
    width: 36,
    height: 36,
    borderRadius: 18,
    overflow: 'hidden',
  },
  dealerBannerName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  dealerBannerBadge: {
    fontSize: 12,
    color: '#27ae60',
    fontWeight: '600',
  },
  dealerBannerRating: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
  },

  // Dealer card (in seller section)
  dealerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 14,
  },
  dealerCardLogo: {
    width: 52,
    height: 52,
    borderRadius: 26,
    overflow: 'hidden',
  },
  dealerCardLogoFallback: {
    backgroundColor: '#e8f0fe',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dealerCardName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  dealerBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dealerBadgeText: {
    fontSize: 13,
    color: '#27ae60',
    fontWeight: '600',
  },
  dealerStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 12,
  },
  dealerRatingNum: {
    fontSize: 15,
    fontWeight: '700',
    color: '#333',
  },
  dealerReviewCount: {
    fontSize: 14,
    color: '#888',
  },
  dealerInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
  },
  dealerInfoText: {
    fontSize: 14,
    color: '#555',
    flex: 1,
  },

  // Report Ad
  reportAdRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 8,
    borderBottomColor: '#f5f5f5',
  },
  reportAdText: {
    fontSize: 15,
    color: '#888',
  },

  // Seller
  sellerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sellerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  sellerInfo: {
    marginLeft: 14,
    flex: 1,
  },
  sellerName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  sellerPhone: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  sellerType: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  ratingText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
  },
  reviewCount: {
    fontSize: 13,
    color: '#888',
  },
  verifiedBadges: {
    marginTop: 16,
    gap: 8,
  },
  verifiedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  verifiedText: {
    fontSize: 14,
    color: '#333',
  },
  liveAdsText: {
    fontSize: 13,
    color: '#888',
    marginTop: 12,
  },

  // Contact bar
  contactBar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  messageBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: BLUE,
    paddingVertical: 14,
    borderRadius: 10,
    marginRight: 8,
  },
  messageBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 8,
  },
  callBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: BLUE,
  },
  callBtnText: {
    color: BLUE,
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 8,
  },

  // Error
  errorWrap: { alignItems: 'center', paddingTop: 100 },
  errorText: { fontSize: 16, color: '#999', marginTop: 12 },
  retryBtn: {
    marginTop: 16,
    backgroundColor: BLUE,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryText: { color: '#fff', fontSize: 14, fontWeight: '600' },

  relatedSection: {
    paddingTop: 16,
    paddingBottom: 8,
  },
  relatedTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#888',
    letterSpacing: 0.5,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  relatedDivider: {
    height: 2,
    backgroundColor: '#e74c3c',
    marginHorizontal: 16,
    marginBottom: 16,
  },
  relatedGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    justifyContent: 'space-between',
  },
  relatedCard: {
    width: (SCREEN_WIDTH - 32) / 2,
    backgroundColor: '#fff',
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  relatedCardImage: {
    width: '100%',
    height: (SCREEN_WIDTH - 32) / 2 * 0.7,
  },
  relatedCardNoImage: {
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  relatedCardBody: {
    padding: 10,
  },
  relatedCardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
    lineHeight: 18,
  },
  relatedCardSpec: {
    fontSize: 12,
    color: '#888',
    marginTop: 4,
  },
  relatedCardPriceLabel: {
    fontSize: 12,
    color: '#888',
    marginTop: 8,
  },
  relatedCardPrice: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1a1a1a',
    marginTop: 2,
  },
  relatedCardHeart: {
    position: 'absolute',
    bottom: 10,
    right: 10,
  },
});
