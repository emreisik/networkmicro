import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth/require";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import {
  CampaignStatusBadge,
  TaskStatusBadge,
  PlatformBadge,
} from "@/components/common/status-badge";
import { CampaignForm } from "@/components/forms/campaign-form";
import {
  AssetUploadForm,
  DeleteAssetButton,
} from "@/components/forms/asset-upload-form";
import { formatDate, formatMoney } from "@/lib/format";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function CampaignDetailPage({ params }: PageProps) {
  await requireRole("ADMIN");
  const { id } = await params;

  const campaign = await prisma.campaign.findUnique({
    where: { id },
    include: {
      assets: { orderBy: { createdAt: "desc" } },
      tasks: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!campaign) notFound();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={campaign.name}
        description={campaign.slug}
        action={
          <div className="flex items-center gap-2">
            <CampaignStatusBadge status={campaign.status} />
            <Button asChild variant="outline">
              <Link href={`/admin/tasks/new?campaignId=${campaign.id}`}>
                Add task
              </Link>
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Details</CardTitle>
          </CardHeader>
          <CardContent>
            <CampaignForm
              mode="edit"
              defaults={{
                id: campaign.id,
                name: campaign.name,
                slug: campaign.slug,
                description: campaign.description,
                brand: campaign.brand,
                status: campaign.status,
                startsAt: campaign.startsAt,
                endsAt: campaign.endsAt,
                budgetCents: campaign.budgetCents,
              }}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Summary</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2 text-sm">
            <Row label="Budget" value={formatMoney(campaign.budgetCents)} />
            <Row label="Spent" value={formatMoney(campaign.spentCents)} />
            <Row
              label="Starts"
              value={campaign.startsAt ? formatDate(campaign.startsAt) : "—"}
            />
            <Row
              label="Ends"
              value={campaign.endsAt ? formatDate(campaign.endsAt) : "—"}
            />
            <Row label="Tasks" value={String(campaign.tasks.length)} />
            <Row label="Assets" value={String(campaign.assets.length)} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Tasks</CardTitle>
          <Button asChild size="sm">
            <Link href={`/admin/tasks/new?campaignId=${campaign.id}`}>
              New task
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          {campaign.tasks.length === 0 ? (
            <p className="text-sm text-muted-foreground">No tasks yet.</p>
          ) : (
            <ul className="divide-y">
              {campaign.tasks.map((t) => (
                <li
                  key={t.id}
                  className="flex items-center justify-between gap-3 py-3"
                >
                  <div>
                    <div className="font-medium">{t.title}</div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <PlatformBadge platform={t.platform} />
                      <span>{formatMoney(t.rewardCents)}</span>
                      <span>
                        · {t.approvedCount} approved / {t.assignedCount} claimed
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <TaskStatusBadge status={t.status} />
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/admin/tasks/${t.id}`}>Open</Link>
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Assets</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <AssetUploadForm campaignId={campaign.id} />
          {campaign.assets.length === 0 ? (
            <p className="text-sm text-muted-foreground">No assets yet.</p>
          ) : (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
              {campaign.assets.map((a) => (
                <div key={a.id} className="overflow-hidden rounded-md border">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={a.fileUrl}
                    alt={a.title ?? "asset"}
                    className="h-36 w-full object-cover"
                  />
                  <div className="flex items-center justify-between gap-2 p-2">
                    <p className="truncate text-xs">
                      {a.title ?? a.fileKey.split("/").pop()}
                    </p>
                    <DeleteAssetButton assetId={a.id} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span>{value}</span>
    </div>
  );
}
