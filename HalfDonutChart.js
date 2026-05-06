import React from 'react';
import { View } from 'react-native';
import { WebView } from 'react-native-webview';
import { responsiveWidth } from 'react-native-responsive-dimensions';

const HalfDonutChart = ({ graphData, subtitle = "Earned this Week", onChartClick }) => {


  const htmlContent = `
<html>
<head>
  <link href="https://fonts.googleapis.com/css2?family=Rubik:wght@500&display=swap" rel="stylesheet">
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/chartjs-plugin-datalabels"></script>
  <style>
    body {
      margin: 0;
      padding: 0;
      display: flex;
      justify-content: center;
      align-items: center;
      background-color: transparent;
    }
  </style>
</head>
<body>
  <canvas id="halfDonutChart" width="300" height="200"></canvas>
  <script>
    document.addEventListener("DOMContentLoaded", function () {
      const logData = $LOG_DATA$;
      const totalEarningsWeek = $TOTAL_EARNINGS$;

      // ✅ Extract Data from API Response
      const labels = logData.map(item => item.category);
      const data = logData.map(item => item.earningsPercentage);
      const backgroundColors = ['#FFC6A5', '#B3D9FF', '#B59FFF', '#FFCFD2', '#FBF8CC', '#D5FFDE', '#B5F8FE'];

      var ctx = document.getElementById('halfDonutChart').getContext('2d');
      Chart.register(ChartDataLabels);

      // ✅ Handle cases where all values are 0 or all are 1
      const isAllZero = data.every(value => value === 0);
      const isAllOne = data.every(value => value === 1);

      let finalData, finalLabels;

      if (isAllZero) {
        finalData = Array(data.length).fill(1); // ✅ Show equal partitions
        finalLabels = Array(data.length).fill('0%');
      } else if (isAllOne) {
        finalData = Array(data.length).fill(5); // ✅ Ensure visibility
        finalLabels = labels;
      } else {
        finalData = data;
        finalLabels = labels;
      }

      new Chart(ctx, {
        type: 'doughnut',
        data: {
          labels: finalLabels,
          datasets: [{
            data: finalData,
            backgroundColor: backgroundColors,
            borderColor: '#000',
            borderWidth: 5
          }]
        },
        options: {
          rotation: -90, // Start from bottom
          circumference: 180, // Half Circle
          responsive: true,
          maintainAspectRatio: false,
          cutout: '70%',
          onClick: (e, elements) => {
            if (elements.length > 0) {
              const index = elements[0].index;
              const label = finalLabels[index]; 
              // alert("Clicked: " + label); // Debug
              if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
                window.ReactNativeWebView.postMessage(label);
              }
            }
          },
          plugins: {
            legend: { display: false },
            datalabels: {
              color: '#1e1e1e',
              font: { size: isAllOne ? 20 : 30, weight: 'bold' }, // ✅ Adjust font size
              anchor: isAllOne ? 'end' : 'center',  // ✅ Prevent overlap
              align: isAllOne ? 'end' : 'center',
              formatter: (value, ctx) => {
                if (isAllZero) return '0%';
                if (isAllOne) return finalLabels[ctx.dataIndex];
                return value > 0 ? Number(value).toFixed(1) + '%' : '';
              }
            }
          }
        },
        plugins: [{
          beforeDraw: function (chart) {
            var width = chart.width,
              height = chart.height,
              ctx = chart.ctx;

            ctx.restore();
            ctx.font = "500 60px 'Rubik', sans-serif";
            ctx.textAlign = "center";
            ctx.fillStyle = "#000";

            // ✅ Dynamic ₹ Earnings Text
            ctx.fillText("₹" + totalEarningsWeek.toLocaleString(), width / 2, height / 1.8);

            // ✅ Earned this Week Text (Dynamic)
            const subtitle = "$SUBTITLE$";
            ctx.font = "500 35px 'Rubik', sans-serif"; // Slightly smaller for date ranges
            ctx.fillText(subtitle, width / 2, height / 1.3);
            ctx.save();
          }
        }]
      });
    });
  </script>
</body>
</html>
`;


  // ✅ Replace Dynamic Data with Graph Data
  const finalHtml = htmlContent
    .replace('$LOG_DATA$', JSON.stringify(graphData.orderedEarnings))
    .replace('$TOTAL_EARNINGS$', graphData.totalEarningsWeek)
    .replace('$SUBTITLE$', subtitle);

  return (
    <View style={{ height: 200, width: '100%' }}>
      <WebView
        originWhitelist={['*']}
        source={{ html: finalHtml }}
        style={{ backgroundColor: 'transparent' }}
        javaScriptEnabled
        domStorageEnabled
        mixedContentMode="always"
        androidLayerType="hardware"
        onMessage={(event) => {
             if (onChartClick) onChartClick(event.nativeEvent.data);
        }}
      />
    </View>
  );
};

export default HalfDonutChart;
