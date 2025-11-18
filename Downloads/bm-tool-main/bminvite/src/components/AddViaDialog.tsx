import { useState } from "react";
import { Building2, Upload } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "./ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { api } from "../renderer/services/api";

interface AddViaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddViaDialog({ open, onOpenChange }: AddViaDialogProps) {
  const [accountType, setAccountType] = useState<"via" | "bm-trung-gian">("via");
  const [accountData, setAccountData] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!accountData.trim()) {
      alert("Please enter account data");
      return;
    }

    setSaving(true);
    try {
      // Parse account data (format: USERNAME|PASS|2FA|PROXY)
      const lines = accountData
        .split('\n')
        .map(line => line.trim())
        .filter(line => line);

      if (lines.length === 0) {
        alert("No valid account data found");
        setSaving(false);
        return;
      }

      // Parse accounts
      const accounts = lines.filter(line => line.includes('|'));
      
      if (accounts.length === 0) {
        alert("Invalid format. Expected: USERNAME|PASS|2FA|PROXY");
        setSaving(false);
        return;
      }

      const type = accountType === "bm-trung-gian" ? "BM" : "VIA";
      
      // Use batch import via IPC with accounts directly
      const batchResult = await window.electronAPI?.apiRequest('profiles:import', {
        type,
        accounts, // Pass accounts directly (no file path needed)
      });

      if (batchResult?.success) {
        alert(`Created ${batchResult.data?.count || 0} profiles successfully!`);
        onOpenChange(false);
        setAccountData("");
        window.dispatchEvent(new Event('profile:created'));
      } else {
        alert(`Error: ${batchResult?.error || 'Failed to create profiles'}`);
      }
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleImportFile = async () => {
    try {
      const fileResult = await api.selectFile({
        filters: [
          { name: 'CSV Files', extensions: ['csv'] },
          { name: 'Text Files', extensions: ['txt'] },
        ],
      });

      if (fileResult.success && fileResult.filePath) {
        setSaving(true);
        const type = accountType === "bm-trung-gian" ? "BM" : "VIA";
        const result = await api.importProfiles(fileResult.filePath, type);
        if (result.success) {
          alert(`Imported ${result.data?.count || 0} profiles successfully!`);
          onOpenChange(false);
          setAccountData("");
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl rounded-2xl max-h-[90vh] overflow-y-auto" style={{ border: "1px solid #E5E7EB" }}>
        <DialogHeader className="pb-3">
          <DialogTitle className="flex items-center gap-3 text-lg">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: "#D1FAE5" }}
            >
              <Building2 size={20} style={{ color: "#10B981" }} />
            </div>
            Add Via / BM Trung Gian
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="manual" className="w-full">
          <TabsList className="grid w-full grid-cols-2 rounded-lg p-1" style={{ backgroundColor: "#F3F4F6" }}>
            <TabsTrigger value="manual" className="rounded-lg py-2.5">Manual Input</TabsTrigger>
            <TabsTrigger value="import" className="rounded-lg py-2.5">Import File</TabsTrigger>
          </TabsList>

          <TabsContent value="manual" className="space-y-5 mt-6">
            <div className="space-y-2">
              <Label htmlFor="account-type" className="text-base">Account Type</Label>
              <Select
                value={accountType}
                onValueChange={(v) => setAccountType(v as "via" | "bm-trung-gian")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="via">VIA</SelectItem>
                  <SelectItem value="bm-trung-gian">BM Trung Gian</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="account-data" className="text-base">Account Data</Label>
              <Textarea
                id="account-data"
                placeholder="Enter account data (one per line)&#10;Format: USERNAME|PASSWORD|2FA|PROXY_IP:PROXY_PORT:PROXY_USER:PROXY_PASS&#10;&#10;Example:&#10;username123|password123|2FAKEY|123.45.67.89:8080:user:pass"
                value={accountData}
                onChange={(e) => setAccountData(e.target.value)}
                className="rounded-xl min-h-[200px] font-mono text-sm"
                style={{ borderColor: "#E5E7EB" }}
              />
              <p className="text-xs" style={{ color: "#6B7280" }}>
                Format: USERNAME|PASSWORD|2FA|PROXY (one account per line)
              </p>
            </div>
          </TabsContent>

          <TabsContent value="import" className="space-y-5 mt-6">
            <div className="space-y-2">
              <Label htmlFor="account-type-import" className="text-base">Account Type</Label>
              <Select
                value={accountType}
                onValueChange={(v) => setAccountType(v as "via" | "bm-trung-gian")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="via">VIA</SelectItem>
                  <SelectItem value="bm-trung-gian">BM Trung Gian</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="border-2 border-dashed rounded-lg p-8 text-center">
              <Upload className="mx-auto mb-4" size={32} style={{ color: "#9CA3AF" }} />
              <p className="text-sm text-gray-500 mb-4">
                Import accounts from CSV/TXT file
              </p>
              <p className="text-xs text-gray-400 mb-4">
                Format: UID|PASSWORD|2FA|PROXY_IP:PROXY_PORT:PROXY_USER:PROXY_PASS
              </p>
              <Button onClick={handleImportFile} disabled={saving}>
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
            disabled={saving || !accountData.trim()}
            style={{ backgroundColor: "#10B981" }}
          >
            {saving ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
