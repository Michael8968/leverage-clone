import Image from 'next/image';
import { cn } from '@/lib/utils';

export function Logo({ className }: { className?: string }) {
  return (
    <div className={cn("relative h-8 w-auto aspect-[220/63]", className)}>
      <Image
        src="/logo.png"
        alt="Leverage Platform Logo"
        layout="fill"
        objectFit="cover"
        className="rounded-sm"
      />
    </div>
  );
}
