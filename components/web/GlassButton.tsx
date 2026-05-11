import React, { useRef } from "react";
import { Platform } from "react-native";

const variants = {
  clear:  { bg: "rgba(255,255,255,0.12)", border: "rgba(255,255,255,0.22)", shadow: "rgba(0,0,0,0.2)", color: "#fff" },
  blue:   { bg: "rgba(50,130,255,0.28)",  border: "rgba(100,170,255,0.35)", shadow: "rgba(50,100,255,0.25)", color: "#fff" },
  purple: { bg: "rgba(140,70,255,0.28)",  border: "rgba(170,120,255,0.38)", shadow: "rgba(100,50,220,0.3)",  color: "#fff" },
  pink:   { bg: "rgba(255,60,120,0.24)",  border: "rgba(255,100,150,0.35)", shadow: "rgba(220,40,100,0.25)", color: "#fff" },
  teal:   { bg: "rgba(20,210,190,0.22)",  border: "rgba(60,230,210,0.32)",  shadow: "rgba(0,180,160,0.22)", color: "#fff" },
  dark:   { bg: "rgba(0,0,0,0.35)",       border: "rgba(255,255,255,0.12)", shadow: "rgba(0,0,0,0.4)",      color: "rgba(255,255,255,0.85)" },
  white:  { bg: "rgba(255,255,255,0.88)", border: "rgba(255,255,255,0.95)", shadow: "rgba(0,0,0,0.18)",     color: "#1a1a2e" },
  glass:  { bg: "rgba(255,255,255,0.15)", border: "rgba(255,255,255,0.4)",  shadow: "rgba(0,0,0,0.1)",      color: "#01b854" }, // Custom BYG glass
};

const sizes = {
  sm: { height: 36, px: 18, fontSize: 14, radius: 12 },
  md: { height: 44, px: 24, fontSize: 16, radius: 14 },
  lg: { height: 52, px: 32, fontSize: 17, radius: 16 },
  xl: { height: 60, px: 40, fontSize: 18, radius: 18 },
};

export default function GlassButton({
  children,
  variant = "clear",
  size = "md",
  pill = false,
  icon = false,
  onClick,
  style = {},
  disabled = false,
}) {
  const btnRef = useRef(null);
  
  if (Platform.OS !== 'web') {
    // Basic fallback for mobile, though this is a web-focused request
    return null; 
  }

  const v = variants[variant] || variants.clear;
  const s = sizes[size] || sizes.md;
  const radius = pill ? 999 : s.radius;
  const width = icon ? s.height : undefined;

  function handleClick(e) {
    if (disabled) return;
    const btn = btnRef.current as any;
    if (!btn) return;

    const ripple = document.createElement("span");
    const rect = btn.getBoundingClientRect();
    const sz = Math.max(rect.width, rect.height);
    Object.assign(ripple.style, {
      position: "absolute", borderRadius: "50%",
      background: "rgba(255,255,255,0.25)",
      width: sz + "px", height: sz + "px",
      left: e.clientX - rect.left - sz / 2 + "px",
      top: e.clientY - rect.top - sz / 2 + "px",
      transform: "scale(0)", animation: "glassRipple 0.5s ease-out forwards",
      pointerEvents: "none", zIndex: 3,
    });
    btn.appendChild(ripple);
    setTimeout(() => ripple.remove(), 600);
    onClick?.(e);
  }

  return (
    <>
      <style>{`
        @keyframes glassRipple { to { transform: scale(4); opacity: 0; } }
        .glass-btn-inner:active { transform: scale(0.96); filter: brightness(0.9); }
        .glass-btn-inner:hover { transform: translateY(-1px); box-shadow: 0 6px 28px rgba(0,0,0,0.25); }
      `}</style>
      <button
        ref={btnRef}
        className="glass-btn-inner"
        onClick={handleClick}
        disabled={disabled}
        style={{
          position: "relative",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          height: s.height,
          width,
          padding: icon ? 0 : `0 ${s.px}px`,
          fontSize: s.fontSize,
          fontWeight: 600,
          fontFamily: "-apple-system, BlinkMacSystemFont, 'Inter', sans-serif",
          borderRadius: radius,
          border: `1px solid ${v.border}`,
          background: v.bg,
          color: v.color,
          boxShadow: `0 4px 24px ${v.shadow}, inset 0 1px 0 rgba(255,255,255,0.2)`,
          cursor: disabled ? "not-allowed" : "pointer",
          overflow: "hidden",
          transition: "all 0.15s ease",
          backdropFilter: "blur(20px) saturate(180%)",
          WebkitBackdropFilter: "blur(20px) saturate(180%)",
          opacity: disabled ? 0.5 : 1,
          outline: 'none',
          ...style,
        } as any}
      >
        {/* Top shine */}
        <span style={{
          position: "absolute", top: 0, left: 0, right: 0, height: "50%",
          background: "linear-gradient(180deg, rgba(255,255,255,0.28) 0%, rgba(255,255,255,0.04) 100%)",
          pointerEvents: "none", zIndex: 1,
        }} />
        {/* Content */}
        <span style={{ position: "relative", zIndex: 2, display: "contents" }}>
          {children}
        </span>
      </button>
    </>
  );
}
