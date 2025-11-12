import { useState } from "react";
import { LayoutDashboard, Users, Link2, Building2, Link, FileText } from "lucide-react";
import { Dashboard } from "./components/Dashboard";
import { ProfileDashboard } from "./components/ProfileDashboard";
import { ViaDashboard } from "./components/ViaDashboard";
import { BMTrungGianDashboard } from "./components/BMTrungGianDashboard";
import { LinkInviteDashboard } from "./components/LinkInviteDashboard";
import { ReportDashboard } from "./components/ReportDashboard";

export default function App() {
  const [activeView, setActiveView] = useState("dashboard");

  const menuItems = [
    { id: "dashboard", icon: LayoutDashboard, label: "Dashboard" },
    { id: "list-profile", icon: Users, label: "List Profile" },
    { id: "via", icon: Link2, label: "Via" },
    { id: "bm-trung-gian", icon: Building2, label: "BM Trung Gian" },
    { id: "link-invite", icon: Link, label: "Link Invite" },
    { id: "report", icon: FileText, label: "Report" },
  ];

  return (
    <div className="flex flex-col h-screen" style={{ backgroundColor: "#F8F9FA" }}>
      {/* Top Navigation Bar */}
      <header
        className="w-full border-b"
        style={{
          backgroundColor: "#FFFFFF",
          borderColor: "#E5E7EB",
          boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
        }}
      >
        <nav className="px-6">
          <div className="flex items-center gap-1 h-14">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveView(item.id)}
                  className="relative flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 text-sm font-medium"
                  style={{
                    color: isActive ? "#4F46E5" : "#6B7280",
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.color = "#374151";
                      e.currentTarget.style.backgroundColor = "#F9FAFB";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.color = "#6B7280";
                      e.currentTarget.style.backgroundColor = "transparent";
                    }
                  }}
                >
                  {isActive && (
                    <>
                      <div
                        className="absolute bottom-0 left-0 right-0 h-0.5 rounded-t-full"
                        style={{ backgroundColor: "#4F46E5" }}
                      />
                      <div
                        className="absolute inset-0 rounded-lg"
                        style={{ backgroundColor: "#EEF2FF", opacity: 0.5 }}
                      />
                    </>
                  )}
                  <Icon 
                    size={18} 
                    className="relative z-10"
                    style={{ 
                      color: isActive ? "#4F46E5" : "inherit",
                      strokeWidth: isActive ? 2.5 : 2,
                    }} 
                  />
                  <span className="relative z-10">{item.label}</span>
                </button>
              );
            })}
          </div>
        </nav>
      </header>

      {/* Main content area */}
      <div className="flex-1 overflow-auto">
        {activeView === "dashboard" && <Dashboard />}
        {activeView === "list-profile" && <ProfileDashboard />}
        {activeView === "via" && <ViaDashboard />}
        {activeView === "bm-trung-gian" && <BMTrungGianDashboard />}
        {activeView === "link-invite" && <LinkInviteDashboard />}
        {activeView === "report" && <ReportDashboard />}
      </div>
    </div>
  );
}
