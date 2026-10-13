import { cn } from "@/lib/utils";

export function Marquee({
  children,
  reverse = false,
  seconds = 40,
  className
}: {
  children: React.ReactNode;
  reverse?: boolean;
  seconds?: number;
  className?: string;
}) {
  return (
    <div className={cn("zh-marquee group relative flex overflow-hidden", className)}>
      {[0, 1].map((copy) => (
        <div
          key={copy}
          aria-hidden={copy === 1}
          className={cn("zh-marquee-track flex shrink-0 items-center", reverse && "[animation-direction:reverse]")}
          style={{ animationDuration: `${seconds}s` }}
        >
          {children}
        </div>
      ))}
    </div>
  );
}
