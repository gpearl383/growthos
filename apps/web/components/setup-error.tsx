import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@growthos/ui/card";

type SetupErrorProps = {
  title: string;
  description: string;
  details?: string;
};

export function SetupError({ title, description, details }: SetupErrorProps) {
  return (
    <Card className="border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/20">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      {details ? (
        <CardContent>
          <pre className="overflow-x-auto rounded-md bg-white/80 p-3 text-xs text-red-800 dark:bg-black/20 dark:text-red-200">
            {details}
          </pre>
        </CardContent>
      ) : null}
    </Card>
  );
}
