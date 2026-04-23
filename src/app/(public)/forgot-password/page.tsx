import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function ForgotPasswordPage() {
  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-4 px-4 py-16">
      <Card>
        <CardHeader className="space-y-1">
          <CardTitle>Forgot your password?</CardTitle>
          <CardDescription>We&apos;ll help you recover access.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Alert>
            <AlertDescription>
              Password reset is handled by a platform admin. Contact support at{" "}
              <a
                href="mailto:support@example.com"
                className="underline-offset-4 hover:underline"
              >
                support@example.com
              </a>{" "}
              to request a reset.
            </AlertDescription>
          </Alert>
          <p className="text-center text-sm text-muted-foreground">
            Back to{" "}
            <Link
              href="/login"
              className="text-foreground underline-offset-4 hover:underline"
            >
              sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
