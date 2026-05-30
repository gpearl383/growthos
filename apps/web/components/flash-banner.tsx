import {
  Card,
  CardContent,
} from "@growthos/ui/card";

type FlashBannerProps = {
  variant?: "success" | "error" | "info";
  children: React.ReactNode;
};

const styles = {
  success:
    "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/20 dark:text-emerald-200",
  error:
    "border-red-200 bg-red-50 text-red-900 dark:border-red-900 dark:bg-red-950/20 dark:text-red-200",
  info: "border-blue-200 bg-blue-50 text-blue-900 dark:border-blue-900 dark:bg-blue-950/20 dark:text-blue-200",
};

export function FlashBanner({
  variant = "success",
  children,
}: FlashBannerProps) {
  return (
    <Card className={styles[variant]}>
      <CardContent className="p-4 text-sm">{children}</CardContent>
    </Card>
  );
}
