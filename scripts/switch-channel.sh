#!/bin/bash

# Switch EAS Update channel in both Android and iOS config files
# Usage: ./scripts/switch-channel.sh <staging|production>

CHANNEL=$1

if [ -z "$CHANNEL" ]; then
  echo "❌ Please provide a channel: staging or production"
  echo "Usage: npm run channel:staging  OR  npm run channel:production"
  exit 1
fi

if [ "$CHANNEL" != "staging" ] && [ "$CHANNEL" != "production" ]; then
  echo "❌ Invalid channel: $CHANNEL"
  echo "Allowed values: staging, production"
  exit 1
fi

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

# Android: AndroidManifest.xml
MANIFEST="$PROJECT_DIR/android/app/src/main/AndroidManifest.xml"
if [ -f "$MANIFEST" ]; then
  sed -i '' "s/expo-channel-name\&quot;:\&quot;[a-z]*/expo-channel-name\&quot;:\&quot;$CHANNEL/" "$MANIFEST"
  echo "✅ Android AndroidManifest.xml → channel: $CHANNEL"
else
  echo "⚠️  AndroidManifest.xml not found"
fi

# iOS: Info.plist
PLIST="$PROJECT_DIR/ios/Fahdu/Info.plist"
if [ -f "$PLIST" ]; then
  # Replace the string value after the expo-channel-name key
  sed -i '' "/<key>expo-channel-name<\/key>/{n;s/<string>[a-z]*<\/string>/<string>$CHANNEL<\/string>/;}" "$PLIST"
  echo "✅ iOS Info.plist → channel: $CHANNEL"
else
  echo "⚠️  Info.plist not found"
fi

echo ""
echo "🎯 Channel switched to: $CHANNEL"
echo "   Now run: npm run build:$CHANNEL"
