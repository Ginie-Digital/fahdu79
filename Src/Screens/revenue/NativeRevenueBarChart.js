import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { responsiveFontSize, responsiveWidth, responsiveHeight } from 'react-native-responsive-dimensions';

const screenWidth = Dimensions.get('window').width;

const NativeRevenueBarChart = ({ graphData, onChartClick }) => {
  const data = graphData?.orderedEarnings || [];

  // Find the maximum value to normalize bar heights
  const maxPercentage = data.reduce((max, item) => Math.max(max, item.earningsPercentage || 0), 0);
  
  // Safety check to avoid division by zero if maxPercentage is 0 (though ideally it shouldn't be)
  const safeMax = maxPercentage === 0 ? 100 : maxPercentage;

  return (
    <View style={styles.container}>
      {/* Y-axis labels (hidden or simplified as per design, following previous style) */}
      
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContainer}
      >
        {data.map((item, index) => {
          // Calculate height relative to a max height (e.g., 180px)
          const barHeight = (item.earningsPercentage / safeMax) * 150; 
          // Ensure a minimum height for visibility even if 0
          const finalHeight = Math.max(barHeight, 12); 

          return (
            <TouchableOpacity 
              key={index} 
              style={styles.barContainer}
              onPress={() => onChartClick && onChartClick(item.category)}
              activeOpacity={0.8}
            >
                {/* Percentage Label */}
              <Text style={styles.percentageText}>
                {item.earningsPercentage ? `${item.earningsPercentage.toFixed(1)}%` : '0%'}
              </Text>

              {/* Bar */}
              <View 
                style={[
                  styles.bar, 
                  { 
                    height: finalHeight,
                    backgroundColor: item.color || '#CCCCCC' 
                  }
                ]} 
              />
              
              {/* Category Label removed as per request */}
              {/* <Text style={styles.label} numberOfLines={1}>
                {item.category}
              </Text> */}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 250, 
    width: '100%',
    backgroundColor: '#fff',
    paddingVertical: 10,
  },
  scrollContainer: {
    paddingHorizontal: 0, // Removed padding to align with features breakdown
    alignItems: 'flex-end', // Align bars to bottom
    minWidth: '100%'
  },
  barContainer: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    width: 45, // Reduced width for tighter spacing
    marginRight: 2, // Reduced margin
    height: '100%',
  },
  percentageText: {
    fontFamily: 'Rubik-Medium',
    fontSize: 10, // Adjusted for cleaner look
    color: '#1e1e1e',
    marginBottom: 5,
  },
  bar: {
    width: 35, // Bar thickness
    borderWidth: 1.5,
    borderColor: '#1e1e1e',
    borderRadius: 6,
    // borderBottomLeftRadius: 6,
    // borderBottomRightRadius: 6,
  },
  label: {
    marginTop: 8,
    fontFamily: 'Rubik-Medium',
    fontSize: 10,
    color: '#555',
    textAlign: 'center',
    width: '100%',
  },
});

export default NativeRevenueBarChart;
