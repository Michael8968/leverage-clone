import { cn } from "@/lib/utils";
import Image from "next/image";

export function Logo({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center justify-center", className)}>
      <Image 
        src="/logo.png" 
        alt="Leverage AI Logo" 
        width={32} 
        height={32} 
        className="text-primary"
      />
    </div>
  );
}
