import RNFS from 'react-native-fs';
import {FFmpegKit, MediaInformation, FFprobeKit, ReturnCode, FFmpegKitConfig, Statistics} from 'ffmpeg-kit-react-native';
import {Platform} from 'react-native';
import AppLog from '../Src/Utils/Logger';

export const generateBase64Image = async uri => {
  try {
    if (uri) {
      const cleanUri = uri.startsWith('file://') ? uri.replace('file://', '') : uri;
      console.log(cleanUri, '{}{}{}{');

      return FFmpegKit.execute(`-i "${cleanUri}" -vf scale=15:15 "${RNFS.CachesDirectoryPath}/encodedImage%03d.jpg" -loglevel quiet -y`).then(async session => {
        let returnCodeBySession = await session.getReturnCode();

        if (ReturnCode.isSuccess(returnCodeBySession)) {
          let result = await RNFS.readFile(`${RNFS.CachesDirectoryPath}/encodedImage001.jpg`, 'base64');

          return `data:image/png;base64,` + result;
        } else {
          console.log('FFMPeg Error While converting base 64');
        }
      });
    } else {
      console.log('Please pass selected image url to generateImageThumbnail');
    }
  } catch (e) {
    console.log('Error at generateImageThumbnail', e.message);
  }
};

const getVideoInformation = async uri => {
  let cleanUri = uri;
  if (cleanUri.startsWith('file://')) {
    cleanUri = cleanUri.replace('file://', '');
  }
  return FFprobeKit.getMediaInformation(cleanUri).then(async session => {
    const information = session.getMediaInformation();

    let bitRate = information.getBitrate();

    let bitRateInKbps = ((bitRate - (10 / 100) * bitRate) / 1024).toFixed(0);

    return bitRateInKbps;
  });
};

const platformCommander = (uri, bitRateToSet) => {
  console.log(uri, bitRateToSet, '::::::::::::::::::::::');

  if (Platform.OS === 'android') {
    return `-hwaccel mediacodec -i ${uri} -c:a copy -c:v h264_mediacodec -b:v ${bitRateToSet}k ${RNFS.CachesDirectoryPath}/fahduReducedVideo.mp4 -y`;
  } else {
    return `-i ${uri} -c:v h264_videotoolbox -b:v ${bitRateToSet}k -maxrate ${bitRateToSet}k -bufsize ${bitRateToSet}k -c:a copy ${RNFS.CachesDirectoryPath}/fahduReducedVideo.mp4 -y`;
  }
};

export const videoReducer = async (uri, preMetadata = null) => {
  if (!uri) {
    console.error('Video URI must be provided.');
    return null;
  }

  // Clean the input URI (remove file:// prefix)
  let cleanUri = uri;
  if (cleanUri.startsWith('file://')) {
    cleanUri = cleanUri.replace('file://', '');
  }

  try {
    let originalBitrate, width, height;

    // --- 1. Get video metadata (skip if pre-fetched) ---
    if (preMetadata && typeof preMetadata === 'object' && preMetadata.width) {
      // Pre-fetched metadata from getVideoMetadata — skip FFprobe
      originalBitrate = Number(preMetadata.bitrate) || null;
      width = preMetadata.width;
      height = preMetadata.height;
      console.log('⚡ videoReducer: Using pre-fetched metadata (skipped FFprobe)');
    } else {
      // Fallback: run FFprobe (backward compat if raw bitrate or null passed)
      const sessionInfo = await FFprobeKit.getMediaInformation(cleanUri);
      const information = sessionInfo.getMediaInformation();
      originalBitrate = (typeof preMetadata === 'number' ? preMetadata : null) || information.getBitrate();
      
      const streams = information.getStreams();
      const videoStream = streams?.find(s => s.getType() === 'video');
      width = videoStream ? Number(videoStream.getWidth()) : 0;
      height = videoStream ? Number(videoStream.getHeight()) : 0;
    }

    const shortSide = Math.min(width, height);

    if (!originalBitrate) {
      console.error('Could not determine original bitrate.');
      return null;
    }

    const originalStat = await RNFS.stat(cleanUri);
    const originalSizeMb = (originalStat.size / 1024 / 1024).toFixed(2);

    console.log(`📊 Original: ${width}x${height}, bitrate: ${Math.round(originalBitrate / 1024)}kbps, size: ${originalSizeMb}MB`);

    // --- 2. Smart Skip: If already 720p (or smaller) and bitrate is already reasonable, just skip compression ---
    if (shortSide <= 720 && originalBitrate <= 5000000) {
      console.log(`⏭️ Video is already 720p (or smaller) and under 5Mbps. Skipping compression for best quality.`);
      
      // Fire-and-forget Firebase Logging (Non-blocking)
      Promise.resolve().then(() => {
        try {
          const mBefore = `${width}x${height} ${Math.round(originalBitrate / 1024)}kbps ${originalSizeMb}MB`;
          AppLog('VIDEO_REDUCER', `Compression Skipped (Qual): Before ${mBefore} | After (Unchanged)`);
        } catch (e) { console.warn('Bg log error', e); }
      });

      return uri;
    }

    // --- 3. Prepare Output ---
    const outputPath = `${RNFS.CachesDirectoryPath}/${Date.now()}_reduced.mp4`;

    let hardwareCommand, softwareCommand;

    if (Platform.OS === 'android') {
      // ── Android: keep it simple, generous bitrate ──
      // Cap at 8 Mbps (8000kbps) to prevent bloated videos from staying huge
      const targetKbps = Math.min(8000, Math.round((originalBitrate * 0.95) / 1024));

      // Clean, hardware-accelerated MediaCodec command (no incompatible rate control options)
      hardwareCommand = `-i "${cleanUri}" -c:a copy -c:v h264_mediacodec -b:v ${targetKbps}k -g 50 -loglevel error "${outputPath}" -y`;

      // Software fallback using mpeg4 (built-in encoder, available in every FFmpeg build)
      softwareCommand = `-i "${cleanUri}" -c:a copy -c:v mpeg4 -b:v ${targetKbps}k -pix_fmt yuv420p -loglevel error "${outputPath}" -y`;

    } else {
      // ── iOS: WhatsApp/Instagram-style compression (Capped at 1080p) ──
      
      let scaleFilter = '';

      if (shortSide > 1080) {
        // Scale down to 1080p if larger (e.g., 4K - though already blocked by validation, good for safety)
        if (width > height) {
          scaleFilter = '-vf "scale=-2:1080"';
        } else {
          scaleFilter = '-vf "scale:1080:-2"';
        }
        console.log(`📐 Scaling down to 1080p for better quality/size management`);
      } else {
        console.log(`📐 Keeping resolution up to 1080p (${width}x${height})`);
      }

      // Instead of forcing a strict bitrate which causes pixelation on iOS,
      // we use Apple's VideoToolbox quality setting (-q:v). 
      // Lower number = more compression. 55 provides a good balance of size vs quality.
      const iOSQualityTarget = 55; 

      // Hardware: VideoToolbox using constant quality (-q:v) instead of rigid bitrate
      hardwareCommand = `-i "${cleanUri}" -c:a copy ${scaleFilter} -c:v h264_videotoolbox -q:v ${iOSQualityTarget} -profile:v high -level 4.1 -pix_fmt yuv420p -threads 0 -loglevel error "${outputPath}" -y`;

      // Software fallback: mpeg4 (built-in encoder, available in every FFmpeg build)
      const maxKbps = Math.round((originalBitrate / 1024) || 12000); // Fallback max for software
      softwareCommand = `-i "${cleanUri}" -c:a copy ${scaleFilter} -c:v mpeg4 -b:v ${maxKbps}k -pix_fmt yuv420p -loglevel error "${outputPath}" -y`;
    }

    // --- 4. Try Hardware Encoding First ---
    console.log(`🔧 Attempting hardware encoding...`);

    let session = await FFmpegKit.execute(hardwareCommand);
    let returnCode = await session.getReturnCode();

    if (ReturnCode.isSuccess(returnCode)) {
      console.log('✅ Hardware encoding successful!');

      // Fire-and-forget Firebase Logging (Non-blocking)
      Promise.resolve().then(async () => {
        try {
          const afterSession = await FFprobeKit.getMediaInformation(outputPath);
          const afterInfo = afterSession.getMediaInformation();
          const afterBitrate = afterInfo.getBitrate();
          const afterSize = afterInfo.getSize();
          const afterVideo = afterInfo.getStreams()?.find(s => s.getType() === 'video');
          const afterW = afterVideo ? Number(afterVideo.getWidth()) : width;
          const afterH = afterVideo ? Number(afterVideo.getHeight()) : height;

          const mBefore = `${width}x${height} ${Math.round(originalBitrate / 1024)}kbps ${originalSizeMb}MB`;
          const mAfter = `${afterW}x${afterH} ${Math.round(afterBitrate / 1024)}kbps ${(afterSize / 1024 / 1024).toFixed(2)}MB`;
          
          AppLog('VIDEO_REDUCER', `Compression (HW): Before ${mBefore} | After ${mAfter}`);
        } catch (e) { console.warn('Bg log error', e); }
      });

      return `file://${outputPath}`;
    }

    // --- 5. Hardware Failed - Try Software Encoding ---
    console.log('⚠️ Hardware encoding failed, falling back to software encoding...');

    // Delete the failed output file if it exists
    const fileExists = await RNFS.exists(outputPath);
    if (fileExists) {
      await RNFS.unlink(outputPath);
    }

    console.log(`🔧 Attempting software encoding...`);

    session = await FFmpegKit.execute(softwareCommand);
    returnCode = await session.getReturnCode();

    if (ReturnCode.isSuccess(returnCode)) {
      console.log('✅ Software encoding successful!');

      // Fire-and-forget Firebase Logging (Non-blocking)
      Promise.resolve().then(async () => {
        try {
          const afterSession = await FFprobeKit.getMediaInformation(outputPath);
          const afterInfo = afterSession.getMediaInformation();
          const afterBitrate = afterInfo.getBitrate();
          const afterSize = afterInfo.getSize();
          const afterVideo = afterInfo.getStreams()?.find(s => s.getType() === 'video');
          const afterW = afterVideo ? Number(afterVideo.getWidth()) : width;
          const afterH = afterVideo ? Number(afterVideo.getHeight()) : height;

          const mBefore = `${width}x${height} ${Math.round(originalBitrate / 1024)}kbps ${originalSizeMb}MB`;
          const mAfter = `${afterW}x${afterH} ${Math.round(afterBitrate / 1024)}kbps ${(afterSize / 1024 / 1024).toFixed(2)}MB`;
          
          AppLog('VIDEO_REDUCER', `Compression (SW): Before ${mBefore} | After ${mAfter}`);
        } catch (e) { console.warn('Bg log error', e); }
      });

      return `file://${outputPath}`;
    } else {
      console.error(`❌ Both hardware and software encoding failed with return code ${returnCode}.`);
      const softwareLogs = await session.getLogsAsString();
      console.error('Software encoding logs:', softwareLogs);
      return null;
    }
  } catch (e) {
    console.error('An unexpected error occurred in videoReducer:', e);
    return null;
  }
};

export const generateVideoThumbnail = async uri => {
  if (!uri) {
    console.error('Video URI must be provided to generate a thumbnail.');
    return null;
  }

  try {
    const outputPath = `${RNFS.CachesDirectoryPath}/${Date.now()}.jpg`;

    let cleanUri = uri;
    if (cleanUri.startsWith('file://')) {
      cleanUri = cleanUri.replace('file://', '');
    }

    // -ss 00:00:00.000: Seeks to the first frame.
    // Placing -ss BEFORE -i makes the seek operation nearly instantaneous.
    // -frames:v 1: Extracts only one frame.
    // -vf scale=320:-1: Scales to 320px wide, auto height (smaller file, faster load)
    // -q:v 8: JPEG quality (2=best, 31=worst). 8 is good for thumbnails.
    const command = `-ss 00:00:00.000 -i "${cleanUri}" -frames:v 1 -vf scale=320:-1 -q:v 8 "${outputPath}" -y`;

    const session = await FFmpegKit.execute(command);
    const returnCode = await session.getReturnCode();

    if (ReturnCode.isSuccess(returnCode)) {
      console.log('Thumbnail generated successfully at:', outputPath);
      return `file://${outputPath}`;
    } else {
      console.error('Failed to generate thumbnail.');
      // Log the actual FFmpeg output for debugging
      const logs = await session.getLogsAsString();
      console.error('FFmpeg Logs:', logs);
      return null;
    }
  } catch (e) {
    console.error('An error occurred while generating thumbnail:', e);
    return null;
  }
};

export const reduceImageSize = async uri => {
  try {
    if (!uri) {
      console.log('Please provide an image URI');
      return;
    }

    let cleanUri = uri;
    if (cleanUri.startsWith('file://')) {
      cleanUri = cleanUri.replace('file://', '');
    }

    let outputPath = `${RNFS.CachesDirectoryPath}/compressed_image.jpg`;

    // FFmpeg Command to compress image
    let command = `-i "${cleanUri}" -vf "scale=iw*0.7:ih*0.7" -q:v 5 -y "${outputPath}"`;

    return FFmpegKit.execute(command).then(async session => {
      let returnCodeBySession = await session.getReturnCode();

      if (ReturnCode.isSuccess(returnCodeBySession)) {
        let fileStat = await RNFS.stat(outputPath);

        // If file is still above 500KB, retry with a lower quality
        if (fileStat.size > 500 * 1024) {
          let retryCommand = `-i "${outputPath}" -vf "scale=iw*0.5:ih*0.5" -q:v 8 -y "${outputPath}"`;
          await FFmpegKit.execute(retryCommand);
        }

        return `file://${outputPath}`;
      } else {
        console.log('FFmpeg Error While Reducing Image Size');
      }
    });
  } catch (e) {
    console.log('Error reducing image size:', e.message);
  }
};

export async function getImageSize(filePath) {
  try {
    // Clean the file path
    const cleanPath = filePath.replace('file://', '');

    // Use -v error to suppress extra output that breaks JSON parsing
    const command = `-v error -select_streams v:0 -show_entries stream=width,height -of json "${cleanPath}"`;

    console.log('Getting image size for:', cleanPath);

    const session = await FFprobeKit.execute(command);
    const returnCode = await session.getReturnCode();

    if (ReturnCode.isSuccess(returnCode)) {
      const output = await session.getOutput();

      console.log('FFprobe output:', output);

      // Try to parse JSON
      const jsonResult = JSON.parse(output);
      const streams = jsonResult.streams;

      if (streams && streams.length > 0) {
        const width = streams[0].width;
        const height = streams[0].height;

        console.log(`Image size: ${width}x${height}`);

        return {width, height};
      }
    }

    throw new Error('Failed to get image size');
  } catch (error) {
    console.error('FFprobe error:', error);
    console.error('Error details:', error.message);
    return null;
  }
}

export const convertPngToJpeg = async (inputPath, outputPath) => {
  const quality = 2;

  try {
    if (!inputPath) {
      throw new Error('Invalid PNG input path');
    }

    let cleanInputPath = inputPath;
    if (cleanInputPath.startsWith('file://')) {
      cleanInputPath = cleanInputPath.replace('file://', '');
    }

    const finalOutputPath = outputPath || `${RNFS.TemporaryDirectoryPath}/${Date.now()}.jpg`;
    let cleanOutputPath = finalOutputPath;
    if (cleanOutputPath.startsWith('file://')) {
      cleanOutputPath = cleanOutputPath.replace('file://', '');
    }

    // FFmpeg -q:v scale: 2 = highest quality, 31 = lowest
    const command = `-y -i "${cleanInputPath}" -q:v ${quality} "${cleanOutputPath}"`;

    console.log(`Executing FFmpeg command: ${command}`);

    const session = await FFmpegKit.execute(command);
    const returnCode = await session.getReturnCode();

    if (returnCode.isValueSuccess()) {
      console.log('Conversion successful');
      return finalOutputPath;
    } else {
      const output = await session.getOutput();
      const error = await session.getFailStackTrace();
      throw new Error(`FFmpeg failed: ${error || output || 'Unknown error'}`);
    }
  } catch (error) {
    console.error('Conversion error:', error);
    throw error;
  }
};

export function resizeImage(inputPath, outputPath, width = 150, height = 150) {
  return new Promise(async (resolve, reject) => {
    try {
      let cleanInputPath = inputPath;
      if (cleanInputPath.startsWith('file://')) {
        cleanInputPath = cleanInputPath.replace('file://', '');
      }

      let cleanOutputPath = outputPath;
      if (cleanOutputPath.startsWith('file://')) {
        cleanOutputPath = cleanOutputPath.replace('file://', '');
      }

      const fileExists = await RNFS.exists(cleanInputPath);
      if (!fileExists) {
        reject('Input file does not exist');
        return;
      }

      // Default to 150x150 for thumbnails if not specified (previous was 512 hardcoded inside)
      const targetWidth = width;
      const targetHeight = height;
      const quality = Platform.OS === 'ios' ? 2 : 3; // Good balance for profile thumbnails

      // Scale to fit target dimensions - adding -threads 0 for speed
      const command = `-y -threads 0 -i "${cleanInputPath}" -vf scale=${targetWidth}:${targetHeight}:force_original_aspect_ratio=decrease,pad=${targetWidth}:${targetHeight}:(ow-iw)/2:(oh-ih)/2:white -q:v ${quality} "${cleanOutputPath}"`;

      FFmpegKit.execute(command).then(async session => {
        const returnCode = await session.getReturnCode();

        if (ReturnCode.isSuccess(returnCode)) {
          console.log(`✅ Image resized successfully to ${targetWidth}x${targetHeight}`);
          resolve(outputPath);
        } else {
          const logs = await session.getLogsAsString();
          const failStackTrace = await session.getFailStackTrace();
          reject(`FFmpeg failed: ${failStackTrace || logs || 'Unknown error'}`);
        }
      });
    } catch (error) {
      reject(error.message || error);
    }
  });
}

// Resize image to COVER (crop to fill) - good for thumbnails
export function resizeImageCover(inputPath, outputPath, size = 100) {
  return new Promise(async (resolve, reject) => {
    try {
      let cleanInputPath = inputPath;
      if (cleanInputPath.startsWith('file://')) {
        cleanInputPath = cleanInputPath.replace('file://', '');
      }

      let cleanOutputPath = outputPath;
      if (cleanOutputPath.startsWith('file://')) {
        cleanOutputPath = cleanOutputPath.replace('file://', '');
      }

      const fileExists = await RNFS.exists(cleanInputPath);
      if (!fileExists) {
        reject('Input file does not exist');
        return;
      }

      const quality = 3; // Good quality for small thumbnails

      // Scale to fit within max size while preserving aspect ratio (no cropping)
      // This ensures the full image is visible in the thumbnail
      // -1 maintains aspect ratio: scale=size:-1 scales width to size, height auto
      const command = `-y -i "${cleanInputPath}" -vf "scale=${size}:-1" -q:v ${quality} "${cleanOutputPath}"`;

      FFmpegKit.execute(command).then(async session => {
        const returnCode = await session.getReturnCode();

        if (ReturnCode.isSuccess(returnCode)) {
          console.log(`✅ Image cover-resized to ${size}x${size}`);
          resolve(outputPath);
        } else {
          const logs = await session.getLogsAsString();
          const failStackTrace = await session.getFailStackTrace();
          reject(`FFmpeg failed: ${failStackTrace || logs || 'Unknown error'}`);
        }
      });
    } catch (error) {
      reject(error.message || error);
    }
  });
}

// --- Your Validation Rules ---
const MAX_FILE_SIZE_BYTES = 150 * 1024 * 1024; // 150MB
const UHD_SHORT_DIMENSION = 2160; // 4K resolution threshold
const MAX_DURATION_MS = 60 * 1000; // 1 minute in milliseconds

// Helper function to get a common resolution name
const getResolutionName = (width, height) => {
  const shortDimension = Math.min(width, height);
  if (shortDimension >= 2160) return '4K UHD';
  if (shortDimension >= 1080) return '1080p (Full HD)';
  if (shortDimension >= 720) return '720p (HD)';
  return 'Lower Resolution';
};

export const getVideoMetadata = async filePath => {
  if (!filePath || typeof filePath !== 'string') {
    console.error(`Invalid filePath provided: ${filePath}`);
    return null;
  }

  let cleanPath = filePath;
  if (cleanPath.startsWith('file://')) {
    cleanPath = cleanPath.replace('file://', '');
  }

  const command = `-v quiet -print_format json -show_format -show_streams "${cleanPath}"`;

  try {
    const session = await FFprobeKit.execute(command);
    const returnCode = await session.getReturnCode();

    if (ReturnCode.isSuccess(returnCode)) {
      const output = await session.getOutput();
      const mediaInfo = JSON.parse(output);
      const videoStream = mediaInfo.streams.find(s => s.codec_type === 'video');

      if (!videoStream) {
        return {isValid: false, validationReason: 'No video stream found in the file.'};
      }

      // --- Extract all the necessary data ---
      const width = videoStream.width;
      const height = videoStream.height;
      const size = mediaInfo.format.size;
      const duration = Math.round(parseFloat(mediaInfo.format.duration) * 1000);
      const bitrate = mediaInfo.format.bit_rate; // <-- 1. Extract the bitrate here

      // --- Integrated Validation Logic ---
      let isValid = true;
      let validationReason = 'Video is valid.';

      if (size > MAX_FILE_SIZE_BYTES) {
        isValid = false;
        const sizeInMB = (size / 1024 / 1024).toFixed(2);
        validationReason = `File size (${sizeInMB}MB) exceeds the 150MB limit.`;
      } else if (Math.min(width, height) >= UHD_SHORT_DIMENSION) {
        isValid = false;
        validationReason = `Video resolution (${width}x${height}) is 4K or higher, which is not allowed.`;
      } else if (duration > MAX_DURATION_MS) {
        isValid = false;
        const durationInSeconds = (duration / 1000).toFixed(1);
        validationReason = `Video duration (${durationInSeconds}s) exceeds the 1 minute limit.`;
      }

      const result = {
        size,
        width,
        height,
        duration,
        bitrate, // <-- 2. Add the bitrate to the returned object
        resolutionName: getResolutionName(width, height),
        isValid,
        validationReason,
      };

      console.log('Video processing complete:', result);
      return result;
    } else {
      console.error(`FFprobe failed with return code ${returnCode}`);
      return {isValid: false, validationReason: 'Failed to process video file.'};
    }
  } catch (error) {
    console.error(`Error in getVideoMetadata for ${filePath}:`, error);
    return null;
  }
};

export const resizeImageForPost = async (imagePath, aspectWidth, aspectHeight) => {
  try {
    console.log(`Starting resize for: ${imagePath}`);

    // Clean path for FFmpeg (remove file:// prefix)
    let cleanImagePath = imagePath;
    if (cleanImagePath.startsWith('file://')) {
      cleanImagePath = cleanImagePath.replace('file://', '');
    }

    // Step 1: Get actual image dimensions
    const imageSize = await getImageSize(cleanImagePath);

    if (!imageSize) {
      console.log('Could not get image size, returning original');
      return imagePath;
    }

    const {width: actualWidth, height: actualHeight} = imageSize;
    console.log(`Original dimensions: ${actualWidth}x${actualHeight}`);

    // Step 2: Determine target dimensions based on aspect ratio
    const aspectRatio = aspectWidth / aspectHeight;
    const isSquare = Math.abs(aspectRatio - 1) < 0.1; // 1:1 ratio

    let targetWidth, targetHeight;

    if (isSquare) {
      targetWidth = 1080;
      targetHeight = 1080;
    } else {
      // 4:5 ratio
      targetWidth = 1080;
      targetHeight = 1350;
    }

    console.log(`Target dimensions: ${targetWidth}x${targetHeight} (isSquare: ${isSquare})`);

    // Step 3: Only resize if image is larger than target
    if (actualWidth <= targetWidth && actualHeight <= targetHeight) {
      console.log('Image is smaller than target, no resize needed');
      return imagePath;
    }

    // Step 4: Create output path
    const outputPath = `${RNFS.TemporaryDirectoryPath}/post_resized_${Date.now()}.jpg`;

    // Step 5: FFmpeg command with high quality
    // Use scale with exact dimensions and force the size
    const quality = Platform.OS === 'ios' ? 1 : 2;

    // For square images, force exact 1080x1080
    // For portrait, maintain aspect ratio within 1080x1350
    let scaleFilter;
    if (isSquare) {
      // Force exact square dimensions
      scaleFilter = `scale=${targetWidth}:${targetHeight}`;
    } else {
      // Maintain aspect ratio, fit within bounds
      scaleFilter = `scale=${targetWidth}:${targetHeight}:force_original_aspect_ratio=decrease`;
    }

    const command = `-y -i "${cleanImagePath}" -vf "${scaleFilter}" -q:v ${quality} "${outputPath}"`;

    console.log(`Executing resize command: ${command}`);

    // Step 6: Execute FFmpeg
    const session = await FFmpegKit.execute(command);
    const returnCode = await session.getReturnCode();

    if (ReturnCode.isSuccess(returnCode)) {
      console.log('Image resized successfully:', outputPath);

      // Verify the output file exists
      const fileExists = await RNFS.exists(outputPath);
      if (fileExists) {
        const stat = await RNFS.stat(outputPath);
        const newSize = await getImageSize(outputPath);
        console.log(`Resized file size: ${(stat.size / 1024).toFixed(2)} KB`);
        console.log(`Resized dimensions: ${newSize?.width}x${newSize?.height}`);
        return outputPath;
      } else {
        console.error('Output file does not exist');
        return imagePath;
      }
    } else {
      const logs = await session.getLogsAsString();
      console.error('FFmpeg resize failed:', logs);
      return imagePath;
    }
  } catch (error) {
    console.error('Error in resizeImageForPost:', error);
    return imagePath; // Return original path on error
  }
};

// Center-crop an image to 4:5 aspect ratio, then downscale to max 1080x1350
export const cropToAspectAndResize = async (imagePath) => {
  try {
    // Normalize path - handle file:// prefix and URL encoding
    let cleanPath = imagePath;
    if (cleanPath.startsWith('file://')) {
      cleanPath = cleanPath.replace('file://', '');
    }
    cleanPath = decodeURIComponent(cleanPath);

    // Verify file exists
    const fileExists = await RNFS.exists(cleanPath);
    if (!fileExists) {
      console.warn('cropToAspectAndResize: file not found, returning original:', cleanPath);
      return imagePath;
    }

    // Quick size check — skip processing for small images (already compressed by picker)
    const stat = await RNFS.stat(cleanPath);
    const fileSizeMb = stat.size / (1024 * 1024);
    console.log(`📐 Image file size: ${fileSizeMb.toFixed(2)}MB`);

    const imageSize = await getImageSize(cleanPath);
    if (!imageSize) {
      console.log('Could not get image size for auto-crop, returning original');
      return imagePath;
    }

    const { width, height } = imageSize;
    const targetAspect = 4 / 5;
    const currentAspect = width / height;

    // If already within target dimensions AND close to 4:5, skip entirely
    if (width <= 1080 && height <= 1350 && Math.abs(currentAspect - targetAspect) < 0.05) {
      console.log('⏭️ Image is already within 1080x1350 and ~4:5, skipping processing');
      return imagePath;
    }

    // If already very close to 4:5 and small enough, skip cropping
    if (Math.abs(currentAspect - targetAspect) < 0.01 && width <= 1080) {
      console.log('Image is already 4:5 and small, skipping auto-crop');
      return imagePath;
    }

    let cropW, cropH;
    if (currentAspect > targetAspect) {
      // Image is wider than 4:5 → crop width
      cropH = height;
      cropW = Math.round(height * targetAspect);
    } else {
      // Image is taller than 4:5 → crop height
      cropW = width;
      cropH = Math.round(width / targetAspect);
    }

    // Ensure even dimensions (FFmpeg requires this)
    cropW = cropW % 2 === 0 ? cropW : cropW - 1;
    cropH = cropH % 2 === 0 ? cropH : cropH - 1;

    // Center the crop
    const cropX = Math.round((width - cropW) / 2);
    const cropY = Math.round((height - cropH) / 2);

    // Determine final dimensions (cap at 1080x1350)
    let finalW = cropW;
    let finalH = cropH;
    if (finalW > 1080) {
      finalW = 1080;
      finalH = 1350;
    }
    // Ensure even
    finalW = finalW % 2 === 0 ? finalW : finalW - 1;
    finalH = finalH % 2 === 0 ? finalH : finalH - 1;

    const outputPath = `${RNFS.TemporaryDirectoryPath}/auto_crop_${Date.now()}.jpg`;
    const quality = Platform.OS === 'ios' ? 1 : 2;

    const scaleFilter = (finalW !== cropW) ? `,scale=${finalW}:${finalH}` : '';
    const command = `-y -threads 0 -i "${cleanPath}" -vf "crop=${cropW}:${cropH}:${cropX}:${cropY}${scaleFilter}" -q:v ${quality} "${outputPath}"`;

    console.log(`Auto-crop+resize: ${width}x${height} → crop ${cropW}x${cropH} → final ${finalW}x${finalH}`);

    const session = await FFmpegKit.execute(command);
    const returnCode = await session.getReturnCode();

    if (ReturnCode.isSuccess(returnCode)) {
      console.log('✅ Auto-crop successful:', outputPath);
      return `file://${outputPath}`;
    } else {
      const logs = await session.getLogsAsString();
      console.error('Auto-crop failed:', logs);
      return imagePath;
    }
  } catch (error) {
    console.error('Error in cropToAspectAndResize:', error);
    return imagePath;
  }
};

// Add this function to FFMPegModule.js

export function resizeCoverImage(inputPath, outputPath) {
  return new Promise(async (resolve, reject) => {
    try {
      let cleanInputPath = inputPath;
      if (cleanInputPath.startsWith('file://')) {
        cleanInputPath = cleanInputPath.replace('file://', '');
      }

      let cleanOutputPath = outputPath;
      if (cleanOutputPath.startsWith('file://')) {
        cleanOutputPath = cleanOutputPath.replace('file://', '');
      }

      const fileExists = await RNFS.exists(cleanInputPath);
      if (!fileExists) {
        reject('Input file does not exist');
        return;
      }

      // Cover photos need higher resolution (16:9 aspect ratio)
      // Using 1280x720 for good quality without huge file size
      const targetWidth = 1280;
      const targetHeight = 720;
      const quality = Platform.OS === 'ios' ? 2 : 3; // Good balance for cover images

      // Scale to fit within bounds while maintaining aspect ratio, then pad to exact dimensions
      // Adding -threads 0 for faster processing
      const command = `-y -threads 0 -i "${cleanInputPath}" -vf scale=${targetWidth}:${targetHeight}:force_original_aspect_ratio=decrease,pad=${targetWidth}:${targetHeight}:(ow-iw)/2:(oh-ih)/2:white -q:v ${quality} "${cleanOutputPath}"`;

      console.log(`Executing cover resize command: ${command}`);

      FFmpegKit.execute(command).then(async session => {
        const returnCode = await session.getReturnCode();

        if (ReturnCode.isSuccess(returnCode)) {
          console.log('Cover image resized successfully');

          // Verify output
          const stat = await RNFS.stat(cleanOutputPath);
          console.log(`Resized cover size: ${(stat.size / 1024).toFixed(2)} KB`);

          resolve(cleanOutputPath);
        } else {
          const logs = await session.getLogsAsString();
          const failStackTrace = await session.getFailStackTrace();
          reject(`FFmpeg failed: ${failStackTrace || logs || 'Unknown error'}`);
        }
      });
    } catch (error) {
      reject(error.message || error);
    }
  });
}

export function applyImageFilter(inputPath, filterCommand) {
  return new Promise(async (resolve, reject) => {
    try {
      if (!inputPath) {
        reject('Input file path is missing');
        return;
      }

      let cleanInputPath = inputPath;
      if (cleanInputPath.startsWith('file://')) {
        cleanInputPath = cleanInputPath.replace('file://', '');
      }

      const fileExists = await RNFS.exists(cleanInputPath);
      if (!fileExists) {
        reject('Input file does not exist');
        return;
      }

      // Create a unique output path
      const outputPath = `${RNFS.TemporaryDirectoryPath}/filtered_${Date.now()}.jpg`;
      
      // Determine quality
      const quality = Platform.OS === 'ios' ? 1 : 2; 

      // Build command: -y (overwrite), -i (input), -vf (filter), -q:v (quality), output
      // Note: filterCommand should be just the string for -vf, e.g., "hue=s=0"
      let fullCommand;
      if (filterCommand && filterCommand !== 'none') {
          fullCommand = `-y -i "${cleanInputPath}" -vf "${filterCommand}" -q:v ${quality} "${outputPath}"`;
      } else {
          // If no filter, just copy or return original (but better to copy to ensure consistent behavior if needed)
           resolve(inputPath);
           return;
      }

      console.log(`Executing filter command: ${fullCommand}`);

      FFmpegKit.execute(fullCommand).then(async session => {
        const returnCode = await session.getReturnCode();

        if (ReturnCode.isSuccess(returnCode)) {
          console.log('✅ Filter applied successfully');
          resolve(`file://${outputPath}`);
        } else {
          const logs = await session.getLogsAsString();
          const failStackTrace = await session.getFailStackTrace();
          console.error('FFmpeg filter failed:', logs);
          reject(`FFmpeg failed: ${failStackTrace || logs || 'Unknown error'}`);
        }
      });
    } catch (error) {
      reject(error.message || error);
    }
  });
}

// Blend two images based on opacity (for intensity control)
// opacity: 0 = fully original, 1 = fully filtered
export function blendImages(originalPath, filteredPath, opacity) {
  return new Promise(async (resolve, reject) => {
    try {
      if (!originalPath || !filteredPath) {
        reject('Both original and filtered paths are required');
        return;
      }

      // Clean paths (remove file:// prefix if present)
      const cleanOriginal = originalPath.replace('file://', '');
      const cleanFiltered = filteredPath.replace('file://', '');

      const originalExists = await RNFS.exists(cleanOriginal);
      const filteredExists = await RNFS.exists(cleanFiltered);

      if (!originalExists) {
        reject('Original file does not exist');
        return;
      }
      if (!filteredExists) {
        reject('Filtered file does not exist');
        return;
      }

      // Create unique output path
      const outputPath = `${RNFS.TemporaryDirectoryPath}/blended_${Date.now()}.jpg`;
      
      // Determine quality
      const quality = Platform.OS === 'ios' ? 1 : 2;

      // Use the blend filter with opacity
      // blend=all_expr='A*(1-{opacity})+B*{opacity}' blends A (first input) with B (second input)
      // A = original, B = filtered
      const blendExpr = `A*(1-${opacity})+B*${opacity}`;
      const fullCommand = `-y -i "${cleanOriginal}" -i "${cleanFiltered}" -filter_complex "blend=all_expr='${blendExpr}'" -q:v ${quality} "${outputPath}"`;

      console.log(`Executing blend command with opacity ${opacity}`);

      FFmpegKit.execute(fullCommand).then(async session => {
        const returnCode = await session.getReturnCode();

        if (ReturnCode.isSuccess(returnCode)) {
          console.log('✅ Images blended successfully');
          resolve(`file://${outputPath}`);
        } else {
          const logs = await session.getLogsAsString();
          const failStackTrace = await session.getFailStackTrace();
          console.error('FFmpeg blend failed:', logs);
          reject(`FFmpeg blend failed: ${failStackTrace || logs || 'Unknown error'}`);
        }
      });
    } catch (error) {
      reject(error.message || error);
    }
  });
}
