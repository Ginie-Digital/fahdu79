import { StyleSheet, FlatList, Platform, View, ActivityIndicator, Dimensions, InteractionManager } from "react-native";
import React, { memo, useCallback, useState, useRef, useEffect, useMemo } from "react";
import { responsiveWidth, responsiveHeight } from "react-native-responsive-dimensions";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useSelector } from "react-redux";
import OtherProfilePostCard from "../NewOtherProfileComponents/OtherProfilePostCard";

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const SinglePost = ({ route }) => {
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

  const SocialPostRender = memo(({ item, index }) => (
    <OtherProfilePostCard item={item} index={index} token={token} />
  ));

  const keyExtractor = useCallback((item) => item._id, []);

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
        renderItem={({ item, index }) => <SocialPostRender item={item} index={index} />}
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

        // Standard optimization
        initialNumToRender={5}
        maxToRenderPerBatch={5}
        windowSize={10}
        
        showsVerticalScrollIndicator={false}

        ItemSeparatorComponent={() => (
          <View style={styles.separator} />
        )}
        
        removeClippedSubviews={Platform.OS === 'android'}
      />
    </GestureHandlerRootView>
  );
};

export default memo(SinglePost);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  separator: {
    height: responsiveWidth(1),
    backgroundColor: '#EEEEEE',
  },
});