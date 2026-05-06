import React from 'react';
import Svg, { Rect, Path } from 'react-native-svg';

const CompareIcon = ({ size = 24 }) => (
  <Svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none"
  >
    {/* Main Container with thicker stroke and brand color */}
    <Rect 
      x="3" 
      y="3" 
      width="18" 
      height="18" 
      rx="3" 
      stroke="#FFA86B" 
      strokeWidth="2.5" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
    />
    
    {/* Divider Line */}
    <Path 
      d="M12 3v18" 
      stroke="#FFA86B" 
      strokeWidth="2.5" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
    />
  </Svg>
);

export default CompareIcon;
