import React from 'react';
import { View, Dimensions } from 'react-native';
import { WebView } from 'react-native-webview';

const screenWidth = Dimensions.get('window').width;

const RevenueBarChart = ({ graphData, onChartClick }) => {
  // Use a fallback object if graphData or orderedEarnings is missing
  const data = graphData?.orderedEarnings || [];
  
  // Dynamic width: Ensure visible text. Min width = screen width.
  // ~60px per bar ensures they aren't cramped.
  const chartWidth = Math.max(screenWidth, data.length * 70);

  const htmlContent = `
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <link href="https://fonts.googleapis.com/css2?family=Rubik:wght@400;500;700&display=swap" rel="stylesheet">
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/chartjs-plugin-datalabels"></script>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: transparent;
    }
    .scroll-container {
      width: 100vw;
      overflow-x: auto;
      overflow-y: hidden;
      -webkit-overflow-scrolling: touch;
    }
    .chart-wrapper {
        width: ${chartWidth}px; /* Dynamic width */
        height: 220px; /* Fixed height to match container */
        padding: 0 10px;
        box-sizing: border-box;
    }
    canvas {
        width: 100% !important;
        height: 100% !important;
    }
  </style>
</head>
<body>
  <div class="scroll-container">
    <div class="chart-wrapper">
      <canvas id="barChart"></canvas>
    </div>
  </div>
  <script>
    document.addEventListener("DOMContentLoaded", function () {
      const logData = $LOG_DATA$;
      
      const labels = logData.map(item => item.category);
      // Original values for labels
      const originalData = logData.map(item => item.earningsPercentage);
      // Visual data: if value is 0, give it a small height (e.g. 5) so the bar appears
      const visualData = originalData.map(val => val === 0 ? 3 : val);

      const backgroundColors = ['#FFC6A5', '#B3D9FF', '#B59FFF', '#FFCFD2', '#FBF8CC', '#D5FFDE', '#B5F8FE'];

      var ctx = document.getElementById('barChart').getContext('2d');
      Chart.register(ChartDataLabels);

      new Chart(ctx, {
        type: 'bar',
        data: {
          labels: labels,
          datasets: [{
            data: visualData,
            backgroundColor: backgroundColors,
            borderColor: '#000',
            borderWidth: 1.5,
            borderRadius: 6,
            borderSkipped: false,
            barThickness: 30, // Fixed legible thickness
          }]
        },
        options: {
          onClick: (e, elements) => {
            if (elements.length > 0) {
              const index = elements[0].index;
              const label = labels[index];
              if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
                window.ReactNativeWebView.postMessage(label);
              }
            }
          },
          responsive: true,
          maintainAspectRatio: false,
          layout: {
            padding: {
                top: 25,
                bottom: 10
            }
          },
          scales: {
            x: {
              grid: { display: false },
              ticks: {
                font: { family: 'Rubik', weight: '500', size: 10 },
                color: '#1e1e1e',
                autoSkip: false,
                maxRotation: 0,
                minRotation: 0
              }
            },
            y: {
              grid: { display: true, color: '#f0f0f0', borderDash: [5, 5] },
              ticks: { display: false },
              border: { display: false },
              beginAtZero: true
            }
          },
          plugins: {
            legend: { display: false },
            tooltip: { enabled: false },
            datalabels: {
              color: '#1e1e1e',
              anchor: 'end',
              align: 'end',
              offset: -4,
              font: { family: 'Rubik', weight: 'bold', size: 11 },
              formatter: (value, ctx) => {
                 // Use the original data for the label
                 const trueValue = originalData[ctx.dataIndex];
                 return trueValue === 0 ? '0%' : trueValue.toFixed(1) + '%';
              }
            }
          }
        }
      });
    });
  </script>
</body>
</html>
`;

  const dataToInject = graphData?.orderedEarnings ? JSON.stringify(graphData.orderedEarnings) : '[]';
  const finalHtml = htmlContent.replace('$LOG_DATA$', dataToInject);

  return (
    <View style={{ height: 220, width: '100%' }}>
      <WebView
        originWhitelist={['*']}
        source={{ html: finalHtml }}
        style={{ backgroundColor: 'transparent' }}
        javaScriptEnabled
        domStorageEnabled
        mixedContentMode="always"
        androidLayerType="hardware"
        showsHorizontalScrollIndicator={false}
        scrollEnabled={false} // WebView handles internal scroll via CSS overflow
        onMessage={(event) => {
             if (onChartClick) onChartClick(event.nativeEvent.data);
        }}
      />
    </View>
  );
};

export default RevenueBarChart;
