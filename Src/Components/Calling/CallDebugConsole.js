import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { height: SCREEN_H } = Dimensions.get('window');

export const CallDebugConsole = ({ logs, onClear }) => {
  const [isOpen, setIsOpen] = useState(false);
  const insets = useSafeAreaInsets();
  const scrollViewRef = useRef(null);

  const handleToggle = () => {
    setIsOpen(!isOpen);
  };

  return (
    <>
      {/* Floating Badge Button */}
      <TouchableOpacity
        onPress={handleToggle}
        style={[styles.floatingButton, { top: insets.top + 80 }]}
        activeOpacity={0.8}
      >
        <Text style={styles.floatingButtonText}>🐞 debug</Text>
      </TouchableOpacity>

      {/* Slide-out Terminal Panel */}
      {isOpen && (
        <View style={[styles.consoleContainer, { paddingBottom: Math.max(insets.bottom, 15) }]}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>🐞 Polling Console</Text>
            <View style={styles.headerActions}>
              <TouchableOpacity onPress={onClear} style={styles.actionButton} activeOpacity={0.7}>
                <Text style={styles.actionButtonText}>Clear</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleToggle} style={[styles.actionButton, styles.closeButton]} activeOpacity={0.7}>
                <Text style={styles.actionButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Log Stream */}
          <ScrollView 
            ref={scrollViewRef}
            style={styles.logStream} 
            contentContainerStyle={styles.logStreamContent}
            onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
          >
            {logs.length === 0 ? (
              <Text style={styles.emptyText}>No logs recorded yet. Polling will write entries here...</Text>
            ) : (
              logs.map((log, index) => {
                let color = '#a3e635'; // lime green for normal response/started
                if (log.includes('Error')) color = '#f87171'; // red for errors
                else if (log.includes('Action')) color = '#60a5fa'; // light blue for callbacks
                else if (log.includes('Request')) color = '#cbd5e1'; // light grey for requests
                
                return (
                  <Text key={index} style={[styles.logLine, { color }]}>
                    {log}
                  </Text>
                );
              })
            )}
          </ScrollView>
        </View>
      )}
    </>
  );
};

const styles = StyleSheet.create({
  floatingButton: {
    position: 'absolute',
    right: 12,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    zIndex: 99999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  floatingButtonText: {
    fontFamily: 'monospace',
    fontSize: 12,
    color: '#e2e8f0',
    fontWeight: 'bold',
  },
  consoleContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: SCREEN_H * 0.35,
    backgroundColor: 'rgba(15, 23, 42, 0.95)',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderTopWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    zIndex: 99999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: 'bold',
    fontFamily: 'monospace',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
  },
  closeButton: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
  },
  actionButtonText: {
    color: '#e2e8f0',
    fontSize: 11,
    fontWeight: '600',
    fontFamily: 'monospace',
  },
  logStream: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  logStreamContent: {
    paddingBottom: 20,
  },
  logLine: {
    fontFamily: 'monospace',
    fontSize: 10,
    lineHeight: 14,
    marginBottom: 4,
  },
  emptyText: {
    fontFamily: 'monospace',
    fontSize: 11,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 40,
  },
});
