"use client";

import { useState, useEffect } from "react";
import { X, Share, PlusSquare } from "lucide-react";

export function PWAInstallPrompt() {
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(true);
  const [showPrompt, setShowPrompt] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    // Check if we're already running as a PWA
    const isStandaloneMode = window.matchMedia("(display-mode: standalone)").matches 
      || (window.navigator as any).standalone 
      || document.referrer.includes("android-app://");
    
    setIsStandalone(isStandaloneMode);

    if (isStandaloneMode) return;

    // Detect iOS for specific instructions
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIOSDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIOSDevice);

    // If it's iOS, just show the prompt after a short delay since there's no native event
    if (isIOSDevice) {
      const timer = setTimeout(() => {
        const hasDismissed = localStorage.getItem("aniya_pwa_dismissed");
        if (!hasDismissed) setShowPrompt(true);
      }, 3000);
      return () => clearTimeout(timer);
    }

    // For Android/Chrome: listen to the native beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      const hasDismissed = localStorage.getItem("aniya_pwa_dismissed");
      if (!hasDismissed) {
        setShowPrompt(true);
      }
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const dismissPrompt = () => {
    setShowPrompt(false);
    localStorage.setItem("aniya_pwa_dismissed", "true");
  };

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setShowPrompt(false);
      }
      setDeferredPrompt(null);
    }
  };

  if (!showPrompt || isStandalone) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 pb-8 sm:pb-4 animate-in slide-in-from-bottom-full duration-500">
      <div className="mx-auto max-w-sm bg-white rounded-2xl shadow-xl border border-pink-100 p-4 relative overflow-hidden">
        {/* Decorative background */}
        <div className="absolute -right-4 -top-4 w-24 h-24 bg-pink-50 rounded-full opacity-50 pointer-events-none" />
        
        <button 
          onClick={dismissPrompt}
          className="absolute top-2 right-2 p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-50 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="pr-6">
          <h3 className="font-semibold text-gray-900 mb-1">Install Aniya</h3>
          <p className="text-sm text-gray-600 mb-4">
            Add this memory book to your home screen for quick access and a full-screen app experience!
          </p>

          {isIOS ? (
            <div className="bg-gray-50 rounded-xl p-3 text-sm text-gray-600 flex items-center gap-3">
              <Share className="w-5 h-5 text-blue-500 shrink-0" />
              <p>
                Tap the <span className="font-semibold text-gray-900">Share</span> icon below, then select <span className="font-semibold text-gray-900">Add to Home Screen</span> <PlusSquare className="inline w-4 h-4 mx-1 text-gray-900" />
              </p>
            </div>
          ) : (
            <button
              onClick={handleInstallClick}
              className="w-full bg-pink-500 hover:bg-pink-600 text-white font-medium py-2.5 px-4 rounded-xl transition-colors shadow-sm shadow-pink-200"
            >
              Install App
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
