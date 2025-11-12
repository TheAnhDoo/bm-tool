import { useState } from "react";
import { Download, RefreshCw } from "lucide-react";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";

interface Report {
  id: number;
  idVia: string;
  uid: string;
  idAdAccount: string;
  idBM: string;
  status: "completed" | "pending";
  time: string;
}

const mockReports: Report[] = [
  {
    id: 1,
    idVia: "via_01",
    uid: "100123",
    idAdAccount: "act_123456789",
    idBM: "bm_001",
    status: "completed",
    time: "2025-11-05 14:30:25",
  },
  {
    id: 2,
    idVia: "via_02",
    uid: "100124",
    idAdAccount: "act_987654321",
    idBM: "bm_002",
    status: "pending",
    time: "2025-11-05 14:25:10",
  },
  {
    id: 3,
    idVia: "via_03",
    uid: "100125",
    idAdAccount: "act_555666777",
    idBM: "bm_001",
    status: "completed",
    time: "2025-11-05 14:20:45",
  },
  {
    id: 4,
    idVia: "via_04",
    uid: "100126",
    idAdAccount: "act_111222333",
    idBM: "bm_003",
    status: "pending",
    time: "2025-11-05 14:15:30",
  },
  {
    id: 5,
    idVia: "via_05",
    uid: "100127",
    idAdAccount: "act_444555666",
    idBM: "bm_002",
    status: "completed",
    time: "2025-11-05 14:10:15",
  },
];

export function ReportDashboard() {
  const [reports, setReports] = useState<Report[]>(mockReports);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
      console.log("Data refreshed");
    }, 1000);
  };

  const handleExportCSV = () => {
    console.log("Exporting CSV");
    const csvContent =
      "ID Via,UID,ID Ad Account,ID BM,Status,Time\n" +
      reports
        .map(
          (r) =>
            `${r.idVia},${r.uid},${r.idAdAccount},${r.idBM},${r.status},${r.time}`
        )
        .join("\n");
    
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "report.csv";
    a.click();
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
                <TableHead>ID Via</TableHead>
                <TableHead>UID</TableHead>
                <TableHead>ID Ad Account</TableHead>
                <TableHead>ID BM</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Time</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reports.map((report) => (
                <TableRow key={report.id} style={{ borderColor: "#E5E7EB" }}>
                  <TableCell>{report.idVia}</TableCell>
                  <TableCell>{report.uid}</TableCell>
                  <TableCell>{report.idAdAccount}</TableCell>
                  <TableCell>{report.idBM}</TableCell>
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
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
