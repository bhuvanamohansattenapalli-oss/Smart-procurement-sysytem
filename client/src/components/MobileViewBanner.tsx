import React from "react";
import { Smartphone, Monitor, Minimize2, Maximize2, X } from "lucide-react";
import { useMobileView } from "@/contexts/MobileViewContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { tUi } from "@/lib/translations";

export function MobileViewBanner() {
  const { isMobileView, frameMode, toggleFrameMode, toggleMobileView } = useMobileView();
  const { language } = useLanguage();

  if (!isMobileView) return null;

  return (
    <aside className="mobile-view-active-banner" role="status" aria-label="Mobile view active notification">
      <div className="banner-left">
        <Smartphone size={14} className="shrink-0 text-emerald-200" />
        <span className="banner-title font-bold">
          {tUi("Mobile View Active", language)}
        </span>
        <span className="banner-desc hidden sm:inline text-emerald-200/90 text-[10px]">
          • {tUi("Showing mobile responsive layout", language)}
        </span>
      </div>

      <div className="banner-right">
        {/* Toggle between Phone simulation frame and Full width (only relevant on wide screens) */}
        <button
          type="button"
          onClick={toggleFrameMode}
          className="banner-mode-btn hidden md:inline-flex"
          title={frameMode === "phone" ? tUi("Switch to Full Width", language) : tUi("Switch to Phone Frame", language)}
        >
          {frameMode === "phone" ? (
            <>
              <Maximize2 size={12} />
              <span>Full Width</span>
            </>
          ) : (
            <>
              <Minimize2 size={12} />
              <span>Phone Frame</span>
            </>
          )}
        </button>

        <button
          type="button"
          onClick={toggleMobileView}
          className="banner-exit-btn"
          title={tUi("Switch to Desktop View", language)}
        >
          <Monitor size={12} />
          <span>{tUi("Exit Mobile View", language)}</span>
        </button>
      </div>
    </aside>
  );
}

export default MobileViewBanner;

