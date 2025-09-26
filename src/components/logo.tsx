import { cn } from '@/lib/utils';

export function Logo({ className }: { className?: string }) {
  return (
    <div className={cn("relative h-8 w-8", className)}>
      <svg
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full"
      >
        <g>
            <ellipse 
                cx="50" 
                cy="50" 
                rx="45" 
                ry="18" 
                stroke="hsl(var(--foreground))" 
                strokeWidth="3" 
                strokeOpacity="0.6"
            />
            <ellipse 
                cx="50" 
                cy="50" 
                rx="45" 
                ry="18" 
                stroke="hsl(var(--foreground))" 
                strokeWidth="3" 
                strokeOpacity="0.6"
                transform="rotate(60 50 50)"
            />
            <circle cx="50" cy="50" r="12" className="fill-primary" />
        </g>
      </svg>
    </div>
  );
}
