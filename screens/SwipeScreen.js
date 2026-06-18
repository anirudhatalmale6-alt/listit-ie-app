import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, Image, Animated, PanResponder, Dimensions,
  StyleSheet, ActivityIndicator, TouchableOpacity,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.25;
const SWIPE_OUT_DURATION = 250;
const API_URL = 'https://listit.ie/api/user/search';
const IMG_BASE = 'https://d3ste2v8jw54du.cloudfront.net/';
const STORAGE_KEY = '@listit_saved_ads';

export default function SwipeScreen({ onSavedCountChange }) {
  const [ads, setAds] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [noMore, setNoMore] = useState(false);
  const position = useRef(new Animated.ValueXY()).current;
  const seenIds = useRef(new Set());

  const fetchAds = useCallback(async (pg = 1) => {
    try {
      const params = new URLSearchParams({
        limit: '20',
        sort_order: 'DESC',
        sort_by: 'last_bump_at',
        page: String(pg),
        status: '1',
      });
      const res = await fetch(`${API_URL}?${params}`);
      const data = await res.json();
      if (data.result && data.result.length > 0) {
        const fresh = data.result.filter(a => !seenIds.current.has(a.id));
        fresh.forEach(a => seenIds.current.add(a.id));
        if (fresh.length === 0) {
          setNoMore(true);
        } else {
          setAds(prev => [...prev, ...fresh]);
        }
      } else {
        setNoMore(true);
      }
    } catch (e) {
      console.warn('Fetch error:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAds(1); }, []);

  useEffect(() => {
    if (ads.length > 0 && currentIndex >= ads.length - 5 && !noMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchAds(nextPage);
    }
  }, [currentIndex, ads.length]);

  const saveAd = async (ad) => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      const saved = stored ? JSON.parse(stored) : [];
      if (!saved.find(s => s.id === ad.id)) {
        saved.unshift(ad);
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
        if (onSavedCountChange) onSavedCountChange(saved.length);
      }
    } catch (e) {
      console.warn('Save error:', e);
    }
  };

  const forceSwipe = (direction) => {
    const x = direction === 'right' ? SCREEN_WIDTH * 1.5 : -SCREEN_WIDTH * 1.5;
    Animated.timing(position, {
      toValue: { x, y: 0 },
      duration: SWIPE_OUT_DURATION,
      useNativeDriver: false,
    }).start(() => onSwipeComplete(direction));
  };

  const onSwipeComplete = (direction) => {
    const ad = ads[currentIndex];
    if (direction === 'right' && ad) {
      saveAd(ad);
    }
    position.setValue({ x: 0, y: 0 });
    setCurrentIndex(prev => prev + 1);
  };

  const resetPosition = () => {
    Animated.spring(position, {
      toValue: { x: 0, y: 0 },
      useNativeDriver: false,
    }).start();
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gesture) => {
        position.setValue({ x: gesture.dx, y: gesture.dy * 0.3 });
      },
      onPanResponderRelease: (_, gesture) => {
        if (gesture.dx > SWIPE_THRESHOLD) {
          forceSwipe('right');
        } else if (gesture.dx < -SWIPE_THRESHOLD) {
          forceSwipe('left');
        } else {
          resetPosition();
        }
      },
    })
  ).current;

  const getCardStyle = () => {
    const rotate = position.x.interpolate({
      inputRange: [-SCREEN_WIDTH, 0, SCREEN_WIDTH],
      outputRange: ['-8deg', '0deg', '8deg'],
    });
    return {
      ...position.getLayout(),
      transform: [{ rotate }],
    };
  };

  const getImageUrl = (ad) => {
    try {
      const imgs = typeof ad.images === 'string' ? JSON.parse(ad.images) : ad.images;
      if (Array.isArray(imgs) && imgs.length > 0) {
        const img = imgs[0];
        if (typeof img === 'string') return img.startsWith('http') ? img : IMG_BASE + img;
        if (img.image) return img.image.startsWith('http') ? img.image : IMG_BASE + img.image;
      }
    } catch (e) {}
    return null;
  };

  const getSpecs = (ad) => {
    const specs = [];
    if (ad.vehicleData) {
      const v = ad.vehicleData;
      if (v.year) specs.push(String(v.year));
      if (v.engine_size) specs.push(v.engine_size > 100 ? (v.engine_size / 1000).toFixed(1) + 'L' : v.engine_size + 'L');
      if (v.fuel_type) specs.push(v.fuel_type);
      if (v.mileage) specs.push(Number(v.mileage).toLocaleString() + ' km');
      if (v.transmission) specs.push(v.transmission);
    }
    if (ad.location) specs.push(ad.location);
    return specs;
  };

  if (loading && ads.length === 0) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color="#1b87f4" />
        <Text style={s.loadingText}>Loading ads...</Text>
      </View>
    );
  }

  if (currentIndex >= ads.length) {
    return (
      <View style={s.center}>
        <Ionicons name="checkmark-circle-outline" size={64} color="#1b87f4" />
        <Text style={s.emptyTitle}>You've seen them all!</Text>
        <Text style={s.emptySubtitle}>Check back later for new listings</Text>
        <TouchableOpacity
          style={s.resetBtn}
          onPress={() => {
            seenIds.current.clear();
            setAds([]);
            setCurrentIndex(0);
            setPage(1);
            setNoMore(false);
            setLoading(true);
            fetchAds(1);
          }}
        >
          <Text style={s.resetBtnText}>Start Over</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const ad = ads[currentIndex];
  const imageUrl = getImageUrl(ad);
  const specs = getSpecs(ad);
  const likeOpacity = position.x.interpolate({
    inputRange: [0, SWIPE_THRESHOLD],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });
  const nopeOpacity = position.x.interpolate({
    inputRange: [-SWIPE_THRESHOLD, 0],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  return (
    <View style={s.container}>
      <View style={s.header}>
        <Text style={s.headerTitle}>Discover</Text>
        <Text style={s.headerSubtitle}>Swipe right to save, left to skip</Text>
      </View>

      <View style={s.cardArea}>
        {/* Next card preview */}
        {currentIndex + 1 < ads.length && (
          <View style={[s.card, s.nextCard]}>
            <Image
              source={{ uri: getImageUrl(ads[currentIndex + 1]) }}
              style={s.cardImage}
            />
          </View>
        )}

        {/* Current card */}
        <Animated.View
          style={[s.card, getCardStyle()]}
          {...panResponder.panHandlers}
        >
          {imageUrl ? (
            <Image source={{ uri: imageUrl }} style={s.cardImage} />
          ) : (
            <View style={[s.cardImage, s.noImage]}>
              <Ionicons name="image-outline" size={48} color="#ccc" />
            </View>
          )}

          <Animated.View style={[s.overlayLabel, s.likeLabel, { opacity: likeOpacity }]}>
            <Text style={s.likeLabelText}>SAVE</Text>
          </Animated.View>
          <Animated.View style={[s.overlayLabel, s.nopeLabel, { opacity: nopeOpacity }]}>
            <Text style={s.nopeLabelText}>SKIP</Text>
          </Animated.View>

          <View style={s.cardInfo}>
            <Text style={s.cardTitle} numberOfLines={2}>{ad.title}</Text>
            {ad.price > 0 && (
              <Text style={s.cardPrice}>
                {'€'}{Number(ad.price).toLocaleString()}
              </Text>
            )}
            {specs.length > 0 && (
              <Text style={s.cardSpecs} numberOfLines={1}>
                {specs.join('  •  ')}
              </Text>
            )}
          </View>
        </Animated.View>
      </View>

      <View style={s.actions}>
        <TouchableOpacity style={[s.actionBtn, s.skipBtn]} onPress={() => forceSwipe('left')}>
          <Ionicons name="close" size={32} color="#ff4458" />
        </TouchableOpacity>
        <TouchableOpacity style={[s.actionBtn, s.saveBtn]} onPress={() => forceSwipe('right')}>
          <Ionicons name="heart" size={32} color="#4cd964" />
        </TouchableOpacity>
      </View>

      <Text style={s.counter}>{currentIndex + 1} / {ads.length}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  loadingText: { marginTop: 12, fontSize: 16, color: '#666' },
  emptyTitle: { fontSize: 22, fontWeight: '700', marginTop: 16, color: '#333' },
  emptySubtitle: { fontSize: 15, color: '#888', marginTop: 6 },
  resetBtn: { marginTop: 24, backgroundColor: '#1b87f4', paddingHorizontal: 32, paddingVertical: 14, borderRadius: 25 },
  resetBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  header: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 },
  headerTitle: { fontSize: 26, fontWeight: '800', color: '#1a1a1a' },
  headerSubtitle: { fontSize: 14, color: '#888', marginTop: 2 },
  cardArea: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  card: {
    position: 'absolute',
    width: SCREEN_WIDTH - 32,
    height: SCREEN_HEIGHT * 0.58,
    borderRadius: 16,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    overflow: 'hidden',
  },
  nextCard: { transform: [{ scale: 0.95 }], opacity: 0.7 },
  cardImage: { width: '100%', height: '65%', backgroundColor: '#eee' },
  noImage: { justifyContent: 'center', alignItems: 'center' },
  cardInfo: { padding: 16, flex: 1, justifyContent: 'center' },
  cardTitle: { fontSize: 18, fontWeight: '700', color: '#1a1a1a', marginBottom: 6 },
  cardPrice: { fontSize: 22, fontWeight: '800', color: '#1b87f4', marginBottom: 6 },
  cardSpecs: { fontSize: 13, color: '#888' },
  overlayLabel: { position: 'absolute', top: 40, zIndex: 10, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, borderWidth: 3 },
  likeLabel: { right: 20, borderColor: '#4cd964', backgroundColor: 'rgba(76,217,100,0.1)' },
  nopeLabel: { left: 20, borderColor: '#ff4458', backgroundColor: 'rgba(255,68,88,0.1)' },
  likeLabelText: { fontSize: 24, fontWeight: '800', color: '#4cd964' },
  nopeLabelText: { fontSize: 24, fontWeight: '800', color: '#ff4458' },
  actions: { flexDirection: 'row', justifyContent: 'center', gap: 40, paddingBottom: 16 },
  actionBtn: { width: 64, height: 64, borderRadius: 32, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 6, elevation: 4 },
  skipBtn: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#ff4458' },
  saveBtn: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#4cd964' },
  counter: { textAlign: 'center', fontSize: 13, color: '#aaa', paddingBottom: 8 },
});
