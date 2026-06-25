import React, { useRef, useState, useEffect, useCallback } from 'react';
import { StatusBar, BackHandler, Platform, View, Text, TouchableOpacity, ActivityIndicator, StyleSheet, ScrollView, Animated, Image } from 'react-native';
import { WebView } from 'react-native-webview';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import SwipeScreen from './screens/SwipeScreen';
import SavedScreen from './screens/SavedScreen';

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
const TAB_BAR_HEIGHT = 60;

const TAB_URLS = {
  Browse: BASE_URL,
  'Place Ad': `${BASE_URL}/user/ads/create`,
  Messages: `${BASE_URL}/user/messages`,
  'My Profile': `${BASE_URL}/user/profile`,
};

const TAB_ICONS = {
  Browse: ['search', 'search-outline'],
  Discover: ['flame', 'flame-outline'],
  Saved: ['heart', 'heart-outline'],
  'Place Ad': ['pricetag', 'pricetag-outline'],
  'My Profile': ['person', 'person-outline'],
};

const WEB_TABS = new Set(['Browse', 'Place Ad', 'Messages', 'My Profile']);

const INJECTED_JS = `
  (function() {
    var style = document.createElement('style');
    style.textContent = \`
      body {
        overflow-x: hidden !important;
        padding-bottom: 70px !important;
      }
      * { -webkit-tap-highlight-color: transparent; }

      /* Force all images visible - WebView onLoad events can fail */
      img, .card-img-top {
        opacity: 1 !important;
      }

      /* Compact website navbar in app */
      nav.navbar, .navbar {
        padding: 5px 0 !important;
        position: relative !important;
      }


      /* Smooth page transitions */
      #root {
        transition: transform 0.25s cubic-bezier(0.25, 0.1, 0.25, 1), opacity 0.25s ease;
        will-change: transform, opacity;
      }
      #root.slide-out-left {
        transform: translateX(-30%);
        opacity: 0.3;
      }
      #root.slide-in-right {
        transform: translateX(100%);
        opacity: 0;
      }
      #root.slide-out-right {
        transform: translateX(30%);
        opacity: 0.3;
      }
      #root.slide-in-left {
        transform: translateX(-100%);
        opacity: 0;
      }
    \`;
    document.head.appendChild(style);

    // Smooth page transition helper
    var isNavigating = false;
    function slideTransition(direction) {
      if (isNavigating) return;
      isNavigating = true;
      var root = document.getElementById('root');
      if (!root) { isNavigating = false; return; }

      // Slide out current page
      root.classList.add(direction === 'forward' ? 'slide-out-left' : 'slide-out-right');

      setTimeout(function() {
        // Instantly position new page off-screen on the other side
        root.style.transition = 'none';
        root.classList.remove('slide-out-left', 'slide-out-right');
        root.classList.add(direction === 'forward' ? 'slide-in-right' : 'slide-in-left');

        // Force reflow
        root.offsetHeight;

        // Slide new page in
        root.style.transition = '';
        root.classList.remove('slide-in-right', 'slide-in-left');

        setTimeout(function() { isNavigating = false; }, 300);
      }, 200);
    }

    // Force images visible after page load
    function forceImagesVisible() {
      var imgs = document.querySelectorAll('img');
      for (var i = 0; i < imgs.length; i++) {
        imgs[i].style.setProperty('opacity', '1', 'important');
      }
    }
    setTimeout(forceImagesVisible, 1000);
    setTimeout(forceImagesVisible, 3000);
    setTimeout(forceImagesVisible, 6000);

    // Scroll detection for tab bar hide/show
    var lastScrollY = 0;
    var scrollDelta = 0;
    var tabBarHidden = false;
    var scrollThreshold = 50;

    window.addEventListener('scroll', function() {
      var currentY = window.scrollY || document.documentElement.scrollTop;
      var diff = currentY - lastScrollY;
      lastScrollY = currentY;

      if (currentY <= 10) {
        if (tabBarHidden) {
          tabBarHidden = false;
          window.ReactNativeWebView.postMessage(JSON.stringify({type: 'scroll', direction: 'up'}));
        }
        scrollDelta = 0;
        return;
      }

      scrollDelta += diff;

      if (scrollDelta > scrollThreshold && !tabBarHidden) {
        tabBarHidden = true;
        window.ReactNativeWebView.postMessage(JSON.stringify({type: 'scroll', direction: 'down'}));
        scrollDelta = 0;
      } else if (scrollDelta < -scrollThreshold && tabBarHidden) {
        tabBarHidden = false;
        window.ReactNativeWebView.postMessage(JSON.stringify({type: 'scroll', direction: 'up'}));
        scrollDelta = 0;
      }

      if (Math.abs(scrollDelta) > scrollThreshold * 2) {
        scrollDelta = 0;
      }
    }, { passive: true });

    // Move fixed-bottom elements above tab bar - runs continuously
    function fixFloatingElements() {
      var els = document.querySelectorAll('*');
      for (var i = 0; i < els.length; i++) {
        var cs = window.getComputedStyle(els[i]);
        if (cs.position === 'fixed' && cs.display !== 'none') {
          var bot = parseInt(cs.bottom);
          if (bot >= 0 && bot < 65 && els[i].offsetHeight > 0) {
            els[i].style.setProperty('bottom', '75px', 'important');
          }
        }
      }
      forceImagesVisible();
    }

    setTimeout(fixFloatingElements, 1500);
    setTimeout(fixFloatingElements, 3000);
    setTimeout(fixFloatingElements, 6000);
    setInterval(fixFloatingElements, 4000);

    // Reduce excessive top padding on home/search but keep navbar visible
    setTimeout(function() {
      if (location.pathname === '/' || location.pathname.startsWith('/search')) {
        var divs = document.querySelectorAll('#root > div > div:first-child');
        for (var i = 0; i < divs.length; i++) {
          var pt = parseInt(window.getComputedStyle(divs[i]).paddingTop);
          if (pt >= 60) {
            divs[i].style.paddingTop = '10px';
            break;
          }
        }
      }
    }, 1500);

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

    // Smooth transitions on navigation
    var pushState = history.pushState;
    history.pushState = function() {
      slideTransition('forward');
      pushState.apply(history, arguments);
      window.ReactNativeWebView.postMessage(JSON.stringify({type: 'nav', url: location.href}));
      setTimeout(fixFloatingElements, 1000);
      setTimeout(forceImagesVisible, 500);
      setTimeout(forceImagesVisible, 2000);
      tabBarHidden = false;
      window.ReactNativeWebView.postMessage(JSON.stringify({type: 'scroll', direction: 'up'}));
    };
    window.addEventListener('popstate', function() {
      slideTransition('back');
      window.ReactNativeWebView.postMessage(JSON.stringify({type: 'nav', url: location.href}));
      setTimeout(fixFloatingElements, 1000);
      setTimeout(forceImagesVisible, 500);
      setTimeout(forceImagesVisible, 2000);
      tabBarHidden = false;
      window.ReactNativeWebView.postMessage(JSON.stringify({type: 'scroll', direction: 'up'}));
    });

    // MutationObserver to catch dynamically loaded images
    var observer = new MutationObserver(function(mutations) {
      for (var i = 0; i < mutations.length; i++) {
        var added = mutations[i].addedNodes;
        for (var j = 0; j < added.length; j++) {
          if (added[j].tagName === 'IMG') {
            added[j].style.setProperty('opacity', '1', 'important');
          }
          if (added[j].querySelectorAll) {
            var imgs = added[j].querySelectorAll('img');
            for (var k = 0; k < imgs.length; k++) {
              imgs[k].style.setProperty('opacity', '1', 'important');
            }
          }
        }
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });

    true;
  })();
`;

function CustomTabBar({ activeTab, onTabPress, savedCount, translateY }) {
  const insets = useSafeAreaInsets();
  const tabs = ['Browse', 'Discover', 'Saved', 'Place Ad', 'My Profile'];
  const bottomPad = Math.max(insets.bottom, 16);

  return (
    <Animated.View style={{
      flexDirection: 'row',
      backgroundColor: NAV_BG,
      paddingTop: 10,
      paddingBottom: bottomPad,
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      transform: [{ translateY }],
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
            <View>
              <Ionicons name={iconName} size={22} color={color} />
              {tab === 'Saved' && savedCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{savedCount > 99 ? '99+' : savedCount}</Text>
                </View>
              )}
            </View>
            <Text style={{ color, fontSize: 10, fontWeight: '500', marginTop: 3 }}>{tab}</Text>
          </TouchableOpacity>
        );
      })}
    </Animated.View>
  );
}

export default function App() {
  const webViewRef = useRef(null);
  const [activeTab, setActiveTab] = useState('Browse');
  const [loading, setLoading] = useState(true);
  const [currentUrl, setCurrentUrl] = useState(BASE_URL);
  const [savedCount, setSavedCount] = useState(0);
  const canGoBackRef = useRef(false);
  const tabBarTranslateY = useRef(new Animated.Value(0)).current;
  const tabBarVisible = useRef(true);

  useEffect(() => {
    if (Platform.OS === 'android') {
      const handler = BackHandler.addEventListener('hardwareBackPress', () => {
        if (WEB_TABS.has(activeTab) && webViewRef.current && canGoBackRef.current) {
          webViewRef.current.goBack();
          return true;
        }
        if (!WEB_TABS.has(activeTab)) {
          setActiveTab('Browse');
          return true;
        }
        if (WEB_TABS.has(activeTab) && activeTab !== 'Browse') {
          setActiveTab('Browse');
          if (webViewRef.current) {
            webViewRef.current.injectJavaScript(`window.location.href = '${BASE_URL}'; true;`);
          }
          return true;
        }
        return false;
      });
      return () => handler.remove();
    }
  }, [activeTab]);

  const handleTabPress = useCallback((tab) => {
    setActiveTab(tab);
    if (WEB_TABS.has(tab) && TAB_URLS[tab] && webViewRef.current) {
      webViewRef.current.injectJavaScript(`window.location.href = '${TAB_URLS[tab]}'; true;`);
    }
    if (!tabBarVisible.current) {
      tabBarVisible.current = true;
      Animated.spring(tabBarTranslateY, { toValue: 0, useNativeDriver: true, tension: 80, friction: 12 }).start();
    }
  }, [tabBarTranslateY]);

  const handleOpenAd = useCallback((adUrl) => {
    setActiveTab('Browse');
    if (webViewRef.current) {
      webViewRef.current.injectJavaScript(`window.location.href = '${adUrl}'; true;`);
    }
  }, []);

  const handleWebViewMessage = useCallback((event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'scroll') {
        if (data.direction === 'down' && tabBarVisible.current) {
          tabBarVisible.current = false;
          Animated.spring(tabBarTranslateY, { toValue: TAB_BAR_HEIGHT + 30, useNativeDriver: true, tension: 80, friction: 12 }).start();
        } else if (data.direction === 'up' && !tabBarVisible.current) {
          tabBarVisible.current = true;
          Animated.spring(tabBarTranslateY, { toValue: 0, useNativeDriver: true, tension: 80, friction: 12 }).start();
        }
      }
    } catch (e) {}
  }, [tabBarTranslateY]);

  const isWebTab = WEB_TABS.has(activeTab);

  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />
        <MainContent
          webViewRef={webViewRef}
          loading={loading}
          setLoading={setLoading}
          currentUrl={currentUrl}
          setCurrentUrl={setCurrentUrl}
          activeTab={activeTab}
          isWebTab={isWebTab}
          handleTabPress={handleTabPress}
          handleOpenAd={handleOpenAd}
          savedCount={savedCount}
          setSavedCount={setSavedCount}
          canGoBackRef={canGoBackRef}
          tabBarTranslateY={tabBarTranslateY}
          onWebViewMessage={handleWebViewMessage}
        />
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}

function MainContent({
  webViewRef, loading, setLoading, currentUrl, setCurrentUrl,
  activeTab, isWebTab, handleTabPress, handleOpenAd, savedCount, setSavedCount,
  canGoBackRef, tabBarTranslateY, onWebViewMessage,
}) {
  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <View style={{ flex: 1, paddingTop: insets.top }}>
        <View style={{ flex: isWebTab ? 1 : 0, height: isWebTab ? undefined : 0, overflow: 'hidden' }}>
          {loading && isWebTab && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color={LISTIT_BLUE} />
            </View>
          )}
          <WebView
            ref={webViewRef}
            source={{ uri: BASE_URL }}
            style={{ flex: 1, opacity: (loading && isWebTab) ? 0 : 1 }}
            injectedJavaScript={INJECTED_JS}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            startInLoadingState={false}
            allowsBackForwardNavigationGestures={true}
            allowsInlineMediaPlayback={true}
            mediaPlaybackRequiresUserAction={false}
            sharedCookiesEnabled={true}
            cacheEnabled={true}
            cacheMode="LOAD_DEFAULT"
            thirdPartyCookiesEnabled={true}
            onLoadStart={() => {
              setLoading(true);
              setTimeout(() => setLoading(false), 4000);
            }}
            onLoadEnd={() => setLoading(false)}
            onError={() => setLoading(false)}
            onHttpError={() => setLoading(false)}
            onNavigationStateChange={(navState) => {
              setCurrentUrl(navState.url);
              canGoBackRef.current = navState.canGoBack;
            }}
            onMessage={onWebViewMessage}
            userAgent="Mozilla/5.0 (Linux; Android 15; OnePlus) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36 ListitApp/1.1"
          />
        </View>

        {activeTab === 'Discover' && (
          <SwipeScreen onSavedCountChange={setSavedCount} />
        )}
        {activeTab === 'Saved' && (
          <SavedScreen onOpenAd={handleOpenAd} onSavedCountChange={setSavedCount} />
        )}
      </View>
      <CustomTabBar
        activeTab={activeTab}
        onTabPress={handleTabPress}
        savedCount={savedCount}
        translateY={tabBarTranslateY}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  appHeader: {
    height: 44,
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e8e8e8',
  },
  headerLogo: {
    height: 30,
    width: 100,
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
