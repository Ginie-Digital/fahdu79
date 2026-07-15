import {StyleSheet, Text, View, ActivityIndicator} from 'react-native';
import React, {useState} from 'react';
import {responsiveWidth} from 'react-native-responsive-dimensions';
import {WebView as WV} from 'react-native-webview';
import {useAppTheme} from '../Hook/useAppTheme';

const WebView = ({route}) => {
  const {colors, isDark} = useAppTheme();
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  const type = route?.params?.type;

  // Determine URL based on type
  let url = null;
  if (type === 'tac') {
    url = 'https://www.fahdu.com/terms-conditions';
  } else if (type === 'pap') {
    url = 'https://www.fahdu.com/privacy-policy';
  } else if (type === 'refund') {
    url = 'https://fahdu.com/refund-policy/';
  }

  const isRefundOrDark = type === 'refund' || isDark;
  const activeBg = isRefundOrDark ? '#121212' : colors.background;

  // Determine injected CSS based on active theme or refund type
  const injectedCSS = isRefundOrDark
    ? `
      html, body, p, span, div, section, article, main, header, footer, h1, h2, h3, h4, h5, h6, li, ul, ol, table, tbody, tr, td, th {
        background-color: transparent !important;
        color: #FFFFFF !important;
      }
      html, body, #page, .site {
        background-color: #121212 !important;
      }
      a {
        color: #FFA86B !important;
      }
      .button-talk {
        background-color: #1A1A1A !important;
        border: 2px solid #FFA86B !important;
        box-shadow: 2px 2px 0 0 #FF7819, 4px 4px 0 0 #000000 !important;
      }
      .button-talk-text {
        color: #FFFFFF !important;
      }
      .fahdu_siteheader, .site_footer, .ditted_pattern, .download-btn, .toggle_button, .back_drop {
        display: none !important;
      }
      section.account_delete_sec {
        margin: 10px !important;
        padding: 15px !important;
        border: none !important;
      }
    `
    : `
      .fahdu_siteheader, .site_footer, .ditted_pattern, .download-btn, .toggle_button, .back_drop {
        display: none !important;
      }
      section.account_delete_sec {
        margin: 10px !important;
        padding: 15px !important;
        border: none !important;
      }
    `;

  const injectedJS = `
    (function() {
      var style = document.createElement('style');
      style.type = 'text/css';
      style.innerHTML = \`${injectedCSS.replace(/\n/g, ' ')}\`;
      document.head.appendChild(style);
    })();
    true;
  `;

  // If no URL found or an error occurred, show error view
  if (!url || error) {
    return (
      <View style={[styles.container, styles.center, {backgroundColor: activeBg}]}>
        <Text style={[styles.errorText, {color: colors.text}]}>There was some error</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, {backgroundColor: activeBg, borderTopColor: isDark ? '#2A2A2A' : '#282828'}]}>
      {loading && (
        <View style={[styles.loaderContainer, styles.center, {backgroundColor: activeBg}]}>
          <ActivityIndicator size="large" color={colors.accent || '#FFA86B'} />
        </View>
      )}
      <WV
        source={{uri: url}}
        onError={() => setError(true)}
        onLoadEnd={() => setLoading(false)}
        style={{flex: 1, backgroundColor: activeBg}}
        injectedJavaScript={injectedJS}
        injectedJavaScriptBeforeContentLoaded={injectedJS}
        onMessage={() => {}}
      />
    </View>
  );
};

export default WebView;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    borderTopColor: '#282828',
    paddingHorizontal: responsiveWidth(2),
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loaderContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'white',
    zIndex: 1,
  },
  errorText: {
    fontFamily: 'MabryPro-Medium',
    color: '#282828',
  },
});
