import { useState, useEffect } from "react";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";

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
    memory: number;
    deviceMemory: number;
    hardwareConcurrency: number;
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
  mediaDevices: {
    videoInputs: number;
    audioInputs: number;
    audioOutputs: number;
  };
  plugins: string[];
  fonts: string[];
}

interface CustomFingerprintEditorProps {
  value: DeviceFingerprint | null;
  onChange: (fingerprint: DeviceFingerprint | null) => void;
}

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

const PLATFORMS = ['Win32', 'MacIntel', 'Linux x86_64'];
const LANGUAGES = ['en-US', 'en-GB', 'en-CA', 'fr-FR', 'de-DE', 'es-ES', 'zh-CN', 'ja-JP'];
const TIMEZONES = [
  'America/New_York',
  'America/Los_Angeles',
  'Europe/London',
  'Asia/Tokyo',
  'Europe/Paris',
  'Asia/Shanghai',
  'America/Chicago',
  'Europe/Berlin',
];

const DEFAULT_FINGERPRINT: DeviceFingerprint = {
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  platform: 'Win32',
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
  plugins: ['Chrome PDF Plugin', 'Chrome PDF Viewer'],
  fonts: ['Arial', 'Verdana', 'Helvetica', 'Times New Roman', 'Courier New', 'Georgia'],
};

export function CustomFingerprintEditor({ value, onChange }: CustomFingerprintEditorProps) {
  const [fingerprint, setFingerprint] = useState<DeviceFingerprint>(
    value || DEFAULT_FINGERPRINT
  );

  useEffect(() => {
    if (value) {
      setFingerprint(value);
    }
  }, [value]);

  const updateFingerprint = (updates: Partial<DeviceFingerprint>) => {
    const updated = { ...fingerprint, ...updates };
    setFingerprint(updated);
    onChange(updated);
  };

  const updateScreen = (updates: Partial<DeviceFingerprint['screen']>) => {
    updateFingerprint({
      screen: { ...fingerprint.screen, ...updates },
    });
  };

  const updateHardware = (updates: Partial<DeviceFingerprint['hardware']>) => {
    updateFingerprint({
      hardware: { ...fingerprint.hardware, ...updates },
    });
  };

  const updateWebGL = (updates: Partial<DeviceFingerprint['webgl']>) => {
    updateFingerprint({
      webgl: { ...fingerprint.webgl, ...updates },
    });
  };

  const updateMediaDevices = (updates: Partial<DeviceFingerprint['mediaDevices']>) => {
    updateFingerprint({
      mediaDevices: { ...fingerprint.mediaDevices, ...updates },
    });
  };

  return (
    <div className="space-y-6 p-4 border rounded-lg" style={{ backgroundColor: "#F9FAFB", borderColor: "#E5E7EB" }}>
      <h4 className="text-sm font-semibold" style={{ color: "#333" }}>Custom Device Configuration</h4>

      {/* Platform & User Agent */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Platform</Label>
          <Select value={fingerprint.platform} onValueChange={(v) => updateFingerprint({ platform: v })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PLATFORMS.map((p) => (
                <SelectItem key={p} value={p}>{p}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Language</Label>
          <Select value={fingerprint.language} onValueChange={(v) => updateFingerprint({ language: v, languages: [v, 'en'] })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LANGUAGES.map((l) => (
                <SelectItem key={l} value={l}>{l}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Timezone</Label>
        <Select value={fingerprint.timezone} onValueChange={(v) => updateFingerprint({ timezone: v })}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TIMEZONES.map((t) => (
              <SelectItem key={t} value={t}>{t}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Screen */}
      <div className="space-y-3">
        <Label className="text-sm font-semibold">Screen</Label>
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-2">
            <Label className="text-xs">Width</Label>
            <Input
              type="number"
              value={fingerprint.screen.width}
              onChange={(e) => updateScreen({ width: parseInt(e.target.value) || 0 })}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Height</Label>
            <Input
              type="number"
              value={fingerprint.screen.height}
              onChange={(e) => updateScreen({ height: parseInt(e.target.value) || 0 })}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Pixel Ratio</Label>
            <Input
              type="number"
              step="0.25"
              value={fingerprint.screen.pixelRatio}
              onChange={(e) => updateScreen({ pixelRatio: parseFloat(e.target.value) || 1 })}
            />
          </div>
        </div>
      </div>

      {/* Hardware */}
      <div className="space-y-3">
        <Label className="text-sm font-semibold">Hardware</Label>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label className="text-xs">CPU Cores</Label>
            <Input
              type="number"
              value={fingerprint.hardware.cpuCores}
              onChange={(e) => updateHardware({ cpuCores: parseInt(e.target.value) || 0, hardwareConcurrency: parseInt(e.target.value) || 0 })}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">RAM (GB)</Label>
            <Input
              type="number"
              value={fingerprint.hardware.memory}
              onChange={(e) => {
                const mem = parseInt(e.target.value) || 0;
                updateHardware({ memory: mem, deviceMemory: Math.floor(mem / 2) });
              }}
            />
          </div>
        </div>
      </div>

      {/* GPU */}
      <div className="space-y-3">
        <Label className="text-sm font-semibold">GPU</Label>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label className="text-xs">Vendor</Label>
            <Select value={fingerprint.webgl.vendor} onValueChange={(v) => updateWebGL({ vendor: v })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {GPU_VENDORS.map((v) => (
                  <SelectItem key={v} value={v}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Renderer</Label>
            <Select value={fingerprint.webgl.renderer} onValueChange={(v) => updateWebGL({ renderer: v })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {GPU_RENDERERS.map((r) => (
                  <SelectItem key={r} value={r}>{r}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Media Devices */}
      <div className="space-y-3">
        <Label className="text-sm font-semibold">Media Devices</Label>
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-2">
            <Label className="text-xs">Video Inputs</Label>
            <Input
              type="number"
              min="0"
              value={fingerprint.mediaDevices.videoInputs}
              onChange={(e) => updateMediaDevices({ videoInputs: parseInt(e.target.value) || 0 })}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Audio Inputs</Label>
            <Input
              type="number"
              min="0"
              value={fingerprint.mediaDevices.audioInputs}
              onChange={(e) => updateMediaDevices({ audioInputs: parseInt(e.target.value) || 0 })}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Audio Outputs</Label>
            <Input
              type="number"
              min="1"
              value={fingerprint.mediaDevices.audioOutputs}
              onChange={(e) => updateMediaDevices({ audioOutputs: parseInt(e.target.value) || 1 })}
            />
          </div>
        </div>
      </div>

      {/* User Agent */}
      <div className="space-y-2">
        <Label>User Agent</Label>
        <Input
          value={fingerprint.userAgent}
          onChange={(e) => updateFingerprint({ userAgent: e.target.value })}
          placeholder="User Agent string"
        />
      </div>
    </div>
  );
}





