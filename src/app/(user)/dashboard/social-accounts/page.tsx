import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth/require";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/common/empty-state";
import { PlatformBadge } from "@/components/common/status-badge";
import { Badge } from "@/components/ui/badge";
import {
  SocialAccountForm,
  DeleteSocialAccountButton,
} from "@/components/forms/social-account-form";
import { formatNumber } from "@/lib/format";

export default async function SocialAccountsPage() {
  const user = await requireUser();

  const accounts = await prisma.socialAccount.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Social accounts"
        description="Add the accounts you use to complete tasks."
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Add account</CardTitle>
        </CardHeader>
        <CardContent>
          <SocialAccountForm />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Your accounts</CardTitle>
        </CardHeader>
        <CardContent>
          {accounts.length === 0 ? (
            <EmptyState
              title="No accounts yet"
              description="Add your first social account to start claiming tasks."
            />
          ) : (
            <ul className="divide-y">
              {accounts.map((a) => (
                <li
                  key={a.id}
                  className="flex items-center justify-between gap-3 py-3"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <PlatformBadge platform={a.platform} />
                      <span className="font-medium">@{a.username}</span>
                      <Badge variant="outline">{a.accountType}</Badge>
                      {a.verified ? (
                        <Badge variant="success">Verified</Badge>
                      ) : null}
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {formatNumber(a.followerCount)} followers ·{" "}
                      <a
                        className="underline-offset-4 hover:underline"
                        href={a.profileUrl}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {a.profileUrl}
                      </a>
                    </div>
                  </div>
                  <DeleteSocialAccountButton id={a.id} />
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
