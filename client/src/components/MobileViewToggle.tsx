import React from "react";
import { Smartphone, Monitor } from "lucide-react";
import { useMobileView } from "@/contexts/MobileViewContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { tUi } from "@/lib/translations";

interface MobileViewToggleProps {
  className?: string;
  showBadge?: boolean;
  compact?: boolean;
}

export function MobileViewToggle({
  className = "",
  showBadge = true,
  compact = false,
}: MobileViewToggleProps) {
  const { isMobileView, toggleMobileView } = useMobileView();
  const { language } = useLanguage();

  const label = isMobileView
    ? tUi("Desktop View", language)
    : tUi("Mobile View", language);

  const title = isMobileView
    ? tUi("Switch to Desktop View", language)
    : tUi("Switch to Mobile View", language);

  return (
    <button
      type="button"
      onClick={toggleMobileView}
      className={`mobile-view-toggle-btn ${isMobileView ? "active" : ""} ${compact ? "compact" : ""} ${className}`}
      title={title}
      aria-label={title}
      aria-pressed={isMobileView}
    >
      {isMobileView ? (
        <Monitor size={15} className="shrink-0 mobile-icon" />
      ) : (
        <Smartphone size={15} className="shrink-0 mobile-icon" />
      )}
      {!compact && <span className="mobile-toggle-text">{label}</span>}
      {showBadge && (
        <span className={`mobile-toggle-badge ${isMobileView ? "active" : ""}`}>
          {isMobileView ? "ON" : "OFF"}
        </span>
      )}
    </button>
  );
}

export default MobileViewToggle;

