"use client";

import React from "react";

export type MenuBarItem = "dashboard" | "notifications" | "settings" | "help" | "security";

export interface MenuBarProps {
  active?: MenuBarItem;
  onSelect?: (key: MenuBarItem) => void;
  className?: string;
  lang?: "ar" | "en";
}

const icons: Record<MenuBarItem, React.ReactNode> = {
  dashboard: (
    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
      <path d="M3 9.5L12 4l9 5.5v7.5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9.5z" />
      <path d="M9 22V12h6v10" />
    </svg>
  ),
  notifications: (
    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
      <path d="M18 16v-5a6 6 0 1 0-12 0v5l-2 2v1h16v-1l-2-2z" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  ),
  settings: (
    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h.09a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h.09a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v.09a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  ),
  help: (
    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="10" />
      <path d="M9.09 9a3 3 0 1 1 5.82 1c0 2-3 3-3 3" />
      <circle cx="12" cy="17" r="1" />
    </svg>
  ),
  security: (
    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  ),
};

interface IconButtonProps {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick?: () => void;
}

const IconButton: React.FC<IconButtonProps> = ({ icon, label, active, onClick }) => {
  const [hovered, setHovered] = React.useState(false);
  const [showTooltip, setShowTooltip] = React.useState(false);
  const tooltipTimeout = React.useRef<NodeJS.Timeout | null>(null);

  const expandedWidth = Math.max(40 + label.length * 8 + 24, 110);
  const isExpanded = hovered || active;

  const handleMobileTooltip = (e: React.MouseEvent) => {
    if (typeof window !== "undefined" && window.innerWidth < 640) {
      e.preventDefault();
      setShowTooltip(true);
      if (tooltipTimeout.current) clearTimeout(tooltipTimeout.current);
      tooltipTimeout.current = setTimeout(() => setShowTooltip(false), 1200);
    }
    if (onClick) onClick();
  };

  React.useEffect(() => {
    return () => {
      if (tooltipTimeout.current) clearTimeout(tooltipTimeout.current);
    };
  }, []);

  return (
    <button
      type="button"
      aria-label={label}
      className={`flex items-center rounded-lg border transition-all focus:outline-none relative overflow-visible
        ${
          active
            ? "border-white/40 bg-white/10 text-white font-medium shadow-sm"
            : "border-transparent text-zinc-400 hover:text-white hover:bg-white/[0.05]"
        }
        duration-200
        w-10 sm:w-auto
        px-0 sm:px-3
        py-1.5
        justify-center sm:justify-start
        bg-black
      `}
      style={{
        minWidth: 40,
        minHeight: 40,
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={handleMobileTooltip}
    >
      {/* Tooltip for mobile view */}
      <span
        className={`sm:hidden absolute -top-8 left-1/2 -translate-x-1/2 bg-black border border-white/20 text-white text-[10px] font-mono rounded px-2 py-0.5 transition-opacity duration-200 pointer-events-none z-30 ${
          showTooltip ? "opacity-100" : "opacity-0"
        }`}
      >
        {label}
      </span>
      <span className="flex items-center justify-center w-7 h-7 shrink-0">
        {icon}
      </span>
      <span
        className={`text-xs font-mono transition-all duration-300 whitespace-nowrap pointer-events-none ml-1.5 hidden sm:inline ${
          isExpanded ? "opacity-100 w-auto" : "opacity-0 w-0"
        }`}
        style={{
          transition: "opacity 0.25s, width 0.3s cubic-bezier(0.4,0,0.2,1)",
          width: isExpanded ? expandedWidth - 40 - 24 : 0,
        }}
      >
        {label}
      </span>
    </button>
  );
};

const itemLabels: Record<"ar" | "en", Record<MenuBarItem, string>> = {
  ar: {
    dashboard: "الرئيسية",
    security: "حاجز الخصوصية",
    notifications: "البلاغات الفورية",
    settings: "استوديو الطباعة",
    help: "الدعم والمساعدة",
  },
  en: {
    dashboard: "Home",
    security: "Zero-Knowledge",
    notifications: "Live Alerts",
    settings: "Print Studio",
    help: "Documentation",
  },
};

export const MenuBar = ({ active = "dashboard", onSelect, className = "", lang = "ar" }: MenuBarProps) => {
  const currentLabels = itemLabels[lang] || itemLabels.ar;

  return (
    <nav
      className={`flex items-center gap-1 bg-[#08080A] p-1 rounded-xl border border-white/15 w-fit mx-auto transition-all duration-200 ${className}`}
    >
      <IconButton
        icon={icons.dashboard}
        label={currentLabels.dashboard}
        active={active === "dashboard"}
        onClick={() => onSelect?.("dashboard")}
      />
      <div className="w-px h-4 bg-white/10 mx-0.5" />
      <IconButton
        icon={icons.security}
        label={currentLabels.security}
        active={active === "security"}
        onClick={() => onSelect?.("security")}
      />
      <IconButton
        icon={icons.notifications}
        label={currentLabels.notifications}
        active={active === "notifications"}
        onClick={() => onSelect?.("notifications")}
      />
      <IconButton
        icon={icons.settings}
        label={currentLabels.settings}
        active={active === "settings"}
        onClick={() => onSelect?.("settings")}
      />
      <IconButton
        icon={icons.help}
        label={currentLabels.help}
        active={active === "help"}
        onClick={() => onSelect?.("help")}
      />
    </nav>
  );
};

export default MenuBar;
