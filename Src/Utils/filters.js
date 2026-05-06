// FULL FILTERS - Works on both Android and iOS (with full-gpl package)
export const FILTERS = [
    // Cinematic
    { id: 4, name: 'Cinematic', command: "curves=all='0/0 0.5/0.45 1/1',colorbalance=rm=0.1:bm=0.1,vignette=angle=0.785", description: 'Cinematic', category: 'Cinematic' },
    { id: 7, name: 'Hyper', command: "unsharp=5:5:1.0:5:5:0.0,eq=contrast=1.2:saturation=1.2", description: 'Hyper', category: 'Cinematic' },
    { id: 12, name: 'New York', command: "eq=contrast=1.3:saturation=1.1:brightness=-0.02", description: 'New York', category: 'Cinematic' },
    { id: 31, name: 'Tokyo', command: "eq=contrast=1.15:saturation=1.4,colorchannelmixer=rr=1.05:gg=0.95:bb=1.1,curves=all='0/0 0.25/0.3 0.75/0.8 1/1',vignette", description: 'Vibrant Cool', category: 'Cinematic' },
    { id: 32, name: 'Hefe', command: "eq=contrast=1.4:saturation=1.4,curves=all='0/0 0.5/0.45 1/1',vignette=angle=1.047", description: 'High Contrast', category: 'Cinematic' },
    { id: 19, name: 'Clarendon', command: "eq=contrast=1.3:saturation=1.5:brightness=0.05,curves=r='0/0 0.5/0.58 1/1':g='0/0 0.5/0.58 1/1':b='0/0 0.5/0.7 1/1'", description: 'Landscapes', category: 'Cinematic' },
    { id: 20, name: 'Juno', command: "eq=contrast=1.2:brightness=0.1,hue=s=1.2,curves=all='0/0 0.5/0.6 1/1'", description: 'Cityscapes', category: 'Cinematic' },

    // Portrait
    { id: 1, name: 'Paris', command: "smartblur=lr=1.5:ls=-0.5,eq=brightness=0.03:contrast=0.95", description: 'Paris', category: 'Portrait' },
    { id: 11, name: 'Soft Light', command: "eq=gamma=1.2:saturation=0.9:brightness=0.05", description: 'Soft Light', category: 'Portrait' },
    { id: 36, name: 'Velvet', command: "smartblur=lr=1.5:ls=-1,eq=brightness=0.05:gamma=1.1", description: 'Beauty', category: 'Portrait' },
    { id: 39, name: 'Smoothie', command: "smartblur=lr=2.5:ls=-0.9,eq=contrast=1.02", description: 'Soft Skin', category: 'Portrait' },
    { id: 40, name: 'Rosy', command: "smartblur=lr=1.5:ls=-0.5,colorbalance=rh=0.08:gh=0.02:bh=0.04,eq=brightness=0.04", description: 'Warm Glow', category: 'Portrait' },
    { id: 41, name: 'Bright', command: "eq=brightness=0.08:contrast=1.05:saturation=0.95,smartblur=lr=1.0:ls=-0.5", description: 'Bright Face', category: 'Portrait' },
    { id: 42, name: 'Porcelain', command: "smartblur=lr=3:ls=-0.5,eq=brightness=0.1:saturation=0.85", description: 'Pale & Smooth', category: 'Portrait' },

    // Vintage
    { id: 8, name: 'Grainy', command: "noise=alls=15:allf=t+u,eq=contrast=0.95", description: 'Grainy', category: 'Vintage' },
    { id: 15, name: 'Valencia', command: "colorbalance=rh=0.1:gh=0.05:bh=-0.1,eq=contrast=0.9:brightness=0.05:saturation=1.1", description: 'Valencia', category: 'Vintage' },
    { id: 17, name: 'Nashville', command: "colorbalance=rh=0.15:gh=0.05:bh=0.12:rm=0.08:bm=0.05,eq=contrast=1.1:brightness=0.08:saturation=1.1", description: 'Nashville', category: 'Vintage' },
    { id: 26, name: 'Gingham', command: "eq=brightness=0.1:saturation=0.7,colorbalance=rh=0.05:gh=0.08:bh=-0.1,curves=all='0/0.15 0.5/0.55 1/0.95'", description: 'Vintage', category: 'Vintage' },
    { id: 29, name: 'Retro Glow', command: "rgbashift=rh=-2:gh=2,smartblur=lr=2:ls=-1,eq=brightness=0.02", description: 'Dreamy 80s', category: 'Vintage' },
    { id: 16, name: 'Sierra', command: "curves=all='0/0.1 0.5/0.5 1/0.9',eq=saturation=0.8", description: 'Sierra', category: 'Vintage' },
    { id: 38, name: 'Retro Film', command: "curves=all='0/0.1 0.5/0.5 1/0.9',colorbalance=rh=0.05:bh=-0.05,noise=alls=12:allf=t+u", description: 'Analog Feel', category: 'Vintage' },
    { id: 21, name: 'Valencia', command: "curves=r='0/0.11 0.42/0.51 1/0.95':g='0/0.12 0.50/0.48 1/0.90':b='0/0.14 0.50/0.50 1/0.86',eq=brightness=0.05", description: 'Lifestyle', category: 'Vintage' },

    // Atmosphere
    { id: 2, name: 'Simple Warm', command: "colorbalance=rh=0.05:gh=0.02:bh=-0.02", description: 'Simple Warm', category: 'Atmosphere' },
    { id: 3, name: 'Simple Cool', command: "colorbalance=rh=-0.02:gh=-0.01:bh=0.05", description: 'Simple Cool', category: 'Atmosphere' },
    { id: 5, name: 'Boost Warm', command: "colorbalance=rh=0.15:gh=0.08:bh=-0.1,eq=saturation=1.2", description: 'Boost Warm', category: 'Atmosphere' },
    { id: 6, name: 'Boost Cool', command: "colorbalance=rh=-0.1:gh=-0.05:bh=0.2,eq=saturation=1.1", description: 'Boost Cool', category: 'Atmosphere' },
    { id: 13, name: 'Cairo', command: "colorbalance=rh=0.1:gh=0.05:bh=-0.1,eq=contrast=0.95", description: 'Cairo', category: 'Atmosphere' },
    { id: 25, name: 'Oslo', command: "eq=brightness=0.1:contrast=0.9:saturation=0.7", description: 'Minimalist', category: 'Atmosphere' },
    { id: 30, name: 'Summer Tan', command: "hue=s=1.3:h=20,eq=brightness=0.05:contrast=1.1", description: 'Sun-kissed', category: 'Atmosphere' },
    { id: 14, name: 'Rise', command: "eq=brightness=0.05:contrast=1.1,colorbalance=rh=0.1:gh=0.05:bh=-0.05", description: 'Rise', category: 'Atmosphere' },
    { id: 34, name: 'Rise Classic', command: "eq=brightness=0.05:contrast=1.1,colorbalance=rh=0.1:gh=0.05:bh=-0.05", description: 'Morning Light', category: 'Atmosphere' },
    { id: 18, name: 'Mayfair', command: "eq=contrast=1.2:saturation=1.1,colorbalance=rh=0.05,vignette=angle=0.785", description: 'Mayfair', category: 'Atmosphere' },
    { id: 35, name: 'Vignette', command: "eq=contrast=1.2:saturation=1.1,colorbalance=rh=0.05,vignette=angle=0.785", description: 'Vignette Warm', category: 'Atmosphere' },
    { id: 22, name: 'Lark', command: "eq=brightness=0.1:contrast=1.1,colorbalance=rm=-0.1:gm=0.05:bm=0.1:rh=-0.05:gh=0.05:bh=0.05", description: 'Nature', category: 'Atmosphere' },

    // Artistic
    { id: 10, name: 'Color Leak', command: "colorbalance=rh=0.25:gh=0.05,curves=all='0/0 0.5/0.6 1/1'", description: 'Color Leak', category: 'Artistic' },
    { id: 27, name: 'Lo-Fi', command: "eq=contrast=1.5:saturation=1.6:brightness=-0.05", description: 'Food/Drama', category: 'Artistic' },
    { id: 33, name: 'Ludwig', command: "eq=contrast=1.1:brightness=0.05,curves=r='0/0 0.5/0.6 1/1':g='0/0 0.5/0.45 1/1':b='0/0 0.5/0.45 1/1'", description: 'Minimal/Red', category: 'Artistic' },
    { id: 23, name: 'Aden', command: "eq=saturation=0.8:brightness=0.05,colorbalance=rh=-0.1:bh=0.15,curves=all='0/0.1 0.5/0.5 1/0.95'", description: 'Portraits', category: 'Artistic' },
    { id: 24, name: 'Melbourne', command: "eq=contrast=1.1:brightness=0.02,colorbalance=rh=0.05:gh=0.02:bh=-0.05", description: 'Warm Glow', category: 'Artistic' },
    { id: 9, name: 'Halo', command: "vignette=angle=0.5:mode=backward", description: 'Halo', category: 'Artistic' },
    { id: 28, name: 'Strawberry', command: "hue=h=340:s=1.2,eq=brightness=0.03,curves=r='0/0.1 0.5/0.6 1/0.9'", description: 'Sweet Vibe', category: 'Artistic' },
    { id: 37, name: 'Dreamy', command: "smartblur=lr=2:ls=-1,eq=contrast=0.9:brightness=0.05:saturation=0.9,colorbalance=rh=0.05:gh=0.02:bh=0.05,vignette=angle=0.785", description: 'Atmospheric', category: 'Artistic' }
];

// Full filters now supported on both platforms
export const FILTERS_SUPPORTED = true;
