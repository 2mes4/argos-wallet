import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  size?: number;
}

export function ArgosLogo({ className, size = 32 }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn(className)}
    >
      <defs>
        <linearGradient id="amberGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#f5d99c" />
          <stop offset="50%" stopColor="#e8a838" />
          <stop offset="100%" stopColor="#c98a1e" />
        </linearGradient>
        <radialGradient id="irisGrad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#1c1c20" />
          <stop offset="100%" stopColor="#0a0a0b" />
        </radialGradient>
      </defs>
      <path
        d="M4 32 C 16 12, 48 12, 60 32 C 48 52, 16 52, 4 32 Z"
        stroke="url(#amberGrad)"
        strokeWidth="2"
        fill="none"
      />
      <circle cx="32" cy="32" r="12" fill="url(#irisGrad)" stroke="url(#amberGrad)" strokeWidth="1.5" />
      <circle cx="32" cy="32" r="5" fill="url(#amberGrad)" />
      <circle cx="34" cy="30" r="1.5" fill="#0a0a0b" />
      <path d="M32 18 L32 14" stroke="url(#amberGrad)" strokeWidth="1" strokeLinecap="round" opacity="0.5" />
      <path d="M32 50 L32 54" stroke="url(#amberGrad)" strokeWidth="1" strokeLinecap="round" opacity="0.5" />
      <path d="M14 24 L10 22" stroke="url(#amberGrad)" strokeWidth="1" strokeLinecap="round" opacity="0.4" />
      <path d="M50 24 L54 22" stroke="url(#amberGrad)" strokeWidth="1" strokeLinecap="round" opacity="0.4" />
      <path d="M14 40 L10 42" stroke="url(#amberGrad)" strokeWidth="1" strokeLinecap="round" opacity="0.4" />
      <path d="M50 40 L54 42" stroke="url(#amberGrad)" strokeWidth="1" strokeLinecap="round" opacity="0.4" />
    </svg>
  );
}

export function ArgosWordmark({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <ArgosLogo size={28} />
      <span className="font-display text-xl tracking-wide" style={{ fontWeight: 500 }}>
        Argos
      </span>
    </div>
  );
}
