import { useTheme } from "next-themes";
import { Toaster as Sonner, toast } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:rounded-card group-[.toaster]:border group-[.toaster]:border-hairline group-[.toaster]:bg-surface-raised group-[.toaster]:text-foreground group-[.toaster]:shadow-raised group-[.toaster]:text-[13px]",
          title: "group-[.toast]:font-mono group-[.toast]:lowercase group-[.toast]:tracking-tight",
          description: "group-[.toast]:text-caption",
          actionButton:
            "group-[.toast]:rounded-control group-[.toast]:bg-forest group-[.toast]:text-forest-foreground group-[.toast]:font-mono group-[.toast]:lowercase",
          cancelButton:
            "group-[.toast]:rounded-control group-[.toast]:bg-muted group-[.toast]:text-muted-foreground group-[.toast]:font-mono group-[.toast]:lowercase",
          error: "group-[.toaster]:text-destructive",
          success: "group-[.toaster]:text-success",
        },
      }}
      {...props}
    />
  );
};

export { Toaster, toast };
