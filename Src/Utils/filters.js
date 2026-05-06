// FFmpeg filters optimized for LGPL / 16KB compatible builds (No 'eq' or 'smartblur')
// Using 'hue', 'curves', 'colorbalance', 'yaepblur' as alternatives.

export const FILTERS = [
    // Cinematic
    { id: 4, name: 'Cinematic', command: "curves=all='0/0 0.5/0.45 1/1',colorbalance=rm=0.1:bm=0.1,vignette=angle=0.785", description: 'Cinematic', category: 'Cinematic' },
    { id: 7, name: 'Hyper', command: "unsharp=5:5:1.0:5:5:0.0,curves=all='0.1/0 0.5/0.5 0.9/1',hue=s=1.2", description: 'Hyper', category: 'Cinematic' },
    { id: 12, name: 'New York', command: "curves=all='0.1/0 0.5/0.5 0.9/1',hue=s=1.1:b=-0.02", description: 'New York', category: 'Cinematic' },
    { id: 31, name: 'Tokyo', command: "hue=s=1.4,colorchannelmixer=rr=1.05:gg=0.95:bb=1.1,curves=all='0/0 0.25/0.3 0.75/0.8 1/1',vignette", description: 'Vibrant Cool', category: 'Cinematic' },
    { id: 32, name: 'Hefe', command: "curves=all='0/0.1 0.5/0.45 1/0.9',hue=s=1.4,vignette=angle=1.047", description: 'High Contrast', category: 'Cinematic' },
    { id: 19, name: 'Clarendon', command: "hue=s=1.5:b=0.05,curves=r='0/0 0.5/0.58 1/1':g='0/0 0.5/0.58 1/1':b='0/0 0.5/0.7 1/1'", description: 'Landscapes', category: 'Cinematic' },
    { id: 20, name: 'Juno', command: "hue=s=1.2:b=0.1,curves=all='0/0 0.5/0.6 1/1'", description: 'Cityscapes', category: 'Cinematic' },

    // Portrait
    { id: 1, name: 'Paris', command: "yaepblur=r=1.5:s=1,hue=b=0.03,curves=all='0/0 0.5/0.55 1/1'", description: 'Paris', category: 'Portrait' },
    { id: 11, name: 'Soft Light', command: "curves=all='0/0 0.5/0.6 1/1',hue=s=0.9:b=0.05", description: 'Soft Light', category: 'Portrait' },
    { id: 36, name: 'Velvet', command: "yaepblur=r=1.5:s=1,hue=b=0.05,curves=all='0/0 0.5/0.55 1/1'", description: 'Beauty', category: 'Portrait' },
    { id: 39, name: 'Smoothie', command: "yaepblur=r=2.5:s=1,curves=all='0/0 0.5/0.52 1/1'", description: 'Soft Skin', category: 'Portrait' },
    { id: 40, name: 'Rosy', command: "yaepblur=r=1.5:s=1,colorbalance=rh=0.08:gh=0.02:bh=0.04,hue=b=0.04", description: 'Warm Glow', category: 'Portrait' },
    { id: 41, name: 'Bright', command: "hue=b=0.08:s=0.95,curves=all='0.1/0 0.5/0.5 0.9/1',yaepblur=r=1.0:s=1", description: 'Bright Face', category: 'Portrait' },
    { id: 42, name: 'Porcelain', command: "yaepblur=r=3:s=1,hue=b=0.1:s=0.85", description: 'Pale & Smooth', category: 'Portrait' },

    // Vintage
    { id: 8, name: 'Grainy', command: "noise=alls=15:allf=t+u,curves=all='0/0 0.5/0.52 1/1'", description: 'Grainy', category: 'Vintage' },
    { id: 15, name: 'Valencia', command: "colorbalance=rh=0.1:gh=0.05:bh=-0.1,curves=all='0/0 0.5/0.55 1/1',hue=s=1.1:b=0.05", description: 'Valencia', category: 'Vintage' },
    { id: 17, name: 'Nashville', command: "colorbalance=rh=0.15:gh=0.05:bh=0.12:rm=0.08:bm=0.05,curves=all='0.1/0 0.5/0.5 0.9/1',hue=s=1.1:b=0.08", description: 'Nashville', category: 'Vintage' },
    { id: 26, name: 'Gingham', command: "hue=b=0.1:s=0.7,colorbalance=rh=0.05:gh=0.08:bh=-0.1,curves=all='0/0.15 0.5/0.55 1/0.95'", description: 'Vintage', category: 'Vintage' },
    { id: 29, name: 'Retro Glow', command: "yaepblur=r=2:s=1,hue=b=0.02", description: 'Dreamy 80s', category: 'Vintage' },
    { id: 16, name: 'Sierra', command: "curves=all='0/0.1 0.5/0.5 1/0.9',hue=s=0.8", description: 'Sierra', category: 'Vintage' },
    { id: 38, name: 'Retro Film', command: "curves=all='0/0.1 0.5/0.5 1/0.9',colorbalance=rh=0.05:bh=-0.05,noise=alls=12:allf=t+u", description: 'Analog Feel', category: 'Vintage' },
    { id: 21, name: 'Valencia', command: "curves=r='0/0.11 0.42/0.51 1/0.95':g='0/0.12 0.50/0.48 1/0.90':b='0/0.14 0.50/0.50 1/0.86',hue=b=0.05", description: 'Lifestyle', category: 'Vintage' },

    // Atmosphere
    { id: 2, name: 'Simple Warm', command: "colorbalance=rh=0.05:gh=0.02:bh=-0.02", description: 'Simple Warm', category: 'Atmosphere' },
    { id: 3, name: 'Simple Cool', command: "colorbalance=rh=-0.02:gh=-0.01:bh=0.05", description: 'Simple Cool', category: 'Atmosphere' },
    { id: 5, name: 'Boost Warm', command: "colorbalance=rh=0.15:gh=0.08:bh=-0.1,hue=s=1.2", description: 'Boost Warm', category: 'Atmosphere' },
    { id: 6, name: 'Boost Cool', command: "colorbalance=rh=-0.1:gh=-0.05:bh=0.2,hue=s=1.1", description: 'Boost Cool', category: 'Atmosphere' },
    { id: 13, name: 'Cairo', command: "colorbalance=rh=0.1:gh=0.05:bh=-0.1,curves=all='0/0 0.5/0.52 1/1'", description: 'Cairo', category: 'Atmosphere' },
    { id: 25, name: 'Oslo', command: "hue=b=0.1:s=0.7,curves=all='0/0 0.5/0.55 1/1'", description: 'Minimalist', category: 'Atmosphere' },
    { id: 30, name: 'Summer Tan', command: "hue=s=1.3:h=20,curves=all='0.1/0 0.5/0.5 0.9/1',hue=b=0.05", description: 'Sun-kissed', category: 'Atmosphere' },
    { id: 14, name: 'Rise', command: "curves=all='0.1/0 0.5/0.5 0.9/1',hue=b=0.05,colorbalance=rh=0.1:gh=0.05:bh=-0.05", description: 'Rise', category: 'Atmosphere' },
    { id: 34, name: 'Rise Classic', command: "curves=all='0.1/0 0.5/0.5 0.9/1',hue=b=0.05,colorbalance=rh=0.1:gh=0.05:bh=-0.05", description: 'Morning Light', category: 'Atmosphere' },
    { id: 18, name: 'Mayfair', command: "curves=all='0.1/0 0.5/0.5 0.9/1',hue=s=1.1,colorbalance=rh=0.05,vignette=angle=0.785", description: 'Mayfair', category: 'Atmosphere' },
    { id: 35, name: 'Vignette', command: "curves=all='0.1/0 0.5/0.5 0.9/1',hue=s=1.1,colorbalance=rh=0.05,vignette=angle=0.785", description: 'Vignette Warm', category: 'Atmosphere' },
    { id: 22, name: 'Lark', command: "hue=b=0.1,curves=all='0.1/0 0.5/0.5 0.9/1',colorbalance=rm=-0.1:gm=0.05:bm=0.1:rh=-0.05:gh=0.05:bh=0.05", description: 'Nature', category: 'Atmosphere' },

    // Artistic
    { id: 10, name: 'Color Leak', command: "colorbalance=rh=0.25:gh=0.05,curves=all='0/0 0.5/0.6 1/1'", description: 'Color Leak', category: 'Artistic' },
    { id: 27, name: 'Lo-Fi', command: "curves=all='0.2/0 0.5/0.5 0.8/1',hue=s=1.6:b=-0.05", description: 'Food/Drama', category: 'Artistic' },
    { id: 33, name: 'Ludwig', command: "hue=b=0.05,curves=r='0/0 0.5/0.6 1/1':g='0/0 0.5/0.45 1/1':b='0/0 0.5/0.45 1/1'", description: 'Minimal/Red', category: 'Artistic' },
    { id: 23, name: 'Aden', command: "hue=s=0.8:b=0.05,colorbalance=rh=-0.1:bh=0.15,curves=all='0/0.1 0.5/0.5 1/0.95'", description: 'Portraits', category: 'Artistic' },
    { id: 24, name: 'Melbourne', command: "curves=all='0.1/0 0.5/0.5 0.9/1',hue=b=0.02,colorbalance=rh=0.05:gh=0.02:bh=-0.05", description: 'Warm Glow', category: 'Artistic' },
    { id: 9, name: 'Halo', command: "vignette=angle=0.5:mode=backward", description: 'Halo', category: 'Artistic' },
    { id: 28, name: 'Strawberry', command: "hue=h=340:s=1.2:b=0.03,curves=r='0/0.1 0.5/0.6 1/0.9'", description: 'Sweet Vibe', category: 'Artistic' },
    { id: 37, name: 'Dreamy', command: "yaepblur=r=2:s=1,curves=all='0/0 0.5/0.52 1/1',hue=b=0.05:s=0.9,colorbalance=rh=0.05:gh=0.02:bh=0.05,vignette=angle=0.785", description: 'Atmospheric', category: 'Artistic' }
];

export const FILTERS_SUPPORTED = true;
