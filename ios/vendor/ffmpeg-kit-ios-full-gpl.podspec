Pod::Spec.new do |s|
  s.name         = 'ffmpeg-kit-ios-full-gpl'
  s.version      = '6.0'
  s.summary      = 'FFmpegKit Full GPL iOS'
  s.description  = 'Precompiled FFmpegKit iOS frameworks with full filter support'
  s.homepage     = 'https://github.com/arthenica/ffmpeg-kit'
  s.license      = { :type => 'GPL-3.0' }
  s.authors      = 'Arthenica'

  s.platform     = :ios, '12.1'
  s.source       = { :http => 'file:///Users/giniedigital/Documents/fahdu79/ios/vendor/ffmpeg-kit-ios-full-gpl.zip' }

  s.vendored_frameworks = [
    'ffmpegkit.xcframework',
    'libavcodec.xcframework',
    'libavdevice.xcframework',
    'libavfilter.xcframework',
    'libavformat.xcframework',
    'libavutil.xcframework',
    'libswresample.xcframework',
    'libswscale.xcframework'
  ]
end
