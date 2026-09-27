import { useState, type ReactNode } from "react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

export interface FormDrawerProps {
  trigger?: ReactNode;
  title: string;
  description?: string;
  submitLabel?: string;
  children: ReactNode | ((close: () => void) => ReactNode);
  onSubmit?: () => boolean | void | Promise<boolean | void>;
  hideFooter?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function FormDrawer({
  trigger,
  title,
  description,
  submitLabel = "Save",
  children,
  onSubmit,
  hideFooter,
  open: controlledOpen,
  onOpenChange,
}: FormDrawerProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isMobile = useIsMobile();
  const open = controlledOpen ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      {trigger ? <SheetTrigger asChild>{trigger}</SheetTrigger> : null}
      <SheetContent
        side={isMobile ? "bottom" : "right"}
        className={cn(
          "flex flex-col gap-0 p-0",
          isMobile ? "h-[94dvh] w-full max-w-none rounded-t-xl" : "w-full sm:max-w-xl",
        )}
      >
        <SheetHeader className="shrink-0 border-b px-4 py-4 pr-12 sm:px-5">
          <SheetTitle>{title}</SheetTitle>
          {description ? <SheetDescription>{description}</SheetDescription> : null}
        </SheetHeader>
        <div className="scrollbar-thin min-h-0 flex-1 overflow-x-hidden overflow-y-auto px-4 py-4 sm:px-5 sm:py-5">
          {typeof children === "function" ? children(() => setOpen(false)) : children}
        </div>
        {hideFooter ? null : (
          <div className="grid shrink-0 grid-cols-2 gap-2 border-t bg-surface-muted/50 px-4 py-3 pb-[calc(.75rem+env(safe-area-inset-bottom))] sm:flex sm:items-center sm:justify-end sm:px-5 sm:pb-3">
            <Button variant="ghost" className="w-full sm:w-auto" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button className="w-full sm:w-auto"
              onClick={async () => {
                const result = await onSubmit?.();
                if (result !== false) setOpen(false);
              }}
            >
              {submitLabel}
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
