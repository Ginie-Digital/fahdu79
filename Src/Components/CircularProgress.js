import React from 'react';
import { View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

/**
 * Twitter-like circular progress indicator
 * @param {number} current - Current value/count
 * @param {number} max - Maximum value/count
 * @param {number} size - Size of the circle (default: 24)
 * @param {string} progressColor - Custom progress color (optional)
 * @param {string} backgroundColor - Custom background circle color (default: #E0E0E0)
 */
const CircularProgress = ({
    current,
    max,
    size = 24,
    progressColor: customProgressColor,
    backgroundColor = '#1E1E1E'
}) => {
    const progressStrokeWidth = 3;
    const backgroundStrokeWidth = 1.5;
    const radius = (size - progressStrokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const progress = Math.min(current / max, 1);
    const strokeDashoffset = circumference - (progress * circumference);

    // Color changes based on remaining characters
    const remaining = max - current;
    let progressColor = customProgressColor || '#FFA86B'; // Orange

    if (!customProgressColor) {
        if (remaining <= 20 && remaining > 0) {
            progressColor = '#FFB347'; // Light orange warning
        } else if (remaining <= 0) {
            progressColor = '#FF6B6B'; // Red
        }
    }

    return (
        <View style={{ width: size, height: size }}>
            <Svg width={size} height={size}>
                {/* Background circle */}
                <Circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke={backgroundColor}
                    strokeWidth={backgroundStrokeWidth}
                    fill="none"
                />
                {/* Progress circle */}
                <Circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke={progressColor}
                    strokeWidth={progressStrokeWidth}
                    fill="none"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    transform={`rotate(-90 ${size / 2} ${size / 2})`}
                />
            </Svg>
        </View>
    );
};

export default CircularProgress;
