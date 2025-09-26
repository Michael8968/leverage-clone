import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("size-8", className)}
    >
      <path d="M4 6h16" />
      <path d="M4 12h16" />
      <path d="M4 18h7" />
    </svg>
  );
}
