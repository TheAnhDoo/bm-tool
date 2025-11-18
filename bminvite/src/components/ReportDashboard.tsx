import { useState, useEffect } from "react";
import { Download, RefreshCw, Trash2 } from "lucide-react";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Checkbox } from "./ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import { api } from "../renderer/services/api";

interface Report {
  id: number;
  idVia: string;
  username: string; // Username của VIA
  idAdAccount: string;
  idBM: string;
  bmUid?: string | null; // UID BM Trung Gian
  status: "completed" | "pending";
  time: string;
}

export function ReportDashboard() {
  const [reports, setReports] = useState<Report[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    setLoading(true);
    try {
      const result = await api.listReports();
      if (result.success && result.data?.reports) {
        // Map API response to Report interface
        const mappedReports: Report[] = result.data.reports.map((r: any) => ({
          id: r.id,
          idVia: r.idVia || null,
          username: r.username || null,
          idAdAccount: r.idAdAccount || null,
          idBM: r.idBM || null,
          bmUid: r.bmUid || null,
          status: r.status === 'completed' ? 'completed' : 'pending',
          time: r.time ? new Date(r.time).toLocaleString('vi-VN') : new Date().toLocaleString('vi-VN'),
        }));
        setReports(mappedReports);
      } else {
        console.error('Failed to load reports:', result.error);
        if (result.error) {
          alert(`Failed to load reports: ${result.error}`);
        }
      }
    } catch (error: any) {
      console.error('Failed to load reports:', error);
      alert(`Failed to load reports: ${error.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadReports();
    setIsRefreshing(false);
  };

  const handleExportCSV = async () => {
    try {
      const result = await api.exportReports('csv');
      if (result.success && result.data?.path) {
        alert(`Reports exported to: ${result.data.path}`);
      } else {
        alert(`Error: ${result.error}`);
      }
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.length === 0) {
      alert('Vui lòng chọn ít nhất một report để xóa');
      return;
    }
    
    if (!confirm(`Bạn có chắc muốn xóa ${selectedIds.length} report đã chọn?`)) return;
    
    try {
      const result = await api.deleteReports(selectedIds);
      if (result.success) {
        alert(`Đã xóa ${result.data?.count || 0} report thành công!`);
        setSelectedIds([]);
        await loadReports();
      } else {
        alert(`Error: ${result.error || 'Không thể xóa report'}`);
      }
    } catch (error: any) {
      alert(`Error: ${error.message || 'Đã xảy ra lỗi khi xóa report'}`);
    }
  };

  const completedCount = reports.filter(r => r.status === "completed").length;
  const pendingCount = reports.filter(r => r.status === "pending").length;

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-6" style={{ borderBottom: "1px solid #E5E7EB", backgroundColor: "#FFFFFF" }}>
        <h2 className="text-2xl" style={{ color: "#333" }}>
          Report
        </h2>
        <p className="mt-1" style={{ color: "#6B7280" }}>
          Báo cáo chi tiết hoạt động invite
        </p>
      </div>

      <div className="p-6 flex-1 flex flex-col">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="p-4 rounded-xl" style={{ backgroundColor: "#FFFFFF", border: "1px solid #E5E7EB" }}>
            <div style={{ color: "#6B7280" }}>Tổng số</div>
            <div className="text-2xl mt-1" style={{ color: "#333" }}>
              {reports.length}
            </div>
          </div>
          <div className="p-4 rounded-xl" style={{ backgroundColor: "#FFFFFF", border: "1px solid #E5E7EB" }}>
            <div style={{ color: "#6B7280" }}>Đã xong</div>
            <div className="text-2xl mt-1" style={{ color: "#10B981" }}>
              {completedCount}
            </div>
          </div>
          <div className="p-4 rounded-xl" style={{ backgroundColor: "#FFFFFF", border: "1px solid #E5E7EB" }}>
            <div style={{ color: "#6B7280" }}>Chưa xong</div>
            <div className="text-2xl mt-1" style={{ color: "#F59E0B" }}>
              {pendingCount}
            </div>
          </div>
        </div>

        {/* Toolbar */}
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg" style={{ color: "#333" }}>
            Chi tiết báo cáo
          </h3>
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="rounded-xl gap-2"
              onClick={handleRefresh}
              disabled={isRefreshing}
              style={{ borderColor: "#E5E7EB" }}
            >
              <RefreshCw size={18} className={isRefreshing ? "animate-spin" : ""} />
              Refresh
            </Button>
            <Button
              variant="outline"
              className="rounded-xl gap-2"
              onClick={handleDeleteSelected}
              disabled={selectedIds.length === 0}
              style={{ borderColor: "#E5E7EB", color: "#EF4444" }}
            >
              <Trash2 size={18} />
              Xóa ({selectedIds.length})
            </Button>
            <Button
              className="rounded-xl gap-2"
              onClick={handleExportCSV}
              style={{ backgroundColor: "#4F46E5" }}
            >
              <Download size={18} />
              Export CSV
            </Button>
          </div>
        </div>

        {/* Table */}
        <div className="rounded-xl overflow-hidden flex-1" style={{ backgroundColor: "#FFFFFF", border: "1px solid #E5E7EB" }}>
          <Table>
            <TableHeader>
              <TableRow style={{ borderColor: "#E5E7EB" }}>
                <TableHead className="w-12">
                  <Checkbox
                    checked={selectedIds.length === reports.length && reports.length > 0}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedIds(reports.map(r => r.id));
                      } else {
                        setSelectedIds([]);
                      }
                    }}
                  />
                </TableHead>
                <TableHead>ID Via</TableHead>
                <TableHead>Username</TableHead>
                <TableHead>ID Ad Account</TableHead>
                <TableHead>ID BM</TableHead>
                <TableHead>BM UID</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Time</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                    Đang tải dữ liệu...
                  </TableCell>
                </TableRow>
              ) : reports.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                    Không có báo cáo nào
                  </TableCell>
                </TableRow>
              ) : (
                reports.map((report) => (
                  <TableRow key={report.id} style={{ borderColor: "#E5E7EB" }}>
                    <TableCell>
                      <Checkbox
                        checked={selectedIds.includes(report.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedIds([...selectedIds, report.id]);
                          } else {
                            setSelectedIds(selectedIds.filter(id => id !== report.id));
                          }
                        }}
                      />
                    </TableCell>
                    <TableCell>{report.idVia || 'N/A'}</TableCell>
                    <TableCell>{report.username || 'N/A'}</TableCell>
                    <TableCell>{report.idAdAccount || 'N/A'}</TableCell>
                    <TableCell>{report.idBM || 'N/A'}</TableCell>
                    <TableCell>{report.bmUid || 'N/A'}</TableCell>
                  <TableCell>
                    {report.status === "completed" ? (
                      <Badge className="rounded-full" style={{ backgroundColor: "#D1FAE5", color: "#10B981" }}>
                        Đã xong
                      </Badge>
                    ) : (
                      <Badge className="rounded-full" style={{ backgroundColor: "#FEF3C7", color: "#F59E0B" }}>
                        Chưa xong
                      </Badge>
                    )}
                  </TableCell>
                    <TableCell style={{ color: "#6B7280" }}>{report.time}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
