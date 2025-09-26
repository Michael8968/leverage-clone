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
        <path
          d="M20 80 L50 20 L80 80 L70 80 L50 40 L30 80 Z"
          className="fill-primary"
        />
        <path
          d="M35 70 L50 50 L65 70 L50 70 Z"
          className="fill-accent"
        />
      </svg>
    </div>
  );
}
