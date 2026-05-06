import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Image, ScrollView, TouchableOpacity, ActivityIndicator, Platform, PanResponder, Vibration, Animated, Easing, Dimensions, Alert } from 'react-native';
import { CropView } from 'react-native-image-crop-tools';
import { responsiveWidth, responsiveHeight } from 'react-native-responsive-dimensions';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AnimatedButton from '../Components/AnimatedButton';
import { applyImageFilter, resizeImageCover, blendImages, resizeImageForPost, cropToAspectAndResize } from '../../FFMPeg/FFMPegModule';
import { FILTERS as RAW_FILTERS, FILTERS_SUPPORTED } from '../Utils/filters';
import { triggerSelection, triggerImpactMedium, triggerSuccess, triggerImpactLight } from '../Utils/Haptics';
import Back from '../Components/Back/Back';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Svg, { Defs, Pattern, Path, Rect, Circle } from 'react-native-svg';
import AsyncStorage from '@react-native-async-storage/async-storage';
import RNFS from 'react-native-fs';

import CompareIcon from '../Components/CompareIcon';
const ALL_FILTERS = [
    { id: 0, name: 'Normal', command: 'none', description: 'Original', category: 'All' },
    ...RAW_FILTERS
];

const CATEGORIES = ['All', 'Cinematic', 'Portrait', 'Vintage', 'Atmosphere', 'Artistic'];

const FilterItem = React.memo(({ filter, isSelected, thumbUri, onSelect, onToggleFavorite, isFavorite, disabled }) => {
    // Spring animation for touch
    const scaleAnim = useRef(new Animated.Value(1)).current;

    const onPressIn = () => {
         Animated.spring(scaleAnim, {
             toValue: 0.9,
             useNativeDriver: true,
         }).start();
    };

    const onPressOut = () => {
         Animated.spring(scaleAnim, {
             toValue: 1,
             friction: 3,
             tension: 40,
             useNativeDriver: true,
         }).start();
    };

    return (
        <TouchableOpacity 
            style={styles.filterItem}
            onPress={() => {
                if (disabled) return;
                triggerImpactLight(); 
                onSelect(filter.id);
            }}
            onPressIn={disabled ? undefined : onPressIn}
            onPressOut={disabled ? undefined : onPressOut}
            activeOpacity={disabled ? 1 : 0.9}
            disabled={disabled}
        >

            <Animated.View style={[
                styles.filterPreviewBox, 
                isSelected && styles.selectedFilterBox,
                { transform: [{ scale: isSelected ? 1.05 : scaleAnim }] } 
            ]}>
                {thumbUri ? (
                    <Image 
                        source={{ uri: thumbUri.startsWith('file://') ? thumbUri : `file://${thumbUri}` }} 
                        style={styles.filterThumbnail}
                        resizeMode="cover"
                    />
                ) : (
                    <ActivityIndicator size="small" color="#999" />
                )}
                
                {/* {filter.id !== 0 && (
                <TouchableOpacity 
                    style={styles.favoriteIcon} 
                    onPress={() => onToggleFavorite(filter.name)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                    <Icon 
                        name={isFavorite ? "heart" : "heart-outline"} 
                        size={16} 
                        color={isFavorite ? "#FF4081" : "#fff"} 
                        style={{ textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2 }}
                    />
                </TouchableOpacity>
                )} */}
            </Animated.View>
             <Text style={[styles.filterName, isSelected && styles.selectedFilterText]}>
                {filter.name}
            </Text>
        </TouchableOpacity>
    );
});

const FilterScreen = ({ route, navigation }) => {
    const { uris, uri, width, height } = route.params;
    const initialUris = uris || [uri];
    const insets = useSafeAreaInsets();
    
    // Multi-image state
    const [activeIndex, setActiveIndex] = useState(0);
    const activeIndexRef = useRef(0);
    const switchImageRef = useRef(null);
    const imageStatesRef = useRef(initialUris.map(uri => ({ /* placeholder */ })));
    const [editMode, setEditMode] = useState('crop'); // 'crop' | 'rotate' | 'filters'
    const [imageStates, setImageStates] = useState(
        initialUris.map(u => ({
            uri: u,
            resolvedUri: null,
            previewUri: u,
            visibleUri: u,
            filteredUri: null,
            selectedFilterId: 0,
            intensity: 75,
            isCropping: true,
            hasInitialCrop: false,
            thumbnails: {},
            thumbnailsLoading: true,
        }))
    );

    // Current image states (mapped to imageStates[activeIndex])
    const currentImageState = imageStates[activeIndex];
    const [selectedFilterId, setSelectedFilterId] = useState(currentImageState.selectedFilterId);
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [previewUri, setPreviewUri] = useState(currentImageState.previewUri);
    const [visibleUri, setVisibleUri] = useState(currentImageState.visibleUri);
    const [filteredUri, setFilteredUri] = useState(currentImageState.filteredUri);
    const [loading, setLoading] = useState(false);
    const [thumbnails, setThumbnails] = useState(currentImageState.thumbnails);
    const [thumbnailsLoading, setThumbnailsLoading] = useState(currentImageState.thumbnailsLoading);
    const [overlayFilterName, setOverlayFilterName] = useState('');
    const [intensity, setIntensity] = useState(currentImageState.intensity);
    const [showOriginal, setShowOriginal] = useState(false);
    const [favorites, setFavorites] = useState([]);
    const scrollViewRef = useRef(null);
    const categoryScrollViewRef = useRef(null);
    const overlayOpacity = useRef(new Animated.Value(0)).current;
    const pulseAnim = useRef(new Animated.Value(1)).current;
    const intensityAnim = useRef(new Animated.Value(75)).current; // Smooth animation value
    const selectedFilterIdRef = useRef(selectedFilterId); // Track current filter for swipe
    const displayedFiltersRef = useRef(displayedFilters); // Track current list for swipe
    const handleApplyFilterRef = useRef(null); // Ref to access latest handleApplyFilter
    const selectedCategoryRef = useRef(selectedCategory); // Track current category for swipe
    const lastSnapPoint = useRef(null); // Track last triggered snap point for slider
    const isSwipingCategory = useRef(false); // Flag to prevent auto-reset during swipe
    const longPressInterval = useRef(null); // For long press intensity increment
    const [isCropping, setIsCropping] = useState(currentImageState.isCropping);
    const [hasInitialCrop, setHasInitialCrop] = useState(currentImageState.hasInitialCrop);
    const cropViewRef = useRef(null);
    const [resolvedUri, setResolvedUri] = useState(currentImageState.resolvedUri);
    const [originalUri, setOriginalUri] = useState(currentImageState.resolvedUri);
    const [isProcessingCrop, setIsProcessingCrop] = useState(false);
    const resolvedUriRef = useRef(null);
    const cropOpacity = useRef(new Animated.Value(1)).current;
    const cropScale = useRef(new Animated.Value(0.95)).current;

    // Reset all state when route params change (new images selected)
    const urisKey = initialUris.join('|');
    const prevUrisKey = useRef(urisKey);
    
    useEffect(() => {
        if (prevUrisKey.current !== urisKey) {
            prevUrisKey.current = urisKey;
            
            // Reset all image states for new URIs
            const newStates = initialUris.map(u => ({
                uri: u,
                resolvedUri: null,
                previewUri: u,
                visibleUri: u,
                filteredUri: null,
                selectedFilterId: 0,
                intensity: 75,
                isCropping: true,
                hasInitialCrop: false,
                thumbnails: {},
                thumbnailsLoading: true,
            }));
            
            setImageStates(newStates);
            setActiveIndex(0);
            activeIndexRef.current = 0;
            
            // Reset current image state
            setSelectedFilterId(0);
            setSelectedCategory('All');
            setPreviewUri(initialUris[0]);
            setVisibleUri(initialUris[0]);
            setFilteredUri(null);
            setLoading(false);
            setThumbnails({});
            setThumbnailsLoading(true);
            setOverlayFilterName('');
            setIntensity(75);
            setShowOriginal(false);
            setIsCropping(true);
            setHasInitialCrop(false);
            setResolvedUri(null);
            setOriginalUri(null);
            setIsProcessingCrop(false);
            resolvedUriRef.current = null;
            initialized.current = false;
            thumbnailGenId.current++;
        }
    }, [urisKey]);

    // Switch image handler
    const switchImage = (index) => {
        if (index === activeIndex) return;
        triggerImpactLight();
        
        // Save current state
        const updatedStates = [...imageStates];
        updatedStates[activeIndex] = {
            ...updatedStates[activeIndex],
            selectedFilterId,
            previewUri,
            visibleUri,
            filteredUri,
            intensity,
            isCropping,
            hasInitialCrop,
            resolvedUri,
            thumbnails,
            thumbnailsLoading,
        };
        
        setImageStates(updatedStates);
        setActiveIndex(index);
        
        // Load next state
        const nextState = updatedStates[index];
        setSelectedFilterId(nextState.selectedFilterId);
        setPreviewUri(nextState.previewUri);
        setVisibleUri(nextState.visibleUri);
        setFilteredUri(nextState.filteredUri);
        setIntensity(nextState.intensity);
        setIsCropping(nextState.isCropping);
        setHasInitialCrop(nextState.hasInitialCrop);
        setResolvedUri(nextState.resolvedUri);
        setOriginalUri(nextState.resolvedUri);
        setThumbnails(nextState.thumbnails);
        setThumbnailsLoading(nextState.thumbnailsLoading);
        
        // Bump generation ID to cancel any in-flight thumbnail generation
        thumbnailGenId.current++;

        // Reset initialized flag for the new image
        if (nextState.resolvedUri && Object.keys(nextState.thumbnails).length > 0) {
            // Thumbnails already exist for this image, mark as initialized
            initialized.current = true;
        } else if (nextState.resolvedUri) {
            // Need to generate thumbnails for this image
            initialized.current = false;
            initializeFilterScreen(nextState.resolvedUri);
        } else {
            initialized.current = false;
        }
    };

    // Keep refs in sync for PanResponder closures
    activeIndexRef.current = activeIndex;
    switchImageRef.current = switchImage;
    imageStatesRef.current = imageStates;

    // Swipe gesture to switch images in crop/rotate modes
    const imageSwitchPanResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => false,
            onMoveShouldSetPanResponder: (_, gestureState) => {
                return Math.abs(gestureState.dx) > Math.abs(gestureState.dy) && Math.abs(gestureState.dx) > 15;
            },
            onPanResponderRelease: (_, gestureState) => {
                const { dx } = gestureState;
                const SWIPE_THRESHOLD = 50;
                const currentIdx = activeIndexRef.current;
                const totalImages = imageStatesRef.current.length;
                
                if (dx < -SWIPE_THRESHOLD && currentIdx < totalImages - 1) {
                    // Swipe LEFT → next image
                    switchImageRef.current(currentIdx + 1);
                } else if (dx > SWIPE_THRESHOLD && currentIdx > 0) {
                    // Swipe RIGHT → previous image
                    switchImageRef.current(currentIdx - 1);
                }
            },
        })
    ).current;

    // Remove image from multi-image array
    const removeImage = (index) => {
        if (initialUris.length <= 1) return;
        triggerImpactMedium();
        const newUris = [...initialUris];
        newUris.splice(index, 1);
        const newStates = [...imageStates];
        newStates.splice(index, 1);
        setImageStates(newStates);
        // Adjust activeIndex if needed
        if (index <= activeIndex && activeIndex > 0) {
            const newIndex = activeIndex - 1;
            setActiveIndex(newIndex);
            const state = newStates[newIndex];
            setSelectedFilterId(state.selectedFilterId);
            setPreviewUri(state.previewUri);
            setVisibleUri(state.visibleUri);
            setFilteredUri(state.filteredUri);
            setIntensity(state.intensity);
            setIsCropping(state.isCropping);
            setHasInitialCrop(state.hasInitialCrop);
            setResolvedUri(state.resolvedUri);
            setOriginalUri(state.resolvedUri);
            setThumbnails(state.thumbnails);
            setThumbnailsLoading(state.thumbnailsLoading);
        } else if (index === activeIndex) {
            const newIndex = Math.min(activeIndex, newStates.length - 1);
            setActiveIndex(newIndex);
            const state = newStates[newIndex];
            setSelectedFilterId(state.selectedFilterId);
            setPreviewUri(state.previewUri);
            setVisibleUri(state.visibleUri);
            setFilteredUri(state.filteredUri);
            setIntensity(state.intensity);
            setIsCropping(state.isCropping);
            setHasInitialCrop(state.hasInitialCrop);
            setResolvedUri(state.resolvedUri);
            setOriginalUri(state.resolvedUri);
            setThumbnails(state.thumbnails);
            setThumbnailsLoading(state.thumbnailsLoading);
        }
        // Also mutate initialUris ref (won't cause re-render but keeps data consistent)
        initialUris.splice(index, 1);
    };

    // Rotate / Flip handler using FFmpeg
    const handleRotateFlip = async (type) => {
        if (loading) return;
        setLoading(true);
        triggerImpactMedium();
        try {
            const currentUri = previewUri || resolvedUri;
            const cleanUri = decodeURIComponent(currentUri.replace('file://', ''));
            let filterCommand;
            switch (type) {
                case 'left': filterCommand = 'transpose=2'; break;
                case 'right': filterCommand = 'transpose=1'; break;
                case 'flip': filterCommand = 'hflip'; break;
                default: return;
            }
            const result = await applyImageFilter(cleanUri, filterCommand);
            if (result) {
                setPreviewUri(result);
                setVisibleUri(result);
                setResolvedUri(result);
                resolvedUriRef.current = result;
                setOriginalUri(result);
                // Clear filter thumbnails since image changed
                setThumbnails({});
                setFilteredUri(null);
                setSelectedFilterId(0);
                initialized.current = false;
            }
        } catch (error) {
            console.error('Rotate/flip error:', error);
        } finally {
            setLoading(false);
        }
    };

    // Custom Error Notification
    const [errorMessage, setErrorMessage] = useState('');
    const errorTranslateY = useRef(new Animated.Value(-100)).current; 

    const showError = (message) => {
        setErrorMessage(message);
        // Slide down
        Animated.sequence([
            Animated.timing(errorTranslateY, {
                toValue: 0,
                duration: 400,
                useNativeDriver: true,
                easing: Easing.out(Easing.cubic),
            }),
            Animated.delay(3500), // Wait 3.5s
            Animated.timing(errorTranslateY, {
                toValue: -100, // Slide back up
                duration: 400,
                useNativeDriver: true,
                easing: Easing.in(Easing.cubic),
            })
        ]).start();
    };

    // Animate opacity & scale when entering/exiting crop mode
    useEffect(() => {
        if (isCropping) {
            // Fade IN & Scale UP when entering crop mode
            cropOpacity.setValue(0);
            cropScale.setValue(0.95);
            
            Animated.parallel([
                Animated.timing(cropOpacity, {
                    toValue: 1,
                    duration: 300,
                    useNativeDriver: true,
                    easing: Easing.out(Easing.cubic),
                }),
                Animated.timing(cropScale, {
                    toValue: 1,
                    duration: 300,
                    useNativeDriver: true,
                    easing: Easing.out(Easing.back(1.5)), // Subtle bounce
                })
            ]).start();
        }
    }, [isCropping]);


    // Resolve URI (handle content:// for Android)
    useEffect(() => {
        const resolveUri = async () => {
            const currentUri = initialUris[activeIndex];
            if (!currentUri) return;

            if (Platform.OS === 'android' && currentUri.startsWith('content://')) {
                try {
                    const tempPath = `${RNFS.CachesDirectoryPath}/temp_source_${Date.now()}_${activeIndex}.jpg`;
                    await RNFS.copyFile(currentUri, tempPath);
                    const fileUri = `file://${tempPath}`;
                    setResolvedUri(fileUri);
                    setOriginalUri(fileUri);
                    setPreviewUri(fileUri);
                    setVisibleUri(fileUri);
                } catch (err) {
                    console.error('Failed to resolve content URI:', err);
                    setResolvedUri(currentUri);
                    setOriginalUri(currentUri);
                }
            } else {
                setResolvedUri(currentUri);
                setOriginalUri(currentUri);
                setPreviewUri(currentUri);
                setVisibleUri(currentUri);
            }
        };
        resolveUri();
    }, [activeIndex, urisKey]);

    // Keep ref in sync for closures
    useEffect(() => {
        resolvedUriRef.current = resolvedUri;
    }, [resolvedUri]);

    // Calculate image dimensions to always cover full width but respect available height
    const screenWidth = Dimensions.get('window').width;
    const screenHeight = Dimensions.get('window').height;
    const aspectRatio = width && height ? width / height : 1;
    
    // Account for all bottom UI: thumbnails (100) + bottom tabs (~90) + navigation header (50) + insets
    const expectedBottomUI = editMode === 'crop' ? 190 : 270; // 80px extra for rotate/filters controls
    const estimatedBottomUIHeight = expectedBottomUI + insets.top + insets.bottom + 20;
    const availableImageHeight = screenHeight - estimatedBottomUIHeight;
    
    // Default 4:5 aspect ratio dimensions based on full width
    let imageDisplayWidth = screenWidth;
    let imageDisplayHeight = screenWidth * (5 / 4);
    
    // In filters/rotate mode, add 20px margin on each side
    if (editMode === 'filters' || editMode === 'rotate') {
        imageDisplayWidth = screenWidth - 40;
        imageDisplayHeight = imageDisplayWidth * (5 / 4);
    }
    
    // If the 4:5 height exceeds available vertical space, only clamp the height.
    // Keep width so there's no white space on left/right.
    // resizeMode="cover" on the Image will handle the crop.
    if (imageDisplayHeight > availableImageHeight) {
        imageDisplayHeight = availableImageHeight;
        if (editMode === 'filters' || editMode === 'rotate') {
            imageDisplayWidth = availableImageHeight * (4 / 5);
        }
        // In crop mode, imageDisplayWidth stays at screenWidth — no side gaps
    }

    // Derived filters based on category
    const displayedFilters = React.useMemo(() => {
        if (selectedCategory === 'All') {
            return ALL_FILTERS;
        }
        // Always include Normal (id 0) as the first option + filters matching category
        return [ALL_FILTERS[0], ...ALL_FILTERS.slice(1).filter(f => f.category === selectedCategory)];
    }, [selectedCategory]);

    const filteredUriRef = useRef(null); // Ref to access latest filteredUri in useEffect without triggering it

    // Keep refs in sync
    useEffect(() => {
        selectedFilterIdRef.current = selectedFilterId;
    }, [selectedFilterId]);

    useEffect(() => {
        displayedFiltersRef.current = displayedFilters;
    }, [displayedFilters]);

    useEffect(() => {
        selectedCategoryRef.current = selectedCategory;
    }, [selectedCategory]);

    useEffect(() => {
        filteredUriRef.current = filteredUri;
    }, [filteredUri]);

    // Auto-scroll to selected filter when category/list changes
    useEffect(() => {
        const index = displayedFilters.findIndex(f => f.id === selectedFilterId);
        if (index !== -1) {
            // Filter exists in new list -> Scroll to it
            // Small timeout to ensure list layout updates
            setTimeout(() => scrollToCenter(index), 100);
        } else {
            // Filter does not exist -> Reset to Normal (and scroll to 0)
            // ONLY if we are not currently swiping between categories
            if (!isSwipingCategory.current) {
                handleApplyFilter(0);
            }
            // If swiping, we rely on the PanResponder's handleApplyFilter call to set the correct new ID
        }
    }, [displayedFilters]);
    
    // ... (keeping other existing effects if any, ensuring no duplication) ...

    // Apply intensity when it changes (debounced)
    useEffect(() => {
        // Only apply if we have a filter selected (not Normal)
        if (selectedFilterId === 0) {
            return;
        }

        // Debounce to avoid excessive FFmpeg calls
        const timeoutId = setTimeout(async () => {
            // Use refs to get latest values without triggering re-runs
            const currentFilteredUri = filteredUriRef.current;
            const currentResolvedUri = resolvedUriRef.current || resolvedUri;

            if (!currentFilteredUri || !currentResolvedUri) return;

            try {
                const opacity = intensity / 100; // Convert 0-100 to 0-1
                
                // If intensity is 100, just use the filtered image directly
                if (intensity >= 100) {
                    setPreviewUri(currentFilteredUri);
                    return;
                }
                
                // If intensity is 0, use the original image
                if (intensity <= 0) {
                    setPreviewUri(currentResolvedUri);
                    return;
                }
                
                // Blend original and filtered based on intensity
                console.log(`Applying intensity ${intensity}% (opacity: ${opacity})`);
                const blendedUri = await blendImages(currentResolvedUri, currentFilteredUri, opacity);
                if (blendedUri) {
                    setPreviewUri(blendedUri);
                }
            } catch (error) {
                console.error('Intensity blend error:', error);
            }
        }, 300); // 300ms debounce

        return () => clearTimeout(timeoutId);
    }, [intensity]); // ONLY run when intensity changes

    useEffect(() => {
        loadFavorites();
        if (resolvedUri) {

            initializeFilterScreen();
        }
    }, [resolvedUri]);

    // Update header - hide when in filters mode
    useEffect(() => {
        if (editMode === 'filters') {
            navigation.setOptions({
                headerShown: false,
            });
        } else {
            navigation.setOptions({
                headerShown: true,
                title: 'Edit Post',
                headerRight: () => (
                    <TouchableOpacity 
                        onPress={handleNext} 
                        disabled={loading}
                        style={{ backgroundColor: '#1e1e1e', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, marginRight: 5 }}
                    >
                        <Text style={{ fontSize: 14, fontFamily: 'Rubik-SemiBold', color: loading ? '#666' : '#fff' }}>
                            {editMode === 'crop' && isCropping ? 'Done' : 'Next'}
                        </Text>
                    </TouchableOpacity>
                ),
                headerLeft: () => (
                    <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginLeft: 10 }}>
                        <Icon name="chevron-left" size={28} color="#1e1e1e" />
                    </TouchableOpacity>
                )
            });
        }
    }, [previewUri, loading, isCropping, hasInitialCrop, editMode]);

    const loadFavorites = async () => {
        try {
            const savedFavorites = await AsyncStorage.getItem('favoriteFilters');
            if (savedFavorites) {
                setFavorites(JSON.parse(savedFavorites));
            }
        } catch (error) {
            console.error('Failed to load favorites:', error);
        }
    };

    const toggleFavorite = async (filterName) => {
        try {
            let newFavorites;
            if (favorites.includes(filterName)) {
                newFavorites = favorites.filter(name => name !== filterName);
            } else {
                newFavorites = [...favorites, filterName];
            }
            setFavorites(newFavorites);
            await AsyncStorage.setItem('favoriteFilters', JSON.stringify(newFavorites));
        } catch (error) {
            console.error('Failed to save favorites:', error);
        }
    };

    const initialized = useRef(false); // To prevent re-initialization
    const thumbnailGenId = useRef(0); // Cancellation token for thumbnail generation

    const initializeFilterScreen = async (targetUri) => {
         const uriToUse = targetUri || resolvedUri;
         if (initialized.current || !uriToUse) return; 
         initialized.current = true;

         // Bump generation ID so any previous in-flight generation is discarded
         const currentGenId = ++thumbnailGenId.current;

         try {
            setThumbnailsLoading(true);
            const tempDir = RNFS.CachesDirectoryPath;
            const smallThumbPath = `${tempDir}/thumb_base_${Date.now()}_${Math.random().toString(36).substr(2, 6)}.jpg`;
            
            const cleanUri = decodeURIComponent(uriToUse.replace('file://', ''));
            console.log('--- Initializing Filter Screen ---');
            console.log('Input URI:', uriToUse);
            console.log('Clean Path for FFmpeg:', cleanUri);
            console.log('Thumbnail GenId:', currentGenId);
            
            await resizeImageCover(cleanUri, smallThumbPath, 100);

            // Check if user switched images during resize
            if (thumbnailGenId.current !== currentGenId) {
                console.log('Thumbnail generation cancelled (image switched during resize)');
                return;
            }
            
            // Start fresh — don't merge with previous thumbnails
            setThumbnails({ 0: smallThumbPath });

            for (let i = 1; i < ALL_FILTERS.length; i++) {
                // Check cancellation before each filter
                if (thumbnailGenId.current !== currentGenId) {
                    console.log('Thumbnail generation cancelled (image switched during filter loop)');
                    return;
                }

                const filter = ALL_FILTERS[i];
                if (filter.command !== 'none') {
                   try {
                       const filterResult = await applyImageFilter(smallThumbPath, filter.command);
                       // Check cancellation after each filter completes
                       if (thumbnailGenId.current !== currentGenId) {
                           console.log('Thumbnail generation cancelled (image switched after filter)');
                           return;
                       }
                       if (filterResult) {
                           setThumbnails(prev => ({ ...prev, [filter.id]: filterResult }));
                       }
                   } catch (e) {
                       console.log(`Failed to generate thumb for ${filter.name}`);
                   }
                }
            }
            if (thumbnailGenId.current === currentGenId) {
                setThumbnailsLoading(false);
            }
        } catch (error) {
            console.error('Thumbnail generation failed:', error);
            if (thumbnailGenId.current === currentGenId) {
                setThumbnailsLoading(false);
            }
        }
    };

    // Haptic feedback function
    const triggerHaptic = () => {
        triggerSelection();
    };

    // Show filter name overlay with fade animation
    const showFilterOverlay = (filterName) => {
        setOverlayFilterName(filterName);
        overlayOpacity.setValue(1);
        Animated.timing(overlayOpacity, {
            toValue: 0,
            duration: 1200,
            delay: 400,
            useNativeDriver: true,
        }).start();
    };

    // Start subtle pulse animation
    const startPulse = () => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, {
                    toValue: 0.7,
                    duration: 400,
                    useNativeDriver: true,
                }),
                Animated.timing(pulseAnim, {
                    toValue: 1,
                    duration: 400,
                    useNativeDriver: true,
                }),
            ])
        ).start();
    };

    const stopPulse = () => {
        pulseAnim.stopAnimation();
        pulseAnim.setValue(1);
    };

    // Scroll to center the selected filter thumbnail
    const scrollToCenter = (index) => {
        if (scrollViewRef.current) {
            const ITEM_WIDTH = 72 + 12; // width + marginRight
            const SCREEN_WIDTH = require('react-native').Dimensions.get('window').width;
            const offset = (index * ITEM_WIDTH) - (SCREEN_WIDTH / 2) + (ITEM_WIDTH / 2) + 15; // 15 = paddingHorizontal
            scrollViewRef.current.scrollTo({ x: Math.max(0, offset), animated: true });
        }
    };

    // Scroll to center the selected category chip
    const scrollCategoryToCenter = (categoryIndex) => {
        if (categoryScrollViewRef.current) {
            const CHIP_WIDTH = 80 + 10; // approx chip width + marginRight
            const SCREEN_WIDTH = require('react-native').Dimensions.get('window').width;
            const offset = (categoryIndex * CHIP_WIDTH) - (SCREEN_WIDTH / 2) + (CHIP_WIDTH / 2) + 15;
            categoryScrollViewRef.current.scrollTo({ x: Math.max(0, offset), animated: true });
        }
    };

    const handleApplyFilter = async (filterId) => {
        if (selectedFilterId === filterId) return;
        
        // Find index in displayed filters for scrolling using REF to avoid stale closure
        const currentList = displayedFiltersRef.current;
        const index = currentList.findIndex(f => f.id === filterId);
        
        // Trigger haptic feedback
        triggerHaptic();
        
        setSelectedFilterId(filterId);
        // Do NOT reset intensity - keep current value
        // setIntensity(75); 
        // intensityAnim.setValue(75);
        const filter = ALL_FILTERS.find(f => f.id === filterId);
        
        // Scroll thumbnail to center provided we found the index
        if (index !== -1) {
            scrollToCenter(index);
        }
        
        // Show filter name overlay
        showFilterOverlay(filter.name);
        
        if (filter.command === 'none') {
            setPreviewUri(resolvedUriRef.current || resolvedUri || uri);
            setFilteredUri(null);
            return;
        }

        // Filter toast overlay provides visual feedback
        try {
            // Use resolvedUriRef.current to get latest value (avoids stale closure)
            const sourceUri = resolvedUriRef.current || resolvedUri || uri; 
            const cleanUri = decodeURIComponent(sourceUri.replace('file://', ''));
            console.log('Applying filter on:', cleanUri);
            const result = await applyImageFilter(cleanUri, filter.command);
            if (result) {
                setFilteredUri(result); // Store full intensity filtered image for blending
                
                // Apply current intensity blend (use current intensity state)
                const currentOpacity = intensity / 100;
                const blendedResult = await blendImages(sourceUri, result, currentOpacity);
                if (blendedResult) {
                    setPreviewUri(blendedResult);
                } else {
                    // Fallback to full filtered image if blend fails
                    setPreviewUri(result);
                }
            }
        } catch (error) {
            console.error('Filter error:', error);
            // Silently fail and keep original image
            setPreviewUri(resolvedUri || uri);
            setFilteredUri(null);
        } finally {
            stopPulse();
            setLoading(false);
        }
    };
    
    // Keep handler ref in sync
    useEffect(() => {
        handleApplyFilterRef.current = handleApplyFilter;
    }, [handleApplyFilter]);



    const handleCategorySelect = (category) => {
        triggerSelection();
        setSelectedCategory(category);
        // Scroll category chip to center
        const catIndex = CATEGORIES.indexOf(category);
        if (catIndex !== -1) {
            scrollCategoryToCenter(catIndex);
        }
    };

    // Long press timer for Before/After
    const longPressTimerRef = useRef(null);
    const isLongPressActiveRef = useRef(false);

    // Swipe gesture handler
    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: (_, gestureState) => {
                // Cancel long press if user starts moving
                if (longPressTimerRef.current) {
                    clearTimeout(longPressTimerRef.current);
                    longPressTimerRef.current = null;
                }
                // Only respond to horizontal swipes
                return Math.abs(gestureState.dx) > Math.abs(gestureState.dy) && Math.abs(gestureState.dx) > 10;
            },
            onPanResponderGrant: () => {
                // Start a delayed long press for Before/After
                isLongPressActiveRef.current = false;
                if (selectedFilterIdRef.current !== 0) {
                    longPressTimerRef.current = setTimeout(() => {
                        isLongPressActiveRef.current = true;
                        triggerImpactLight();
                        setShowOriginal(true);
                        showFilterOverlay('Before');
                    }, 400);
                }
            },
            onPanResponderTerminate: () => {
                 if (longPressTimerRef.current) {
                     clearTimeout(longPressTimerRef.current);
                     longPressTimerRef.current = null;
                 }
                 setShowOriginal(false);
                 if (isLongPressActiveRef.current && selectedFilterIdRef.current !== 0) {
                     showFilterOverlay('After');
                 }
                 isLongPressActiveRef.current = false;
            },
            onPanResponderRelease: (_, gestureState) => {
                 // Cancel long press timer if still pending
                 if (longPressTimerRef.current) {
                     clearTimeout(longPressTimerRef.current);
                     longPressTimerRef.current = null;
                 }
                 
                 setShowOriginal(false);
                 
                const { dx } = gestureState;
                const SWIPE_THRESHOLD = 50;
                
                 // Only show "After" if long press was actually triggered
                 if (isLongPressActiveRef.current && selectedFilterIdRef.current !== 0) {
                     showFilterOverlay('After');
                 }
                 isLongPressActiveRef.current = false;

                const currentId = selectedFilterIdRef.current;
                
                // USE REF HERE to get current list
                const currentList = displayedFiltersRef.current;
                
                // Find current index in DISPLAYED filters
                const currentIndex = currentList.findIndex(f => f.id === currentId);
                
                console.log('SWIPE RELEASE:', { dx, currentId, currentIndex, listLen: currentList.length });

                if (currentIndex === -1) return;

                // Swipe RIGHT (dx > 0) = Go to PREVIOUS filter/category (backward)
                if (dx > SWIPE_THRESHOLD) {
                    if (currentIndex > 0) {
                         const prevFilter = currentList[currentIndex - 1];
                         if (handleApplyFilterRef.current) {
                             handleApplyFilterRef.current(prevFilter.id);
                         }
                    } else {
                         // At start of list (likely Normal) -> Go to Prev Category, Last Filter
                         const currentCatIndex = CATEGORIES.indexOf(selectedCategoryRef.current);
                         if (currentCatIndex > 0) {
                             isSwipingCategory.current = true; // Block auto-reset
                             const prevCategory = CATEGORIES[currentCatIndex - 1];
                             // Get filters for prev category
                             const prevCatFilters = [ALL_FILTERS[0], ...ALL_FILTERS.slice(1).filter(f => f.category === prevCategory)];
                             // Select LAST filter of prev category
                             const targetFilter = prevCatFilters[prevCatFilters.length - 1];
                             
                             handleCategorySelect(prevCategory);
                             if (handleApplyFilterRef.current) {
                                 handleApplyFilterRef.current(targetFilter.id);
                             }
                             
                             // Reset flag after delay
                             setTimeout(() => { isSwipingCategory.current = false; }, 500);
                         }
                    }
                // Swipe LEFT (dx < 0) = Go to NEXT filter/category (forward)
                } else if (dx < -SWIPE_THRESHOLD) {
                    if (currentIndex < currentList.length - 1) {
                         const nextFilter = currentList[currentIndex + 1];
                         if (handleApplyFilterRef.current) {
                             handleApplyFilterRef.current(nextFilter.id);
                         }
                    } else {
                         // At end of list -> Go to Next Category, First REAL Filter (Skip Normal)
                         const currentCatIndex = CATEGORIES.indexOf(selectedCategoryRef.current);
                         if (currentCatIndex < CATEGORIES.length - 1) {
                             isSwipingCategory.current = true; // Block auto-reset
                             const nextCategory = CATEGORIES[currentCatIndex + 1];
                             // Get filters for next category
                             const nextCatFilters = [ALL_FILTERS[0], ...ALL_FILTERS.slice(1).filter(f => f.category === nextCategory)];
                             
                             // Select Index 1 (Skip Normal) if available, else 0
                             const targetFilter = nextCatFilters.length > 1 ? nextCatFilters[1] : nextCatFilters[0];
                             
                             handleCategorySelect(nextCategory);
                             if (handleApplyFilterRef.current) {
                                 handleApplyFilterRef.current(targetFilter.id);
                             }

                             // Reset flag after delay
                             setTimeout(() => { isSwipingCategory.current = false; }, 500);
                         }
                    }
                }
            },
        })
    ).current;

    const handleSaveCrop = async (res) => {
        // Called when CropView finishes saving
        // res contains { width, height, uri }
        console.log('Final Crop Result:', res);
        if (res && res.uri) {
            triggerSuccess();

            setIsProcessingCrop(true); // Start processing, keep CropView visible until image loads
            
            // Downscale to max 1080x1350 (4:5) if larger — speeds up all subsequent filter operations
            let croppedUri = res.uri;
            try {
                const cleanCropPath = croppedUri.replace('file://', '');
                const resizedPath = await resizeImageForPost(cleanCropPath, 4, 5);
                if (resizedPath && resizedPath !== cleanCropPath) {
                    croppedUri = resizedPath.startsWith('file://') ? resizedPath : `file://${resizedPath}`;
                    console.log('Downscaled cropped image to 1080x1350 max');
                }
            } catch (resizeErr) {
                console.log('Downscale skipped:', resizeErr.message);
            }

            // Update both previewUri AND resolvedUri to the cropped version
            setResolvedUri(croppedUri); 
            resolvedUriRef.current = croppedUri; // Update ref immediately for closures
            // REMOVED: setVisibleUri(croppedUri); // Don't sync visible uri immediately, let onLoadEnd handle it to prevent blink
            
            // Clear the old filtered image since it was based on the pre-crop image
            setFilteredUri(null);
            
            // Re-apply current filter if any
            if (selectedFilterId !== 0) {
                const filter = ALL_FILTERS.find(f => f.id === selectedFilterId);
                if (filter && filter.command !== 'none') {
                    try {
                        const cleanUri = decodeURIComponent(croppedUri.replace('file://', ''));
                        console.log('Re-applying filter after crop:', filter.name);
                        const result = await applyImageFilter(cleanUri, filter.command);
                        if (result) {
                            setFilteredUri(result); // Store full intensity filtered image
                            
                            // Apply current intensity blend
                            const currentOpacity = intensity / 100;
                            if (intensity >= 100) {
                                setPreviewUri(result);
                            } else if (intensity <= 0) {
                                setPreviewUri(croppedUri);
                            } else {
                                const blendedResult = await blendImages(croppedUri, result, currentOpacity);
                                if (blendedResult) {
                                    setPreviewUri(blendedResult);
                                } else {
                                    setPreviewUri(result);
                                }
                            }
                        } else {
                            setPreviewUri(croppedUri);
                        }
                    } catch (error) {
                        console.error('Re-apply filter after crop error:', error);
                        setPreviewUri(croppedUri);
                    } finally {
                        stopPulse();
                        setLoading(false);
                    }
                } else {
                    setPreviewUri(croppedUri);
                }
            } else {
                setPreviewUri(croppedUri);
            }
            
            // Regenerate filter thumbnails from the cropped image
            setThumbnails({});
            initialized.current = false;
            initializeFilterScreen(croppedUri);
        }
        setHasInitialCrop(true); // Mark initial crop as done
        // REMOVED: setIsCropping(false); // Defer until onLoadEnd
    };

    const handleNext = async () => {
        if (editMode === 'crop' && isCropping) {
             // Save crop first
             if (cropViewRef.current) {
                 cropViewRef.current.saveImage(true, 100);
             }
        } else if (editMode === 'filters' || editMode === 'rotate') {
            // Save current state and go back to main edit view (crop tab)
            triggerSuccess();
            const updatedStates = [...imageStates];
            updatedStates[activeIndex] = {
                ...updatedStates[activeIndex],
                selectedFilterId,
                previewUri,
                visibleUri,
                filteredUri,
                intensity,
                isCropping: false,
                hasInitialCrop,
                resolvedUri,
                thumbnails,
                thumbnailsLoading,
            };
            setImageStates(updatedStates);
            setEditMode('crop');
            setIsCropping(false);
        } else {
            triggerSuccess();
            
            // Save current image state before processing
            const finalImageStates = [...imageStates];
            finalImageStates[activeIndex] = {
                ...finalImageStates[activeIndex],
                previewUri,
                hasInitialCrop,
            };

            // Auto-crop any uncropped images to 4:5 + 1080p max
            const processedUris = [];
            for (let i = 0; i < finalImageStates.length; i++) {
                const state = finalImageStates[i];
                let finalUri = state.previewUri;
                
                if (!state.hasInitialCrop) {
                    // Image was never cropped — auto-crop to 4:5 and downscale
                    console.log(`Auto-cropping image ${i + 1} to 4:5...`);
                    try {
                        finalUri = await cropToAspectAndResize(finalUri);
                    } catch (err) {
                        console.error(`Auto-crop failed for image ${i + 1}:`, err);
                    }
                }
                processedUris.push(finalUri);
            }
            
            navigation.navigate('createpostpage', {
                uris: processedUris,
                width: 4,
                height: 5
            });
        }
    };

    // If still resolving uri, show loader
    if (!resolvedUri) {
         return (
             <View style={[styles.container, styles.loaderContainer]}>
                 <ActivityIndicator size="large" color="#ff6c05" />
             </View>
         );
    }

    return (
        <View style={[styles.container, editMode === 'filters' && { paddingTop: insets.top }]}>
            {/* Main Image View */}
            <View style={[styles.imageContainer, {flex: 1, marginTop: editMode === 'filters' ? 10 : 15}]}>
                
                <View 
                    style={[
                        StyleSheet.absoluteFill, 
                        { 
                            opacity: (editMode === 'crop' && isCropping && !isProcessingCrop) ? 0 : 1, 
                            zIndex: 1,
                            justifyContent: 'center', 
                            alignItems: 'center' 
                        }
                    ]}
                    pointerEvents={(editMode === 'crop' && isCropping) ? 'none' : 'auto'}
                    {...(editMode === 'filters' ? panResponder.panHandlers : (editMode === 'crop' && !isCropping || editMode === 'rotate') ? imageSwitchPanResponder.panHandlers : {})}
                >
                    <View style={{ width: imageDisplayWidth, height: imageDisplayHeight, overflow: 'hidden', borderRadius: (editMode === 'filters' || editMode === 'rotate') ? 20 : 0 }}>
                        
                        {/* 1. Background Image (Last Loaded) to prevent blink */}
                        <Image 
                            source={{ uri: visibleUri.startsWith('file://') ? visibleUri : `file://${visibleUri}` }} 
                            style={[styles.mainImage, { position: 'absolute' }]} 
                            resizeMode="cover" 
                        />

                        {/* 2. Foreground Image (Target/Loading) */}
                        <Image 
                            source={{ uri: previewUri.startsWith('file://') ? previewUri : `file://${previewUri}` }} 
                            style={styles.mainImage} 
                            resizeMode="cover" 
                            onLoadEnd={() => {
                                setVisibleUri(previewUri);
                                if (isProcessingCrop) {
                                    Animated.parallel([
                                        Animated.timing(cropOpacity, {
                                            toValue: 0,
                                            duration: 300,
                                            useNativeDriver: true,
                                        }),
                                        Animated.timing(cropScale, {
                                            toValue: 0.95,
                                            duration: 300,
                                            useNativeDriver: true,
                                        })
                                    ]).start(() => {
                                        setIsProcessingCrop(false);
                                        setIsCropping(false);
                                    });
                                }
                            }}
                        />

                        {/* 3. Original Image (Before/After Toggle) */}
                        <Image 
                            source={{ uri: (resolvedUri || uri).startsWith('file://') ? (resolvedUri || uri) : `file://${resolvedUri || uri}` }} 
                            style={[styles.mainImage, { position: 'absolute', opacity: showOriginal ? 1 : 0 }]} 
                            resizeMode="cover" 
                        />

                        {/* Loading Overlay */}
                        {loading && (
                            <View style={[styles.loaderContainer, StyleSheet.absoluteFill, { backgroundColor: 'rgba(255,255,255,0.7)' }]}>
                                <ActivityIndicator size="large" color="#FF6C05" />
                            </View>
                        )}
                    </View>

                    {/* NEW RECROP BUTTON LOCATION - Exactly where DRAG TO REPOSITION is */}
                    {editMode === 'crop' && !isCropping && (
                        <TouchableOpacity 
                            style={[styles.recropBtn, { marginTop: 8, marginBottom: 8 }]}
                            onPress={() => {
                                triggerImpactMedium();
                                setIsCropping(true);
                            }}
                        >
                            <Image source={require('../../Assets/Images/PostImg/Crop.png')} style={{ width: 16, height: 16, tintColor: '#1e1e1e', marginRight: 6 }} resizeMode="contain" />
                            <Text style={styles.recropBtnText}>Recrop</Text>
                        </TouchableOpacity>
                    )}
                    
                    {/* Filter Name Overlay */}
                    {overlayFilterName ? (
                        <Animated.View style={[styles.filterOverlay, { opacity: overlayOpacity }]}>
                            <Text style={styles.filterOverlayText}>{overlayFilterName}</Text>
                        </Animated.View>
                    ) : null}

                </View>

                {/* CropView Overlay - Only when in crop mode */}
                {editMode === 'crop' && isCropping && (
                    <Animated.View style={[StyleSheet.absoluteFill, { 
                        zIndex: 999, 
                        backgroundColor: '#fff', 
                        justifyContent: 'center', 
                        alignItems: 'center',
                        opacity: cropOpacity,
                        transform: [{ scale: cropScale }]
                    }]}>
                        <CropView
                            sourceUrl={originalUri && originalUri.startsWith('file://') ? originalUri : `file://${originalUri}`}
                            style={{width: imageDisplayWidth, height: imageDisplayHeight, backgroundColor: '#f0f0f0'}}
                            ref={cropViewRef}
                            onImageCrop={handleSaveCrop}
                            aspectRatio={{ width: 4, height: 5 }}
                            keepAspectRatio={true}
                            lockAspectRatio={true}
                        />
                        <Text style={{ color: '#888', fontSize: 12, fontFamily: 'Rubik-Regular', marginTop: 8, marginBottom: 8, letterSpacing: 1 }}>DRAG TO REPOSITION</Text>
                    </Animated.View>
                )}

                {/* Custom Error Toast */}
                <Animated.View 
                    style={[
                        styles.errorToast, 
                        { transform: [{ translateY: errorTranslateY }] }
                    ]}
                >
                    <Text style={styles.errorText}>{errorMessage}</Text>
                </Animated.View>
            </View>

            {/* Thumbnail Strip with X Buttons (multi-image only, hidden in filter mode) */}
            {initialUris.length > 1 && editMode === 'crop' && (
                <View style={styles.thumbnailStrip}>
                    <ScrollView 
                        horizontal 
                        showsHorizontalScrollIndicator={false} 
                        style={{ overflow: 'visible' }}
                        contentContainerStyle={styles.thumbnailStripContent} 
                        keyboardShouldPersistTaps="handled"
                    >
                        {imageStates.map((state, index) => {
                            const isCurrent = activeIndex === index;
                            const thumbUri = isCurrent ? previewUri : state.previewUri;
                            
                            return (
                                <View key={index} style={[styles.thumbnailWrapper, index === imageStates.length - 1 && { marginRight: 0 }]}>
                                    <TouchableOpacity 
                                        onPress={() => switchImage(index)}
                                        style={[
                                            styles.thumbnailBox, 
                                            isCurrent && styles.activeThumbnailBox
                                        ]}
                                        activeOpacity={0.85}
                                    >
                                        <Image 
                                            source={{ uri: thumbUri.startsWith('file://') ? thumbUri : `file://${thumbUri}` }} 
                                            style={styles.thumbnailImage}
                                            resizeMode="cover"
                                        />
                                    </TouchableOpacity>
                                    {imageStates.length > 1 && (
                                        <TouchableOpacity 
                                            style={styles.thumbnailRemoveBtn}
                                            onPress={() => removeImage(index)}
                                            hitSlop={{ top: 5, bottom: 5, left: 5, right: 5 }}
                                        >
                                            <Icon name="close" size={12} color="#fff" />
                                        </TouchableOpacity>
                                    )}
                                </View>
                            );
                        })}
                    </ScrollView>
                </View>
            )}

            {/* Mode Controls Container */}
            <View style={[styles.modeControlsArea, editMode === 'crop' && { minHeight: 0 }]}>
                {editMode === 'crop' && !isCropping && (
                    <View style={{ height: 0 }} /> // Spacer removed as Recrop is moved up
                )}

                {editMode === 'rotate' && (
                    <View style={styles.rotateControls}>
                        <TouchableOpacity style={styles.rotateBtn} onPress={() => handleRotateFlip('left')} disabled={loading}>
                            <View style={styles.rotateBtnCircle}>
                                <Image source={require('../../Assets/Images/PostImg/Rotate/ic_round-rotate-left.png')} style={styles.rotateBtnIcon} resizeMode="contain" />
                            </View>
                            <Text style={styles.rotateBtnLabel}>LEFT</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.rotateBtn} onPress={() => handleRotateFlip('right')} disabled={loading}>
                            <View style={styles.rotateBtnCircle}>
                                <Image source={require('../../Assets/Images/PostImg/Rotate/ic_round-rotate-left-1.png')} style={styles.rotateBtnIcon} resizeMode="contain" />
                            </View>
                            <Text style={styles.rotateBtnLabel}>RIGHT</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.rotateBtn} onPress={() => handleRotateFlip('flip')} disabled={loading}>
                            <View style={styles.rotateBtnCircle}>
                                <Image source={require('../../Assets/Images/PostImg/Rotate/flip.png')} style={styles.rotateBtnIcon} resizeMode="contain" />
                            </View>
                            <Text style={styles.rotateBtnLabel}>FLIP</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {editMode === 'filters' && (
                    <View style={styles.filtersPanel}>
                        {/* Intensity Control */}
                        <View style={styles.intensityRow}>
                            <TouchableOpacity
                                style={[styles.intensityBox, selectedFilterId === 0 && { opacity: 0.4 }]}
                                disabled={selectedFilterId === 0}
                                onPress={() => {
                                    triggerSelection();
                                    const presets = [25, 50, 75, 100];
                                    const nextPreset = presets.find(p => p > intensity);
                                    const nextValue = nextPreset !== undefined ? nextPreset : 25;
                                    setIntensity(nextValue);
                                    intensityAnim.setValue(nextValue);
                                }}
                                onLongPress={() => {
                                    triggerImpactMedium();
                                    longPressInterval.current = setInterval(() => {
                                        setIntensity(prev => {
                                            const next = prev >= 100 ? 0 : prev + 1;
                                            if (next % 10 === 0) triggerImpactLight();
                                            intensityAnim.setValue(next);
                                            return next;
                                        });
                                    }, 50);
                                }}
                                onPressOut={() => {
                                    if (longPressInterval.current) {
                                        clearInterval(longPressInterval.current);
                                        longPressInterval.current = null;
                                    }
                                }}
                                delayLongPress={300}
                                activeOpacity={0.7}
                            >
                                <View style={styles.intensityCircleBtn}>
                                    <Svg width={44} height={44} style={styles.progressRing}>
                                        <Circle cx={22} cy={22} r={18} stroke="#e0e0e0" strokeWidth={3} fill="none" />
                                        <Circle cx={22} cy={22} r={18} stroke="#ffa86b" strokeWidth={3} fill="none"
                                            strokeDasharray={`${(intensity / 100) * 113} 113`}
                                            strokeLinecap="round" transform="rotate(-90 22 22)"
                                        />
                                    </Svg>
                                    <Text style={styles.intensityCircleText}>{intensity}</Text>
                                </View>
                                <View style={{ marginLeft: 8 }}>
                                    <Text style={styles.intensityHint}>Intensity</Text>
                                    <Text style={styles.intensitySubLabel}>Tap to tweak</Text>
                                </View>
                            </TouchableOpacity>
                        </View>

                        {/* Category Tabs */}
                        <View style={styles.categoryContainer}>
                            <ScrollView 
                                ref={categoryScrollViewRef}
                                horizontal 
                                showsHorizontalScrollIndicator={false}
                                contentContainerStyle={styles.categoryContent}
                            >
                                {CATEGORIES.map((cat) => (
                                    <TouchableOpacity
                                        key={cat}
                                        style={[styles.categoryChip, selectedCategory === cat && styles.activeChip]}
                                        onPress={() => handleCategorySelect(cat)}
                                    >
                                        <Text style={[styles.categoryText, selectedCategory === cat && styles.activeCategoryText]}>
                                            {cat}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </View>

                        {/* Filter Thumbnails */}
                        <ScrollView 
                            ref={scrollViewRef}
                            horizontal 
                            showsHorizontalScrollIndicator={false} 
                            contentContainerStyle={styles.scrollContent}
                        >
                            {displayedFilters.map((filter) => (
                                <FilterItem
                                    key={filter.id}
                                    filter={filter}
                                    isSelected={selectedFilterId === filter.id}
                                    thumbUri={thumbnails[filter.id] || (filter.id === 0 ? uri : null)}
                                    onSelect={handleApplyFilter}
                                    onToggleFavorite={toggleFavorite}
                                    isFavorite={favorites.includes(filter.name)}
                                    disabled={false}
                                />
                            ))}
                        </ScrollView>
                    </View>
                )}
            </View>

            {/* Bottom: Cancel/Done in filters mode, Tab Bar otherwise */}
            {editMode === 'filters' ? (
                <View style={[styles.cancelDoneBar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
                    <TouchableOpacity 
                        style={styles.cancelBtn}
                        onPress={() => {
                            triggerImpactLight();
                            setEditMode('crop');
                            setIsCropping(false);
                        }}
                    >
                        <Text style={styles.cancelBtnText}>Cancel</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                        style={styles.doneBtn}
                        onPress={() => {
                            // Save filter state and go back to crop tab
                            triggerSuccess();
                            const updatedStates = [...imageStates];
                            updatedStates[activeIndex] = {
                                ...updatedStates[activeIndex],
                                selectedFilterId,
                                previewUri,
                                visibleUri,
                                filteredUri,
                                intensity,
                                isCropping: false,
                                hasInitialCrop,
                                resolvedUri,
                                thumbnails,
                                thumbnailsLoading,
                            };
                            setImageStates(updatedStates);
                            setEditMode('crop');
                            setIsCropping(false);
                        }}
                        disabled={loading}
                    >
                        <Text style={[styles.doneBtnText, loading && { opacity: 0.5 }]}>Done</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <View style={[styles.bottomTabBar, { paddingBottom: Math.max(insets.bottom, 15), paddingTop: 15 }]}>
                    <TouchableOpacity 
                        style={styles.bottomTab}
                        onPress={() => {
                            triggerImpactLight();
                            setEditMode('crop');
                            if (!hasInitialCrop) setIsCropping(true);
                        }}
                    >
                        <View style={[styles.bottomTabBox, editMode === 'crop' && styles.bottomTabActive]}>
                            <Image 
                                source={require('../../Assets/Images/PostImg/Crop.png')} 
                                style={[styles.bottomTabIcon, editMode === 'crop' && styles.bottomTabIconActive]} 
                                resizeMode="contain" 
                            />
                        </View>
                        <Text style={[styles.bottomTabLabel, editMode === 'crop' && styles.bottomTabLabelActive]}>CROP</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                        style={styles.bottomTab}
                        onPress={() => {
                            triggerImpactLight();
                            setEditMode('rotate');
                            setIsCropping(false);
                        }}
                    >
                        <View style={[styles.bottomTabBox, editMode === 'rotate' && styles.bottomTabActive]}>
                            <Image 
                                source={require('../../Assets/Images/PostImg/Rotate.png')} 
                                style={[styles.bottomTabIcon, editMode === 'rotate' && styles.bottomTabIconActive]} 
                                resizeMode="contain" 
                            />
                        </View>
                        <Text style={[styles.bottomTabLabel, editMode === 'rotate' && styles.bottomTabLabelActive]}>ROTATE</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                        style={styles.bottomTab}
                        onPress={() => {
                            triggerImpactLight();
                            setEditMode('filters');
                            setIsCropping(false);
                            // Re-initialize filter thumbnails if needed
                            if (resolvedUri && Object.keys(thumbnails).length === 0) {
                                initialized.current = false;
                                initializeFilterScreen();
                            }
                        }}
                    >
                        <View style={[styles.bottomTabBox, editMode === 'filters' && styles.bottomTabActive]}>
                            <Image 
                                source={require('../../Assets/Images/PostImg/Filters.png')} 
                                style={[styles.bottomTabIcon, editMode === 'filters' && styles.bottomTabIconActive]} 
                                resizeMode="contain" 
                            />
                        </View>
                        <Text style={[styles.bottomTabLabel, editMode === 'filters' && styles.bottomTabLabelActive]}>FILTERS</Text>
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );
};

export default FilterScreen;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    imageContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#fff',
    },
    mainImage: {
        width: '100%',
        height: '100%',
    },
    loaderContainer: {
        justifyContent: 'center',
        alignItems: 'center'
    },
    loadingText: {
        marginTop: 10,
        fontFamily: 'Rubik-Regular',
        color: '#555'
    },
    filterSelector: {
        minHeight: 180, // Minimum height to accommodate tabs
        backgroundColor: '#fafafa',
        // Add faint line for Android as shadow might not be enough
        borderTopWidth: Platform.OS === 'android' ? 1.5 : 0, 
        borderTopColor: '#f0f0f0',
        paddingTop: 15,
        // Subtle top shadow
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 10, // Increased from 3
    },
    selectText: {
        display: 'none',
    },
    scrollContent: {
        paddingHorizontal: 15,
        alignItems: 'center', // Center thumbnails vertically
        flexGrow: 1, // Fill available space
    },
    filterItem: {
        marginRight: 12,
        alignItems: 'center',
    },
    filterName: {
        fontFamily: 'Rubik-Regular',
        fontSize: 11,
        color: '#888',
        marginTop: 6,
        marginBottom: 12,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    selectedFilterText: {
        color: '#1e1e1e',
        fontFamily: 'Rubik-SemiBold'
    },
    filterPreviewBox: {
        width: 56,
        height: 70, // 4:5 aspect ratio (56 * 5/4 = 70)
        borderRadius: 6,
        overflow: 'hidden',
        backgroundColor: '#1e1e1e',
        borderWidth: 2.5,
        borderColor: 'transparent',
        marginTop: 2
    },
    selectedFilterBox: {
        borderWidth: 3,
        borderColor: '#1e1e1e',
        transform: [{ scale: 1.05 }]
    },
    filterThumbnail: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    favoriteIcon: {
        position: 'absolute',
        bottom: 4,
        right: 4,
        zIndex: 10,
    },
    filterOverlay: {
        position: 'absolute',
        top: '50%',
        left: 0,
        right: 0,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: -20,
    },
    filterOverlayText: {
        fontFamily: 'Rubik-SemiBold',
        fontSize: 22,
        color: '#fff',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 8,
        overflow: 'hidden',
    },
    absoluteImage: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
    },
    controlsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 15,
        paddingVertical: 10,
        backgroundColor: '#fafafa',
        borderTopWidth: 1,
        borderTopColor: '#eee',
    },
    intensityBox: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        backgroundColor: '#fff',
        borderRadius: 10,
        paddingVertical: 4,
        paddingHorizontal: 10,
        borderWidth: 1,
        borderColor: '#e0e0e0',
    },
    beforeAfterBtn: {
        padding: 8,
        backgroundColor: '#fff',
        borderRadius: 10,
    },
    sliderContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
    },
    intensityLabel: {
        fontFamily: 'Rubik-Medium',
        fontSize: 12,
        color: '#666',
        width: 35,
        textAlign: 'right',
        marginRight: 8,
    },
    intensityCircleBtn: {
        width: 44,
        height: 44,
        justifyContent: 'center',
        alignItems: 'center',
    },
    progressRing: {
        position: 'absolute',
    },
    intensityCircleText: {
        fontFamily: 'Rubik-SemiBold',
        fontSize: 12,
        color: '#ffa86b',
    },
    intensityHint: {
        fontFamily: 'Rubik-Medium',
        fontSize: 11,
        color: '#1e1e1e',
    },
    intensitySubLabel: {
        fontFamily: 'Rubik-Regular',
        fontSize: 10,
        color: '#999',
    },
    categoryContainer: {
        marginBottom: 12,
        height: 44,
    },
    categoryContent: {
        paddingHorizontal: 15,
        alignItems: 'center',
    },
    categoryChip: {
        paddingVertical: 8,
        paddingHorizontal: 20,
        borderRadius: 36,
        backgroundColor: '#F5F5F5',
        marginRight: 10,
        borderWidth: 1.5,
        borderColor: '#1e1e1e',
    },
    activeChip: {
        backgroundColor: '#FFA86B',
        shadowColor: '#FFA86B',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },
    categoryText: {
        fontFamily: 'Rubik-Medium',
        fontSize: 14,
        color: '#1e1e1e',
    },
    activeCategoryText: {
        color: '#1e1e1e',
        fontFamily: 'Rubik-Medium',
        fontSize : 14
    },
    errorToast: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        backgroundColor: '#FF8080',
        paddingVertical: 12,
        paddingHorizontal: 20,
        zIndex: 2000,
        alignItems: 'center',
        justifyContent: 'center',
        borderBottomLeftRadius: 12,
        borderBottomRightRadius: 12,
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
    },
    errorText: {
        color: '#fff',
        fontFamily: 'Rubik-Bold',
        fontSize: 14,
        textAlign: 'center',
        textShadowColor: 'rgba(0, 0, 0, 0.2)',
        textShadowOffset: { width: 1, height: 1 },
        textShadowRadius: 2,
    },
    multiImageSwitcher: {
        height: 60,
        backgroundColor: '#fff',
        borderTopWidth: 1,
        borderTopColor: '#f0f0f0',
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    multiImageSwitcherContent: {
        paddingHorizontal: 15,
        alignItems: 'center',
        paddingVertical: 10,
    },
    switcherThumb: {
        width: 44,
        height: 44,
        borderRadius: 8,
        marginRight: 10,
        backgroundColor: '#f3f3f3',
        overflow: 'hidden',
        borderWidth: 2,
        borderColor: 'transparent',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    activeSwitcherThumb: {
        borderColor: '#ffa86b',
        transform: [{ scale: 1.05 }],
    },
    switcherImageContainer: {
        width: '100%',
        height: '100%',
    },
    switcherImage: {
        width: '100%',
        height: '100%',
    },
    editedIndicator: {
        position: 'absolute',
        top: 2,
        right: 2,
        backgroundColor: '#4CAF50',
        borderRadius: 6,
        width: 12,
        height: 12,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: '#fff',
    },

    // --- New Styles for Tab-Based UI ---

    thumbnailStrip: {
        backgroundColor: 'transparent',
        height: 100,
        overflow: 'visible',
    },
    thumbnailStripContent: {
        paddingHorizontal: 15,
        alignItems: 'center',
        justifyContent: 'center',
        flexGrow: 1,
        paddingTop: 25,
        overflow: 'visible',
    },
    thumbnailWrapper: {
        position: 'relative',
        marginRight: responsiveWidth(5),
        overflow: 'visible',
    },
    thumbnailBox: {
        width: 55,
        height: 55,
        borderRadius: 9,
        overflow: 'hidden',
    },
    activeThumbnailBox: {
        borderWidth: 3,
        borderColor: '#1e1e1e',
    },
    thumbnailImage: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    thumbnailRemoveBtn: {
        position: 'absolute',
        top: -8,
        right: -8,
        width: 20,
        height: 20,
        backgroundColor: '#1E1E1ED9',
        borderRadius: 10,
        borderWidth: 2,
        borderColor: '#1e1e1e',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10,
    },

    modeControlsArea: {
        backgroundColor: '#fff',
        minHeight: 80,
    },

    // Rotate mode
    rotateControls: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 20,
        gap: 40,
    },
    rotateBtn: {
        alignItems: 'center',
    },
    rotateBtnCircle: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: '#ffefe4',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    rotateBtnIcon: {
        width: 24,
        height: 24,
        tintColor: '#1e1e1e',
    },
    rotateBtnLabel: {
        fontFamily: 'Rubik-Medium',
        fontSize: 11,
        color: '#666',
        letterSpacing: 0.5,
    },

    // Filters panel
    filtersPanel: {
        backgroundColor: '#fafafa',
    },
    intensityRow: {
        paddingHorizontal: 15,
        paddingVertical: 8,
    },

    // Bottom Tab Bar
    bottomTabBar: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        paddingTop: 12,
        backgroundColor: '#fff',
        borderTopWidth: 1,
        borderTopColor: '#e8e8e8',
    },
    bottomTab: {
        alignItems: 'center',
        flex: 1,
    },
    bottomTabBox: {
        alignItems: 'center',
        justifyContent: 'center',
        width: 48,
        height: 48,
        borderWidth: 2,
        borderColor: '#1e1e1e',
        borderRadius: 16,
    },
    bottomTabLabel: {
        fontFamily: 'Rubik-Bold',
        fontSize: 11,
        color: '#1e1e1e',
        marginTop: 12,
        textTransform: 'uppercase',
    },
    bottomTabLabelActive: {
        color: '#1e1e1e',
    },
    bottomTabActive: {
        backgroundColor: '#ffa86b',
        borderColor: '#1e1e1e',
    },
    bottomTabIcon: {
        width: 24,
        height: 24,
        tintColor: '#1e1e1e',
    },
    bottomTabIconActive: {
        tintColor: '#1e1e1e',
    },

    // Recrop button
    recropContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 20,
    },
    recropBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'transparent',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 25,
    },
    recropBtnText: {
        fontFamily: 'Rubik-SemiBold',
        fontSize: 14,
        color: '#1e1e1e',
    },

    // Cancel / Done Bar (filters mode only)
    cancelDoneBar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 12,
        backgroundColor: '#fff',
        borderTopWidth: 1,
        borderTopColor: '#e8e8e8',
    },
    cancelBtn: {
        paddingVertical: 10,
        paddingHorizontal: 4,
    },
    cancelBtnText: {
        fontFamily: 'Rubik-SemiBold',
        fontSize: responsiveWidth(3.5),
        color: '#1e1e1e',
    },
    doneBtn: {
        paddingVertical: 10,
        paddingHorizontal: 4,
    },
    doneBtnText: {
        fontFamily: 'Rubik-SemiBold',
        fontSize: responsiveWidth(3.5),
        color: '#1e1e1e',
    },
});
