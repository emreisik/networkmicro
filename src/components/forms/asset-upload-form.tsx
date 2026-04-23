"use client";

import { useRef, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  uploadCampaignAssetAction,
  deleteCampaignAssetAction,
} from "@/app/(admin)/admin/campaigns/actions";

export function AssetUploadForm({ campaignId }: { campaignId: string }) {
  const [pending, startTransition] = useTransition();
  const ref = useRef<HTMLFormElement>(null);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    fd.set("campaignId", campaignId);
    startTransition(async () => {
      const res = await uploadCampaignAssetAction(fd);
      if (res.ok) {
        toast.success("Asset added.");
        form.reset();
      } else if (res.error) {
        toast.error(res.error);
      }
    });
  }

  return (
    <form ref={ref} onSubmit={onSubmit} className="grid gap-3 md:grid-cols-2">
      <div className="flex flex-col gap-1.5 md:col-span-2">
        <Label htmlFor="file">File (JPG, PNG, WebP — max 8 MB)</Label>
        <Input
          id="file"
          name="file"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          required
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="title">Title</Label>
        <Input id="title" name="title" />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="linkUrl">Link URL</Label>
        <Input id="linkUrl" name="linkUrl" type="url" />
      </div>
      <div className="flex flex-col gap-1.5 md:col-span-2">
        <Label htmlFor="caption">Caption</Label>
        <Textarea id="caption" name="caption" rows={2} />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="hashtags">Hashtags</Label>
        <Input id="hashtags" name="hashtags" placeholder="#brand #campaign" />
      </div>
      <div className="flex flex-col gap-1.5 md:col-span-2">
        <Label htmlFor="instructions">Instructions</Label>
        <Textarea id="instructions" name="instructions" rows={2} />
      </div>
      <div className="md:col-span-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Uploading…" : "Add asset"}
        </Button>
      </div>
    </form>
  );
}

export function DeleteAssetButton({ assetId }: { assetId: string }) {
  const [pending, start] = useTransition();
  return (
    <Button
      variant="ghost"
      size="xs"
      className="text-destructive hover:text-destructive"
      onClick={() => {
        start(async () => {
          const res = await deleteCampaignAssetAction(assetId);
          if (res.ok) toast.success("Removed.");
          else if (res.error) toast.error(res.error);
        });
      }}
      disabled={pending}
    >
      Remove
    </Button>
  );
}
