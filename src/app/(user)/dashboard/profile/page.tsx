import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth/require";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PageHeader } from "@/components/common/page-header";
import { ProfileForm, PasswordForm } from "@/components/forms/profile-form";
import { formatDateTime } from "@/lib/format";

export default async function ProfilePage() {
  const session = await requireUser();
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: session.id },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      country: true,
      bio: true,
      createdAt: true,
      trustScore: true,
      approvedCount: true,
      rejectedCount: true,
    },
  });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Profile"
        description="Manage your personal information and password."
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Profile</CardTitle>
          </CardHeader>
          <CardContent>
            <ProfileForm
              defaults={{
                name: user.name,
                phone: user.phone ?? "",
                country: user.country ?? "",
                bio: user.bio ?? "",
              }}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Account</CardTitle>
            <CardDescription>{user.email}</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2 text-sm">
            <Row label="Joined" value={formatDateTime(user.createdAt)} />
            <Row label="Trust score" value={`${user.trustScore} / 100`} />
            <Row label="Approved" value={String(user.approvedCount)} />
            <Row label="Rejected" value={String(user.rejectedCount)} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Password</CardTitle>
          <CardDescription>
            Use a strong password with at least 8 characters.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PasswordForm />
        </CardContent>
      </Card>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span>{value}</span>
    </div>
  );
}
