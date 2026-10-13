"use client";

import { Toaster as Sonner, type ToasterProps } from "sonner";

const Toaster = (props: ToasterProps) => (
  <Sonner
    theme="dark"
    position="bottom-right"
    className="toaster group"
    toastOptions={{
      classNames: {
        toast:
          "group toast !rounded-2xl !border !border-zh-gold/25 !bg-zinc-950/95 !text-zinc-100 !shadow-[0_20px_60px_rgba(0,0,0,0.6)] backdrop-blur-xl",
        description: "!text-zinc-400",
        actionButton: "!bg-zh-gold !text-black !rounded-full !px-3",
        success: "[&_[data-icon]]:!text-rose-400",
        error: "[&_[data-icon]]:!text-red-400"
      }
    }}
    {...props}
  />
);

export { Toaster };
