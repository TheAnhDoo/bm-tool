import { useState, useEffect } from "react";
import { Edit2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Label } from "./ui/label";
import { api } from "../renderer/services/api";

interface Profile {
  id: number;
  type: "VIA" | "BM";
  uid: string | null;
  proxy: string;
  status: string;
  pinned: boolean;
  cookie?: string | null;
}

interface EditProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile: Profile | null;
  onProfileUpdated?: () => void;
}

export function EditProfileDialog({ open, onOpenChange, profile, onProfileUpdated }: EditProfileDialogProps) {
  const [uid, setUid] = useState("");
  const [password, setPassword] = useState("");
  const [twoFAKey, setTwoFAKey] = useState("");
  const [cookie, setCookie] = useState("");
  const [saving, setSaving] = useState(false);

  // Load profile data when dialog opens
  useEffect(() => {
    if (open && profile) {
      setUid(profile.uid || "");
      // Don't load password/2FA/cookie for security - user needs to re-enter if changing
      setPassword("");
      setTwoFAKey("");
      setCookie("");
    }
  }, [open, profile]);

  const handleSave = async () => {
    if (!profile) return;

    setSaving(true);
    try {
      const updateData: { uid?: string; password?: string; twoFAKey?: string; cookie?: string } = {};
      
      if (uid !== profile.uid) {
        updateData.uid = uid || undefined;
      }
      
      // Only update password/2FA/cookie if provided (not empty)
      if (password.trim()) {
        updateData.password = password;
      }
      
      if (twoFAKey.trim()) {
        updateData.twoFAKey = twoFAKey;
      }
      
      if (cookie.trim()) {
        updateData.cookie = cookie;
      }

      // Only make API call if there are changes
      if (Object.keys(updateData).length === 0) {
        alert("No changes to save");
        setSaving(false);
        return;
      }

      const result = await api.updateProfile(profile.id, updateData);
      
      if (result.success) {
        alert("Profile updated successfully!");
        onOpenChange(false);
        if (onProfileUpdated) {
          onProfileUpdated();
        }
        window.dispatchEvent(new Event('profile:updated'));
      } else {
        alert(`Error: ${result.error}`);
      }
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    onOpenChange(false);
    // Reset form
    if (profile) {
      setUid(profile.uid || "");
      setPassword("");
      setTwoFAKey("");
      setCookie("");
    }
  };

  if (!profile) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl rounded-2xl" style={{ border: "1px solid #E5E7EB" }}>
        <DialogHeader className="pb-3">
          <DialogTitle className="flex items-center gap-3 text-lg">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: "#EEF2FF" }}
            >
              <Edit2 size={20} style={{ color: "#4F46E5" }} />
            </div>
            Edit Profile #{profile.id}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-4">
          {/* Profile Type (read-only) */}
          <div className="space-y-2">
            <Label className="text-base">Profile Type</Label>
            <Input
              value={profile.type}
              disabled
              className="rounded-xl h-11 bg-gray-50"
              style={{ borderColor: "#E5E7EB" }}
            />
          </div>

          {/* Proxy (read-only) */}
          <div className="space-y-2">
            <Label className="text-base">Proxy</Label>
            <Input
              value={profile.proxy}
              disabled
              className="rounded-xl h-11 bg-gray-50 font-mono text-xs"
              style={{ borderColor: "#E5E7EB" }}
            />
            <p className="text-xs" style={{ color: "#6B7280" }}>
              Proxy cannot be changed. Delete and recreate profile to change proxy.
            </p>
          </div>

          {/* UID */}
          <div className="space-y-2">
            <Label htmlFor="edit-uid" className="text-base">UID</Label>
            <Input
              id="edit-uid"
              placeholder="Facebook UID"
              value={uid}
              onChange={(e) => setUid(e.target.value)}
              className="rounded-xl h-11"
              style={{ borderColor: "#E5E7EB" }}
            />
          </div>

          {/* Password */}
          <div className="space-y-2">
            <Label htmlFor="edit-password" className="text-base">Password</Label>
            <Input
              id="edit-password"
              type="password"
              placeholder="Leave empty to keep current password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="rounded-xl h-11"
              style={{ borderColor: "#E5E7EB" }}
            />
            <p className="text-xs" style={{ color: "#6B7280" }}>
              Leave empty if you don't want to change the password
            </p>
          </div>

          {/* 2FA Key */}
          <div className="space-y-2">
            <Label htmlFor="edit-two-fa" className="text-base">2FA Key</Label>
            <Input
              id="edit-two-fa"
              placeholder="Leave empty to keep current 2FA key"
              value={twoFAKey}
              onChange={(e) => setTwoFAKey(e.target.value)}
              className="rounded-xl h-11"
              style={{ borderColor: "#E5E7EB" }}
            />
            <p className="text-xs" style={{ color: "#6B7280" }}>
              Leave empty if you don't want to change the 2FA key
            </p>
          </div>

          {/* Facebook Cookie */}
          <div className="space-y-2">
            <Label htmlFor="edit-cookie" className="text-base">Facebook Cookie</Label>
            <Textarea
              id="edit-cookie"
              placeholder="Paste Facebook cookie string here (leave empty to keep current cookie)"
              value={cookie}
              onChange={(e) => setCookie(e.target.value)}
              className="rounded-xl min-h-[100px] font-mono text-xs"
              style={{ borderColor: "#E5E7EB" }}
            />
            <p className="text-xs" style={{ color: "#6B7280" }}>
              Paste the full Facebook cookie string. If provided, this will be used for login instead of password.
            </p>
          </div>
        </div>

        <DialogFooter className="pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            className="rounded-xl px-5"
            style={{ borderColor: "#E5E7EB" }}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            className="rounded-xl px-5"
            onClick={handleSave}
            disabled={saving}
            style={{ backgroundColor: "#4F46E5" }}
          >
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}






