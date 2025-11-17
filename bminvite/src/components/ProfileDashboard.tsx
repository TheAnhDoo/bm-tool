import { useState, useEffect } from "react";
import {
  Search,
  Download,
  Upload,
  UserPlus,
  Building2,
  Link as LinkIcon,
  Play,
  Square,
  Copy,
  RefreshCw,
} from "lucide-react";
import { ProfileTable } from "./ProfileTable";
import { AddProfileDialog } from "./AddProfileDialog";
import { AddViaDialog } from "./AddViaDialog";
import { AddLinkInviteDialog } from "./AddLinkInviteDialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { api } from "../renderer/services/api";

export function ProfileDashboard() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddProfileOpen, setIsAddProfileOpen] = useState(false);
  const [isAddViaOpen, setIsAddViaOpen] = useState(false);
  const [isAddLinkInviteOpen, setIsAddLinkInviteOpen] = useState(false);
  const [selectedRows, setSelectedRows] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRunAll = async () => {
    setLoading(true);
    try {
      // Open all profiles (just open browser, don't run automation)
      const result = await api.startProfiles();
      if (result.success) {
        alert("Đã mở tất cả profiles");
      } else {
        alert(`Error: ${result.error}`);
      }
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleStopAll = async () => {
    setLoading(true);
    try {
      // Stop all running profiles
      const result = await api.stopProfiles();
      if (result.success) {
        alert("Đã dừng tất cả profiles");
        // Refresh profile list to update status
        setTimeout(() => {
          window.dispatchEvent(new Event('profiles:stopped'));
        }, 200);
      } else {
        alert(`Lỗi: ${result.error}`);
      }
    } catch (error: any) {
      alert(`Lỗi: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleRunSelected = async () => {
    if (selectedRows.length === 0) return;
    setLoading(true);
    try {
      // Open selected profiles (just open browser, don't run automation)
      const result = await api.startProfiles(selectedRows);
      if (result.success) {
        alert(`Đã mở ${selectedRows.length} profile(s) đã chọn`);
      } else {
        alert(`Error: ${result.error}`);
      }
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleStopSelected = async () => {
    if (selectedRows.length === 0) return;
    setLoading(true);
    try {
      // Stop selected profiles
      const result = await api.stopProfiles(selectedRows);
      if (result.success) {
        alert(`Đã dừng ${selectedRows.length} profile(s) đã chọn`);
        // Refresh profile list to update status
        setTimeout(() => {
          window.dispatchEvent(new Event('profiles:stopped'));
        }, 200);
      } else {
        alert(`Lỗi: ${result.error}`);
      }
    } catch (error: any) {
      alert(`Lỗi: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyFullInfo = async () => {
    if (selectedRows.length === 0) {
      alert("Vui lòng chọn ít nhất một profile");
      return;
    }

    try {
      const profilesResult = await api.listProfiles();
      if (!profilesResult.success || !profilesResult.data?.profiles) {
        alert("Error: Could not load profiles");
        return;
      }

      const selectedProfiles = profilesResult.data.profiles.filter((p: any) => 
        selectedRows.includes(p.id)
      );

      // Format profile information
      const profileInfo = selectedProfiles.map((p: any) => {
        let userAgent = 'N/A';
        try {
          if (p.deviceConfig) {
            const deviceConfig = typeof p.deviceConfig === 'string' ? JSON.parse(p.deviceConfig) : p.deviceConfig;
            userAgent = deviceConfig.userAgent || 'N/A';
          }
        } catch (e) {
          // Ignore
        }

        return `Profile ID: ${p.id}
Type: ${p.type}
Username: ${p.username || p.uid || 'N/A'}
${p.type === 'BM' && p.bmUid ? `BM UID: ${p.bmUid}` : ''}
Password: ${p.password || 'N/A'}
2FA Key: ${p.twoFAKey || 'N/A'}
Cookie: ${p.cookie || 'N/A'}
Proxy: ${p.proxy}
User Agent: ${userAgent}
Status: ${p.status}
Headless: ${p.headless ? 'Yes' : 'No'}
Created At: ${p.createdAt}
---
`;
      }).join('\n');

      await navigator.clipboard.writeText(profileInfo);
      alert(`Đã copy thông tin của ${selectedProfiles.length} profile(s) vào clipboard`);
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    }
  };

  const handleImport = async () => {
    try {
      const fileResult = await api.selectFile({
        filters: [
          { name: 'CSV Files', extensions: ['csv'] },
          { name: 'Text Files', extensions: ['txt'] },
          { name: 'All Files', extensions: ['*'] },
        ],
      });

      if (fileResult.success && fileResult.filePath) {
        setLoading(true);
        const result = await api.importProfiles(fileResult.filePath);
        if (result.success) {
          alert(`Imported ${result.data?.count || 0} profiles successfully`);
          // Refresh profile list
          window.location.reload();
        } else {
          alert(`Error: ${result.error}`);
        }
        setLoading(false);
      }
    } catch (error: any) {
      alert(`Error: ${error.message}`);
      setLoading(false);
    }
  };

  const handleExport = async () => {
    setLoading(true);
    try {
      const result = await api.exportProfiles('csv');
      if (result.success && result.data?.path) {
        alert(`Profiles exported to: ${result.data.path}`);
      } else {
        alert(`Error: ${result.error}`);
      }
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      // Dispatch event to trigger ProfileTable refresh
      window.dispatchEvent(new Event('profile:refresh'));
      // Small delay to show loading state and ensure refresh completes
      setTimeout(() => {
        setIsRefreshing(false);
      }, 300);
    } catch (error: any) {
      console.error('Error refreshing profiles:', error);
      setIsRefreshing(false);
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div
        className="p-6"
        style={{
          borderBottom: "1px solid #E5E7EB",
          backgroundColor: "#FFFFFF",
        }}
      >
        <h2 className="text-2xl mb-4" style={{ color: "#333" }}>
          Quản lý Profile
        </h2>

        {/* Action Buttons */}
        <div className="flex gap-3 flex-wrap">
          <Button
            className="rounded-xl gap-2"
            style={{ backgroundColor: "#4F46E5" }}
            onClick={() => setIsAddProfileOpen(true)}
          >
            <UserPlus size={18} />
            Add Profile
          </Button>
          <Button
            className="rounded-xl gap-2"
            style={{ backgroundColor: "#10B981" }}
            onClick={() => setIsAddViaOpen(true)}
          >
            <Building2 size={18} />
            Add Via/BM Trung Gian
          </Button>
          <Button
            className="rounded-xl gap-2"
            style={{ backgroundColor: "#6366F1" }}
            onClick={() => setIsAddLinkInviteOpen(true)}
          >
            <LinkIcon size={18} />
            Link Invite
          </Button>
        </div>
      </div>

      <div className="p-6 flex-1 flex flex-col">
        {/* Title */}
        <div className="mb-6">
          <h3 className="text-lg" style={{ color: "#333" }}>
            👉 Profile via / BM trung gian đã tạo
          </h3>
        </div>

        {/* Toolbar */}
        <div className="mb-4 flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[300px]">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2"
              size={18}
              style={{ color: "#9CA3AF" }}
            />
            <Input
              placeholder="Tìm kiếm profile / via..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 rounded-xl"
              style={{ borderColor: "#E5E7EB" }}
            />
          </div>
          <Button
            variant="outline"
            className="rounded-xl gap-2"
            style={{ borderColor: "#E5E7EB" }}
            onClick={handleImport}
            disabled={loading}
          >
            <Upload size={18} />
            Import
          </Button>
          <Button
            variant="outline"
            className="rounded-xl gap-2"
            style={{ borderColor: "#E5E7EB" }}
            onClick={handleExport}
            disabled={loading}
          >
            <Download size={18} />
            Export
          </Button>
          <Button
            variant="outline"
            className="rounded-xl gap-2"
            style={{ borderColor: "#E5E7EB" }}
            onClick={handleRefresh}
            disabled={isRefreshing || loading}
            title="Refresh profile status"
          >
            <RefreshCw size={18} className={isRefreshing ? "animate-spin" : ""} />
            Refresh
          </Button>
          <Button
            className="rounded-xl gap-2"
            style={{ backgroundColor: "#10B981" }}
            onClick={handleRunAll}
            disabled={loading}
          >
            <Play size={18} />
            Run All
          </Button>
          <Button
            variant="outline"
            className="rounded-xl gap-2"
            style={{ borderColor: "#E5E7EB", color: "#EF4444" }}
            onClick={handleStopAll}
            disabled={loading}
          >
            <Square size={18} />
            Stop All
          </Button>
          <Button
            className="rounded-xl gap-2"
            style={{ backgroundColor: "#6366F1" }}
            onClick={handleRunSelected}
            disabled={selectedRows.length === 0 || loading}
          >
            <Play size={18} />
            Run Selected
          </Button>
          <Button
            variant="outline"
            className="rounded-xl gap-2"
            style={{ borderColor: "#E5E7EB", color: "#F59E0B" }}
            onClick={handleStopSelected}
            disabled={selectedRows.length === 0 || loading}
          >
            <Square size={18} />
            Stop Selected
          </Button>
          <Button
            variant="outline"
            className="rounded-xl gap-2"
            style={{ borderColor: "#4F46E5", color: "#4F46E5" }}
            onClick={handleCopyFullInfo}
            disabled={selectedRows.length === 0}
          >
            <Copy size={18} />
            Copy Full Info
          </Button>
        </div>

        {/* Table */}
        <ProfileTable
          searchQuery={searchQuery}
          onSelectionChange={setSelectedRows}
        />
      </div>

      <AddProfileDialog
        open={isAddProfileOpen}
        onOpenChange={setIsAddProfileOpen}
      />
      <AddViaDialog
        open={isAddViaOpen}
        onOpenChange={setIsAddViaOpen}
      />
      <AddLinkInviteDialog
        open={isAddLinkInviteOpen}
        onOpenChange={setIsAddLinkInviteOpen}
      />
    </div>
  );
}
