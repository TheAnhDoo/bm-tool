import { useState, useEffect } from "react";
import { Play, Square, X, Search, TestTube } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Checkbox } from "./ui/checkbox";
import { Textarea } from "./ui/textarea";
import { api } from "../renderer/services/api";
import { TaskResult, BM_RATE_LIMIT_PER_ROUND } from "../modules/autoBmScript";

interface Profile {
  id: number;
  type: 'VIA' | 'BM';
  username: string | null;
  bmUid?: string | null;
  proxy: string;
  status: string;
  password?: string | null;
  cookie?: string | null;
}

export function AutoBmPage() {
  const [bmProfiles, setBmProfiles] = useState<Profile[]>([]);
  const [viaProfiles, setViaProfiles] = useState<Profile[]>([]);
  const [selectedBmId, setSelectedBmId] = useState<number | null>(null);
  const [selectedViaIds, setSelectedViaIds] = useState<number[]>([]);
  const [inviteLinks, setInviteLinks] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [logs, setLogs] = useState<TaskResult[]>([]);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [bmSearchQuery, setBmSearchQuery] = useState("");
  const [viaSearchQuery, setViaSearchQuery] = useState("");
  const [headless, setHeadless] = useState(false);
  const [testViaBmId, setTestViaBmId] = useState('1377944550624786');

  useEffect(() => {
    loadProfiles();
  }, []);

  const loadProfiles = async () => {
    try {
      const [bmResult, viaResult] = await Promise.all([
        api.listProfiles({ type: 'BM' }),
        api.listProfiles({ type: 'VIA' }),
      ]);

      if (bmResult.success && bmResult.data?.profiles) {
        const mappedBMs: Profile[] = bmResult.data.profiles.map((p: any) => ({
          id: p.id,
          type: 'BM',
          username: p.username || p.uid || null,
          bmUid: p.bmUid || null,
          proxy: p.proxy || '',
          status: p.status || 'idle',
          password: p.password || null,
          cookie: p.cookie || null,
        }));
        setBmProfiles(mappedBMs);
      }

      if (viaResult.success && viaResult.data?.profiles) {
        const mappedVIAs: Profile[] = viaResult.data.profiles.map((p: any) => ({
          id: p.id,
          type: 'VIA',
          username: p.username || p.uid || null,
          proxy: p.proxy || '',
          status: p.status || 'idle',
          password: p.password || null,
          cookie: p.cookie || null,
        }));
        setViaProfiles(mappedVIAs);
      }
    } catch (error: any) {
      console.error('Failed to load profiles:', error);
      alert(`Failed to load profiles: ${error.message || 'Unknown error'}`);
    } finally {
      // no loading indicator
    }
  };

  const filteredBMs = bmProfiles.filter(
    (bm) =>
      (bm.username || '').toLowerCase().includes(bmSearchQuery.toLowerCase()) ||
      (bm.bmUid || '').toLowerCase().includes(bmSearchQuery.toLowerCase()) ||
      bm.proxy.toLowerCase().includes(bmSearchQuery.toLowerCase())
  );

  const filteredVIAs = viaProfiles.filter(
    (via) =>
      (via.username || '').toLowerCase().includes(viaSearchQuery.toLowerCase()) ||
      via.proxy.toLowerCase().includes(viaSearchQuery.toLowerCase())
  );

  const handleToggleVia = (viaId: number) => {
    setSelectedViaIds((prev) =>
      prev.includes(viaId) ? prev.filter((id) => id !== viaId) : [...prev, viaId]
    );
  };

  const handleSelectAllVIAs = () => {
    if (selectedViaIds.length === filteredVIAs.length) {
      setSelectedViaIds([]);
    } else {
      setSelectedViaIds(filteredVIAs.map((v) => v.id));
    }
  };

  const handleRun = async () => {
    if (!selectedBmId) {
      alert('Vui lòng chọn BM trung gian');
      return;
    }

    if (selectedViaIds.length === 0) {
      alert('Vui lòng chọn ít nhất một VIA');
      return;
    }

    const links = inviteLinks
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    if (links.length === 0) {
      alert('Vui lòng nhập ít nhất một link invite');
      return;
    }

    const selectedBM = bmProfiles.find((p) => p.id === selectedBmId);
    const selectedVIAs = viaProfiles.filter((p) => selectedViaIds.includes(p.id));

    if (!selectedBM) {
      alert('BM trung gian không tồn tại');
      return;
    }

    if (!selectedBM.bmUid || selectedBM.bmUid.trim() === '') {
      alert('BM trung gian chưa có bmUid. Vui lòng cập nhật bmUid trong profile.');
      return;
    }

    setIsRunning(true);
    setLogs([]);
    setProgress({ done: 0, total: links.length });

    try {
      // Call via IPC
      const result = await api.runAutoBmScript({
        bmId: selectedBM.id,
        viaIds: selectedVIAs.map(v => v.id),
        inviteLinks: links,
        headless: headless,
      });

      if (!result.success) {
        throw new Error(result.error || 'Failed to run script');
      }

      // Subscribe to log events
      if (window.electronAPI) {
        const unsubscribe = window.electronAPI.subscribeAutomation((event, data) => {
          if (event === 'autoBm:log') {
            setLogs((prev) => [...prev, data as TaskResult]);
          } else if (event === 'autoBm:progress') {
            setProgress(data as { done: number; total: number });
          } else if (event === 'autoBm:complete') {
            setIsRunning(false);
            if (unsubscribe) unsubscribe();
          } else if (event === 'autoBm:error') {
            setIsRunning(false);
            alert(`Error: ${data}`);
            if (unsubscribe) unsubscribe();
          }
        });
      }
    } catch (error: any) {
      console.error('Auto BM Script error:', error);
      alert(`Error: ${error.message || 'Đã xảy ra lỗi khi chạy script'}`);
      setIsRunning(false);
    }
  };

  const handleStop = () => {
    setIsRunning(false);
  };

  const handleClearLog = () => {
    setLogs([]);
    setProgress({ done: 0, total: 0 });
  };

  const handleTest = async () => {
    if (selectedViaIds.length !== 1) {
      alert('Vui lòng chọn đúng 1 VIA để test bước approve.');
      return;
    }

    if (!testViaBmId.trim()) {
      alert('Vui lòng nhập viaBmId để test.');
      return;
    }

    const selectedVIA = viaProfiles.find((p) => p.id === selectedViaIds[0]);

    if (!selectedVIA) {
      alert('VIA không tồn tại');
      return;
    }

    try {
      const result = await api.testAutoBmProfiles({
        viaId: selectedVIA.id,
        viaBmId: testViaBmId.trim(),
        headless: headless,
      });

      if (!result.success) {
        throw new Error(result.error || 'Failed to run test');
      }

      alert('✅ Test Mode: Đã mở VIA và chạy thử bước approve role setup. Browser sẽ giữ nguyên để bạn test selectors.');
    } catch (error: any) {
      console.error('Test Mode error:', error);
      alert(`Error: ${error.message || 'Đã xảy ra lỗi khi chạy test mode'}`);
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('vi-VN');
  };

  const getStatusColor = (status: TaskResult['status']) => {
    switch (status) {
      case 'success':
        return 'bg-green-100 text-green-800';
      case 'error':
        return 'bg-red-100 text-red-800';
      case 'running':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: TaskResult['status']) => {
    switch (status) {
      case 'success':
        return 'Thành công';
      case 'error':
        return 'Lỗi';
      case 'running':
        return 'Đang chạy';
      default:
        return 'Chờ';
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="p-6" style={{ borderBottom: "1px solid #E5E7EB", backgroundColor: "#FFFFFF" }}>
        <h2 className="text-2xl mb-4" style={{ color: "#333" }}>
          Auto BM Script
        </h2>
        <div className="flex items-center gap-3">
          <Button
            className="rounded-xl gap-2"
            style={{ backgroundColor: "#10B981" }}
            onClick={handleRun}
            disabled={isRunning || !selectedBmId || selectedViaIds.length === 0}
          >
            <Play size={18} />
            Run Script
          </Button>
          <Button
            variant="outline"
            className="rounded-xl gap-2"
            onClick={handleStop}
            disabled={!isRunning}
            style={{ borderColor: "#E5E7EB", color: "#EF4444" }}
          >
            <Square size={18} />
            Stop
          </Button>
          <Button
            variant="outline"
            className="rounded-xl gap-2"
            onClick={handleClearLog}
            style={{ borderColor: "#E5E7EB" }}
          >
            <X size={18} />
            Clear Log
          </Button>
          <Button
            className="rounded-xl gap-2"
            style={{ backgroundColor: "#8B5CF6" }}
            onClick={handleTest}
            disabled={isRunning || selectedViaIds.length !== 1}
          >
            <TestTube size={18} />
            Test Mode
          </Button>
          <div className="flex items-center gap-2 ml-4">
            <Checkbox
              id="headless"
              checked={headless}
              onCheckedChange={(checked) => setHeadless(checked === true)}
            />
            <label
              htmlFor="headless"
              className="text-sm cursor-pointer"
              style={{ color: "#6B7280" }}
            >
              Headless Mode
            </label>
          </div>
          <div className="flex items-center gap-2 ml-4">
            <label className="text-sm" style={{ color: "#6B7280" }}>
              viaBmId test:
            </label>
            <Input
              value={testViaBmId}
              onChange={(e) => setTestViaBmId(e.target.value)}
              className="w-48 text-sm"
              placeholder="Enter viaBmId"
            />
          </div>
          {isRunning && (
            <div className="ml-auto text-sm" style={{ color: "#6B7280" }}>
              Progress: {progress.done}/{progress.total} links
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="grid grid-cols-2 gap-6 mb-6">
          {/* BM Selection */}
          <div className="bg-white rounded-xl p-4" style={{ border: "1px solid #E5E7EB" }}>
            <h3 className="text-lg font-semibold mb-3" style={{ color: "#333" }}>
              Chọn BM Trung Gian
            </h3>
            <div className="mb-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2" size={16} style={{ color: "#9CA3AF" }} />
                <Input
                  placeholder="Search BM..."
                  value={bmSearchQuery}
                  onChange={(e) => setBmSearchQuery(e.target.value)}
                  className="pl-9 rounded-lg text-sm"
                  style={{ borderColor: "#E5E7EB" }}
                />
              </div>
            </div>
            <div className="max-h-48 overflow-y-auto">
              {filteredBMs.map((bm) => (
                <div
                  key={bm.id}
                  onClick={() => setSelectedBmId(bm.id)}
                  className={`p-2 rounded-lg cursor-pointer mb-2 ${
                    selectedBmId === bm.id ? 'bg-indigo-50' : 'hover:bg-gray-50'
                  }`}
                  style={{
                    border: selectedBmId === bm.id ? '2px solid #4F46E5' : '1px solid #E5E7EB',
                  }}
                >
                  <div className="text-sm font-medium" style={{ color: "#333" }}>
                    {bm.username || 'N/A'}
                  </div>
                  <div className="text-xs" style={{ color: "#6B7280" }}>
                    BM UID: {bm.bmUid || 'N/A'} | Proxy: {bm.proxy}
                  </div>
                </div>
              ))}
              {filteredBMs.length === 0 && (
                <div className="text-sm text-center py-4" style={{ color: "#9CA3AF" }}>
                  No BM profiles found
                </div>
              )}
            </div>
          </div>

          {/* VIA Selection */}
          <div className="bg-white rounded-xl p-4" style={{ border: "1px solid #E5E7EB" }}>
            <h3 className="text-lg font-semibold mb-3" style={{ color: "#333" }}>
              Chọn VIA ({selectedViaIds.length} selected)
            </h3>
            <div className="mb-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2" size={16} style={{ color: "#9CA3AF" }} />
                <Input
                  placeholder="Search VIA..."
                  value={viaSearchQuery}
                  onChange={(e) => setViaSearchQuery(e.target.value)}
                  className="pl-9 rounded-lg text-sm"
                  style={{ borderColor: "#E5E7EB" }}
                />
              </div>
            </div>
            <div className="max-h-48 overflow-y-auto">
              <div className="mb-2">
                <Checkbox
                  checked={selectedViaIds.length === filteredVIAs.length && filteredVIAs.length > 0}
                  onCheckedChange={handleSelectAllVIAs}
                />
                <span className="ml-2 text-sm" style={{ color: "#6B7280" }}>
                  Select All
                </span>
              </div>
              {filteredVIAs.map((via) => (
                <div key={via.id} className="flex items-center p-2 rounded-lg hover:bg-gray-50 mb-1">
                  <Checkbox
                    checked={selectedViaIds.includes(via.id)}
                    onCheckedChange={() => handleToggleVia(via.id)}
                  />
                  <div className="ml-2 flex-1">
                    <div className="text-sm font-medium" style={{ color: "#333" }}>
                      {via.username || 'N/A'}
                    </div>
                    <div className="text-xs" style={{ color: "#6B7280" }}>
                      Proxy: {via.proxy}
                    </div>
                  </div>
                </div>
              ))}
              {filteredVIAs.length === 0 && (
                <div className="text-sm text-center py-4" style={{ color: "#9CA3AF" }}>
                  No VIA profiles found
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Invite Links Input */}
        <div className="bg-white rounded-xl p-4 mb-6" style={{ border: "1px solid #E5E7EB" }}>
          <h3 className="text-lg font-semibold mb-3" style={{ color: "#333" }}>
            Danh sách Link Invite (mỗi dòng một link)
          </h3>
          <Textarea
            value={inviteLinks}
            onChange={(e) => setInviteLinks(e.target.value)}
            placeholder="Paste invite links here, one per line..."
            className="rounded-lg font-mono text-sm"
            rows={6}
            style={{ borderColor: "#E5E7EB" }}
          />
          <div className="mt-2 text-xs" style={{ color: "#6B7280" }}>
            Rate limit: Tối đa {BM_RATE_LIMIT_PER_ROUND} VIA per round
          </div>
        </div>

        {/* Log Table */}
        <div className="bg-white rounded-xl p-4" style={{ border: "1px solid #E5E7EB" }}>
          <h3 className="text-lg font-semibold mb-3" style={{ color: "#333" }}>
            Log & Tiến trình ({logs.length} entries)
          </h3>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow style={{ borderColor: "#E5E7EB" }}>
                  <TableHead>Time</TableHead>
                  <TableHead>VIA UID</TableHead>
                  <TableHead>BM UID</TableHead>
                  <TableHead>Invite Link</TableHead>
                  <TableHead>Via-BM-ID</TableHead>
                  <TableHead>Via-UID-Ad-Account</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Error</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8" style={{ color: "#9CA3AF" }}>
                      No logs yet. Click "Run Script" to start.
                    </TableCell>
                  </TableRow>
                ) : (
                  logs.map((log) => (
                    <TableRow key={log.id} style={{ borderColor: "#E5E7EB" }}>
                      <TableCell className="text-sm">{formatDate(log.timestamp)}</TableCell>
                      <TableCell className="text-sm">{log.viaUid}</TableCell>
                      <TableCell className="text-sm">{log.bmUid}</TableCell>
                      <TableCell className="text-sm font-mono max-w-xs truncate">
                        {log.inviteLink}
                      </TableCell>
                      <TableCell className="text-sm">{log.viaBmId || 'N/A'}</TableCell>
                      <TableCell className="text-sm">{log.viaAdAccountUid || 'N/A'}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded text-xs ${getStatusColor(log.status)}`}>
                          {getStatusText(log.status)}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm text-red-600 max-w-xs truncate">
                        {log.errorMessage || '-'}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </div>
  );
}

