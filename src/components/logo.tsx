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
            <path
                d="M50 2.5 L95.5 26.25 V 73.75 L50 97.5 L4.5 73.75 V 26.25 Z"
                stroke="hsl(var(--foreground))"
                strokeWidth="4"
                strokeLinejoin="round"
            />
            <path
                d="M50 50 L4.5 26.25 M50 50 L95.5 26.25 M50 50 V 97.5"
                stroke="hsl(var(--primary))"
                strokeWidth="4"
            />
        </g>
      </svg>
    </div>
  );
}
