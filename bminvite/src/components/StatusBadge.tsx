interface StatusBadgeProps {
  status: string;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const statusConfig: Record<string, { label: string; color: string; bgColor: string }> = {
    running: {
      label: "Running",
      color: "#10B981",
      bgColor: "#D1FAE5",
    },
    stopped: {
      label: "Stopped",
      color: "#EF4444",
      bgColor: "#FEE2E2",
    },
    error: {
      label: "Error",
      color: "#F59E0B",
      bgColor: "#FEF3C7",
    },
    idle: {
      label: "Idle",
      color: "#6B7280",
      bgColor: "#F3F4F6",
    },
  };

  const normalizedStatus = (status || 'idle').toLowerCase();
  const config = statusConfig[normalizedStatus] || statusConfig.idle;

  return (
    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full">
      <div
        className="w-2 h-2 rounded-full"
        style={{ backgroundColor: config.color }}
      />
      <span style={{ color: config.color }}>{config.label}</span>
    </div>
  );
}
