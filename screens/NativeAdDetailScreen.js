import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  ActivityIndicator, Dimensions, Linking, Share, FlatList, Alert, Modal, TextInput,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const CDN = 'https://d3ste2v8jw54du.cloudfront.net/';
const API = 'https://api.listit.ie';
const BLUE = '#1b87f4';
const THUMB_GAP = 3;
const THUMB_WIDTH = (SCREEN_WIDTH - THUMB_GAP * 2) / 3;
const GRID_GAP = 2;
const GRID_SIZE = (SCREEN_WIDTH - GRID_GAP * 2) / 3;

function ImageGallery({ images }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [modalVisible, setModalVisible] = useState(false);
  const [gridMode, setGridMode] = useState(false);
  const [galleryKey, setGalleryKey] = useState(0);
  const flatListRef = useRef(null);

  const validImages = (images || []).filter(img => img && typeof img === 'string' && img.trim().length > 0);

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

  const openGallery = (index) => {
    setActiveIndex(index);
    setGridMode(false);
    setGalleryKey(k => k + 1);
    setModalVisible(true);
  };

  const thumbs = validImages.slice(0, 3);
  const extraCount = validImages.length - 3;

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
        renderItem={({ item, index }) => (
          <TouchableOpacity activeOpacity={0.95} onPress={() => openGallery(index)}>
            <Image source={CDN + item} style={galleryStyles.image} contentFit="cover" cachePolicy="memory-disk" />
          </TouchableOpacity>
        )}
      />
      <View style={galleryStyles.counter}>
        <Ionicons name="camera-outline" size={13} color="#fff" />
        <Text style={galleryStyles.counterText}> {activeIndex + 1}/{validImages.length}</Text>
      </View>

      {validImages.length > 1 && (
        <View style={galleryStyles.thumbStrip}>
          {thumbs.map((img, i) => (
            <TouchableOpacity key={i} style={[galleryStyles.thumbWrap, i < 2 && { marginRight: THUMB_GAP }]}
              onPress={() => openGallery(i)} activeOpacity={0.8}>
              <Image source={CDN + img} style={galleryStyles.thumbImage} contentFit="cover" cachePolicy="memory-disk" />
              {i === 2 && extraCount > 0 && (
                <View style={galleryStyles.thumbOverlay}>
                  <Text style={galleryStyles.thumbOverlayText}>+{extraCount}</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>
      )}

      <Modal visible={modalVisible} animationType="fade" statusBarTranslucent
        onRequestClose={() => setModalVisible(false)}>
        <View style={galleryStyles.modalContainer}>
          <View style={galleryStyles.modalHeader}>
            <TouchableOpacity onPress={() => setModalVisible(false)} style={galleryStyles.modalBtn} hitSlop={12}>
              <Ionicons name="close" size={28} color="#fff" />
            </TouchableOpacity>
            {!gridMode && (
              <Text style={galleryStyles.modalTitle}>Image {activeIndex + 1}/{validImages.length}</Text>
            )}
            {gridMode && <View style={{ flex: 1 }} />}
            <TouchableOpacity onPress={() => setGridMode(!gridMode)} style={galleryStyles.modalBtn} hitSlop={12}>
              <Ionicons name={gridMode ? 'image-outline' : 'grid-outline'} size={24} color="#fff" />
            </TouchableOpacity>
          </View>

          {gridMode ? (
            <FlatList
              data={validImages}
              numColumns={3}
              keyExtractor={(_, i) => 'g' + i}
              contentContainerStyle={{ paddingTop: 4 }}
              renderItem={({ item, index }) => (
                <TouchableOpacity
                  style={[galleryStyles.gridItem, (index % 3 !== 2) && { marginRight: GRID_GAP }, { marginBottom: GRID_GAP }]}
                  onPress={() => { setActiveIndex(index); setGridMode(false); setGalleryKey(k => k + 1); }}
                  activeOpacity={0.8}>
                  <Image source={CDN + item} style={galleryStyles.gridImage} contentFit="cover" cachePolicy="memory-disk" />
                </TouchableOpacity>
              )}
            />
          ) : (
            <FlatList
              key={`swipe-${galleryKey}`}
              data={validImages}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              initialScrollIndex={activeIndex}
              getItemLayout={(_, index) => ({ length: SCREEN_WIDTH, offset: SCREEN_WIDTH * index, index })}
              onScroll={(e) => {
                const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
                if (idx >= 0 && idx < validImages.length) setActiveIndex(idx);
              }}
              scrollEventThrottle={16}
              keyExtractor={(_, i) => 's' + i}
              renderItem={({ item }) => (
                <View style={galleryStyles.modalImageWrap}>
                  <Image source={CDN + item} style={galleryStyles.modalImage} contentFit="contain" cachePolicy="memory-disk" />
                </View>
              )}
            />
          )}
        </View>
      </Modal>
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
    height: SCREEN_WIDTH * 0.75,
  },
  counter: {
    position: 'absolute',
    top: SCREEN_WIDTH * 0.75 - 36,
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
  thumbStrip: {
    flexDirection: 'row',
    marginTop: THUMB_GAP,
  },
  thumbWrap: {
    width: THUMB_WIDTH,
    height: THUMB_WIDTH * 0.65,
    overflow: 'hidden',
  },
  thumbImage: {
    width: '100%',
    height: '100%',
  },
  thumbOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  thumbOverlayText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 50,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  modalBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitle: {
    flex: 1,
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
    textAlign: 'center',
  },
  modalImageWrap: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT - 120,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT - 120,
  },
  gridItem: {
    width: GRID_SIZE,
    height: GRID_SIZE,
    overflow: 'hidden',
  },
  gridImage: {
    width: '100%',
    height: '100%',
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

function formatEngineSize(val) {
  if (!val) return null;
  const n = parseFloat(val);
  if (isNaN(n)) return val;
  if (n > 100) return (n / 1000).toFixed(1);
  return n.toFixed(1);
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
      <DetailRow icon="construct-outline" label="Engine" value={data.engine_size ? `${formatEngineSize(data.engine_size)} L ${data.fuel_type || ''}`.trim() : null} />
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
      <DetailRow icon="finger-print-outline" label="VIN" value={data.VIN ? '***********' + data.VIN.slice(-4) : null} />
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

function GoogleReviewsSection({ reviews }) {
  const [showAll, setShowAll] = useState(false);
  if (!Array.isArray(reviews) || reviews.length === 0) return null;
  const displayed = showAll ? reviews : reviews.slice(0, 2);

  return (
    <View style={styles.section}>
      <View style={styles.reviewsHeader}>
        <Ionicons name="star" size={18} color="#f5a623" />
        <Text style={styles.sectionTitle}>Google Reviews</Text>
      </View>
      {displayed.map((review, i) => (
        <View key={i} style={styles.reviewCard}>
          <View style={styles.reviewTop}>
            <View style={styles.reviewAvatar}>
              <Text style={styles.reviewAvatarText}>
                {(review.author_name || '?')[0].toUpperCase()}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.reviewAuthor}>{review.author_name}</Text>
              <View style={styles.reviewStarsRow}>
                {[1, 2, 3, 4, 5].map(s => (
                  <Ionicons key={s} name="star" size={13} color={s <= review.rating ? '#f5a623' : '#ddd'} />
                ))}
                <Text style={styles.reviewTime}> · {review.relative_time_description}</Text>
              </View>
            </View>
          </View>
          {review.text ? (
            <Text style={styles.reviewText} numberOfLines={3}>{review.text}</Text>
          ) : null}
        </View>
      ))}
      {reviews.length > 2 && !showAll && (
        <TouchableOpacity onPress={() => setShowAll(true)} activeOpacity={0.6}>
          <Text style={styles.seeMoreReviewsText}>See all {reviews.length} reviews</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

function NotifyMeSection() {
  const [notified, setNotified] = useState(false);
  return (
    <View style={styles.notifySection}>
      <Text style={styles.notifyText}>Get notified when similar ads are posted</Text>
      <TouchableOpacity
        style={[styles.notifyBtn, notified && styles.notifyBtnActive]}
        onPress={() => setNotified(!notified)}
        activeOpacity={0.7}
      >
        <Ionicons name={notified ? 'notifications' : 'notifications-outline'} size={18} color={notified ? '#fff' : '#333'} />
        <Text style={[styles.notifyBtnText, notified && { color: '#fff' }]}>
          {notified ? 'Subscribed' : 'Notify Me'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

function MessageModal({ visible, onClose, ad }) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const seller = ad?.business_name || ad?.dealer_name || ad?.userDetails?.business_name ||
    ad?.full_name || ad?.userDetails?.name || 'Seller';

  const handleSend = async () => {
    if (!message.trim()) {
      Alert.alert('Message Required', 'Please enter a message.');
      return;
    }
    setSending(true);
    try {
      await fetch(`${API}/api/user/ads/${ad.id}/enquiry`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), phone: phone.trim(), email: email.trim(), message: message.trim(), ad_id: ad.id }),
      });
      Alert.alert('Message Sent', 'Your enquiry has been sent to the seller.');
      onClose();
      setMessage('');
    } catch (e) {
      Alert.alert('Error', 'Failed to send message. Please try again.');
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent statusBarTranslucent onRequestClose={onClose}>
      <KeyboardAvoidingView style={msgStyles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={msgStyles.container}>
          <View style={msgStyles.header}>
            <View style={msgStyles.sellerRow}>
              <View style={msgStyles.sellerAvatar}>
                <Ionicons name="person" size={22} color="#999" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={msgStyles.sellerName}>{seller}</Text>
                <Text style={msgStyles.headerSub}>Send enquiry to seller</Text>
              </View>
              <TouchableOpacity onPress={onClose} hitSlop={12}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
          </View>

          <View style={msgStyles.divider} />

          <ScrollView style={msgStyles.form} keyboardShouldPersistTaps="handled">
            <Text style={msgStyles.label}>Your full name</Text>
            <TextInput style={msgStyles.input} value={name} onChangeText={setName}
              placeholder="Your full name" placeholderTextColor="#aaa" />

            <Text style={msgStyles.label}>Your number</Text>
            <TextInput style={msgStyles.input} value={phone} onChangeText={setPhone}
              placeholder="Your phone number" placeholderTextColor="#aaa" keyboardType="phone-pad" />

            <Text style={msgStyles.label}>Your email</Text>
            <TextInput style={msgStyles.input} value={email} onChangeText={setEmail}
              placeholder="Your email" placeholderTextColor="#aaa" keyboardType="email-address" autoCapitalize="none" />

            <Text style={msgStyles.label}>Your message</Text>
            <TextInput style={[msgStyles.input, { height: 100, textAlignVertical: 'top' }]}
              value={message} onChangeText={setMessage}
              placeholder="Type your message..." placeholderTextColor="#aaa"
              multiline numberOfLines={4} />

            <Text style={msgStyles.disclaimer}>
              Your personal details will only be passed to this seller for them to contact you.
            </Text>
          </ScrollView>

          <View style={msgStyles.footer}>
            <TouchableOpacity style={msgStyles.cancelBtn} onPress={onClose}>
              <Text style={msgStyles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[msgStyles.sendBtn, sending && { opacity: 0.6 }]}
              onPress={handleSend} disabled={sending}>
              <Text style={msgStyles.sendText}>{sending ? 'Sending...' : 'Send'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const msgStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  container: {
    backgroundColor: '#fff',
    borderRadius: 16,
    maxHeight: SCREEN_HEIGHT * 0.8,
    overflow: 'hidden',
  },
  header: {
    padding: 20,
    paddingBottom: 16,
  },
  sellerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sellerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sellerName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  headerSub: {
    fontSize: 13,
    color: '#888',
    marginTop: 2,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#e0e0e0',
  },
  form: {
    padding: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#555',
    marginBottom: 6,
    marginTop: 14,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#1a1a1a',
    backgroundColor: '#fafafa',
  },
  disclaimer: {
    fontSize: 12,
    color: '#999',
    marginTop: 16,
    lineHeight: 17,
  },
  footer: {
    flexDirection: 'row',
    padding: 16,
    gap: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#e0e0e0',
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#555',
  },
  sendBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: '#e74c3c',
    alignItems: 'center',
  },
  sendText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
});

function SellerSection({ ad }) {
  const user = ad.userDetails || {};
  const isDealer = user.user_type === 'dealer' || user.user_type === 'trader' ||
    user.vendor_type === 'dealer' || !!user.dealer_status ||
    ad.im_trader === 1 || !!ad.business_name || !!ad.dealer_name || !!user.business_name;
  const sellerName = ad.business_name || ad.dealer_name || user.business_name || ad.full_name || 'Seller';
  const logo = user.logo || user.image;
  const logoUri = logo ? (logo.startsWith('http') ? logo : CDN + logo) : null;

  const bgImage = user.bg_image ? (user.bg_image.startsWith('http') ? user.bg_image : CDN + user.bg_image) : null;

  const getOpenStatus = () => {
    if (!Array.isArray(user.opening_hours) || user.opening_hours.length === 0) return null;
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const now = new Date();
    const today = days[now.getDay()];
    const todayHours = user.opening_hours.find(h => h && h.day_of_week === today);
    if (!todayHours || todayHours.is_closed) return { open: false, text: 'Closed Today' };
    const openTime = typeof todayHours.open_time === 'string' ? todayHours.open_time.substring(0, 5) : null;
    const closeTime = typeof todayHours.close_time === 'string' ? todayHours.close_time.substring(0, 5) : null;
    if (!openTime || !closeTime) return null;
    const nowMins = now.getHours() * 60 + now.getMinutes();
    const [oh, om] = openTime.split(':').map(Number);
    const [ch, cm] = closeTime.split(':').map(Number);
    if (isNaN(oh) || isNaN(om) || isNaN(ch) || isNaN(cm)) return null;
    const isOpen = nowMins >= oh * 60 + om && nowMins < ch * 60 + cm;
    return { open: isOpen, text: isOpen ? `Open Now: ${openTime} - ${closeTime}` : `Closed · Opens ${openTime}` };
  };

  const openStatus = getOpenStatus();

  const memberSinceD = user.created_at ? new Date(user.created_at) : null;
  const memberYearsD = memberSinceD ? Math.max(0, Math.floor((Date.now() - memberSinceD.getTime()) / (365.25 * 24 * 60 * 60 * 1000))) : null;
  const memberLabelD = memberYearsD === null ? null : memberYearsD < 1 ? 'New' : `${memberYearsD} year${memberYearsD !== 1 ? 's' : ''}`;
  const ratingD = user.average_rating ? parseFloat(user.average_rating) : 0;
  const reviewCountD = user.total_reviews || 0;
  const responseRateD = ad.avg_response_rate || 0;
  const hasStatsD = ratingD > 0 || memberLabelD || reviewCountD > 0;

  if (isDealer) {
    return (
      <View style={styles.section}>
        {bgImage ? (
          <View style={styles.dealerHeroBanner}>
            <Image source={bgImage} style={styles.dealerHeroBg} contentFit="cover" />
            <View style={styles.dealerHeroOverlay}>
              <View style={styles.dealerHeroContent}>
                {logoUri ? (
                  <Image source={logoUri} style={styles.dealerHeroLogo} contentFit="cover" />
                ) : null}
                <View style={{ flex: 1 }}>
                  <Text style={styles.dealerHeroName}>{sellerName}</Text>
                  <Text style={styles.dealerHeroSub}>Verified Dealer</Text>
                </View>
              </View>
            </View>
          </View>
        ) : (
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
        )}

        <View style={styles.verifiedBadges}>
          {ad.email && (
            <View style={styles.verifiedRow}>
              <Ionicons name="checkmark-circle" size={16} color="#27ae60" />
              <Text style={styles.verifiedText}>Email verified</Text>
            </View>
          )}
          {ad.phone_verified === 1 && (
            <View style={styles.verifiedRow}>
              <Ionicons name="checkmark-circle" size={16} color="#27ae60" />
              <Text style={styles.verifiedText}>Phone verified</Text>
            </View>
          )}
        </View>

        {hasStatsD && (
          <View style={styles.sellerStatsCard}>
            {ratingD > 0 && (
              <View style={styles.sellerStatItem}>
                <Text style={styles.sellerStatValue}>{ratingD.toFixed(1)}/5 <Ionicons name="star" size={14} color="#f5a623" /></Text>
                <Text style={styles.sellerStatLabel}>{ratingD >= 4.5 ? 'Excellent' : ratingD >= 3.5 ? 'Very Good' : ratingD >= 2.5 ? 'Good' : 'Fair'}</Text>
              </View>
            )}
            {reviewCountD > 0 && (
              <View style={[styles.sellerStatItem, styles.sellerStatBorder]}>
                <Text style={styles.sellerStatValue}>{reviewCountD}</Text>
                <Text style={styles.sellerStatLabel}>Review{reviewCountD !== 1 ? 's' : ''}</Text>
              </View>
            )}
            {memberLabelD && (
              <View style={[styles.sellerStatItem, (ratingD > 0 || reviewCountD > 0) && styles.sellerStatBorder]}>
                <Text style={styles.sellerStatValue}>{memberLabelD}</Text>
                <Text style={styles.sellerStatLabel}>on Listit</Text>
              </View>
            )}
          </View>
        )}

        {responseRateD > 0 && (
          <View style={styles.sellerMetaRow}>
            <Ionicons name="chatbubble-outline" size={15} color="#666" />
            <Text style={styles.sellerMetaText}>Answers {responseRateD}% of messages</Text>
          </View>
        )}

        {(user.business_address || ad.business_address || ad.location) && (
          <View style={styles.dealerInfoRow}>
            <Ionicons name="location-outline" size={16} color="#666" />
            <Text style={styles.dealerInfoText}>{user.business_address || ad.business_address || ad.location}</Text>
          </View>
        )}

        {openStatus && (
          <View style={styles.dealerInfoRow}>
            <Ionicons name="time-outline" size={16} color={openStatus.open ? '#27ae60' : '#e74c3c'} />
            <Text style={[styles.dealerInfoText, { color: openStatus.open ? '#27ae60' : '#e74c3c', fontWeight: '600' }]}>
              {openStatus.text}
            </Text>
          </View>
        )}

        {user.website && (
          <TouchableOpacity style={styles.dealerInfoRow} onPress={() => Linking.openURL(user.website)}>
            <Ionicons name="globe-outline" size={16} color="#666" />
            <Text style={[styles.dealerInfoText, { color: BLUE }]}>{user.website}</Text>
          </TouchableOpacity>
        )}

        {user.email_contact && (
          <TouchableOpacity style={styles.dealerInfoRow} onPress={() => Linking.openURL(`mailto:${user.email_contact}`)}>
            <Ionicons name="mail-outline" size={16} color="#666" />
            <Text style={[styles.dealerInfoText, { color: BLUE }]}>{user.email_contact}</Text>
          </TouchableOpacity>
        )}

        {user.whatsapp_contact && (
          <TouchableOpacity style={styles.dealerInfoRow} onPress={() => Linking.openURL(`https://wa.me/${String(user.whatsapp_contact).replace(/\D/g, '')}`)}>
            <Ionicons name="logo-whatsapp" size={16} color="#25d366" />
            <Text style={[styles.dealerInfoText, { color: '#25d366' }]}>WhatsApp</Text>
          </TouchableOpacity>
        )}

        {(ad.live_ads_count > 0 || ad.total_ads_count > 0) && (
          <View>
            <View style={styles.dealerInfoRow}>
              <Ionicons name="document-text-outline" size={16} color="#666" />
              <Text style={styles.dealerInfoText}>
                {ad.live_ads_count || 0} Active ad{ad.live_ads_count !== 1 ? 's' : ''}{ad.total_ads_count ? `  |  ${ad.total_ads_count}+ Total ads` : ''}
              </Text>
            </View>
            <TouchableOpacity style={styles.viewAllAdsBtn}>
              <Ionicons name="open-outline" size={15} color={BLUE} />
              <Text style={styles.viewAllAdsText}>View all ads</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  }

  const memberSince = user.created_at ? new Date(user.created_at) : null;
  const memberYears = memberSince ? Math.max(0, Math.floor((Date.now() - memberSince.getTime()) / (365.25 * 24 * 60 * 60 * 1000))) : null;
  const memberLabel = memberYears === null ? null : memberYears < 1 ? 'New member' : `${memberYears} year${memberYears !== 1 ? 's' : ''}`;
  const rating = user.average_rating ? parseFloat(user.average_rating) : 0;
  const reviewCount = user.total_reviews || 0;
  const responseRate = ad.avg_response_rate || 0;
  const hasStats = rating > 0 || memberLabel || reviewCount > 0;

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
        </View>
      </View>

      <View style={styles.verifiedBadges}>
        {ad.email && (
          <View style={styles.verifiedRow}>
            <Ionicons name="checkmark-circle" size={16} color="#27ae60" />
            <Text style={styles.verifiedText}>Email verified</Text>
          </View>
        )}
        {ad.phone_verified === 1 && (
          <View style={styles.verifiedRow}>
            <Ionicons name="checkmark-circle" size={16} color="#27ae60" />
            <Text style={styles.verifiedText}>Phone verified</Text>
          </View>
        )}
      </View>

      {hasStats && (
        <View style={styles.sellerStatsCard}>
          {rating > 0 && (
            <View style={styles.sellerStatItem}>
              <Text style={styles.sellerStatValue}>{rating.toFixed(1)}/5 <Ionicons name="star" size={14} color="#f5a623" /></Text>
              <Text style={styles.sellerStatLabel}>{rating >= 4.5 ? 'Excellent' : rating >= 3.5 ? 'Very Good' : rating >= 2.5 ? 'Good' : 'Fair'}</Text>
            </View>
          )}
          {reviewCount > 0 && (
            <View style={[styles.sellerStatItem, styles.sellerStatBorder]}>
              <Text style={styles.sellerStatValue}>{reviewCount}</Text>
              <Text style={styles.sellerStatLabel}>Review{reviewCount !== 1 ? 's' : ''}</Text>
            </View>
          )}
          {memberLabel && (
            <View style={[styles.sellerStatItem, (rating > 0 || reviewCount > 0) && styles.sellerStatBorder]}>
              <Text style={styles.sellerStatValue}>{memberLabel}</Text>
              <Text style={styles.sellerStatLabel}>on Listit</Text>
            </View>
          )}
        </View>
      )}

      {responseRate > 0 && (
        <View style={styles.sellerMetaRow}>
          <Ionicons name="chatbubble-outline" size={15} color="#666" />
          <Text style={styles.sellerMetaText}>Answers {responseRate}% of messages</Text>
        </View>
      )}

      {(ad.live_ads_count > 0 || ad.total_ads_count > 0) && (
        <View style={styles.sellerMetaRow}>
          <Ionicons name="document-text-outline" size={15} color="#666" />
          <Text style={styles.sellerMetaText}>
            {ad.live_ads_count || 0} Active ad{ad.live_ads_count !== 1 ? 's' : ''}
            {ad.total_ads_count ? `  |  ${ad.total_ads_count}+ Total ads` : ''}
          </Text>
        </View>
      )}

      {ad.live_ads_count > 0 && (
        <TouchableOpacity style={styles.viewAllAdsBtn}>
          <Ionicons name="open-outline" size={15} color={BLUE} />
          <Text style={styles.viewAllAdsText}>View all ads</Text>
        </TouchableOpacity>
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
  const [msgVisible, setMsgVisible] = useState(false);

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
      user.vendor_type === 'dealer' || !!user.dealer_status ||
      ad.im_trader === 1 || !!ad.business_name || !!ad.dealer_name || !!user.business_name;
    const body = { page: 1, limit: 12 };
    if (dealer && ad.user_id) body.user_id = ad.user_id;
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
    const user = ad?.userDetails || {};
    const phone = user.phone_contact || ad?.phone;
    if (phone) {
      const phoneCode = ad?.phone_code || '353';
      const cleaned = String(phone).replace(/^0+/, '');
      Linking.openURL(`tel:+${phoneCode}${cleaned}`);
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
  const adUser = ad.userDetails || {};
  const hasPhone = !!(adUser.phone_contact || ad.phone);
  const timeAgo = getTimeAgo(ad.created_at);
  const vd = ad.vehicleData;
  const isVehicle = ad.is_vehicle === 1 && vd && vd.found !== false;
  const isDealerAd = adUser.user_type === 'dealer' || adUser.user_type === 'trader' ||
    adUser.vendor_type === 'dealer' || !!adUser.dealer_status ||
    ad.im_trader === 1 || !!ad.business_name || !!ad.dealer_name || !!adUser.business_name;
  const dealerDisplayName = ad.business_name || ad.dealer_name || adUser.business_name || ad.full_name || adUser.name || '';
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
          {price >= 1000 && (
            <Text style={styles.monthlyPrice}>From €{Math.round(price / 60).toLocaleString('en-IE')}/mo</Text>
          )}
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
        {Array.isArray(ad.attributes) && ad.attributes.length > 0 && (
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

        {/* Notify Me */}
        <NotifyMeSection />

        {/* Report Ad */}
        <TouchableOpacity style={styles.reportAdRow} activeOpacity={0.7}
          onPress={handleReport}>
          <Ionicons name="flag-outline" size={18} color="#888" />
          <Text style={styles.reportAdText}>Report this Ad</Text>
        </TouchableOpacity>

        {/* Seller */}
        <SellerSection ad={ad} />

        {/* Google Reviews */}
        {isDealerAd && Array.isArray(adUser.reviews) && adUser.reviews.length > 0 && (
          <GoogleReviewsSection reviews={adUser.reviews} />
        )}

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
                if (iv.engine_size) sp.push(formatEngineSize(iv.engine_size) + 'L');
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
        {hasPhone && (
          <TouchableOpacity style={styles.callBtn} onPress={handleCall}>
            <Ionicons name="call-outline" size={18} color={BLUE} />
            <Text style={styles.callBtnText}>Call</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={styles.messageBtn}
          onPress={() => setMsgVisible(true)}>
          <Ionicons name="chatbubble-outline" size={18} color="#fff" />
          <Text style={styles.messageBtnText}>Message</Text>
        </TouchableOpacity>
      </View>

      <MessageModal visible={msgVisible} onClose={() => setMsgVisible(false)} ad={ad} />
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
  monthlyPrice: {
    fontSize: 15,
    color: BLUE,
    fontWeight: '600',
    marginTop: 4,
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

  // Dealer hero banner (with bg_image)
  dealerHeroBanner: {
    borderRadius: 12,
    overflow: 'hidden',
    height: 140,
    marginBottom: 14,
    position: 'relative',
  },
  dealerHeroBg: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  dealerHeroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
    padding: 16,
  },
  dealerHeroContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dealerHeroLogo: {
    width: 48,
    height: 48,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  dealerHeroName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  dealerHeroSub: {
    fontSize: 13,
    color: '#27ae60',
    fontWeight: '600',
    marginTop: 2,
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

  // Google Reviews
  reviewsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  reviewCard: {
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#f0f0f0',
  },
  reviewTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  reviewAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#e8f0fe',
    justifyContent: 'center',
    alignItems: 'center',
  },
  reviewAvatarText: {
    fontSize: 16,
    fontWeight: '700',
    color: BLUE,
  },
  reviewAuthor: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  reviewStarsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  reviewTime: {
    fontSize: 12,
    color: '#999',
  },
  reviewText: {
    fontSize: 14,
    color: '#555',
    lineHeight: 20,
    marginTop: 8,
  },
  seeMoreReviewsText: {
    fontSize: 15,
    color: BLUE,
    fontWeight: '600',
    marginTop: 12,
  },

  // Notify Me
  notifySection: {
    padding: 16,
    backgroundColor: '#f8fafc',
    borderBottomWidth: 8,
    borderBottomColor: '#f5f5f5',
    alignItems: 'center',
  },
  notifyText: {
    fontSize: 15,
    color: '#555',
    marginBottom: 12,
    textAlign: 'center',
  },
  notifyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#333',
  },
  notifyBtnActive: {
    backgroundColor: BLUE,
    borderColor: BLUE,
  },
  notifyBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
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
  sellerStatsCard: {
    flexDirection: 'row',
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#e8e8e8',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  sellerStatItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sellerStatBorder: {
    borderLeftWidth: 1,
    borderLeftColor: '#e8e8e8',
  },
  sellerStatValue: {
    fontSize: 15,
    fontWeight: '700',
    color: BLUE,
  },
  sellerStatLabel: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  sellerMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
  },
  sellerMetaText: {
    fontSize: 14,
    color: '#555',
  },
  viewAllAdsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
  },
  viewAllAdsText: {
    fontSize: 14,
    color: BLUE,
    fontWeight: '600',
    textDecorationLine: 'underline',
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
    gap: 10,
  },
  messageBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: BLUE,
    paddingVertical: 14,
    borderRadius: 10,
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
  contactBtnOutline: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#ddd',
    marginRight: 6,
    gap: 6,
  },
  contactBtnOutlineText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#333',
  },
  contactBtnPrimary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: BLUE,
    paddingVertical: 14,
    borderRadius: 10,
    gap: 6,
  },
  contactBtnPrimaryText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
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
