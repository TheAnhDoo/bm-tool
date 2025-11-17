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
  username: string | null;
  bmUid?: string | null; // UID BM Trung Gian (only for BM profiles)
  proxy: string;
  status: string;
  pinned: boolean;
  password?: string | null;
  twoFAKey?: string | null;
  cookie?: string | null;
}

interface EditProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile: Profile | null;
  onProfileUpdated?: () => void;
}

export function EditProfileDialog({ open, onOpenChange, profile, onProfileUpdated }: EditProfileDialogProps) {
  const [username, setUsername] = useState("");
  const [bmUid, setBmUid] = useState("");
  const [password, setPassword] = useState("");
  const [twoFAKey, setTwoFAKey] = useState("");
  const [cookie, setCookie] = useState("");
  const [saving, setSaving] = useState(false);

  // Load profile data when dialog opens
  useEffect(() => {
    if (open && profile) {
      setUsername(profile.username || "");
      setBmUid(profile.bmUid || "");
      // Don't load password/2FA/cookie values for security, but we'll show if they exist
      setPassword("");
      setTwoFAKey("");
      setCookie("");
    }
  }, [open, profile]);

  const handleSave = async () => {
    if (!profile) return;

    setSaving(true);
    try {
      const updateData: { username?: string; bmUid?: string; password?: string; twoFAKey?: string; cookie?: string } = {};
      
      if (username !== profile.username) {
        updateData.username = username || undefined;
      }
      
      // Only update bmUid for BM profiles
      if (profile.type === 'BM' && bmUid !== (profile.bmUid || '')) {
        updateData.bmUid = bmUid || undefined;
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
      setUsername(profile.username || "");
      setBmUid(profile.bmUid || "");
      setPassword("");
      setTwoFAKey("");
      setCookie("");
    }
  };

  if (!profile) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl rounded-2xl max-h-[90vh] flex flex-col" style={{ border: "1px solid #E5E7EB" }}>
        <DialogHeader className="pb-3 flex-shrink-0">
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

        <div className="space-y-5 py-4 overflow-y-auto flex-1 min-h-0">
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

          {/* Username */}
          <div className="space-y-2">
            <Label htmlFor="edit-username" className="text-base">Username</Label>
            <Input
              id="edit-username"
              placeholder="Facebook Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="rounded-xl h-11"
              style={{ borderColor: "#E5E7EB" }}
            />
          </div>

          {/* BM UID (only for BM profiles) */}
          {profile.type === 'BM' && (
            <div className="space-y-2">
              <Label htmlFor="edit-bm-uid" className="text-base">UID BM Trung Gian</Label>
              <Input
                id="edit-bm-uid"
                placeholder="UID BM Trung Gian (business_id)"
                value={bmUid}
                onChange={(e) => setBmUid(e.target.value)}
                className="rounded-xl h-11"
                style={{ borderColor: "#E5E7EB" }}
              />
              <p className="text-xs" style={{ color: "#6B7280" }}>
                UID này sẽ được dùng để tạo link dashboard BM: https://business.facebook.com/latest/home?nav_ref=bm_home_redirect&business_id={bmUid || 'YOUR_BM_UID'}
              </p>
            </div>
          )}

          {/* Password */}
          <div className="space-y-2">
            <Label htmlFor="edit-password" className="text-base">Password</Label>
            <Input
              id="edit-password"
              type="password"
              placeholder={profile.password ? "Enter new password (current password exists)" : "Enter password (currently not set)"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="rounded-xl h-11"
              style={{ borderColor: "#E5E7EB" }}
            />
            <p className="text-xs" style={{ color: "#6B7280" }}>
              {profile.password 
                ? "Current password exists. Enter new password to update, or leave empty to keep current."
                : "No password currently set. Enter a password to add one."}
            </p>
          </div>

          {/* 2FA Key */}
          <div className="space-y-2">
            <Label htmlFor="edit-two-fa" className="text-base">2FA Key</Label>
            <Input
              id="edit-two-fa"
              placeholder={profile.twoFAKey ? "Enter new 2FA key (current 2FA key exists)" : "Enter 2FA key (currently not set)"}
              value={twoFAKey}
              onChange={(e) => setTwoFAKey(e.target.value)}
              className="rounded-xl h-11"
              style={{ borderColor: "#E5E7EB" }}
            />
            <p className="text-xs" style={{ color: "#6B7280" }}>
              {profile.twoFAKey 
                ? "Current 2FA key exists. Enter new key to update, or leave empty to keep current."
                : "No 2FA key currently set. Enter a 2FA key to add one."}
            </p>
          </div>

          {/* Facebook Cookie */}
          <div className="space-y-2">
            <Label htmlFor="edit-cookie" className="text-base">Facebook Cookie</Label>
            <Textarea
              id="edit-cookie"
              placeholder={profile.cookie ? "Paste new Facebook cookie (current cookie exists)" : "Paste Facebook cookie string (currently not set)"}
              value={cookie}
              onChange={(e) => setCookie(e.target.value)}
              className="rounded-xl min-h-[100px] max-h-[200px] font-mono text-xs overflow-y-auto"
              style={{ borderColor: "#E5E7EB", resize: "vertical" }}
            />
            <p className="text-xs" style={{ color: "#6B7280" }}>
              {profile.cookie 
                ? "Current cookie exists. Paste new cookie to update, or leave empty to keep current. If provided, this will be used for login instead of password."
                : "No cookie currently set. Paste the full Facebook cookie string to add one. If provided, this will be used for login instead of password."}
            </p>
          </div>
        </div>

        <DialogFooter className="pt-4 flex-shrink-0 border-t" style={{ borderColor: "#E5E7EB" }}>
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






