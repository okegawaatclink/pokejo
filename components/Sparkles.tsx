const AMBIENT_DOTS = [
  { top: "8%", left: "12%", size: 6, delay: "0s", opacity: 0.8 },
  { top: "18%", left: "82%", size: 4, delay: "0.6s", opacity: 0.7 },
  { top: "35%", left: "6%", size: 3, delay: "1.2s", opacity: 0.6 },
  { top: "42%", left: "92%", size: 5, delay: "0.3s", opacity: 0.8 },
  { top: "60%", left: "20%", size: 4, delay: "1.6s", opacity: 0.6 },
  { top: "68%", left: "75%", size: 6, delay: "0.9s", opacity: 0.9 },
  { top: "85%", left: "40%", size: 3, delay: "2s", opacity: 0.5 },
  { top: "12%", left: "50%", size: 4, delay: "1.4s", opacity: 0.7 },
];

const BURST_DOTS = [
  { top: "10%", left: "20%", size: 8, delay: "0s", opacity: 1 },
  { top: "15%", left: "75%", size: 6, delay: "0.1s", opacity: 0.9 },
  { top: "40%", left: "5%", size: 5, delay: "0.2s", opacity: 0.9 },
  { top: "50%", left: "90%", size: 7, delay: "0.05s", opacity: 1 },
  { top: "75%", left: "15%", size: 6, delay: "0.3s", opacity: 0.8 },
  { top: "80%", left: "70%", size: 8, delay: "0.15s", opacity: 1 },
  { top: "25%", left: "45%", size: 5, delay: "0.25s", opacity: 0.8 },
  { top: "60%", left: "50%", size: 9, delay: "0s", opacity: 1 },
  { top: "5%", left: "55%", size: 5, delay: "0.35s", opacity: 0.7 },
  { top: "90%", left: "45%", size: 6, delay: "0.2s", opacity: 0.9 },
];

export default function Sparkles({
  variant = "ambient",
  className = "",
}: {
  variant?: "ambient" | "burst";
  className?: string;
}) {
  const dots = variant === "burst" ? BURST_DOTS : AMBIENT_DOTS;

  return (
    <div className={`absolute inset-0 overflow-hidden ${className}`} aria-hidden>
      {variant === "burst" && <div className="radial-flash" />}
      {dots.map((dot, i) => (
        <span
          key={i}
          className="sparkle-dot"
          style={{
            top: dot.top,
            left: dot.left,
            width: dot.size,
            height: dot.size,
            animationDelay: dot.delay,
            ["--twinkle-opacity" as string]: dot.opacity,
          }}
        />
      ))}
    </div>
  );
}
