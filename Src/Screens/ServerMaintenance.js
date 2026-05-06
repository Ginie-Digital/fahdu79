import { StyleSheet, Text, View, Image, StatusBar, TouchableOpacity, Linking, ActivityIndicator } from 'react-native';
import React, { useState } from 'react';
import { responsiveFontSize, responsiveWidth, responsiveHeight } from 'react-native-responsive-dimensions';
import AnimatedButton from '../Components/AnimatedButton';
import { useDispatch } from 'react-redux';
import { toggleServerMaintenance } from '../../Redux/Slices/NormalSlices/HideShowSlice';
import Ionicons from 'react-native-vector-icons/Ionicons';

const ServerMaintenance = () => {
  const dispatch = useDispatch();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = () => {
    setIsRefreshing(true);
    // API logic to check status would go here
    console.log("Refreshing status...");
    
    // Simulate API call
    setTimeout(() => {
      setIsRefreshing(false);
      // dispatch(toggleServerMaintenance({ show: false })); // Uncomment when API ready
    }, 2000);
  };

  const handleContactUs = () => {
    // Open email or support link
    Linking.openURL('mailto:contact@fahdu.com');
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff9f5" />
      
      {/* Main Card */}
      <View style={styles.card}>
        {/* Icon */}
        <View style={styles.iconContainer}>
          <Image 
            source={require('../../Assets/Images/UnderMain.png')} 
            style={styles.icon}
            resizeMode="contain"
          />
        </View>

        {/* Title */}
        <Text style={styles.title}>Under</Text>
        <Text style={styles.title}>Maintenance</Text>
        
        {/* Description */}
        <Text style={styles.description}>
          We're upgrading our systems to provide you with an even better experience. Thank you for your patience!
        </Text>

        {/* Refresh Button */}
        <TouchableOpacity 
          style={[styles.refreshButton, isRefreshing && styles.refreshButtonDisabled]} 
          onPress={handleRefresh}
          disabled={isRefreshing}
        >
          {isRefreshing ? (
            <>
              <ActivityIndicator size="small" color="#FFA86B" />
              <Text style={styles.refreshButtonText}>Refreshing...</Text>
            </>
          ) : (
            <>
              <Ionicons name="refresh-outline" size={20} color="#1e1e1e" />
              <Text style={styles.refreshButtonText}>Refresh</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Contact Us Link */}
      <View style={styles.contactContainer}>
        <Text style={styles.contactText}>Need help? </Text>
        <TouchableOpacity onPress={handleContactUs}>
          <Text style={styles.contactLink}>Contact us</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default ServerMaintenance;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff9f5',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: responsiveWidth(6),
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingVertical: responsiveHeight(5),
    paddingHorizontal: responsiveWidth(8),
    width: '100%',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#1e1e1e',
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#1e1e1e',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: responsiveHeight(3),
  },
  icon: {
    width: 45,
    height: 45,
    tintColor: '#fff',
  },
  title: {
    fontFamily: 'Rubik-Bold',
    fontSize: 30,
    color: '#1e1e1e',
    textAlign: 'center',
    lineHeight: 38,
  },
  description: {
    fontFamily: 'Rubik-Regular',
    fontSize: 16,
    color: '#1e1e1e',
    textAlign: 'center',
    lineHeight: 22,
    marginTop: responsiveHeight(2),
    marginBottom: responsiveHeight(3),
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: responsiveHeight(1.5),
    paddingHorizontal: responsiveWidth(6),
    borderRadius: 30,
    borderWidth: 1.5,
    borderColor: '#FFA86B',
    gap: 8,
  },
  refreshButtonText: {
    fontFamily: 'Rubik-Medium',
    fontSize: responsiveFontSize(1.7),
    color: '#1e1e1e',
  },
  refreshButtonDisabled: {
    opacity: 0.7,
  },
  contactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 28,
  },
  contactText: {
    fontFamily: 'Rubik-Regular',
    fontSize: responsiveFontSize(1.6),
    color: '#666',
  },
  contactLink: {
    fontFamily: 'Rubik-Bold',
    fontSize: responsiveFontSize(1.6),
    color: '#1e1e1e',
    textDecorationLine: 'underline',
  },
});
