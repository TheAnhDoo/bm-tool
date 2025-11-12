interface DeviceFingerprint {
  userAgent: string;
  platform: string;
  language: string;
  languages: string[];
  timezone: string;
  screen: {
    width: number;
    height: number;
    colorDepth: number;
    availWidth: number;
    availHeight: number;
    pixelRatio: number;
  };
  hardware: {
    cpuCores: number;
    memory: number; // GB
    deviceMemory: number; // GB (navigator.deviceMemory)
    hardwareConcurrency: number; // CPU cores
  };
  webgl: {
    vendor: string;
    renderer: string;
    version: string;
    shadingLanguageVersion: string;
    maxTextureSize: number;
    maxVertexAttribs: number;
    maxViewportDims: number[];
  };
  canvas: string;
  audio: string;
  mediaDevices: {
    videoInputs: number;
    audioInputs: number;
    audioOutputs: number;
  };
  plugins: string[];
  fonts: string[];
}

// GPU vendors and models
const GPU_VENDORS = [
  'Google Inc. (Intel)',
  'Google Inc. (NVIDIA)',
  'Google Inc. (AMD)',
  'Google Inc. (Apple)',
  'Intel Inc.',
  'NVIDIA Corporation',
  'Advanced Micro Devices, Inc.',
];

const GPU_RENDERERS = [
  'Intel Iris OpenGL Engine',
  'Intel UHD Graphics 630',
  'NVIDIA GeForce GTX 1060',
  'NVIDIA GeForce RTX 3060',
  'AMD Radeon RX 580',
  'AMD Radeon RX 6700 XT',
  'Apple M1 GPU',
  'Apple M2 GPU',
  'Mesa DRI Intel(R) HD Graphics',
];

// Common font sets
const FONT_SETS = [
  ['Arial', 'Verdana', 'Helvetica', 'Times New Roman', 'Courier New', 'Georgia'],
  ['Arial', 'Helvetica', 'Times', 'Courier', 'Verdana', 'Georgia'],
  ['Arial', 'Calibri', 'Comic Sans MS', 'Courier New', 'Georgia', 'Impact'],
];

const PRESETS: Record<string, Partial<DeviceFingerprint>> = {
  'chrome-windows': {
    platform: 'Win32',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    language: 'en-US',
    languages: ['en-US', 'en'],
    timezone: 'America/New_York',
    screen: {
      width: 1920,
      height: 1080,
      colorDepth: 24,
      availWidth: 1920,
      availHeight: 1040,
      pixelRatio: 1,
    },
    hardware: {
      cpuCores: 8,
      memory: 16,
      deviceMemory: 8,
      hardwareConcurrency: 8,
    },
    webgl: {
      vendor: 'Google Inc. (Intel)',
      renderer: 'Intel Iris OpenGL Engine',
      version: 'WebGL 2.0',
      shadingLanguageVersion: 'WebGL GLSL ES 3.00',
      maxTextureSize: 16384,
      maxVertexAttribs: 16,
      maxViewportDims: [16384, 16384],
    },
    mediaDevices: {
      videoInputs: 1,
      audioInputs: 1,
      audioOutputs: 2,
    },
    plugins: ['Chrome PDF Plugin', 'Chrome PDF Viewer', 'Native Client'],
    fonts: ['Arial', 'Verdana', 'Helvetica', 'Times New Roman', 'Courier New', 'Georgia'],
  },
  'chrome-macos': {
    platform: 'MacIntel',
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    language: 'en-US',
    languages: ['en-US', 'en'],
    timezone: 'America/Los_Angeles',
    screen: {
      width: 1440,
      height: 900,
      colorDepth: 24,
      availWidth: 1440,
      availHeight: 860,
      pixelRatio: 2,
    },
    hardware: {
      cpuCores: 8,
      memory: 16,
      deviceMemory: 8,
      hardwareConcurrency: 8,
    },
    webgl: {
      vendor: 'Google Inc. (Apple)',
      renderer: 'Apple M1 GPU',
      version: 'WebGL 2.0',
      shadingLanguageVersion: 'WebGL GLSL ES 3.00',
      maxTextureSize: 16384,
      maxVertexAttribs: 16,
      maxViewportDims: [16384, 16384],
    },
    mediaDevices: {
      videoInputs: 1,
      audioInputs: 1,
      audioOutputs: 2,
    },
    plugins: ['Chrome PDF Plugin', 'Chrome PDF Viewer'],
    fonts: ['Arial', 'Helvetica', 'Times', 'Courier', 'Verdana', 'Georgia'],
  },
  'firefox-windows': {
    platform: 'Win32',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
    language: 'en-US',
    languages: ['en-US', 'en'],
    timezone: 'America/New_York',
    screen: {
      width: 1920,
      height: 1080,
      colorDepth: 24,
      availWidth: 1920,
      availHeight: 1040,
      pixelRatio: 1,
    },
    hardware: {
      cpuCores: 8,
      memory: 16,
      deviceMemory: 8,
      hardwareConcurrency: 8,
    },
    webgl: {
      vendor: 'Google Inc. (NVIDIA)',
      renderer: 'NVIDIA GeForce GTX 1060',
      version: 'WebGL 2.0',
      shadingLanguageVersion: 'WebGL GLSL ES 3.00',
      maxTextureSize: 16384,
      maxVertexAttribs: 16,
      maxViewportDims: [16384, 16384],
    },
    mediaDevices: {
      videoInputs: 1,
      audioInputs: 1,
      audioOutputs: 2,
    },
    plugins: [],
    fonts: ['Arial', 'Verdana', 'Helvetica', 'Times New Roman', 'Courier New', 'Georgia'],
  },
  'edge-windows': {
    platform: 'Win32',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0',
    language: 'en-US',
    languages: ['en-US', 'en'],
    timezone: 'America/New_York',
    screen: {
      width: 1920,
      height: 1080,
      colorDepth: 24,
      availWidth: 1920,
      availHeight: 1040,
      pixelRatio: 1,
    },
    hardware: {
      cpuCores: 8,
      memory: 16,
      deviceMemory: 8,
      hardwareConcurrency: 8,
    },
    webgl: {
      vendor: 'Google Inc. (AMD)',
      renderer: 'AMD Radeon RX 580',
      version: 'WebGL 2.0',
      shadingLanguageVersion: 'WebGL GLSL ES 3.00',
      maxTextureSize: 16384,
      maxVertexAttribs: 16,
      maxViewportDims: [16384, 16384],
    },
    mediaDevices: {
      videoInputs: 1,
      audioInputs: 1,
      audioOutputs: 2,
    },
    plugins: ['Microsoft Edge PDF Plugin', 'Microsoft Edge PDF Viewer'],
    fonts: ['Arial', 'Verdana', 'Helvetica', 'Times New Roman', 'Courier New', 'Georgia'],
  },
};

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomChoice<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

export function generateFingerprint(preset?: string): DeviceFingerprint {
  if (preset && PRESETS[preset]) {
    const base = PRESETS[preset];
    const screenWidth = base.screen!.width + randomInt(-100, 100);
    const screenHeight = base.screen!.height + randomInt(-100, 100);
    const cpuCores = base.hardware!.cpuCores + randomInt(-2, 2);
    const memory = base.hardware!.memory + randomInt(-4, 4);
    
    return {
      ...base,
      screen: {
        width: screenWidth,
        height: screenHeight,
        colorDepth: base.screen!.colorDepth,
        availWidth: screenWidth - randomInt(0, 80),
        availHeight: screenHeight - randomInt(0, 80),
        pixelRatio: base.screen!.pixelRatio || 1,
      },
      hardware: {
        cpuCores: Math.max(2, cpuCores),
        memory: Math.max(4, memory),
        deviceMemory: Math.max(2, Math.floor(memory / 2)),
        hardwareConcurrency: Math.max(2, cpuCores),
      },
      webgl: {
        vendor: randomChoice(GPU_VENDORS), // Randomize GPU vendor
        renderer: randomChoice(GPU_RENDERERS), // Randomize GPU renderer
        version: base.webgl!.version,
        shadingLanguageVersion: base.webgl!.shadingLanguageVersion,
        maxTextureSize: base.webgl!.maxTextureSize + randomInt(-1024, 1024),
        maxVertexAttribs: base.webgl!.maxVertexAttribs,
        maxViewportDims: [
          base.webgl!.maxViewportDims[0] + randomInt(-512, 512),
          base.webgl!.maxViewportDims[1] + randomInt(-512, 512),
        ],
      },
      canvas: Math.random().toString(36),
      audio: Math.random().toString(36),
      fonts: randomChoice(FONT_SETS),
    } as DeviceFingerprint;
  }

  // Random fingerprint
  const platforms = ['Win32', 'MacIntel', 'Linux x86_64'];
  const languages = ['en-US', 'en-GB', 'en-CA', 'fr-FR', 'de-DE', 'es-ES'];
  const timezones = ['America/New_York', 'America/Los_Angeles', 'Europe/London', 'Asia/Tokyo', 'Europe/Paris', 'Asia/Shanghai'];
  
  const width = randomChoice([1920, 1366, 1440, 1536, 1600, 2560]);
  const height = randomChoice([1080, 768, 900, 864, 1024, 1440]);
  const cpuCores = randomChoice([4, 6, 8, 12, 16]);
  const memory = randomChoice([8, 16, 32, 64]);
  const pixelRatio = randomChoice([1, 1.25, 1.5, 2]);
  
  const gpuVendor = randomChoice(GPU_VENDORS);
  const gpuRenderer = randomChoice(GPU_RENDERERS);

  return {
    platform: randomChoice(platforms),
    userAgent: `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${randomInt(115, 120)}.0.0.0 Safari/537.36`,
    language: randomChoice(languages),
    languages: [randomChoice(languages), 'en'],
    timezone: randomChoice(timezones),
    screen: {
      width,
      height,
      colorDepth: randomChoice([24, 32]),
      availWidth: width - randomInt(0, 80),
      availHeight: height - randomInt(0, 80),
      pixelRatio,
    },
    hardware: {
      cpuCores,
      memory,
      deviceMemory: Math.floor(memory / 2),
      hardwareConcurrency: cpuCores,
    },
    webgl: {
      vendor: gpuVendor,
      renderer: gpuRenderer,
      version: 'WebGL 2.0',
      shadingLanguageVersion: 'WebGL GLSL ES 3.00',
      maxTextureSize: randomChoice([8192, 16384]),
      maxVertexAttribs: randomChoice([16, 32]),
      maxViewportDims: [randomChoice([8192, 16384]), randomChoice([8192, 16384])],
    },
    canvas: Math.random().toString(36),
    audio: Math.random().toString(36),
    mediaDevices: {
      videoInputs: randomChoice([0, 1, 2]),
      audioInputs: randomChoice([0, 1, 2]),
      audioOutputs: randomChoice([1, 2]),
    },
    plugins: randomChoice([
      ['Chrome PDF Plugin', 'Chrome PDF Viewer'],
      ['Chrome PDF Plugin', 'Chrome PDF Viewer', 'Native Client'],
      [],
    ]),
    fonts: randomChoice(FONT_SETS),
  };
}

