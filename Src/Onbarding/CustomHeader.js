import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export const CustomHeader = ({ currentStep, totalSteps }) => {
    const steps = Array.from({ length: totalSteps }, (_, i) => i + 1);

    return (
        <View style={styles.headerContainer}>
            <View style={styles.stepIndicator}>
                {steps.map((step, index) => (
                    <View
                        key={index}
                        style={step === currentStep ? styles.stepBarActive : styles.stepDot}
                    />
                ))}
            </View>
            <Text style={styles.stepText}>
                Step {currentStep} of {totalSteps}
            </Text>
        </View>
    );
};

const styles = StyleSheet.create({
    headerContainer: {
        paddingTop: 20,
        paddingBottom: 20,
        alignItems: 'center',
        backgroundColor: '#FFF',
        borderBottomWidth: 1,
        borderBottomColor: '#E9E9E9',
    },
    stepIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 8,
    },
    stepBarActive: {
        width: 32,
        height: 8,
        backgroundColor: '#FF8C42',
        borderRadius: 4,
    },
    stepDot: {
        width: 8,
        height: 8,
        backgroundColor: '#FFF',
        borderRadius: 4,
        borderWidth: 1.5,
        borderColor: '#1E1E1E',
    },
    stepText: {
        fontSize: 12,
        fontFamily: 'Rubik-Medium',
        color: '#1E1E1E',
    },
});