import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth/require";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/common/page-header";
import { formatRelative } from "@/lib/format";
import {
  SettingForm,
  DeleteSettingButton,
} from "@/components/forms/setting-form";

export default async function SettingsPage() {
  await requireRole("ADMIN");
  const rows = await prisma.systemSetting.findMany({ orderBy: { key: "asc" } });

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Settings"
        description="Platform-level key/value configuration."
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Set a value</CardTitle>
          </CardHeader>
          <CardContent>
            <SettingForm />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Current settings</CardTitle>
          </CardHeader>
          <CardContent>
            {rows.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No settings configured.
              </p>
            ) : (
              <ul className="divide-y">
                {rows.map((s) => (
                  <li
                    key={s.key}
                    className="flex items-start justify-between gap-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="font-mono text-xs">{s.key}</p>
                      <pre className="mt-1 overflow-x-auto whitespace-pre-wrap break-all rounded bg-muted/40 p-2 text-xs">
                        {JSON.stringify(s.value, null, 2)}
                      </pre>
                      <p className="mt-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                        Updated {formatRelative(s.updatedAt)}
                      </p>
                    </div>
                    <DeleteSettingButton keyName={s.key} />
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
