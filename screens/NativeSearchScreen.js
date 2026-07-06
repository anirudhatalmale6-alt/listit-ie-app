import React, { useEffect, useState, useCallback, useRef, useMemo, memo } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, RefreshControl, Dimensions, TextInput,
  Modal, ScrollView, Platform, Alert,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Location from 'expo-location';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CDN = 'https://d3ste2v8jw54du.cloudfront.net/';
const API = 'https://api.listit.ie';
const BLUE = '#1b87f4';
const IMAGE_HEIGHT = Math.floor(SCREEN_WIDTH * 0.58);

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

const AdCard = memo(({ ad, onPress }) => {
  const validImages = useMemo(() => getValidImages(ad.images), [ad.images]);
  const price = parseFloat(ad.price || 0);
  const priceStr = price > 0 ? `€${price.toLocaleString('en-IE')}` : 'Free';
  const timeAgo = getTimeAgo(ad.created_at);
  const totalImages = validImages.length;
  const mainImage = validImages.length > 0 ? validImages[0] : null;

  const vd = ad.vehicleData || {};
  const isVehicle = ad.is_vehicle === 1 && vd.found !== false;
  const specParts = [];
  if (isVehicle) {
    if (vd.year) specParts.push(vd.year);
    if (vd.engine_size) specParts.push(formatEngineSize(vd.engine_size) + 'L');
    if (vd.fuel) specParts.push(vd.fuel);
    const mileStr = formatMileage(vd.milage);
    if (mileStr) specParts.push(mileStr);
  }
  const specLine = specParts.join(' · ');

  const isDealer = ad.vendor_type === 'dealer' && ad.dealer_name;

  return (
    <TouchableOpacity style={[styles.card, isDealer && styles.dealerCard]} onPress={() => onPress(ad)} activeOpacity={0.7}>
      {isDealer && (
        <View style={styles.dealerHeader}>
          {ad.logo ? (
            <Image source={CDN + ad.logo} style={styles.dealerLogo} contentFit="contain" />
          ) : (
            <View style={styles.dealerLogoPlaceholder}>
              <Ionicons name="business" size={14} color="#fff" />
            </View>
          )}
          <Text style={styles.dealerName} numberOfLines={1}>{ad.dealer_name}</Text>
          <View style={styles.dealerBadge}>
            <Ionicons name="shield-checkmark" size={12} color="#fff" />
          </View>
        </View>
      )}
      {ad.under_offer === 1 && (
        <View style={styles.underOfferBanner}>
          <Text style={styles.underOfferText}>Under Offer</Text>
        </View>
      )}

      {/* Single Large Image */}
      <View style={styles.mainImageWrap}>
        {mainImage ? (
          <Image
            source={mainImage}
            style={styles.mainImage}
            contentFit="cover"
            recyclingKey={`${ad.id}-main`}
            cachePolicy="memory-disk"
          />
        ) : (
          <View style={styles.noImageWrap}>
            <Ionicons name="image-outline" size={40} color="#ccc" />
            <Text style={styles.noImageText}>No photos</Text>
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

      {/* Card Body */}
      <View style={styles.cardBody}>
        <Text style={styles.cardTitle} numberOfLines={2}>{ad.title}</Text>
        {specLine ? <Text style={styles.specLine} numberOfLines={1}>{specLine}</Text> : null}
        {ad.location ? <Text style={styles.cardLocation}>{ad.location}</Text> : null}
        <Text style={styles.cardPrice}>{priceStr}</Text>
      </View>
    </TouchableOpacity>
  );
});

const SECTION_TABS = [
  { key: 'all', label: 'All', icon: 'grid-outline' },
  { key: 'motors', label: 'Motors', icon: 'car-sport-outline', slugs: ['cars-and-motors'] },
  { key: 'marketplace', label: 'Marketplace', icon: 'storefront-outline', slugs: ['house-diy','electronics','clothes-lifestyle','sports-hobbies','services','jobs','baby-kids','animals','business','holidays-tickets','lost-found','music-education','wanted','pets','whats-on'] },
  { key: 'property', label: 'Property', icon: 'home-outline', slugs: ['property'] },
  { key: 'farming', label: 'Farming', icon: 'leaf-outline', slugs: ['farming'] },
];

const FUEL_TYPES = ['Diesel', 'Electric', 'Hybrid', 'Petrol'];
const BODY_TYPES = ['Saloon', 'Hatchback', 'Estate', 'SUV', 'Coupe', 'Convertible', 'MPV', 'Van', 'Pickup', 'Other'];
const YEAR_OPTIONS = (() => {
  const now = new Date().getFullYear();
  const extra = new Date().getMonth() >= 7 ? 1 : 0;
  const years = [];
  for (let y = now + extra; y >= now - 50; y--) years.push(String(y));
  return years;
})();
const MILEAGE_OPTIONS = ['0','1000','5000','10000','20000','30000','40000','50000','60000','70000','80000','90000','100000','150000','200000','250000','300000'];

const SORT_OPTIONS = [
  { label: 'Best Match', value: 'id', order: 'DESC' },
  { label: 'Newest', value: 'id', order: 'DESC' },
  { label: 'Oldest', value: 'id', order: 'ASC' },
  { label: 'Price: Low to High', value: 'price', order: 'ASC' },
  { label: 'Price: High to Low', value: 'price', order: 'DESC' },
];

const PROVINCES = [
  { name: 'Connacht', counties: ['Galway', 'Leitrim', 'Mayo', 'Roscommon', 'Sligo'] },
  { name: 'Leinster', counties: ['Carlow', 'Dublin', 'Kildare', 'Kilkenny', 'Laois', 'Longford', 'Louth', 'Meath', 'Offaly', 'Westmeath', 'Wexford', 'Wicklow'] },
  { name: 'Munster', counties: ['Clare', 'Cork', 'Kerry', 'Limerick', 'Tipperary', 'Waterford'] },
  { name: 'Ulster', counties: ['Antrim', 'Armagh', 'Cavan', 'Derry', 'Donegal', 'Down', 'Fermanagh', 'Monaghan', 'Tyrone'] },
];

const ALL_COUNTIES = PROVINCES.flatMap(p => p.counties).sort();

const DISTANCE_OPTIONS = [
  { label: '+5km', value: 5 },
  { label: '+10km', value: 10 },
  { label: '+25km', value: 25 },
  { label: '+50km', value: 50 },
  { label: '+75km', value: 75 },
  { label: '+100km', value: 100 },
  { label: '+150km', value: 150 },
  { label: 'Nationwide', value: 0 },
];

const SELLER_TYPES = [
  { label: 'All', value: '' },
  { label: 'Private', value: 'private' },
  { label: 'Dealer', value: 'dealer' },
  { label: 'Trader', value: 'trader' },
];

const AD_TYPES = [
  { label: 'All', value: '' },
  { label: 'For Sale', value: 'for_sale' },
  { label: 'Wanted', value: 'wanted' },
];

const CollapsibleSection = memo(({ title, children, defaultOpen = false }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <View style={styles.collapsibleSection}>
      <TouchableOpacity style={styles.collapsibleHeader} onPress={() => setOpen(!open)} activeOpacity={0.7}>
        <Text style={styles.collapsibleTitle}>{title}</Text>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={22} color="#555" />
      </TouchableOpacity>
      {open && <View style={styles.collapsibleBody}>{children}</View>}
    </View>
  );
});

const DistancePicker = memo(({ value, onSelect }) => {
  const [showPicker, setShowPicker] = useState(false);
  const label = DISTANCE_OPTIONS.find(d => d.value === value)?.label || '+25km';

  return (
    <>
      <TouchableOpacity
        style={styles.dropdownSelector}
        onPress={() => setShowPicker(true)}
        activeOpacity={0.7}
      >
        <Text style={styles.dropdownText}>{label}</Text>
        <Ionicons name="chevron-down" size={20} color="#555" />
      </TouchableOpacity>

      <Modal visible={showPicker} animationType="fade" transparent>
        <TouchableOpacity style={styles.pickerOverlay} activeOpacity={1} onPress={() => setShowPicker(false)}>
          <View style={styles.pickerContainer}>
            <View style={styles.pickerHeader}>
              <Text style={styles.pickerTitle}>Distance</Text>
              <TouchableOpacity onPress={() => setShowPicker(false)} style={styles.pickerCloseBtn}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.pickerList} showsVerticalScrollIndicator={false}>
              {DISTANCE_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  style={[styles.pickerItem, value === opt.value && styles.pickerItemActive]}
                  onPress={() => { onSelect(opt.value); setShowPicker(false); }}
                >
                  <Text style={[styles.pickerItemText, value === opt.value && styles.pickerItemTextActive]}>
                    {opt.label}
                  </Text>
                  {value === opt.value && <Ionicons name="checkmark" size={20} color={BLUE} />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
});

const LocationPickerScreen = memo(({ visible, value, onSelect, onClose, adCounts }) => {
  const [gettingLocation, setGettingLocation] = useState(false);

  const handleUseMyLocation = useCallback(async () => {
    setGettingLocation(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Location Permission', 'Please enable location permissions in your device settings to use this feature.');
        setGettingLocation(false);
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const [geocode] = await Location.reverseGeocodeAsync({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      });
      if (geocode) {
        const county = (geocode.region || geocode.subregion || geocode.city || '').replace(/^Co\.\s*/, '').replace(/\s+County$/, '');
        const matched = ALL_COUNTIES.find(c => c.toLowerCase() === county.toLowerCase());
        if (matched) {
          onSelect(matched);
          onClose();
        } else {
          onSelect(geocode.region || geocode.city || 'All Ireland');
          onClose();
        }
      }
    } catch (e) {
      Alert.alert('Location Error', 'Could not get your location. Please try again or select manually.');
    } finally {
      setGettingLocation(false);
    }
  }, [onSelect, onClose]);

  const getProvinceCount = useCallback((province) => {
    if (!adCounts) return null;
    return province.counties.reduce((sum, c) => sum + (adCounts[c] || 0), 0);
  }, [adCounts]);

  const getCountyCount = useCallback((county) => {
    if (!adCounts) return null;
    return adCounts[county] || 0;
  }, [adCounts]);

  const totalAds = adCounts ? Object.values(adCounts).reduce((s, v) => s + v, 0) : null;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.locationScreen}>
        <View style={styles.locationScreenHeader}>
          <TouchableOpacity onPress={onClose} style={styles.locationBackBtn}>
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.locationScreenTitle}>Location</Text>
          <View style={{ width: 32 }} />
        </View>

        <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
          <TouchableOpacity style={styles.useMyLocationRow} onPress={handleUseMyLocation} activeOpacity={0.7}>
            <Ionicons name="navigate" size={22} color={BLUE} style={{ marginRight: 12 }} />
            {gettingLocation ? (
              <ActivityIndicator size="small" color={BLUE} />
            ) : (
              <Text style={styles.useMyLocationText}>Use my location</Text>
            )}
          </TouchableOpacity>

          <View style={styles.locationSectionHeader}>
            <Text style={styles.locationSectionTitle}>By province</Text>
          </View>

          <TouchableOpacity
            style={[styles.locationRow, value === 'All Ireland' && styles.locationRowActive]}
            onPress={() => { onSelect('All Ireland'); onClose(); }}
          >
            <Text style={[styles.locationRowText, value === 'All Ireland' && styles.locationRowTextActive]}>
              All Ireland{totalAds !== null ? ` (${totalAds})` : ''}
            </Text>
            {value === 'All Ireland' && (
              <View style={styles.locationCheckbox}><Ionicons name="checkmark" size={16} color="#fff" /></View>
            )}
            {value !== 'All Ireland' && <View style={styles.locationCheckboxEmpty} />}
          </TouchableOpacity>

          {PROVINCES.map((province) => {
            const count = getProvinceCount(province);
            const isSelected = province.name === value;
            return (
              <TouchableOpacity
                key={province.name}
                style={[styles.locationRow, isSelected && styles.locationRowActive]}
                onPress={() => { onSelect(province.name); onClose(); }}
              >
                <Text style={[styles.locationRowText, isSelected && styles.locationRowTextActive]}>
                  {province.name}{count !== null ? ` (${count})` : ''}
                </Text>
                {isSelected ? (
                  <View style={styles.locationCheckbox}><Ionicons name="checkmark" size={16} color="#fff" /></View>
                ) : (
                  <View style={styles.locationCheckboxEmpty} />
                )}
              </TouchableOpacity>
            );
          })}

          <View style={styles.locationSectionHeader}>
            <Text style={styles.locationSectionTitle}>By county</Text>
          </View>

          {ALL_COUNTIES.map((county) => {
            const count = getCountyCount(county);
            const isSelected = county === value;
            return (
              <TouchableOpacity
                key={county}
                style={[styles.locationRow, isSelected && styles.locationRowActive]}
                onPress={() => { onSelect(county); onClose(); }}
              >
                <Text style={[styles.locationRowText, isSelected && styles.locationRowTextActive]}>
                  Co. {county}{count !== null ? ` (${count})` : ''}
                </Text>
                {isSelected ? (
                  <View style={styles.locationCheckbox}><Ionicons name="checkmark" size={16} color="#fff" /></View>
                ) : (
                  <View style={styles.locationCheckboxEmpty} />
                )}
              </TouchableOpacity>
            );
          })}

          <View style={{ height: 40 }} />
        </ScrollView>

        <View style={styles.locationFooter}>
          <TouchableOpacity style={styles.locationClearBtn} onPress={() => { onSelect('All Ireland'); onClose(); }}>
            <Text style={styles.locationClearText}>Clear</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.locationDoneBtn} onPress={onClose}>
            <Text style={styles.locationDoneText}>Done</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
});

export default function NativeSearchScreen({ categorySlug, categoryName, keyword, onAdPress, onBack }) {
  const insets = useSafeAreaInsets();
  const [ads, setAds] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [sortBy, setSortBy] = useState('id');
  const [sortOrder, setSortOrder] = useState('DESC');
  const [searchText, setSearchText] = useState(keyword || '');
  const [activeKeyword, setActiveKeyword] = useState(keyword || '');
  const [categoryId, setCategoryId] = useState(null);

  const [showFilter, setShowFilter] = useState(false);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [filterMinPrice, setFilterMinPrice] = useState('');
  const [filterMaxPrice, setFilterMaxPrice] = useState('');
  const [filterCounty, setFilterCounty] = useState('All Ireland');
  const [filterDistance, setFilterDistance] = useState(25);
  const [filterSellerType, setFilterSellerType] = useState('');
  const [filterAdType, setFilterAdType] = useState('');
  const [filterFuelTypes, setFilterFuelTypes] = useState([]);
  const [filterBodyTypes, setFilterBodyTypes] = useState([]);
  const [filterYearFrom, setFilterYearFrom] = useState('');
  const [filterYearTo, setFilterYearTo] = useState('');
  const [filterMileageFrom, setFilterMileageFrom] = useState('');
  const [filterMileageTo, setFilterMileageTo] = useState('');
  const [activeSection, setActiveSection] = useState('all');

  const [appliedMinPrice, setAppliedMinPrice] = useState('');
  const [appliedMaxPrice, setAppliedMaxPrice] = useState('');
  const [appliedCounty, setAppliedCounty] = useState('All Ireland');
  const [appliedDistance, setAppliedDistance] = useState(25);
  const [appliedSellerType, setAppliedSellerType] = useState('');
  const [appliedAdType, setAppliedAdType] = useState('');
  const [appliedFuelTypes, setAppliedFuelTypes] = useState([]);
  const [appliedBodyTypes, setAppliedBodyTypes] = useState([]);
  const [appliedYearFrom, setAppliedYearFrom] = useState('');
  const [appliedYearTo, setAppliedYearTo] = useState('');
  const [appliedMileageFrom, setAppliedMileageFrom] = useState('');
  const [appliedMileageTo, setAppliedMileageTo] = useState('');
  const [activeFilterCount, setActiveFilterCount] = useState(0);

  useEffect(() => {
    if (categorySlug) {
      fetch(`${API}/admin/category`)
        .then(r => r.json())
        .then(data => {
          if (data.status === 1 && data.data) {
            const allCats = data.data.result || [];
            const cat = allCats.find(c => c.slug === categorySlug);
            if (cat) setCategoryId(String(cat.id));
          }
        })
        .catch(() => {});
    }
  }, [categorySlug]);

  const fetchAds = useCallback(async (pageNum = 1, isRefresh = false) => {
    try {
      if (pageNum === 1 && !isRefresh) setLoading(true);
      if (pageNum > 1) setLoadingMore(true);

      const body = {
        page: pageNum,
        limit: 20,
        sort_by: sortBy,
        sort_order: sortOrder,
        status: 1,
      };
      if (categoryId) body.categories = categoryId;
      if (activeKeyword) body.keyword = activeKeyword;
      if (appliedMinPrice) body.price_from = appliedMinPrice;
      if (appliedMaxPrice) body.price_to = appliedMaxPrice;
      if (appliedCounty && appliedCounty !== 'All Ireland') body.location = appliedCounty;
      if (appliedSellerType) {
        if (appliedSellerType === 'private') body.im_trader = 0;
        else if (appliedSellerType === 'trader') body.im_trader = 1;
        else if (appliedSellerType === 'dealer') body.im_trader = 2;
      }
      if (appliedAdType) {
        if (appliedAdType === 'for_sale') body.ad_type = 1;
        else if (appliedAdType === 'wanted') body.ad_type = 2;
      }

      const dynamic = { makeModel: [], ranges: [], filter: [] };
      let hasVehicleFilter = false;
      if (appliedFuelTypes.length > 0) {
        dynamic.filter.push({ key: 'fuel_type', values: appliedFuelTypes });
        hasVehicleFilter = true;
      }
      if (appliedBodyTypes.length > 0) {
        dynamic.filter.push({ key: 'body_type', values: appliedBodyTypes });
        hasVehicleFilter = true;
      }
      if (appliedYearFrom || appliedYearTo) {
        dynamic.ranges.push({ key: 'year', from: appliedYearFrom || '', to: appliedYearTo || '' });
        hasVehicleFilter = true;
      }
      if (appliedMileageFrom || appliedMileageTo) {
        dynamic.ranges.push({ key: 'milage', from: appliedMileageFrom || '', to: appliedMileageTo || '' });
        hasVehicleFilter = true;
      }
      if (hasVehicleFilter) {
        body.is_vehicle = 1;
        body.dynamic = dynamic;
      }

      const resp = await fetch(`${API}/api/user/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await resp.json();

      if (data.status === 1 && data.data) {
        const newAds = data.data.result || [];
        setTotal(data.data.total || 0);
        if (pageNum === 1) {
          setAds(newAds);
        } else {
          setAds(prev => [...prev, ...newAds]);
        }
        setPage(pageNum);
      }
    } catch (e) {
      console.error('Search error:', e);
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
    }
  }, [categoryId, activeKeyword, sortBy, sortOrder, appliedMinPrice, appliedMaxPrice, appliedCounty, appliedSellerType, appliedAdType, appliedFuelTypes, appliedBodyTypes, appliedYearFrom, appliedYearTo, appliedMileageFrom, appliedMileageTo]);

  useEffect(() => {
    if (categoryId !== null || !categorySlug) {
      fetchAds(1);
    }
  }, [categoryId, activeKeyword, sortBy, sortOrder, appliedMinPrice, appliedMaxPrice, appliedCounty, appliedSellerType, appliedAdType, appliedFuelTypes, appliedBodyTypes, appliedYearFrom, appliedYearTo, appliedMileageFrom, appliedMileageTo]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchAds(1, true);
  }, [fetchAds]);

  const onEndReached = useCallback(() => {
    if (!loadingMore && ads.length < total) {
      fetchAds(page + 1);
    }
  }, [loadingMore, ads.length, total, page, fetchAds]);

  const handleSearch = useCallback(() => {
    if (searchText.trim() !== activeKeyword) {
      setActiveKeyword(searchText.trim());
    }
  }, [searchText, activeKeyword]);

  const handleApplyFilters = useCallback(() => {
    setAppliedMinPrice(filterMinPrice);
    setAppliedMaxPrice(filterMaxPrice);
    setAppliedCounty(filterCounty);
    setAppliedDistance(filterDistance);
    setAppliedSellerType(filterSellerType);
    setAppliedAdType(filterAdType);
    setAppliedFuelTypes([...filterFuelTypes]);
    setAppliedBodyTypes([...filterBodyTypes]);
    setAppliedYearFrom(filterYearFrom);
    setAppliedYearTo(filterYearTo);
    setAppliedMileageFrom(filterMileageFrom);
    setAppliedMileageTo(filterMileageTo);
    let count = 0;
    if (filterMinPrice) count++;
    if (filterMaxPrice) count++;
    if (filterCounty !== 'All Ireland') count++;
    if (filterSellerType) count++;
    if (filterAdType) count++;
    if (filterFuelTypes.length > 0) count++;
    if (filterBodyTypes.length > 0) count++;
    if (filterYearFrom || filterYearTo) count++;
    if (filterMileageFrom || filterMileageTo) count++;
    setActiveFilterCount(count);
    setShowFilter(false);
  }, [filterMinPrice, filterMaxPrice, filterCounty, filterDistance, filterSellerType, filterAdType, filterFuelTypes, filterBodyTypes, filterYearFrom, filterYearTo, filterMileageFrom, filterMileageTo]);

  const handleResetFilters = useCallback(() => {
    setFilterMinPrice('');
    setFilterMaxPrice('');
    setFilterCounty('All Ireland');
    setFilterDistance(25);
    setFilterSellerType('');
    setFilterAdType('');
    setFilterFuelTypes([]);
    setFilterBodyTypes([]);
    setFilterYearFrom('');
    setFilterYearTo('');
    setFilterMileageFrom('');
    setFilterMileageTo('');
    setAppliedMinPrice('');
    setAppliedMaxPrice('');
    setAppliedCounty('All Ireland');
    setAppliedDistance(25);
    setAppliedSellerType('');
    setAppliedAdType('');
    setAppliedFuelTypes([]);
    setAppliedBodyTypes([]);
    setAppliedYearFrom('');
    setAppliedYearTo('');
    setAppliedMileageFrom('');
    setAppliedMileageTo('');
    setActiveFilterCount(0);
    setShowFilter(false);
  }, []);

  const openFilter = useCallback(() => {
    setFilterMinPrice(appliedMinPrice);
    setFilterMaxPrice(appliedMaxPrice);
    setFilterCounty(appliedCounty);
    setFilterDistance(appliedDistance);
    setFilterSellerType(appliedSellerType);
    setFilterAdType(appliedAdType);
    setFilterFuelTypes([...appliedFuelTypes]);
    setFilterBodyTypes([...appliedBodyTypes]);
    setFilterYearFrom(appliedYearFrom);
    setFilterYearTo(appliedYearTo);
    setFilterMileageFrom(appliedMileageFrom);
    setFilterMileageTo(appliedMileageTo);
    setShowFilter(true);
  }, [appliedMinPrice, appliedMaxPrice, appliedCounty, appliedDistance, appliedSellerType, appliedAdType, appliedFuelTypes, appliedBodyTypes, appliedYearFrom, appliedYearTo, appliedMileageFrom, appliedMileageTo]);

  const sortLabel = useMemo(() => {
    const opt = SORT_OPTIONS.find(o => o.value === sortBy && o.order === sortOrder);
    return opt ? opt.label : 'Best Match';
  }, [sortBy, sortOrder]);

  const renderItem = useCallback(({ item }) => (
    <AdCard ad={item} onPress={onAdPress} />
  ), [onAdPress]);

  const keyExtractor = useCallback((item) => String(item.id), []);

  const sectionName = categoryName || 'All Sections';

  const renderHeader = useCallback(() => (
    <View style={styles.listHeader}>
      <View style={styles.viewToggleRow}>
        <TouchableOpacity style={styles.viewToggle} activeOpacity={0.7}>
          <Ionicons name="list" size={16} color="#333" />
          <Text style={styles.viewToggleTextActive}>List View</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.sortToggle}
          onPress={() => {
            const idx = SORT_OPTIONS.findIndex(o => o.value === sortBy && o.order === sortOrder);
            const next = SORT_OPTIONS[(idx + 1) % SORT_OPTIONS.length];
            setSortBy(next.value);
            setSortOrder(next.order);
          }}
          activeOpacity={0.7}
        >
          <Ionicons name="swap-vertical" size={16} color="#555" />
          <Text style={styles.sortToggleText}>{sortLabel}</Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.foundText}>
        Found <Text style={styles.foundBold}>{total.toLocaleString('en-IE')}</Text> Ads in{' '}
        <Text style={styles.foundBold}>{sectionName}</Text>
      </Text>
    </View>
  ), [total, sortLabel, sortBy, sortOrder, sectionName]);

  const renderEmpty = useCallback(() => (
    !loading ? (
      <View style={styles.emptyWrap}>
        <Ionicons name="search-outline" size={48} color="#ccc" />
        <Text style={styles.emptyText}>No ads found</Text>
        <Text style={styles.emptySubtext}>Try a different search or category</Text>
      </View>
    ) : null
  ), [loading]);

  const renderFooter = useCallback(() => (
    loadingMore ? (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={BLUE} />
      </View>
    ) : null
  ), [loadingMore]);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Search Results</Text>
      </View>

      {/* Search Bar */}
      <View style={styles.searchBarWrap}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color="#999" style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder={`Search ${sectionName.toLowerCase()}`}
            placeholderTextColor="#999"
            value={searchText}
            onChangeText={setSearchText}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
          />
        </View>
      </View>

      {/* Category Section Tabs */}
      {!categorySlug && (
        <View style={styles.sectionTabsWrap}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.sectionTabsScroll}>
            {SECTION_TABS.map(tab => {
              const isActive = activeSection === tab.key;
              return (
                <TouchableOpacity
                  key={tab.key}
                  style={[styles.sectionTab, isActive && styles.sectionTabActive]}
                  onPress={() => setActiveSection(tab.key)}
                  activeOpacity={0.7}
                >
                  <Ionicons name={tab.icon} size={16} color={isActive ? '#fff' : '#555'} />
                  <Text style={[styles.sectionTabText, isActive && styles.sectionTabTextActive]}>{tab.label}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* Results List */}
      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={BLUE} />
        </View>
      ) : (
        <FlatList
          data={ads}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          ListHeaderComponent={renderHeader}
          ListEmptyComponent={renderEmpty}
          ListFooterComponent={renderFooter}
          onEndReached={onEndReached}
          onEndReachedThreshold={0.5}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={BLUE} />}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          maxToRenderPerBatch={8}
          windowSize={7}
          initialNumToRender={6}
          updateCellsBatchingPeriod={50}
        />
      )}

      {/* Floating FILTER FAB */}
      <TouchableOpacity style={[styles.filterFab, { bottom: Math.max(insets.bottom, 16) + 10 }]} onPress={openFilter} activeOpacity={0.9}>
        <Ionicons name="options-outline" size={20} color="#fff" />
        <Text style={styles.filterFabText}>FILTER</Text>
        {activeFilterCount > 0 && (
          <View style={styles.filterFabBadge}>
            <Text style={styles.filterFabBadgeText}>{activeFilterCount}</Text>
          </View>
        )}
      </TouchableOpacity>

      {/* Full-Screen Filter Modal */}
      <Modal visible={showFilter} animationType="slide" onRequestClose={() => setShowFilter(false)}>
        <View style={styles.filterScreen}>
          <View style={styles.filterHeader}>
            <TouchableOpacity onPress={() => setShowFilter(false)} style={styles.filterCloseBtn}>
              <Ionicons name="close" size={26} color="#333" />
            </TouchableOpacity>
            <Text style={styles.filterHeaderTitle}>Filters</Text>
            <View style={{ width: 30 }} />
          </View>

          <ScrollView style={styles.filterBody} showsVerticalScrollIndicator={false}>
            {/* Location - DoneDeal style with My Location + Distance */}
            <CollapsibleSection title="Location" defaultOpen={true}>
              <TouchableOpacity
                style={styles.dropdownSelector}
                onPress={() => setShowLocationPicker(true)}
                activeOpacity={0.7}
              >
                <Text style={styles.dropdownText}>
                  {filterCounty === 'All Ireland' ? 'My Location' :
                    PROVINCES.find(p => p.name === filterCounty) ? filterCounty :
                    `Co. ${filterCounty}`}
                </Text>
                <Ionicons name="chevron-down" size={20} color="#555" />
              </TouchableOpacity>
              <View style={{ height: 12 }} />
              <DistancePicker value={filterDistance} onSelect={setFilterDistance} />
            </CollapsibleSection>

            {/* Price */}
            <CollapsibleSection title="Price" defaultOpen={false}>
              <View style={styles.priceRow}>
                <View style={styles.priceInputWrap}>
                  <Text style={styles.priceLabel}>Min</Text>
                  <TextInput
                    style={styles.priceInput}
                    placeholder="€0"
                    placeholderTextColor="#999"
                    keyboardType="numeric"
                    value={filterMinPrice}
                    onChangeText={setFilterMinPrice}
                  />
                </View>
                <Text style={styles.priceDash}>{'—'}</Text>
                <View style={styles.priceInputWrap}>
                  <Text style={styles.priceLabel}>Max</Text>
                  <TextInput
                    style={styles.priceInput}
                    placeholder="Any"
                    placeholderTextColor="#999"
                    keyboardType="numeric"
                    value={filterMaxPrice}
                    onChangeText={setFilterMaxPrice}
                  />
                </View>
              </View>
            </CollapsibleSection>

            {/* Seller type */}
            <CollapsibleSection title="Seller type" defaultOpen={false}>
              <View style={styles.optionList}>
                {SELLER_TYPES.map((opt) => (
                  <TouchableOpacity
                    key={opt.value}
                    style={[styles.optionRow, filterSellerType === opt.value && styles.optionRowActive]}
                    onPress={() => setFilterSellerType(opt.value)}
                  >
                    <Text style={[styles.optionText, filterSellerType === opt.value && styles.optionTextActive]}>
                      {opt.label}
                    </Text>
                    {filterSellerType === opt.value && (
                      <Ionicons name="checkmark-circle" size={20} color={BLUE} />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </CollapsibleSection>

            {/* Fuel Type */}
            <CollapsibleSection title="Fuel Type" defaultOpen={false}>
              <View style={styles.optionList}>
                {FUEL_TYPES.map((fuel) => {
                  const selected = filterFuelTypes.includes(fuel);
                  return (
                    <TouchableOpacity
                      key={fuel}
                      style={[styles.optionRow, selected && styles.optionRowActive]}
                      onPress={() => {
                        setFilterFuelTypes(prev =>
                          selected ? prev.filter(f => f !== fuel) : [...prev, fuel]
                        );
                      }}
                    >
                      <Text style={[styles.optionText, selected && styles.optionTextActive]}>{fuel}</Text>
                      {selected && <Ionicons name="checkmark-circle" size={20} color={BLUE} />}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </CollapsibleSection>

            {/* Body Type */}
            <CollapsibleSection title="Body Type" defaultOpen={false}>
              <View style={styles.bodyTypeGrid}>
                {BODY_TYPES.map((bt) => {
                  const selected = filterBodyTypes.includes(bt);
                  return (
                    <TouchableOpacity
                      key={bt}
                      style={[styles.bodyTypeChip, selected && styles.bodyTypeChipActive]}
                      onPress={() => {
                        setFilterBodyTypes(prev =>
                          selected ? prev.filter(b => b !== bt) : [...prev, bt]
                        );
                      }}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.bodyTypeChipText, selected && styles.bodyTypeChipTextActive]}>{bt}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </CollapsibleSection>

            {/* Year */}
            <CollapsibleSection title="Year" defaultOpen={false}>
              <View style={styles.priceRow}>
                <View style={styles.priceInputWrap}>
                  <Text style={styles.priceLabel}>From</Text>
                  <TouchableOpacity
                    style={styles.dropdownSelector}
                    onPress={() => {
                      const opts = YEAR_OPTIONS.slice().reverse();
                      Alert.alert('Year From', 'Select minimum year', [
                        { text: 'Any', onPress: () => setFilterYearFrom('') },
                        ...opts.filter((_, i) => i % 5 === 0 || opts.indexOf(filterYearFrom) === i).slice(-15).map(y => ({
                          text: y, onPress: () => setFilterYearFrom(y)
                        })),
                      ]);
                    }}
                  >
                    <Text style={styles.dropdownText}>{filterYearFrom || 'Any'}</Text>
                    <Ionicons name="chevron-down" size={18} color="#555" />
                  </TouchableOpacity>
                </View>
                <Text style={styles.priceDash}>{'—'}</Text>
                <View style={styles.priceInputWrap}>
                  <Text style={styles.priceLabel}>To</Text>
                  <TouchableOpacity
                    style={styles.dropdownSelector}
                    onPress={() => {
                      Alert.alert('Year To', 'Select maximum year', [
                        { text: 'Any', onPress: () => setFilterYearTo('') },
                        ...YEAR_OPTIONS.slice(0, 15).map(y => ({
                          text: y, onPress: () => setFilterYearTo(y)
                        })),
                      ]);
                    }}
                  >
                    <Text style={styles.dropdownText}>{filterYearTo || 'Any'}</Text>
                    <Ionicons name="chevron-down" size={18} color="#555" />
                  </TouchableOpacity>
                </View>
              </View>
            </CollapsibleSection>

            {/* Mileage */}
            <CollapsibleSection title="Mileage" defaultOpen={false}>
              <View style={styles.priceRow}>
                <View style={styles.priceInputWrap}>
                  <Text style={styles.priceLabel}>Min</Text>
                  <TextInput
                    style={styles.priceInput}
                    placeholder="0 km"
                    placeholderTextColor="#999"
                    keyboardType="numeric"
                    value={filterMileageFrom}
                    onChangeText={setFilterMileageFrom}
                  />
                </View>
                <Text style={styles.priceDash}>{'—'}</Text>
                <View style={styles.priceInputWrap}>
                  <Text style={styles.priceLabel}>Max</Text>
                  <TextInput
                    style={styles.priceInput}
                    placeholder="Any"
                    placeholderTextColor="#999"
                    keyboardType="numeric"
                    value={filterMileageTo}
                    onChangeText={setFilterMileageTo}
                  />
                </View>
              </View>
            </CollapsibleSection>

            {/* Ad type */}
            <CollapsibleSection title="Ad type" defaultOpen={false}>
              <View style={styles.optionList}>
                {AD_TYPES.map((opt) => (
                  <TouchableOpacity
                    key={opt.value}
                    style={[styles.optionRow, filterAdType === opt.value && styles.optionRowActive]}
                    onPress={() => setFilterAdType(opt.value)}
                  >
                    <Text style={[styles.optionText, filterAdType === opt.value && styles.optionTextActive]}>
                      {opt.label}
                    </Text>
                    {filterAdType === opt.value && (
                      <Ionicons name="checkmark-circle" size={20} color={BLUE} />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </CollapsibleSection>

            <View style={{ height: 40 }} />
          </ScrollView>

          <View style={styles.filterFooter}>
            <TouchableOpacity style={styles.resetBtn} onPress={handleResetFilters} activeOpacity={0.8}>
              <Text style={styles.resetBtnText}>Reset</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.showResultsBtn} onPress={handleApplyFilters} activeOpacity={0.8}>
              <Text style={styles.showResultsText}>Show {total.toLocaleString('en-IE')} results</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Location Picker Screen */}
      <LocationPickerScreen
        visible={showLocationPicker}
        value={filterCounty}
        onSelect={setFilterCounty}
        onClose={() => setShowLocationPicker(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#ddd',
  },
  backBtn: { padding: 4, marginRight: 12 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#1a1a1a' },

  // Search Bar
  searchBarWrap: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#ddd',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 44,
    backgroundColor: '#fafafa',
  },
  searchInput: { flex: 1, fontSize: 15, color: '#333' },

  // List header
  listHeader: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 8 },
  viewToggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  viewToggle: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  viewToggleTextActive: { fontSize: 13, color: '#333', fontWeight: '600' },
  sortToggle: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sortToggleText: { fontSize: 13, color: '#555', fontWeight: '500' },
  foundText: { fontSize: 14, color: '#666', marginTop: 2 },
  foundBold: { fontWeight: '700', color: '#1a1a1a' },

  // Loading / empty
  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: { paddingBottom: 100 },
  emptyWrap: { alignItems: 'center', paddingTop: 80 },
  emptyText: { fontSize: 18, fontWeight: '600', color: '#999', marginTop: 12 },
  emptySubtext: { fontSize: 14, color: '#bbb', marginTop: 4 },
  footerLoader: { paddingVertical: 20 },

  // Section Tabs
  sectionTabsWrap: {
    backgroundColor: '#fff',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#ddd',
  },
  sectionTabsScroll: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  sectionTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    gap: 6,
  },
  sectionTabActive: {
    backgroundColor: BLUE,
  },
  sectionTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#555',
  },
  sectionTabTextActive: {
    color: '#fff',
  },

  // Dealer card styles
  dealerCard: {
    borderLeftWidth: 3,
    borderLeftColor: '#0d47a1',
  },
  dealerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#f8fbff',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e3edf7',
    gap: 8,
  },
  dealerLogo: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: '#eee',
  },
  dealerLogoPlaceholder: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: '#0d47a1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dealerName: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: '#0d47a1',
  },
  dealerBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#4caf50',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Body type grid
  bodyTypeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  bodyTypeChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#ddd',
    backgroundColor: '#fff',
  },
  bodyTypeChipActive: {
    borderColor: BLUE,
    backgroundColor: '#f0f7ff',
  },
  bodyTypeChipText: {
    fontSize: 14,
    color: '#555',
    fontWeight: '500',
  },
  bodyTypeChipTextActive: {
    color: BLUE,
    fontWeight: '600',
  },

  // DoneDeal-style Card (single large image)
  card: {
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
  underOfferBanner: {
    position: 'absolute',
    top: 10,
    left: 0,
    backgroundColor: '#e74c3c',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderTopRightRadius: 4,
    borderBottomRightRadius: 4,
    zIndex: 2,
  },
  underOfferText: { color: '#fff', fontSize: 10, fontWeight: '700', letterSpacing: 0.3 },
  mainImageWrap: {
    width: '100%',
    height: IMAGE_HEIGHT,
    backgroundColor: '#f0f0f0',
    position: 'relative',
  },
  mainImage: {
    width: '100%',
    height: '100%',
  },
  noImageWrap: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  noImageText: { color: '#bbb', fontSize: 12, marginTop: 4 },
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
  cardBody: {
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 14,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1a1a',
    lineHeight: 21,
  },
  specLine: {
    fontSize: 13,
    color: '#777',
    marginTop: 4,
    lineHeight: 18,
  },
  cardLocation: {
    fontSize: 13,
    color: '#999',
    marginTop: 2,
  },
  cardPrice: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1a1a1a',
    marginTop: 8,
  },

  // Floating FILTER FAB
  filterFab: {
    position: 'absolute',
    left: 20,
    right: 20,
    backgroundColor: BLUE,
    borderRadius: 12,
    height: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  filterFabText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 8,
    letterSpacing: 1,
  },
  filterFabBadge: {
    backgroundColor: '#fff',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
    paddingHorizontal: 6,
  },
  filterFabBadgeText: { color: BLUE, fontSize: 12, fontWeight: '700' },

  // Full-screen Filter
  filterScreen: { flex: 1, backgroundColor: '#fff' },
  filterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#ddd',
  },
  filterCloseBtn: { padding: 4 },
  filterHeaderTitle: { fontSize: 18, fontWeight: '700', color: '#1a1a1a' },
  filterResetLink: { fontSize: 14, fontWeight: '600', color: BLUE },
  filterBody: { flex: 1 },

  // Collapsible sections
  collapsibleSection: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#eee',
  },
  collapsibleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  collapsibleTitle: { fontSize: 18, fontWeight: '600', color: '#1a1a1a' },
  collapsibleBody: { paddingHorizontal: 20, paddingBottom: 20 },

  // Dropdown selector (DoneDeal style for Location)
  dropdownSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#fff',
  },
  dropdownText: { fontSize: 16, color: '#333' },

  // Location picker modal
  pickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  pickerContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#eee',
  },
  pickerTitle: { fontSize: 18, fontWeight: '700', color: '#1a1a1a' },
  pickerCloseBtn: { padding: 4 },
  pickerList: { paddingHorizontal: 8 },
  pickerItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  pickerItemActive: { backgroundColor: '#f0f7ff' },
  pickerItemText: { fontSize: 16, color: '#333' },
  pickerItemTextActive: { color: BLUE, fontWeight: '600' },

  // Price inputs
  priceRow: { flexDirection: 'row', alignItems: 'center' },
  priceInputWrap: { flex: 1 },
  priceLabel: { fontSize: 12, color: '#888', marginBottom: 4 },
  priceInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
    backgroundColor: '#fafafa',
  },
  priceDash: { fontSize: 18, color: '#999', marginHorizontal: 12 },

  // Option list (seller type, ad type)
  optionList: { gap: 2 },
  optionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 13,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  optionRowActive: { backgroundColor: '#f0f7ff' },
  optionText: { fontSize: 16, color: '#333' },
  optionTextActive: { color: BLUE, fontWeight: '600' },

  // Show Results footer
  filterFooter: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 34,
    gap: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#ddd',
  },
  resetBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: '#ddd',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resetBtnText: { fontSize: 16, fontWeight: '600', color: '#333' },
  showResultsBtn: {
    flex: 2,
    backgroundColor: BLUE,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  showResultsText: { fontSize: 17, fontWeight: '700', color: '#fff' },

  // Location Picker Screen (DoneDeal style)
  locationScreen: { flex: 1, backgroundColor: '#fff' },
  locationScreenHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#ddd',
  },
  locationBackBtn: { padding: 4 },
  locationScreenTitle: { fontSize: 18, fontWeight: '700', color: '#1a1a1a' },
  useMyLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#eee',
  },
  useMyLocationText: { fontSize: 16, fontWeight: '500', color: '#1a1a1a' },
  locationSectionHeader: {
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  locationSectionTitle: { fontSize: 15, fontWeight: '700', color: '#1a1a1a' },
  locationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#f0f0f0',
  },
  locationRowActive: { backgroundColor: '#f8fbff' },
  locationRowText: { fontSize: 16, color: '#333', flex: 1 },
  locationRowTextActive: { color: BLUE, fontWeight: '600' },
  locationCheckbox: {
    width: 26,
    height: 26,
    borderRadius: 4,
    backgroundColor: BLUE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationCheckboxEmpty: {
    width: 26,
    height: 26,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: '#ddd',
    backgroundColor: '#fff',
  },
  locationFooter: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 34,
    gap: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#ddd',
  },
  locationClearBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: '#ddd',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationClearText: { fontSize: 16, fontWeight: '600', color: '#333' },
  locationDoneBtn: {
    flex: 1,
    backgroundColor: BLUE,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationDoneText: { fontSize: 16, fontWeight: '700', color: '#fff' },
});
