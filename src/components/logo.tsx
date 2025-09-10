import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <svg
        width="32"
        height="32"
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="text-primary"
        aria-hidden="true"
      >
        <path
          d="M6 26V6H8V24H26V26H6Z"
          fill="currentColor"
        />
        <path
          d="M12 20V12H20V14H14V20H12Z"
          fill="currentColor"
        />
         <path
          d="M16 16H24V18H18V24H16V16Z"
          fill="currentColor"
          className="text-accent"
        />
      </svg>
    </div>
  );
}
