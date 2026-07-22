import { StyleSheet, FlatList, Platform, View, ActivityIndicator, Dimensions, InteractionManager } from "react-native";
import React, { memo, useCallback, useState, useRef, useEffect, useMemo } from "react";
import { responsiveWidth, responsiveHeight } from "react-native-responsive-dimensions";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useSelector } from "react-redux";
import OtherProfilePostCard from "../NewOtherProfileComponents/OtherProfilePostCard";
import { useAppTheme } from "../../Hook/useAppTheme";

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Moved OUTSIDE the component so memo actually works and doesn't recreate on every render
const SocialPostRender = memo(({ item, index }) => (
  <OtherProfilePostCard item={item} index={index} />
));

// Static separator component - avoids creating a new function/component on every render
const ItemSeparator = memo(({ isDark, colors }) => (
  <View style={{
    height: responsiveWidth(1),
    backgroundColor: isDark ? colors.separator : '#EEEEEE',
  }} />
));

const SinglePost = ({ route }) => {
  const { colors, isDark } = useAppTheme();
  const styles = useMemo(() => getStyles(colors, isDark), [colors, isDark]);
  const allPosts = useSelector((state) => state.profileFeedCache.data.content);
  const token = useSelector(state => state.auth.user.token);
  const targetIndex = route?.params?.scrollIndex || 0;
  const flatListRef = useRef(null);

  // Fallback to ensure we scroll to the right index
  useEffect(() => {
    if (targetIndex > 0 && allPosts?.length > targetIndex) {
      InteractionManager.runAfterInteractions(() => {
        flatListRef.current?.scrollToIndex({
          index: targetIndex,
          animated: false,
          viewPosition: 0,
        });
      });
    }
  }, [targetIndex, allPosts?.length]);

  const renderItem = useCallback(({ item, index }) => (
    <SocialPostRender item={item} index={index} />
  ), []);

  const keyExtractor = useCallback((item) => item._id, []);

  const renderSeparator = useCallback(() => (
    <ItemSeparator isDark={isDark} colors={colors} />
  ), [isDark, colors]);

  // Pre-calculate layouts for accurate scrolling
  const getItemLayout = useMemo(() => {
    // Cache constants - Aggressively conservative to ensure we never overshoot (cut off top)
    const headerHeight = responsiveWidth(10); // Reduced
    const footerHeight = responsiveWidth(14); // Reduced significantly
    const marginHeight = responsiveHeight(1); // Minimal margin
    const screenWidth = SCREEN_WIDTH;

    // Calculate all offsets
    const offsets = [];
    let currentOffset = 0;

    allPosts.forEach((item, index) => {
      let itemHeight = marginHeight;

      if (item?.post_content_files?.[0]?.format === 'video') {
         // Video Case (Usually 2:3 ratio)
         const aspectRatio = 2 / 3; 
         itemHeight += screenWidth / aspectRatio;
         itemHeight += footerHeight; 
      } else {
         // Image Case
         itemHeight += headerHeight;
         
         // Text estimation - Minimal assumption
         if (item?.postContent) {
            const approximateLines = Math.ceil(item.postContent.length / 60); 
            itemHeight += (approximateLines * 15); 
         }

         // Image Aspect Ratio
         const ar = item?.image?.hasAspectRatio 
            ? Number(item?.image?.aspectRatio?.width) / Number(item?.image?.aspectRatio?.height) 
            : 1;
         const finalAspectRatio = isNaN(ar) ? 1 : ar;
         itemHeight += screenWidth / finalAspectRatio;

         itemHeight += footerHeight;
      }

      offsets[index] = { length: itemHeight, offset: currentOffset, index };
      currentOffset += itemHeight;
    });

    return (data, index) => offsets[index] || { length: 0, offset: 0, index };
  }, [allPosts]);

  return (
    <GestureHandlerRootView style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={allPosts}
        renderItem={renderItem}
        keyExtractor={keyExtractor}

        // Jump to target
        initialScrollIndex={targetIndex}
        getItemLayout={getItemLayout}
        
        onScrollToIndexFailed={info => {
             const wait = new Promise(resolve => setTimeout(resolve, 500));
             wait.then(() => {
               flatListRef.current?.scrollToIndex({ index: info.index, animated: false });
             });
        }}

        // Performance optimizations - larger values prevent white flash on fast scroll
        initialNumToRender={7}
        maxToRenderPerBatch={10}
        windowSize={21}
        updateCellsBatchingPeriod={30}
        
        showsVerticalScrollIndicator={false}

        ItemSeparatorComponent={renderSeparator}
        
        // Enable on both platforms to reclaim memory from off-screen cells
        removeClippedSubviews={true}
      />
    </GestureHandlerRootView>
  );
};

export default memo(SinglePost);

const getStyles = (colors, isDark) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
});