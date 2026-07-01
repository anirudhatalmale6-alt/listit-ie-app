import React, { useRef, useState, useCallback } from 'react';
import { StatusBar, Platform, View, Text, TouchableOpacity, ActivityIndicator, StyleSheet, ScrollView, Image, Linking, Dimensions } from 'react-native';
import { NavigationContainer, useNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { WebView } from 'react-native-webview';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import SwipeScreen from './screens/SwipeScreen';
import SavedScreen from './screens/SavedScreen';
import NativeHomeScreen from './screens/NativeHomeScreen';
import NativeSearchScreen from './screens/NativeSearchScreen';
import NativeAdDetailScreen from './screens/NativeAdDetailScreen';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, info) {
    console.error('App crash caught:', error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, backgroundColor: '#fff' }}>
          <Text style={{ fontSize: 20, fontWeight: '700', color: '#333', marginBottom: 12 }}>Something went wrong</Text>
          <ScrollView style={{ maxHeight: 300, width: '100%' }}>
            <Text style={{ fontSize: 12, color: '#666', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' }}>
              {String(this.state.error)}
            </Text>
          </ScrollView>
          <TouchableOpacity
            style={{ marginTop: 20, backgroundColor: '#1b87f4', paddingHorizontal: 32, paddingVertical: 14, borderRadius: 25 }}
            onPress={() => this.setState({ hasError: false, error: null })}
          >
            <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>Try Again</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

const BASE_URL = 'https://listit.ie';
const LISTIT_BLUE = '#1b87f4';
const NAV_BG = '#2c2c2e';

const TAB_ICONS = {
  Browse: ['search', 'search-outline'],
  Discover: ['compass', 'compass-outline'],
  'Place Ad': ['pricetag', 'pricetag-outline'],
  Messages: ['chatbubbles', 'chatbubbles-outline'],
  'My Profile': ['person', 'person-outline'],
};

const WEBVIEW_TABS = new Set(['Place Ad', 'Messages', 'My Profile']);

const INJECTED_CSS_EARLY = `
  (function() {
    var s = document.createElement('style');
    s.id = 'listit-app-early';
    s.textContent = [
      'nav.navbar,.navbar,header,.site-header,.top-header,.navbar-wrapper,.header-wrapper,[class*="navbar"],.navigation-bar,.nav-container{display:none!important;height:0!important;overflow:hidden!important}',
      'footer,.footer,.site-footer,.footer-wrapper,.footer-section,[class*="footer-"]{display:none!important;height:0!important;overflow:hidden!important}',
      'body{padding-bottom:80px!important;padding-top:0!important;margin-top:0!important}',
      '#root>div>div,#root>div>div>div{padding-top:0!important;margin-top:0!important}',
      'img{content-visibility:visible!important;opacity:1!important}',
      '.saveSearchComponent{display:none!important}',
      '.floatingbox{bottom:75px!important}',
    ].join('');
    (document.head || document.documentElement).appendChild(s);
    true;
  })();
`;

const INJECTED_JS = `
  (function() {
    var style = document.createElement('style');
    style.textContent = [
      'body{overflow-x:hidden!important;padding-bottom:80px!important;padding-top:0!important;margin-top:0!important}',
      '*{-webkit-tap-highlight-color:transparent}',
      'nav.navbar,.navbar,header,.site-header,.top-header,.navbar-wrapper,.header-wrapper,[class*="navbar"],.navigation-bar,.nav-container{display:none!important;height:0!important;overflow:hidden!important}',
      'footer,.footer,.site-footer,.footer-wrapper,.footer-section,[class*="footer-"]{display:none!important;height:0!important;overflow:hidden!important}',
      '#root>div>div:first-child{padding-top:0!important;margin-top:0!important}',
      '.floatingbox{bottom:75px!important}',
      '.saveSearchComponent{display:none!important}',
    ].join('');
    document.head.appendChild(style);

    function removeTopPadding() {
      var root = document.getElementById('root');
      if (!root) return;
      var walk = function(el, depth) {
        if (depth > 5) return;
        var children = el.children;
        for (var i = 0; i < children.length; i++) {
          var c = children[i];
          var cs = window.getComputedStyle(c);
          var pt = parseInt(cs.paddingTop);
          var mt = parseInt(cs.marginTop);
          if (pt >= 40) c.style.setProperty('padding-top', '0px', 'important');
          if (mt >= 40) c.style.setProperty('margin-top', '0px', 'important');
          walk(c, depth + 1);
        }
      };
      walk(root, 0);
    }
    setTimeout(removeTopPadding, 300);
    setTimeout(removeTopPadding, 1000);
    setTimeout(removeTopPadding, 3000);

    var cookieCheck = setInterval(function() {
      var btns = document.querySelectorAll('button');
      for (var i = 0; i < btns.length; i++) {
        var txt = btns[i].textContent.toLowerCase().trim();
        if (txt === 'accept' || txt === 'accept all' || txt === 'i agree') {
          btns[i].click(); clearInterval(cookieCheck); break;
        }
      }
    }, 500);
    setTimeout(function() { clearInterval(cookieCheck); }, 5000);
    true;
  })();
`;

const BrowseStack = createNativeStackNavigator();

function HomeScreen({ navigation, onLoginPress }) {
  const handleCategoryPress = useCallback((path) => {
    const slug = path.replace(/^\//, '');
    navigation.push('Search', {
      categorySlug: slug,
      categoryName: slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
    });
  }, [navigation]);

  const handleAdPress = useCallback((ad) => {
    if (ad && ad.id) navigation.push('Detail', { adId: ad.id });
  }, [navigation]);

  const handleSearchPress = useCallback((path) => {
    const match = path.match(/keyword=([^&]+)/);
    const keyword = match ? decodeURIComponent(match[1]) : '';
    if (path === '/all') {
      navigation.push('Search', { categorySlug: null, categoryName: 'All Ads' });
    } else {
      navigation.push('Search', { categorySlug: null, categoryName: keyword || 'Search', keyword });
    }
  }, [navigation]);

  return (
    <NativeHomeScreen
      onCategoryPress={handleCategoryPress}
      onAdPress={handleAdPress}
      onSearchPress={handleSearchPress}
      onLoginPress={onLoginPress}
    />
  );
}

function SearchScreen({ route, navigation }) {
  const handleAdPress = useCallback((ad) => {
    if (ad && ad.id) navigation.push('Detail', { adId: ad.id });
  }, [navigation]);

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  return (
    <NativeSearchScreen
      categorySlug={route.params?.categorySlug}
      categoryName={route.params?.categoryName}
      keyword={route.params?.keyword}
      onAdPress={handleAdPress}
      onBack={handleBack}
    />
  );
}

function DetailScreen({ route, navigation }) {
  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleRelatedAdPress = useCallback((ad) => {
    if (ad && ad.id) navigation.push('Detail', { adId: ad.id });
  }, [navigation]);

  return (
    <NativeAdDetailScreen
      adId={route.params?.adId}
      onBack={handleBack}
      onRelatedAdPress={handleRelatedAdPress}
    />
  );
}

function BrowseNavigator({ onLoginPress, onScreenChange }) {
  return (
    <BrowseStack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        gestureEnabled: true,
        gestureDirection: 'horizontal',
        animationDuration: 300,
        contentStyle: { backgroundColor: '#f5f5f5' },
      }}
      screenListeners={{
        state: (e) => {
          const routes = e.data?.state?.routes;
          if (routes && routes.length > 0) {
            onScreenChange?.(routes[routes.length - 1].name);
          }
        },
      }}
    >
      <BrowseStack.Screen name="Home">
        {(props) => <HomeScreen {...props} onLoginPress={onLoginPress} />}
      </BrowseStack.Screen>
      <BrowseStack.Screen name="Search" component={SearchScreen} />
      <BrowseStack.Screen name="Detail" component={DetailScreen} />
    </BrowseStack.Navigator>
  );
}

function CustomTabBar({ activeTab, onTabPress, savedCount }) {
  const insets = useSafeAreaInsets();
  const tabs = ['Browse', 'Discover', 'Place Ad', 'Messages', 'My Profile'];
  const bottomPad = Math.max(insets.bottom, 16);

  return (
    <View style={{
      flexDirection: 'row',
      backgroundColor: NAV_BG,
      paddingTop: 10,
      paddingBottom: bottomPad,
      zIndex: 100,
      elevation: 100,
    }}>
      {tabs.map((tab) => {
        const isFocused = activeTab === tab;
        const color = isFocused ? '#fff' : '#888';
        const [iconFocused, iconDefault] = TAB_ICONS[tab];
        const iconName = isFocused ? iconFocused : iconDefault;
        return (
          <TouchableOpacity
            key={tab}
            onPress={() => onTabPress(tab)}
            style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
            activeOpacity={0.7}
          >
            <Ionicons name={iconName} size={22} color={color} />
            <Text style={{ color, fontSize: 10, fontWeight: '500', marginTop: 3 }}>{tab}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function AppHeader({ onLoginPress }) {
  return (
    <View style={styles.appHeader}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Image source={require('./assets/splash-icon.png')} style={{ width: 30, height: 30 }} resizeMode="contain" />
        <Text style={{ fontSize: 20, fontWeight: '800', color: LISTIT_BLUE, marginLeft: 6 }}>Listit</Text>
      </View>
      <TouchableOpacity onPress={onLoginPress} activeOpacity={0.7}>
        <Text style={{ fontSize: 16, fontWeight: '600', color: '#333' }}>Log In</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function App() {
  const navigationRef = useNavigationContainerRef();
  const webViewRef = useRef(null);
  const [activeTab, setActiveTab] = useState('Browse');
  const [browseRoute, setBrowseRoute] = useState('Home');
  const [savedCount, setSavedCount] = useState(0);
  const [webViewLoading, setWebViewLoading] = useState(true);

  const handleOpenAd = useCallback((adId) => {
    setActiveTab('Browse');
    setTimeout(() => {
      navigationRef.current?.navigate('Detail', { adId });
    }, 50);
  }, [navigationRef]);

  const handleTabPress = useCallback((tab) => {
    if (tab === 'Browse' && activeTab === 'Browse') {
      navigationRef.current?.reset({ index: 0, routes: [{ name: 'Home' }] });
      setBrowseRoute('Home');
      return;
    }
    setActiveTab(tab);
    if (WEBVIEW_TABS.has(tab) && webViewRef.current) {
      const urls = {
        'Place Ad': `${BASE_URL}/user/ads/create`,
        'Messages': `${BASE_URL}/user/messages`,
        'My Profile': `${BASE_URL}/user/profile`,
      };
      if (urls[tab]) {
        webViewRef.current.injectJavaScript(`window.location.href = '${urls[tab]}'; true;`);
      }
    }
  }, [activeTab, navigationRef]);

  const handleLoginPress = useCallback(() => {
    setActiveTab('My Profile');
    if (webViewRef.current) {
      webViewRef.current.injectJavaScript(`window.location.href = '${BASE_URL}/login'; true;`);
    }
  }, []);

  const isWebViewTab = WEBVIEW_TABS.has(activeTab);
  const showBrowse = activeTab === 'Browse';

  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <NavigationContainer ref={navigationRef}>
          <StatusBar barStyle="dark-content" backgroundColor="#fff" />
          <View style={{ flex: 1, backgroundColor: '#fff' }}>
            <SafeAreaContent
              activeTab={activeTab}
              showBrowse={showBrowse}
              isWebViewTab={isWebViewTab}
              webViewRef={webViewRef}
              webViewLoading={webViewLoading}
              setWebViewLoading={setWebViewLoading}
              handleLoginPress={handleLoginPress}
              handleOpenAd={handleOpenAd}
              setSavedCount={setSavedCount}
              onBrowseScreenChange={setBrowseRoute}
            />
            {!(showBrowse && browseRoute !== 'Home') && (
              <CustomTabBar
                activeTab={activeTab}
                onTabPress={handleTabPress}
                savedCount={savedCount}
              />
            )}
          </View>
        </NavigationContainer>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}

function SafeAreaContent({
  activeTab, showBrowse, isWebViewTab,
  webViewRef, webViewLoading, setWebViewLoading,
  handleLoginPress, handleOpenAd, setSavedCount,
  onBrowseScreenChange,
}) {
  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1, paddingTop: insets.top }}>
      {/* Browse - native stack navigator (OS-level transitions) */}
      <View style={[StyleSheet.absoluteFill, { top: insets.top, zIndex: showBrowse ? 2 : 0, opacity: showBrowse ? 1 : 0 }]} pointerEvents={showBrowse ? 'auto' : 'none'}>
        <BrowseNavigator onLoginPress={handleLoginPress} onScreenChange={onBrowseScreenChange} />
      </View>

      {/* WebView for Place Ad, Messages, Profile */}
      <View style={{ flex: isWebViewTab ? 1 : 0, height: isWebViewTab ? undefined : 0, overflow: 'hidden' }}>
        <AppHeader onLoginPress={handleLoginPress} />
        {webViewLoading && isWebViewTab && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color={LISTIT_BLUE} />
          </View>
        )}
        <WebView
          ref={webViewRef}
          source={{ uri: `${BASE_URL}/user/ads/create` }}
          style={{ flex: 1, opacity: (webViewLoading && isWebViewTab) ? 0 : 1 }}
          injectedJavaScriptBeforeContentLoaded={INJECTED_CSS_EARLY}
          injectedJavaScript={INJECTED_JS}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          startInLoadingState={false}
          allowsInlineMediaPlayback={true}
          mediaPlaybackRequiresUserAction={false}
          sharedCookiesEnabled={true}
          cacheEnabled={true}
          cacheMode="LOAD_DEFAULT"
          mixedContentMode="compatibility"
          textZoom={100}
          overScrollMode="never"
          androidLayerType="hardware"
          thirdPartyCookiesEnabled={true}
          javaScriptCanOpenWindowsAutomatically={true}
          setSupportMultipleWindows={true}
          onOpenWindow={(syntheticEvent) => {
            const { nativeEvent } = syntheticEvent;
            const targetUrl = nativeEvent?.targetUrl;
            if (targetUrl) {
              if (targetUrl.includes('accounts.google.com') || targetUrl.includes('facebook.com/login') || targetUrl.includes('appleid.apple.com')) {
                Linking.openURL(targetUrl);
              } else {
                webViewRef.current?.injectJavaScript(`window.location.href = '${targetUrl.replace(/'/g, "\\'")}'; true;`);
              }
            }
          }}
          onShouldStartLoadWithRequest={(request) => {
            const url = request.url || '';
            if (url.startsWith('mailto:') || url.startsWith('tel:') || url.startsWith('intent:')) {
              Linking.openURL(url);
              return false;
            }
            return true;
          }}
          onLoadStart={() => {
            setWebViewLoading(true);
            setTimeout(() => setWebViewLoading(false), 2000);
          }}
          onLoadEnd={() => setWebViewLoading(false)}
          onError={() => setWebViewLoading(false)}
          onHttpError={() => setWebViewLoading(false)}
          userAgent="Mozilla/5.0 (Linux; Android 15; OnePlus) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36"
        />
      </View>

      {/* Discover - swipe screen */}
      <View style={[StyleSheet.absoluteFill, { top: insets.top, zIndex: activeTab === 'Discover' ? 2 : 0, opacity: activeTab === 'Discover' ? 1 : 0 }]} pointerEvents={activeTab === 'Discover' ? 'auto' : 'none'}>
        <SwipeScreen onOpenAd={handleOpenAd} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  appHeader: {
    height: 50,
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e8e8e8',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    zIndex: 10,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -10,
    backgroundColor: '#ff4458',
    borderRadius: 9,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
});
