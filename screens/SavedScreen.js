import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, Image, FlatList, TouchableOpacity, ScrollView,
  StyleSheet, Alert, Dimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = (SCREEN_WIDTH - 48) / 2;
const IMG_BASE = 'https://d3ste2v8jw54du.cloudfront.net/';
const STORAGE_KEY = '@listit_saved_ads';
const MAX_COMPARE = 6;

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

export default function SavedScreen({ onOpenAd, onSavedCountChange }) {
  const [saved, setSaved] = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [comparing, setComparing] = useState(false);

  const loadSaved = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      const list = stored ? JSON.parse(stored) : [];
      setSaved(list);
      if (onSavedCountChange) onSavedCountChange(list.length);
    } catch (e) {}
  }, []);

  useEffect(() => { loadSaved(); }, []);

  const removeAd = async (adId) => {
    const updated = saved.filter(a => a.id !== adId);
    setSaved(updated);
    selected.delete(adId);
    setSelected(new Set(selected));
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    if (onSavedCountChange) onSavedCountChange(updated.length);
  };

  const toggleSelect = (adId) => {
    const next = new Set(selected);
    if (next.has(adId)) {
      next.delete(adId);
    } else {
      if (next.size >= MAX_COMPARE) {
        Alert.alert('Maximum reached', `You can compare up to ${MAX_COMPARE} vehicles at a time.`);
        return;
      }
      next.add(adId);
    }
    setSelected(next);
  };

  const clearAll = () => {
    Alert.alert('Clear All', 'Remove all saved ads?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear',
        style: 'destructive',
        onPress: async () => {
          setSaved([]);
          setSelected(new Set());
          await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify([]));
          if (onSavedCountChange) onSavedCountChange(0);
        },
      },
    ]);
  };

  if (comparing) {
    const compareAds = saved.filter(a => selected.has(a.id));
    return (
      <CompareView
        ads={compareAds}
        onBack={() => setComparing(false)}
      />
    );
  }

  if (saved.length === 0) {
    return (
      <View style={s.emptyContainer}>
        <Ionicons name="heart-outline" size={64} color="#ccc" />
        <Text style={s.emptyTitle}>No saved ads yet</Text>
        <Text style={s.emptySubtitle}>Swipe right on the Discover tab to save ads you like</Text>
      </View>
    );
  }

  return (
    <View style={s.container}>
      <View style={s.header}>
        <View>
          <Text style={s.headerTitle}>Saved</Text>
          <Text style={s.headerSubtitle}>{saved.length} ad{saved.length !== 1 ? 's' : ''} saved</Text>
        </View>
        <TouchableOpacity onPress={clearAll}>
          <Text style={s.clearText}>Clear All</Text>
        </TouchableOpacity>
      </View>

      {selected.size >= 2 && (
        <TouchableOpacity style={s.compareBar} onPress={() => setComparing(true)}>
          <Ionicons name="git-compare-outline" size={20} color="#fff" />
          <Text style={s.compareBarText}>Compare {selected.size} vehicles</Text>
        </TouchableOpacity>
      )}

      <Text style={s.selectHint}>
        {selected.size === 0
          ? 'Tap to select ads for comparison (up to 6)'
          : `${selected.size} selected`}
      </Text>

      <FlatList
        data={saved}
        numColumns={2}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={s.grid}
        columnWrapperStyle={s.row}
        renderItem={({ item }) => {
          const isSelected = selected.has(item.id);
          const imageUrl = getImageUrl(item);
          return (
            <TouchableOpacity
              style={[s.card, isSelected && s.cardSelected]}
              onPress={() => toggleSelect(item.id)}
              onLongPress={() => removeAd(item.id)}
              activeOpacity={0.8}
            >
              {isSelected && (
                <View style={s.checkBadge}>
                  <Ionicons name="checkmark-circle" size={24} color="#1b87f4" />
                </View>
              )}
              {imageUrl ? (
                <Image source={{ uri: imageUrl }} style={s.cardImage} />
              ) : (
                <View style={[s.cardImage, s.noImage]}>
                  <Ionicons name="image-outline" size={32} color="#ccc" />
                </View>
              )}
              <View style={s.cardInfo}>
                <Text style={s.cardTitle} numberOfLines={2}>{item.title}</Text>
                {item.price > 0 && (
                  <Text style={s.cardPrice}>{'€'}{Number(item.price).toLocaleString()}</Text>
                )}
              </View>
              <TouchableOpacity
                style={s.removeBtn}
                onPress={() => removeAd(item.id)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close-circle" size={22} color="#ff4458" />
              </TouchableOpacity>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

function CompareView({ ads, onBack }) {
  const specs = [
    { key: 'price', label: 'Price', format: (ad) => ad.price > 0 ? '€' + Number(ad.price).toLocaleString() : '-' },
    { key: 'year', label: 'Year', format: (ad) => ad.vehicleData?.year || '-' },
    { key: 'mileage', label: 'Mileage', format: (ad) => ad.vehicleData?.mileage ? Number(ad.vehicleData.mileage).toLocaleString() + ' km' : '-' },
    { key: 'fuel', label: 'Fuel', format: (ad) => ad.vehicleData?.fuel_type || '-' },
    { key: 'engine', label: 'Engine', format: (ad) => {
      const e = ad.vehicleData?.engine_size;
      if (!e) return '-';
      return e > 100 ? (e / 1000).toFixed(1) + 'L' : e + 'L';
    }},
    { key: 'transmission', label: 'Transmission', format: (ad) => ad.vehicleData?.transmission || '-' },
    { key: 'colour', label: 'Colour', format: (ad) => ad.vehicleData?.colour || '-' },
    { key: 'body', label: 'Body Type', format: (ad) => ad.vehicleData?.body_type || '-' },
    { key: 'doors', label: 'Doors', format: (ad) => ad.vehicleData?.number_of_doors || '-' },
    { key: 'seats', label: 'Seats', format: (ad) => ad.vehicleData?.number_of_seats || '-' },
    { key: 'tax', label: 'Tax Expiry', format: (ad) => ad.vehicleData?.tax_expiry ? new Date(ad.vehicleData.tax_expiry).toLocaleDateString('en-IE', { month: 'short', year: 'numeric' }) : '-' },
    { key: 'nct', label: 'NCT Expiry', format: (ad) => ad.vehicleData?.nct_expiry ? new Date(ad.vehicleData.nct_expiry).toLocaleDateString('en-IE', { month: 'short', year: 'numeric' }) : '-' },
    { key: 'location', label: 'Location', format: (ad) => ad.location || '-' },
  ];

  const colWidth = Math.max(140, (SCREEN_WIDTH - 120) / ads.length);

  return (
    <View style={cs.container}>
      <View style={cs.header}>
        <TouchableOpacity onPress={onBack} style={cs.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={cs.headerTitle}>Compare ({ads.length})</Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View>
          {/* Vehicle images row */}
          <View style={cs.row}>
            <View style={cs.labelCell} />
            {ads.map(ad => (
              <View key={ad.id} style={[cs.cell, { width: colWidth }]}>
                <Image source={{ uri: getImageUrl(ad) }} style={cs.thumbImage} />
                <Text style={cs.thumbTitle} numberOfLines={2}>{ad.title}</Text>
              </View>
            ))}
          </View>

          {/* Spec rows */}
          {specs.map((spec, idx) => (
            <View key={spec.key} style={[cs.row, idx % 2 === 0 && cs.rowAlt]}>
              <View style={cs.labelCell}>
                <Text style={cs.labelText}>{spec.label}</Text>
              </View>
              {ads.map(ad => {
                const val = spec.format(ad);
                const isHighlight = spec.key === 'price';
                return (
                  <View key={ad.id} style={[cs.cell, { width: colWidth }]}>
                    <Text style={[cs.valueText, isHighlight && cs.priceText]}>{val}</Text>
                  </View>
                );
              })}
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const cs = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#eee' },
  backBtn: { marginRight: 12 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#1a1a1a' },
  row: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  rowAlt: { backgroundColor: '#fafafa' },
  labelCell: { width: 110, paddingVertical: 12, paddingHorizontal: 12, justifyContent: 'center' },
  labelText: { fontSize: 13, fontWeight: '600', color: '#666' },
  cell: { paddingVertical: 12, paddingHorizontal: 8, justifyContent: 'center', alignItems: 'center' },
  valueText: { fontSize: 13, color: '#333', textAlign: 'center' },
  priceText: { fontWeight: '700', color: '#1b87f4', fontSize: 15 },
  thumbImage: { width: 100, height: 70, borderRadius: 8, backgroundColor: '#eee', marginBottom: 6 },
  thumbTitle: { fontSize: 11, fontWeight: '600', textAlign: 'center', color: '#333' },
});

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: '#333', marginTop: 16 },
  emptySubtitle: { fontSize: 14, color: '#888', marginTop: 6, textAlign: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', padding: 16, paddingBottom: 0 },
  headerTitle: { fontSize: 26, fontWeight: '800', color: '#1a1a1a' },
  headerSubtitle: { fontSize: 14, color: '#888', marginTop: 2 },
  clearText: { fontSize: 14, color: '#ff4458', fontWeight: '600', marginTop: 6 },
  selectHint: { fontSize: 13, color: '#aaa', paddingHorizontal: 16, paddingVertical: 8 },
  compareBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    marginHorizontal: 16, marginTop: 12, backgroundColor: '#1b87f4',
    paddingVertical: 14, borderRadius: 12,
  },
  compareBarText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  grid: { padding: 16, paddingTop: 0 },
  row: { justifyContent: 'space-between' },
  card: {
    width: CARD_WIDTH, backgroundColor: '#fff', borderRadius: 12,
    marginBottom: 12, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 6, elevation: 3,
  },
  cardSelected: { borderWidth: 2, borderColor: '#1b87f4' },
  checkBadge: { position: 'absolute', top: 8, right: 8, zIndex: 10, backgroundColor: '#fff', borderRadius: 12 },
  cardImage: { width: '100%', height: 110, backgroundColor: '#eee' },
  noImage: { justifyContent: 'center', alignItems: 'center' },
  cardInfo: { padding: 10 },
  cardTitle: { fontSize: 13, fontWeight: '600', color: '#333' },
  cardPrice: { fontSize: 15, fontWeight: '800', color: '#1b87f4', marginTop: 4 },
  removeBtn: { position: 'absolute', top: 6, left: 6, zIndex: 10 },
});
