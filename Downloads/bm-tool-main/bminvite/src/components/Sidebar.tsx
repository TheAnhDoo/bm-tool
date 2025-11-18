import { LayoutDashboard, Users, Link2, Building2, Link, FileText, X } from "lucide-react";
import { Button } from "./ui/button";

interface SidebarProps {
  activeView: string;
  onViewChange: (view: string) => void;
  onClose?: () => void;
}

export function Sidebar({ activeView, onViewChange, onClose }: SidebarProps) {
  const menuItems = [
    { id: "dashboard", icon: LayoutDashboard, label: "Dashboard" },
    { id: "list-profile", icon: Users, label: "List Profile" },
    { id: "via", icon: Link2, label: "Via" },
    { id: "bm-trung-gian", icon: Building2, label: "BM Trung Gian" },
    { id: "link-invite", icon: Link, label: "Link Invite" },
    { id: "report", icon: FileText, label: "Report" },
  ];

  return (
    <div
      className="w-64 flex flex-col h-full"
      style={{ 
        backgroundColor: "#FFFFFF", 
        borderRight: "1px solid #E5E7EB", 
        boxShadow: "2px 0 8px rgba(0,0,0,0.1)" 
      }}
    >
      <div className="p-6 flex items-center justify-between" style={{ borderBottom: "1px solid #E5E7EB" }}>
        <h1 className="text-xl" style={{ color: "#333" }}>
          BM Invite Tool
        </h1>
        {onClose && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0 rounded-lg"
          >
            <X size={18} />
          </Button>
        )}
      </div>
      <nav className="flex-1 p-4">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl mb-2 transition-all"
              style={{
                backgroundColor: isActive ? "#4F46E5" : "transparent",
                color: isActive ? "#FFFFFF" : "#333",
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = "#F3F4F6";
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = "transparent";
                }
              }}
            >
              <Icon size={20} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
