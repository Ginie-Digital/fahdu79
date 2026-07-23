Pod::Spec.new do |s|
  s.name         = 'ffmpeg-kit-ios-full-gpl'
  s.version      = '6.0'
  s.summary      = 'FFmpegKit Full GPL iOS'
  s.description  = 'Precompiled FFmpegKit iOS frameworks with full filter support'
  s.homepage     = 'https://github.com/arthenica/ffmpeg-kit'
  s.license      = { :type => 'GPL-3.0' }
  s.authors      = 'Arthenica'

  s.platform     = :ios, '12.1'
  # FFmpegKit retired its official binary releases. Use a pinned mirror instead
  # of a machine-specific local archive, so `pod install` also works in CI.
  s.source       = {
    :git => 'https://github.com/NooruddinLakhani/ffmpeg-kit-ios-full-gpl.git',
    :commit => '8006263515e85a382052fd6388ed57b6a019811c'
  }

  s.vendored_frameworks = [
    'ffmpeg-kit-ios-full-gpl/6.0-80adc/ffmpegkit.xcframework',
    'ffmpeg-kit-ios-full-gpl/6.0-80adc/libavcodec.xcframework',
    'ffmpeg-kit-ios-full-gpl/6.0-80adc/libavdevice.xcframework',
    'ffmpeg-kit-ios-full-gpl/6.0-80adc/libavfilter.xcframework',
    'ffmpeg-kit-ios-full-gpl/6.0-80adc/libavformat.xcframework',
    'ffmpeg-kit-ios-full-gpl/6.0-80adc/libavutil.xcframework',
    'ffmpeg-kit-ios-full-gpl/6.0-80adc/libswresample.xcframework',
    'ffmpeg-kit-ios-full-gpl/6.0-80adc/libswscale.xcframework'
  ]
end
