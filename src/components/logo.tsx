import Image from 'next/image';
import { cn } from '@/lib/utils';

export function Logo({ className }: { className?: string }) {
  return (
    <div className={cn("relative h-8 w-8", className)}>
      <Image
        src="/logo.png"
        alt="Leverage Platform Logo"
        layout="fill"
        objectFit="contain"
      />
    </div>
  );
}
