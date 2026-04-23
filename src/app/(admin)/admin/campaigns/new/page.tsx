import { requireRole } from "@/lib/auth/require";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/common/page-header";
import { CampaignForm } from "@/components/forms/campaign-form";

export default async function NewCampaignPage() {
  await requireRole("ADMIN");
  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="New campaign"
        description="Define a campaign shell. You can add tasks and assets after."
      />
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Details</CardTitle>
        </CardHeader>
        <CardContent>
          <CampaignForm mode="create" />
        </CardContent>
      </Card>
    </div>
  );
}
