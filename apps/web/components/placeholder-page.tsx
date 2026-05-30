import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@growthos/ui/card";

type PlaceholderPageProps = {
  title: string;
  description: string;
  nextStep: string;
};

export function PlaceholderPage({
  title,
  description,
  nextStep,
}: PlaceholderPageProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          <span className="font-medium text-slate-900 dark:text-slate-100">
            Next build step:
          </span>{" "}
          {nextStep}
        </p>
      </CardContent>
    </Card>
  );
}
