import React, { useEffect, useRef } from 'react';
import { Animated, View, StyleSheet, Easing } from 'react-native';
import { responsiveWidth } from 'react-native-responsive-dimensions';
import { LinearGradient } from 'expo-linear-gradient';

const RevenueChartShimmer = () => {
    const shimmerAnimatedValue = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.loop(
            Animated.timing(shimmerAnimatedValue, {
                toValue: 1,
                duration: 1000,
                easing: Easing.linear,
                useNativeDriver: true,
            })
        ).start();
    }, [shimmerAnimatedValue]);

    const translateX = shimmerAnimatedValue.interpolate({
        inputRange: [0, 1],
        outputRange: [-responsiveWidth(100), responsiveWidth(100)],
    });

    const ShimmerView = ({ style }) => (
        <View style={[style, { overflow: 'hidden', backgroundColor: '#F0F0F0' }]}>
             {/* Lighter background for better contrast in white card */}
            <Animated.View
                style={[
                    StyleSheet.absoluteFill,
                    {
                        transform: [{ translateX }],
                    },
                ]}
            >
                <LinearGradient
                    colors={['transparent', 'rgba(255, 255, 255, 0.5)', 'transparent']}
                    start={{ x: 0, y: 0.5 }}
                    end={{ x: 1, y: 0.5 }}
                    style={{ flex: 1 }}
                />
            </Animated.View>
        </View>
    );

    return (
        <View style={styles.container}>
            {/* Main Dashboard Card Shimmer */}
            <View style={styles.mainCard}>
                
                {/* Header: Total Earnings + Date */}
                <View style={styles.headerRow}>
                    <View>
                        <ShimmerView style={{ width: responsiveWidth(25), height: 14, marginBottom: 8, borderRadius: 4 }} />
                        <ShimmerView style={{ width: responsiveWidth(35), height: 32, borderRadius: 6 }} />
                    </View>
                    <ShimmerView style={{ width: responsiveWidth(20), height: 12, borderRadius: 4 }} />
                </View>

                {/* Divider */}
                <View style={{ height: 1, backgroundColor: '#f0f0f0', marginVertical: 15 }} />

                {/* Bar Chart Bars */}
                <View style={styles.chartContainer}>
                    {[1, 2, 3, 4, 5].map((i) => (
                        <View key={i} style={{ alignItems: 'center', gap: 5 }}>
                             <ShimmerView style={{
                                width: responsiveWidth(10), 
                                height: [responsiveWidth(15), responsiveWidth(35), responsiveWidth(10), responsiveWidth(25), responsiveWidth(20)][i-1], 
                                borderRadius: 8
                             }} />
                             <ShimmerView style={{ width: responsiveWidth(8), height: 8, borderRadius: 2 }} />
                        </View>
                    ))}
                </View>

                {/* Hide Features Breakdown Text */}
                <View style={{ width: '100%', alignItems: 'center', marginVertical: 15 }}>
                     <ShimmerView style={{ width: responsiveWidth(40), height: 14, borderRadius: 4 }} />
                </View>

                 {/* Feature Grid */}
                 <View style={styles.gridContainer}>
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                        <ShimmerView 
                            key={i} 
                            style={{
                                width: '30%', // Matches 32% with gap
                                height: 64, 
                                borderRadius: 12, 
                                marginBottom: 10
                            }} 
                        />
                    ))}
                 </View>
            </View>

            {/* Earnings Card Shimmer (Bottom List) */}
            <View style={{ marginTop: responsiveWidth(6.4), width: '100%' }}>
                 <ShimmerView style={{ width: '40%', height: 20, marginBottom: 10, borderRadius: 4 }} />
                 <View style={styles.card}>
                    {[1, 2, 3, 4].map((item, index) => (
                        <View key={item}>
                             <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 5 }}>
                                <ShimmerView style={{ width: '30%', height: 16, borderRadius: 4 }} />
                                <ShimmerView style={{ width: '20%', height: 16, borderRadius: 4 }} />
                             </View>
                             {index < 3 && <View style={{ height: responsiveWidth(5.87) }} />}
                        </View>
                    ))}
                 </View>
            </View>

            {/* Buttons Shimmer */}
             <ShimmerView style={{ width: '100%', height: 56, borderRadius: 14, marginTop: responsiveWidth(6.4) }} />
             <ShimmerView style={{ width: '100%', height: 56, borderRadius: 28, marginTop: responsiveWidth(6.4) }} />

        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        justifyContent: 'center',
        marginVertical: responsiveWidth(5),
        width: '100%',
    },
    mainCard: {
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 20,
        width: '100%',
        borderWidth: 1,
        borderColor: '#f0f0f0',
        elevation: 2,
    },
    headerRow: {
        flexDirection: 'row', 
        justifyContent: 'space-between', 
        alignItems: 'flex-start'
    },
    chartContainer: {
        height: responsiveWidth(45), 
        flexDirection: 'row', 
        alignItems: 'flex-end', 
        justifyContent: 'space-between',
        paddingHorizontal: 5,
        marginBottom: 10
    },
    gridContainer: {
        flexDirection: 'row', 
        flexWrap: 'wrap', 
        justifyContent: 'space-between'
    },
    card: {
        borderWidth: 1.5,
        borderColor: '#E0E0E0',
        borderRadius: 10,
        padding: 15,
        width: '100%',
        alignSelf: 'center',
        backgroundColor: '#fff',
    },
});

export default RevenueChartShimmer;
