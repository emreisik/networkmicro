import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth/require";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/common/page-header";
import { TaskForm } from "@/components/forms/task-form";

interface PageProps {
  searchParams: Promise<{ campaignId?: string }>;
}

export default async function NewTaskPage({ searchParams }: PageProps) {
  await requireRole("ADMIN");
  const sp = await searchParams;

  const campaigns = await prisma.campaign.findMany({
    where: { status: { in: ["DRAFT", "SCHEDULED", "ACTIVE", "PAUSED"] } },
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true },
  });

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="New task"
        description="Configure reward, requirements, and time window."
      />
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Task</CardTitle>
        </CardHeader>
        <CardContent>
          <TaskForm
            mode="create"
            campaigns={campaigns}
            defaults={{ campaignId: sp.campaignId }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
