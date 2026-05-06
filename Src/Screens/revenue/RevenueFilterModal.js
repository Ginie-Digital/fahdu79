import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal } from 'react-native';
import DatePicker from 'react-native-date-picker';
import { responsiveFontSize, responsiveWidth } from 'react-native-responsive-dimensions';
import Ionicons from 'react-native-vector-icons/Ionicons';
import AnimatedButton from '../../Components/AnimatedButton';
import moment from 'moment';

const RevenueFilterModal = ({ visible, onClose, onApply }) => {
  const [filterType, setFilterType] = useState('Weekly');
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [openStart, setOpenStart] = useState(false);
  const [openEnd, setOpenEnd] = useState(false);

  // Close button handler
  const handleClose = () => {
    onClose();
  };

  const handleApply = () => {
    onApply(filterType, startDate, endDate);
    onClose();
  };

  const formatDate = (date) => {
    return moment(date).format('DD MMM YYYY');
  };

  const renderOption = (type, title, subtitle) => {
    const isSelected = filterType === type;
    return (
      <TouchableOpacity
        style={[styles.option, isSelected ? styles.selectedOption : styles.unselectedOption]}
        onPress={() => setFilterType(type)}
        activeOpacity={0.8}
      >
        <View style={{
            height: 24,
            width: 24,
            borderRadius: 12,
            borderWidth: 1.6,
            borderColor: '#1e1e1e',
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: 15,
            backgroundColor: isSelected ? '#FFA86B' : 'transparent' 
        }}>
           {isSelected && <Ionicons name="checkmark" size={18} color="#1e1e1e" />}
        </View>
        <View>
            <Text style={[styles.optionTitle, { color: '#1e1e1e' }]}>{title}</Text>
            <Text style={styles.optionSubtitle}>{subtitle}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      transparent={true}
      visible={visible}
      animationType="fade"
      onRequestClose={handleClose}
    >
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={handleClose}>
        <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
          <View style={styles.headerRow}>
            <Text style={styles.title}>Filter by Date</Text>
            <TouchableOpacity onPress={handleClose}>
                <Ionicons name="close" size={24} color="#1e1e1e" />
            </TouchableOpacity>
          </View>

          {renderOption('Weekly', 'Weekly', 'Last 7 days')}
          {renderOption('Custom', 'Custom Range', 'Select date range')}

          {filterType === 'Custom' && (
            <View style={styles.customDateContainer}>
              <TouchableOpacity style={styles.dateButton} onPress={() => setOpenStart(true)}>
                <Text style={styles.dateLabel}>From Date</Text>
                <Text style={styles.dateValue}>{formatDate(startDate)}</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.dateButton} onPress={() => setOpenEnd(true)}>
                <Text style={styles.dateLabel}>To Date</Text>
                <Text style={styles.dateValue}>{formatDate(endDate)}</Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={{ marginTop: 20 }}>
            <AnimatedButton buttonMargin={-1} title="Apply Filter" onPress={handleApply} showOverlay={false} />
          </View>
        </View>
      </TouchableOpacity>

      <DatePicker
        modal
        open={openStart}
        date={startDate}
        mode="date"
        maximumDate={new Date()}
        onConfirm={(date) => {
          setOpenStart(false);
          const now = new Date();
          const selectedDate = date > now ? now : date;
          setStartDate(selectedDate);
          if (selectedDate > endDate) {
            setEndDate(selectedDate);
          }
        }}
        onCancel={() => {
          setOpenStart(false);
        }}
      />

      <DatePicker
        modal
        open={openEnd}
        date={endDate}
        mode="date"
        minimumDate={startDate}
        maximumDate={new Date()}
        onConfirm={(date) => {
          setOpenEnd(false);
          const selectedDate = date < startDate ? startDate : date;
          setEndDate(selectedDate);
        }}
        onCancel={() => {
          setOpenEnd(false);
        }}
      />
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: responsiveWidth(85),
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 32,
    borderWidth: 1.5,
    borderColor: '#1e1e1e',
    borderStyle: 'dashed',
  },
  headerRow: {
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: 20
  },
  title: {
    fontFamily: 'Rubik-Bold', // Use Bold for header
    fontSize: 18,
    color: '#1e1e1e',
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 15,
    borderRadius: 14,
    marginBottom: 12,
    borderWidth: 1.5,
  },
  unselectedOption: {
    backgroundColor: '#fff',
    borderColor: '#1e1e1e',
  },
  selectedOption: {
    backgroundColor: '#FFF5EC', // Light peach
    borderColor: '#FFA86B', // Peach/Orange border
  },
  optionTitle: {
    fontFamily: 'Rubik-SemiBold',
    fontSize: 16,
    marginBottom: 2,
  },
  optionSubtitle: {
    fontFamily: 'Rubik-Regular',
    fontSize: 13,
    color: '#444',
  },
  
  customDateContainer: {
    marginTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  dateButton: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#1e1e1e',
    alignItems: 'flex-start',
  },
  dateLabel: {
    fontFamily: 'Rubik-Regular',
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  dateValue: {
    fontFamily: 'Rubik-Medium',
    fontSize: 14,
    color: '#0A0A0A',
  },
});

export default RevenueFilterModal;
