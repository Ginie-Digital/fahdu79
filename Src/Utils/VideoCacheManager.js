import RNFS from 'react-native-fs';
import { Platform } from 'react-native';

const CACHE_DIR = RNFS.CachesDirectoryPath + '/VideoCache';
const MAX_CONCURRENT_DOWNLOADS = 2; // Limit concurrent downloads to prevent bandwidth saturation
const MIN_FILE_SIZE = 1024; // Minimum 1KB to be considered valid

// Ensure cache directory exists
const ensureCacheDir = async () => {
    const exists = await RNFS.exists(CACHE_DIR);
    if (!exists) {
        await RNFS.mkdir(CACHE_DIR);
    }
};

// Simple hash function to generate filename from URL
const getFileName = (url) => {
    // Basic hash to avoid special characters
    let hash = 0;
    for (let i = 0; i < url.length; i++) {
        hash = ((hash << 5) - hash) + url.charCodeAt(i);
        hash |= 0; // Convert to 32bit integer
    }
    // Append extension based on URL or default to mp4
    const ext = url.includes('.m3u8') ? 'm3u8' : 'mp4'; 
    return `vid_${hash}.${ext}`;
};

// Track active downloads
const activeDownloads = new Set();
const downloadQueue = [];
let isProcessingQueue = false;

export const getVideoSource = async (url) => {
    if (!url) return null;
    
    // If it's already a local file, return as is
    if (url.startsWith('file://')) return { uri: url };

    try {
        await ensureCacheDir();
        const filename = getFileName(url);
        const localPath = `${CACHE_DIR}/${filename}`;
        
        const exists = await RNFS.exists(localPath);
        console.log('[VideoCache] Checking:', filename, '| Exists:', exists);

        if (exists) {
            // Validate file size before returning cached file
            try {
                const stat = await RNFS.stat(localPath);
                console.log('[VideoCache] Found cached file, size:', stat.size, 'bytes');
                if (stat.size >= MIN_FILE_SIZE) {
                    const cachedUri = Platform.OS === 'android' ? 'file://' + localPath : localPath;
                    console.log('[VideoCache] ✓ Using cached:', cachedUri);
                    return { uri: cachedUri };
                } else {
                    // File is too small (likely corrupt), delete and re-download
                    console.log('[VideoCache] ✗ File too small, re-downloading');
                    await RNFS.unlink(localPath).catch(() => {});
                    queueDownload(url, localPath);
                    return { uri: url };
                }
            } catch (statError) {
                // If we can't stat the file, use remote URL
                console.log('[VideoCache] Stat error:', statError);
                return { uri: url };
            }
        } else {
            // File doesn't exist, return original URL immediately
            // But queue download for NEXT time
            console.log('[VideoCache] Not cached, queuing download');
            queueDownload(url, localPath);
            return { uri: url };
        }
    } catch (error) {
        console.warn('[VideoCache] Error:', error);
        return { uri: url };
    }
};

// Queue download to respect concurrency limit
const queueDownload = (url, localPath) => {
    if (activeDownloads.has(url)) return; // Already downloading
    
    downloadQueue.push({ url, localPath });
    processQueue();
};

// Process download queue respecting concurrency limit
const processQueue = async () => {
    if (isProcessingQueue) return;
    isProcessingQueue = true;
    
    while (downloadQueue.length > 0 && activeDownloads.size < MAX_CONCURRENT_DOWNLOADS) {
        const { url, localPath } = downloadQueue.shift();
        if (!activeDownloads.has(url)) {
            startBackgroundDownload(url, localPath);
        }
    }
    
    isProcessingQueue = false;
};

const startBackgroundDownload = async (url, localPath) => {
    if (activeDownloads.has(url)) return;
    
    activeDownloads.add(url);
    const tempPath = `${localPath}.tmp`;
    const filename = localPath.split('/').pop();
    console.log('[VideoCache] Starting download:', filename);

    try {
        const result = await RNFS.downloadFile({
            fromUrl: url,
            toFile: tempPath,
            background: true,
            discretionary: true,
            cacheable: false,
        }).promise;

        console.log('[VideoCache] Download result:', filename, '| Status:', result.statusCode, '| Bytes:', result.bytesWritten);

        // Validate downloaded file
        if (result.statusCode === 200 && result.bytesWritten >= MIN_FILE_SIZE) {
            // Success - rename to final path
            await RNFS.moveFile(tempPath, localPath);
            console.log('[VideoCache] ✓ Download saved:', filename);
        } else {
            // Invalid download - cleanup
            console.log('[VideoCache] ✗ Download invalid, cleaning up');
            await RNFS.unlink(tempPath).catch(() => {});
        }
    } catch (error) {
        console.log('[VideoCache] Download failed:', filename, error.message);
        // Clean up partial file
        RNFS.unlink(tempPath).catch(() => {});
    } finally {
        activeDownloads.delete(url);
        // Process next item in queue
        processQueue();
    }
};

// Utility to clear cache
export const clearVideoCache = async () => {
    try {
        const exists = await RNFS.exists(CACHE_DIR);
        if (exists) {
            await RNFS.unlink(CACHE_DIR);
            await RNFS.mkdir(CACHE_DIR);
        }
    } catch (error) {
        console.warn('Clear cache error:', error);
    }
};
