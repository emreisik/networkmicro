import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/require";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { LoginForm } from "@/components/forms/login-form";

interface PageProps {
  searchParams: Promise<{ from?: string; reason?: string }>;
}

export default async function LoginPage({ searchParams }: PageProps) {
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");
  const sp = await searchParams;

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-4 px-4 py-16">
      {sp.reason === "suspended" ? (
        <Alert variant="destructive">
          <AlertDescription>
            Your account is not active. Contact support for assistance.
          </AlertDescription>
        </Alert>
      ) : null}
      <Card>
        <CardHeader className="space-y-1">
          <CardTitle>Welcome back</CardTitle>
          <CardDescription>
            Sign in to your Network Mikro account.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <LoginForm from={sp.from} />
        </CardContent>
      </Card>
      <p className="text-center text-xs text-muted-foreground">
        By continuing you agree to our{" "}
        <Link href="/terms" className="underline-offset-4 hover:underline">
          terms
        </Link>{" "}
        and{" "}
        <Link href="/privacy" className="underline-offset-4 hover:underline">
          privacy policy
        </Link>
        .
      </p>
    </div>
  );
}
