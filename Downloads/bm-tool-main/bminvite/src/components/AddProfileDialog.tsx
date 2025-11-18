import { useState } from "react";
import { CheckCircle2, Upload } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "./ui/tabs";
import { api } from "../renderer/services/api";
import { CustomFingerprintEditor } from "./CustomFingerprintEditor";

interface AddProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddProfileDialog({ open, onOpenChange }: AddProfileDialogProps) {
  const [proxyIP, setProxyIP] = useState("");
  const [proxyPort, setProxyPort] = useState("");
  const [proxyUser, setProxyUser] = useState("");
  const [proxyPass, setProxyPass] = useState("");
  const [uidPassTwoFa, setUidPassTwoFa] = useState("");
  const [bmUid, setBmUid] = useState(""); // UID BM Trung Gian (only for BM profiles)
  const [fingerprint, setFingerprint] = useState("random");
  const [customFingerprint, setCustomFingerprint] = useState<any>(null);
  const [headless, setHeadless] = useState(false);
  const [testingProxy, setTestingProxy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [profileType, setProfileType] = useState<"VIA" | "BM">("VIA");

  const handleTestProxy = async () => {
    if (!proxyIP || !proxyPort) {
      alert("Please enter proxy IP and port");
      return;
    }
    
    setTestingProxy(true);
    try {
      const proxyString = `${proxyIP}:${proxyPort}${proxyUser ? `:${proxyUser}${proxyPass ? `:${proxyPass}` : ''}` : ''}`;
      const result = await api.testProxy(proxyString);
      if (result.success && result.data?.valid) {
        alert("Proxy test successful!");
      } else {
        alert(`Proxy test failed: ${result.error || 'Invalid proxy'}`);
      }
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    } finally {
      setTestingProxy(false);
    }
  };

  const handleSave = async () => {
    if (!proxyIP || !proxyPort) {
      alert("Please enter proxy IP and port");
      return;
    }

    setSaving(true);
    try {
      const proxyString = `${proxyIP}:${proxyPort}${proxyUser ? `:${proxyUser}${proxyPass ? `:${proxyPass}` : ''}` : ''}`;
      
      // Parse USERNAME|PASS|2FA if provided
      let username: string | undefined;
      let password: string | undefined;
      let twoFAKey: string | undefined;
      
      if (uidPassTwoFa) {
        const parts = uidPassTwoFa.split('|');
        username = parts[0]?.trim() || undefined;
        password = parts[1]?.trim() || undefined;
        twoFAKey = parts[2]?.trim() || undefined;
      }

      // Handle custom fingerprint
      let fingerprintValue: string | undefined = undefined;
      if (fingerprint === 'custom' && customFingerprint) {
        // Store custom fingerprint as JSON string
        fingerprintValue = JSON.stringify(customFingerprint);
      } else if (fingerprint !== 'random') {
        fingerprintValue = fingerprint;
      }

      const result = await api.createProfile({
        type: profileType,
        proxy: proxyString,
        fingerprint: fingerprintValue,
        username,
        bmUid: profileType === 'BM' ? (bmUid.trim() || undefined) : undefined, // Only set bmUid for BM profiles
        password,
        twoFAKey,
        headless,
      });

      if (result.success) {
        // Close dialog first
        onOpenChange(false);
        resetForm();
        // Trigger refresh after a short delay to ensure DB is updated
        setTimeout(() => {
          window.dispatchEvent(new Event('profile:created'));
        }, 100);
      } else {
        alert(`Error: ${result.error}`);
      }
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleImportCSV = async () => {
    try {
      const fileResult = await api.selectFile({
        filters: [
          { name: 'CSV Files', extensions: ['csv'] },
          { name: 'Text Files', extensions: ['txt'] },
        ],
      });

      if (fileResult.success && fileResult.filePath) {
        setSaving(true);
        const result = await api.importProfiles(fileResult.filePath, profileType);
        if (result.success) {
          alert(`Imported ${result.data?.count || 0} profiles successfully`);
          onOpenChange(false);
          resetForm();
          window.dispatchEvent(new Event('profile:created'));
        } else {
          alert(`Error: ${result.error}`);
        }
        setSaving(false);
      }
    } catch (error: any) {
      alert(`Error: ${error.message}`);
      setSaving(false);
    }
  };

  const resetForm = () => {
    setProxyIP("");
    setProxyPort("");
    setProxyUser("");
    setProxyPass("");
    setUidPassTwoFa("");
    setBmUid("");
    setFingerprint("random");
    setHeadless(false);
    setProfileType("VIA");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl rounded-2xl max-h-[90vh] overflow-y-auto" style={{ border: "1px solid #E5E7EB" }}>
        <DialogHeader className="pb-3">
          <DialogTitle className="flex items-center gap-3 text-lg">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: "#EEF2FF" }}
            >
              <CheckCircle2 style={{ color: "#4F46E5" }} size={20} />
            </div>
            Add Profile
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="manual" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="manual">Manual Entry</TabsTrigger>
            <TabsTrigger value="import">Import CSV/TXT</TabsTrigger>
          </TabsList>

          <TabsContent value="manual" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Profile Type</Label>
                <Select value={profileType} onValueChange={(v) => setProfileType(v as "VIA" | "BM")}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="VIA">VIA</SelectItem>
                    <SelectItem value="BM">BM Trung Gian</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Device Fingerprint</Label>
                <Select value={fingerprint} onValueChange={setFingerprint}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select fingerprint preset" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="random">Random (Fully Randomized)</SelectItem>
                    <SelectItem value="chrome-windows">Chrome Windows</SelectItem>
                    <SelectItem value="chrome-macos">Chrome macOS</SelectItem>
                    <SelectItem value="firefox-windows">Firefox Windows</SelectItem>
                    <SelectItem value="edge-windows">Edge Windows</SelectItem>
                    <SelectItem value="custom">Custom (Manual Configuration)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs" style={{ color: "#6B7280" }}>
                  {fingerprint === "random" 
                    ? "All hardware specs will be randomly generated"
                    : fingerprint === "chrome-windows"
                    ? "Windows Chrome profile with randomized GPU, RAM, and screen dimensions"
                    : fingerprint === "chrome-macos"
                    ? "macOS Chrome profile with randomized GPU, RAM, and screen dimensions"
                    : fingerprint === "firefox-windows"
                    ? "Windows Firefox profile with randomized GPU, RAM, and screen dimensions"
                    : fingerprint === "edge-windows"
                    ? "Windows Edge profile with randomized GPU, RAM, and screen dimensions"
                    : fingerprint === "custom"
                    ? "Manually configure all device fingerprint settings"
                    : "Select a preset or use random for full randomization"
                  }
                </p>
              </div>
            </div>

            {/* Custom Fingerprint Editor */}
            {fingerprint === "custom" && (
              <CustomFingerprintEditor
                value={customFingerprint}
                onChange={setCustomFingerprint}
              />
            )}

            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="headless"
                  checked={headless}
                  onChange={(e) => setHeadless(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300"
                  style={{ accentColor: "#4F46E5" }}
                />
                <Label htmlFor="headless" className="cursor-pointer">
                  Run in Headless Mode
                </Label>
              </div>
              <p className="text-xs" style={{ color: "#6B7280", marginLeft: "24px" }}>
                Browser will run in background without visible window
              </p>
            </div>

            <div className="space-y-2">
              <Label>Proxy Configuration</Label>
              <div className="grid grid-cols-4 gap-2">
                <Input
                  placeholder="IP"
                  value={proxyIP}
                  onChange={(e) => setProxyIP(e.target.value)}
                />
                <Input
                  placeholder="Port"
                  value={proxyPort}
                  onChange={(e) => setProxyPort(e.target.value)}
                />
                <Input
                  placeholder="User (optional)"
                  value={proxyUser}
                  onChange={(e) => setProxyUser(e.target.value)}
                />
                <Input
                  type="password"
                  placeholder="Pass (optional)"
                  value={proxyPass}
                  onChange={(e) => setProxyPass(e.target.value)}
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleTestProxy}
                disabled={testingProxy || !proxyIP || !proxyPort}
              >
                {testingProxy ? "Testing..." : "Test Proxy"}
              </Button>
            </div>

            <div className="space-y-2">
              <Label>Username | Password | 2FA (Optional)</Label>
              <Textarea
                placeholder="USERNAME|PASSWORD|2FA_KEY (pipe-separated)"
                value={uidPassTwoFa}
                onChange={(e) => setUidPassTwoFa(e.target.value)}
                rows={3}
              />
            </div>

            {/* BM UID field (only for BM profiles) */}
            {profileType === 'BM' && (
              <div className="space-y-2">
                <Label htmlFor="bm-uid">UID BM Trung Gian (Optional)</Label>
                <Input
                  id="bm-uid"
                  placeholder="UID BM Trung Gian (business_id)"
                  value={bmUid}
                  onChange={(e) => setBmUid(e.target.value)}
                  className="rounded-xl"
                  style={{ borderColor: "#E5E7EB" }}
                />
                <p className="text-xs" style={{ color: "#6B7280" }}>
                  UID này sẽ được dùng để tạo link dashboard BM: https://business.facebook.com/latest/home?nav_ref=bm_home_redirect&business_id={bmUid || 'YOUR_BM_UID'}
                </p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="import" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Profile Type</Label>
              <Select value={profileType} onValueChange={(v) => setProfileType(v as "VIA" | "BM")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="VIA">VIA</SelectItem>
                  <SelectItem value="BM">BM Trung Gian</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="border-2 border-dashed rounded-lg p-8 text-center">
              <Upload className="mx-auto mb-4" size={32} style={{ color: "#9CA3AF" }} />
              <p className="text-sm text-gray-500 mb-4">
                Import profiles from CSV/TXT file
              </p>
              <p className="text-xs text-gray-400 mb-4">
                Format: USERNAME|PASSWORD|2FA|PROXY_IP:PROXY_PORT:PROXY_USER:PROXY_PASS
              </p>
              <Button onClick={handleImportCSV} disabled={saving}>
                <Upload size={16} className="mr-2" />
                {saving ? "Importing..." : "Select File"}
              </Button>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || !proxyIP || !proxyPort}
            style={{ backgroundColor: "#4F46E5" }}
          >
            {saving ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
