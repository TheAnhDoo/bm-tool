import { useState, useEffect } from "react";
import { Search, Trash2 } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Checkbox } from "./ui/checkbox";
import { api } from "../renderer/services/api";
import { StatusBadge } from "./StatusBadge";

interface BMTrungGian {
  id: number;
  uid: string | null;
  proxy: string;
  status: string;
  pinned: boolean;
  createdAt: string | Date;
  password?: string | null;
  twoFAKey?: string | null;
  cookie?: string | null;
}

export function BMTrungGianDashboard() {
  const [bms, setBMs] = useState<BMTrungGian[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBMs();
    
    // Listen for profile updates
    const handleProfileUpdate = () => {
      setTimeout(() => loadBMs(), 200);
    };
    window.addEventListener('profile:created', handleProfileUpdate);
    
    if (window.electronAPI) {
      const unsubscribe = window.electronAPI.subscribeAutomation((event) => {
        if (event === 'profile:created' || event === 'profile:updated' || event === 'profile:deleted') {
          setTimeout(() => loadBMs(), 200);
        }
      });
      return () => {
        window.removeEventListener('profile:created', handleProfileUpdate);
        unsubscribe();
      };
    }
    
    return () => {
      window.removeEventListener('profile:created', handleProfileUpdate);
    };
  }, []);

  const loadBMs = async () => {
    setLoading(true);
    try {
      const result = await api.listProfiles({ type: 'BM' });
      if (result.success && result.data?.profiles) {
        const mappedBMs: BMTrungGian[] = result.data.profiles.map((p: any) => ({
          id: p.id,
          uid: p.uid || null,
          proxy: p.proxy || '',
          status: p.status || 'idle',
          pinned: p.pinned === true || p.pinned === 1,
          createdAt: p.createdAt,
          password: p.password || null,
          twoFAKey: p.twoFAKey || null,
          cookie: p.cookie || null,
        }));
        setBMs(mappedBMs);
      }
    } catch (error: any) {
      console.error('Failed to load BM profiles:', error);
      alert(`Failed to load BM profiles: ${error.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const filteredBMs = bms.filter(
    (bm) =>
      (bm.uid || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      bm.proxy.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!confirm(`Are you sure you want to delete ${selectedIds.length} profile(s)?`)) return;
    
    try {
      for (const id of selectedIds) {
        await api.deleteProfile(id);
      }
      setSelectedIds([]);
      setTimeout(() => loadBMs(), 200);
    } catch (error: any) {
      alert(`Error deleting profiles: ${error.message}`);
    }
  };

  const formatDate = (date: string | Date) => {
    if (!date) return 'N/A';
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="h-full flex flex-col">
      <div className="p-6" style={{ borderBottom: "1px solid #E5E7EB", backgroundColor: "#FFFFFF" }}>
        <h2 className="text-2xl" style={{ color: "#333" }}>
          Quản lý BM Trung Gian
        </h2>
      </div>

      <div className="p-6 flex-1 flex flex-col">
        <div className="mb-4 flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2" size={18} style={{ color: "#9CA3AF" }} />
            <Input
              placeholder="Tìm kiếm BM..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 rounded-xl"
              style={{ borderColor: "#E5E7EB" }}
            />
          </div>
          <Button
            variant="outline"
            className="rounded-xl gap-2"
            onClick={handleDelete}
            disabled={selectedIds.length === 0}
            style={{ borderColor: "#E5E7EB", color: "#EF4444" }}
          >
            <Trash2 size={18} />
            Delete
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center p-8">
            <div className="text-gray-500">Đang tải dữ liệu...</div>
          </div>
        ) : (
          <div className="rounded-xl overflow-hidden" style={{ backgroundColor: "#FFFFFF", border: "1px solid #E5E7EB" }}>
            <Table>
              <TableHeader>
                <TableRow style={{ borderColor: "#E5E7EB" }}>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedIds.length === filteredBMs.length && filteredBMs.length > 0}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedIds(filteredBMs.map((b) => b.id));
                        } else {
                          setSelectedIds([]);
                        }
                      }}
                    />
                  </TableHead>
                  <TableHead>ID</TableHead>
                  <TableHead>UID</TableHead>
                  <TableHead>Proxy</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Pinned</TableHead>
                  <TableHead>Password</TableHead>
                  <TableHead>2FA Key</TableHead>
                  <TableHead>Cookie</TableHead>
                  <TableHead>Created At</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBMs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8 text-gray-500">
                      Không có BM Trung Gian profile nào
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredBMs.map((bm) => (
                    <TableRow 
                      key={bm.id} 
                      style={{ 
                        borderColor: "#E5E7EB",
                        backgroundColor: bm.pinned ? "#F9FAFB" : "#FFFFFF"
                      }}
                    >
                      <TableCell>
                        <Checkbox
                          checked={selectedIds.includes(bm.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedIds([...selectedIds, bm.id]);
                            } else {
                              setSelectedIds(selectedIds.filter((id) => id !== bm.id));
                            }
                          }}
                        />
                      </TableCell>
                      <TableCell>{bm.id}</TableCell>
                      <TableCell>{bm.uid || 'N/A'}</TableCell>
                      <TableCell className="font-mono text-xs max-w-xs truncate" title={bm.proxy}>
                        {bm.proxy}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={bm.status} />
                      </TableCell>
                      <TableCell>
                        {bm.pinned ? (
                          <span className="px-2 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-700">
                            Pinned
                          </span>
                        ) : (
                          <span className="px-2 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-500">
                            No
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-xs" style={{ color: bm.password ? "#333" : "#9CA3AF" }}>
                        {bm.password || 'N/A'}
                      </TableCell>
                      <TableCell className="font-mono text-xs" style={{ color: bm.twoFAKey ? "#333" : "#9CA3AF" }}>
                        {bm.twoFAKey || 'N/A'}
                      </TableCell>
                      <TableCell>
                        {bm.cookie ? (
                          <span className="px-2 py-1 rounded-md text-xs font-medium bg-green-100 text-green-700">
                            Có
                          </span>
                        ) : (
                          <span className="px-2 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-500">
                            Không
                          </span>
                        )}
                      </TableCell>
                      <TableCell style={{ color: "#6B7280" }}>{formatDate(bm.createdAt)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}
