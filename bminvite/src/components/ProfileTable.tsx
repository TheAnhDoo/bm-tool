import { useState, useEffect, useMemo } from "react";
import { Play, Square, Edit2, Trash2, Pin } from "lucide-react";
import { Button } from "./ui/button";
import { Checkbox } from "./ui/checkbox";
import { StatusBadge } from "./StatusBadge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import { api } from "../renderer/services/api";
import { EditProfileDialog } from "./EditProfileDialog";

interface Profile {
  id: number;
  type: "VIA" | "BM";
  uid: string | null;
  proxy: string;
  status: string;
  pinned: boolean;
  chromeProfile?: string;
  createdAt?: string | Date;
  updatedAt?: string | Date;
  deviceConfig?: string;
  password?: string | null;
  twoFAKey?: string | null;
  cookie?: string | null;
  lastUsedAt?: string | Date | null;
  headless?: boolean;
  userAgent?: string;
}

interface ProfileTableProps {
  searchQuery: string;
  onSelectionChange: (selected: number[]) => void;
}

export function ProfileTable({ searchQuery, onSelectionChange }: ProfileTableProps) {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  // Load profiles from API
  useEffect(() => {
    loadProfiles();
    
    // Listen for profile creation events
    const handleProfileCreated = () => {
      // Delay slightly to ensure DB is updated
      setTimeout(() => loadProfiles(), 200);
    };
    window.addEventListener('profile:created', handleProfileCreated);
    
    // Subscribe to automation events for real-time updates
    let unsubscribe: (() => void) | undefined;
    if (window.electronAPI) {
      unsubscribe = window.electronAPI.subscribeAutomation((event, data) => {
        if (event === 'profile:started' || event === 'profile:stopped' || event === 'profile:updated' || event === 'profile:created' || event === 'profile:deleted') {
          setTimeout(() => loadProfiles(), 200);
        }
      });
    }
    
    return () => {
      window.removeEventListener('profile:created', handleProfileCreated);
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const loadProfiles = async () => {
    setLoading(true);
    try {
      const result = await api.listProfiles();
      if (result.success && result.data?.profiles) {
        // Map and validate profile data to ensure type safety
        const mappedProfiles: Profile[] = result.data.profiles.map((p: any) => {
          // Parse deviceConfig to get headless setting and userAgent
          let headless = false;
          let userAgent = 'N/A';
          try {
            if (p.deviceConfig) {
              const deviceConfig = typeof p.deviceConfig === 'string' ? JSON.parse(p.deviceConfig) : p.deviceConfig;
              headless = deviceConfig.headless === true;
              userAgent = deviceConfig.userAgent || 'N/A';
            }
          } catch (e) {
            // Ignore parse errors
          }
          
          return {
            id: p.id,
            type: p.type === 'VIA' || p.type === 'BM' ? p.type : 'VIA',
            uid: p.uid || null,
            proxy: p.proxy || '',
            status: p.status || 'idle',
            pinned: p.pinned === true || p.pinned === 1,
            chromeProfile: p.chromeProfile,
            createdAt: p.createdAt,
            updatedAt: p.updatedAt,
            password: p.password || null,
            twoFAKey: p.twoFAKey || null,
            cookie: p.cookie || null,
            deviceConfig: p.deviceConfig,
            headless,
            userAgent,
          };
        });
        setProfiles(mappedProfiles);
      }
    } catch (error: any) {
      console.error('Failed to load profiles:', error);
      // Show user-friendly error instead of crashing
      alert(`Failed to load profiles: ${error.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  // Sort profiles: BM (pinned) first, then VIA
  const sortedProfiles = useMemo(() => {
    return [...profiles].sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      if (a.type === "BM" && b.type === "VIA") return -1;
      if (a.type === "VIA" && b.type === "BM") return 1;
      return 0;
    });
  }, [profiles]);

  const filteredProfiles = sortedProfiles.filter(
    (profile) =>
      (profile.uid || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      profile.proxy.toLowerCase().includes(searchQuery.toLowerCase()) ||
      profile.type.toLowerCase().includes(searchQuery.toLowerCase())
  );

  useEffect(() => {
    onSelectionChange(selectedIds);
  }, [selectedIds, onSelectionChange]);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(filteredProfiles.map((p) => p.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectRow = (id: number, checked: boolean) => {
    if (checked) {
      setSelectedIds([...selectedIds, id]);
    } else {
      setSelectedIds(selectedIds.filter((selectedId) => selectedId !== id));
    }
  };

  const handleToggleStatus = async (id: number) => {
    const profile = profiles.find(p => p.id === id);
    if (!profile) return;

    try {
      if (profile.status === "running") {
        const result = await api.stopProfile(id);
        if (result.success) {
          // Small delay to ensure backend updates status
          setTimeout(() => loadProfiles(), 300);
        } else {
          alert(`Error: ${result.error}`);
        }
      } else {
        const result = await api.startProfile(id);
        if (result.success) {
          // Small delay to ensure backend updates status
          setTimeout(() => loadProfiles(), 300);
        } else {
          alert(`Error: ${result.error}`);
        }
      }
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this profile?')) return;
    
    try {
      const result = await api.deleteProfile(id);
      if (result.success) {
        // Small delay to ensure backend updates
        setTimeout(() => {
          loadProfiles();
          setSelectedIds(selectedIds.filter(selectedId => selectedId !== id));
        }, 200);
      } else {
        alert(`Error: ${result.error}`);
      }
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    }
  };

  const handleToggleHeadless = async (profile: Profile) => {
    try {
      const newHeadless = !profile.headless;
      
      // Update deviceConfig with new headless value
      let deviceConfig: any = {};
      try {
        if (profile.deviceConfig) {
          deviceConfig = typeof profile.deviceConfig === 'string' 
            ? JSON.parse(profile.deviceConfig) 
            : profile.deviceConfig;
        }
      } catch (e) {
        // Ignore parse errors, start with empty object
      }
      
      deviceConfig.headless = newHeadless;
      
      // Update profile with new deviceConfig
      const result = await api.updateProfile(profile.id, {
        deviceConfig: JSON.stringify(deviceConfig),
      });
      
      if (result.success) {
        // Reload profiles to reflect the change
        setTimeout(() => {
          loadProfiles();
        }, 200);
      } else {
        alert(`Error: ${result.error}`);
      }
    } catch (error: any) {
      console.error('Failed to toggle headless:', error);
      alert(`Error: ${error.message}`);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-gray-500">Loading profiles...</div>
      </div>
    );
  }

  return (
    <div className="rounded-xl overflow-hidden" style={{ backgroundColor: "#FFFFFF", border: "1px solid #E5E7EB" }}>
      <Table>
        <TableHeader>
          <TableRow style={{ borderColor: "#E5E7EB" }}>
            <TableHead className="w-12">
              <Checkbox
                checked={selectedIds.length === filteredProfiles.length && filteredProfiles.length > 0}
                onCheckedChange={handleSelectAll}
              />
            </TableHead>
            <TableHead>ID</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>UID</TableHead>
            <TableHead>Proxy</TableHead>
            <TableHead>User Agent</TableHead>
            <TableHead>Password</TableHead>
            <TableHead>2FA Key</TableHead>
            <TableHead>Cookie</TableHead>
            <TableHead>Headless</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredProfiles.length === 0 ? (
            <TableRow>
              <TableCell colSpan={12} className="text-center py-8 text-gray-500">
                No profiles found
              </TableCell>
            </TableRow>
          ) : (
            filteredProfiles.map((profile) => (
              <TableRow
                key={profile.id}
                style={{ 
                  borderColor: "#E5E7EB",
                  backgroundColor: profile.type === "BM" || profile.pinned ? "#F9FAFB" : "#FFFFFF"
                }}
              >
                <TableCell>
                  <Checkbox
                    checked={selectedIds.includes(profile.id)}
                    onCheckedChange={(checked) => handleSelectRow(profile.id, checked as boolean)}
                  />
                </TableCell>
                <TableCell>{profile.id}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {(profile.type === "BM" || profile.pinned) && (
                      <Pin size={14} style={{ color: "#4F46E5" }} />
                    )}
                    <span>{profile.type}</span>
                    {(profile.type === "BM" || profile.pinned) && (
                      <span
                        className="px-2 py-0.5 rounded-md text-xs"
                        style={{ backgroundColor: "#EEF2FF", color: "#4F46E5" }}
                      >
                        {profile.pinned ? 'PINNED' : 'BM'}
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell>{profile.uid || 'N/A'}</TableCell>
                <TableCell className="font-mono text-xs">{profile.proxy}</TableCell>
                <TableCell className="font-mono text-xs max-w-xs truncate" title={profile.userAgent || 'N/A'} style={{ color: "#6B7280" }}>
                  {profile.userAgent || 'N/A'}
                </TableCell>
                <TableCell className="font-mono text-xs" style={{ color: profile.password ? "#333" : "#9CA3AF" }}>
                  {profile.password ? profile.password : 'N/A'}
                </TableCell>
                <TableCell className="font-mono text-xs" style={{ color: profile.twoFAKey ? "#333" : "#9CA3AF" }}>
                  {profile.twoFAKey ? profile.twoFAKey : 'N/A'}
                </TableCell>
                <TableCell className="font-mono text-xs max-w-xs truncate" title={profile.cookie || 'N/A'} style={{ color: "#6B7280" }}>
                  {profile.cookie || 'N/A'}
                </TableCell>
                <TableCell>
                  <Checkbox
                    checked={profile.headless || false}
                    onCheckedChange={() => handleToggleHeadless(profile)}
                  />
                </TableCell>
                <TableCell>
                  <StatusBadge status={profile.status || 'idle'} />
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {profile.status === "running" ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-lg h-8 px-3"
                        onClick={() => handleToggleStatus(profile.id)}
                        style={{ borderColor: "#E5E7EB" }}
                      >
                        <Square size={14} />
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        className="rounded-lg h-8 px-3"
                        onClick={() => handleToggleStatus(profile.id)}
                        style={{ backgroundColor: "#10B981" }}
                      >
                        <Play size={14} />
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-lg h-8 px-3"
                      style={{ borderColor: "#E5E7EB" }}
                      onClick={() => {
                        setEditingProfile(profile);
                        setIsEditDialogOpen(true);
                      }}
                    >
                      <Edit2 size={14} />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-lg h-8 px-3"
                      onClick={() => handleDelete(profile.id)}
                      style={{ borderColor: "#E5E7EB", color: "#EF4444" }}
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      <EditProfileDialog
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        profile={editingProfile}
        onProfileUpdated={() => {
          loadProfiles();
          setEditingProfile(null);
        }}
      />
    </div>
  );
}
