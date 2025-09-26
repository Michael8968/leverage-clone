import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string }) {
  return (
    <div className={cn("relative size-8", className)}>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 256 256"
        className="size-full"
      >
        <path
          fill="hsl(var(--primary))"
          d="M232 94.31,140.35,35.53a20,20,0,0,0-24.7,0L24,94.31a20,20,0,0,0-10.15,22.46l28.18,97.79A20,20,0,0,0,61.1,228.47h133.8a20,20,0,0,0,19.07-13.91l28.18-97.79A20,20,0,0,0,232,94.31Z"
          opacity="0.2"
        ></path>
        <path
          fill="hsl(var(--primary))"
          d="M242.15,116.77,214,19.58A20,20,0,0,0,194.9,5.69H61.1A20,20,0,0,0,42,19.58L13.85,116.77a20,20,0,0,0,10.15,22.46l91.65,58.78a20,20,0,0,0,24.7,0l91.65-58.78A20,20,0,0,0,242.15,116.77Z"
        ></path>
      </svg>
    </div>
  );
}
