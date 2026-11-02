import React, { createContext, useContext, useEffect, useState } from "react";

export type FrameMode = "phone" | "full";

interface MobileViewContextType {
  isMobileView: boolean;
  frameMode: FrameMode;
  toggleMobileView: () => void;
  setMobileView: (active: boolean) => void;
  toggleFrameMode: () => void;
  setFrameMode: (mode: FrameMode) => void;
}

const MobileViewContext = createContext<MobileViewContextType | undefined>(undefined);

const STORAGE_KEY_ACTIVE = "procureflow.mobileView";
const STORAGE_KEY_FRAME = "procureflow.mobileFrameMode";

export function MobileViewProvider({ children }: { children: React.ReactNode }) {
  const [isMobileView, setIsMobileViewState] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_ACTIVE);
      return stored === "true";
    } catch {
      return false;
    }
  });

  const [frameMode, setFrameModeState] = useState<FrameMode>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_FRAME);
      return stored === "full" ? "full" : "phone";
    } catch {
      return "phone";
    }
  });

  const setMobileView = (active: boolean) => {
    setIsMobileViewState(active);
    try {
      localStorage.setItem(STORAGE_KEY_ACTIVE, active ? "true" : "false");
    } catch (e) {
      console.warn("Failed to persist mobile view preference", e);
    }
  };

  const toggleMobileView = () => {
    setMobileView(!isMobileView);
  };

  const setFrameMode = (mode: FrameMode) => {
    setFrameModeState(mode);
    try {
      localStorage.setItem(STORAGE_KEY_FRAME, mode);
    } catch (e) {
      console.warn("Failed to persist mobile frame mode", e);
    }
  };

  const toggleFrameMode = () => {
    setFrameMode(frameMode === "phone" ? "full" : "phone");
  };

  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;

    if (isMobileView) {
      root.setAttribute("data-mobile-mode", "true");
      root.setAttribute("data-frame-mode", frameMode);
      body.classList.add("mobile-mode-forced");
      if (frameMode === "phone") {
        body.classList.add("mobile-frame-phone");
        body.classList.remove("mobile-frame-full");
      } else {
        body.classList.add("mobile-frame-full");
        body.classList.remove("mobile-frame-phone");
      }
    } else {
      root.removeAttribute("data-mobile-mode");
      root.removeAttribute("data-frame-mode");
      body.classList.remove("mobile-mode-forced", "mobile-frame-phone", "mobile-frame-full");
    }
  }, [isMobileView, frameMode]);

  return (
    <MobileViewContext.Provider
      value={{
        isMobileView,
        frameMode,
        toggleMobileView,
        setMobileView,
        toggleFrameMode,
        setFrameMode,
      }}
    >
      {children}
    </MobileViewContext.Provider>
  );
}

export function useMobileView(): MobileViewContextType {
  const context = useContext(MobileViewContext);
  if (!context) {
    throw new Error("useMobileView must be used within a MobileViewProvider");
  }
  return context;
}

