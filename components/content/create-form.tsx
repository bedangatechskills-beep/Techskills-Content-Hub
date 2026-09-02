"use client";

import { useActionState, useState } from "react";
import { createContent } from "@/lib/content/actions";
import type { ReferenceData } from "@/lib/content/queries";
import { PRIORITY_LABEL } from "@/lib/workflow/statuses";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { SubmitButton } from "@/components/forms/submit-button";
import { FormMessage } from "@/components/forms/form-message";
import { SelectField, selectClass } from "./select-field";

const MEDIUM_LABEL: Record<string, string> = {
  video: "Video",
  static: "Static",
  carousel: "Carousel",
  caption: "Caption / copy",
  thumbnail: "Thumbnail",
  story: "Story",
  one_off: "One-off",
};

export function CreateContentForm({ refData }: { refData: ReferenceData }) {
  const [state, action] = useActionState(createContent, null);
  const [region, setRegion] = useState<string>("");

  const campuses = refData.campuses.filter((c) => !region || c.region_code === region);
  const mediums = [...new Set(refData.contentTypes.map((t) => t.medium))];

  return (
    <form action={action} className="max-w-3xl space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Request</CardTitle>
          <CardDescription>Why this content is needed and where it will run.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="title">Title</Label>
            <Input id="title" name="title" required autoFocus />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" name="description" rows={3} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="request_type">Request type</Label>
            <Input
              id="request_type"
              name="request_type"
              placeholder="e.g. intake, event, student story"
            />
          </div>
          <SelectField
            id="requesting_team_key"
            name="requesting_team_key"
            label="Requesting team"
            options={refData.teams.map((t) => ({ value: t.key, label: t.name }))}
          />
          <SelectField
            id="program_id"
            name="program_id"
            label="Program"
            options={refData.programs.map((p) => ({ value: p.id, label: p.name }))}
          />
          <SelectField
            id="campaign_id"
            name="campaign_id"
            label="Campaign"
            options={refData.campaigns.map((c) => ({ value: c.id, label: c.name }))}
          />
          <div className="space-y-2">
            <Label htmlFor="region_code">Region</Label>
            <select
              id="region_code"
              name="region_code"
              required
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              className={selectClass}
            >
              <option value="" disabled>
                Choose a region
              </option>
              {refData.regions.map((r) => (
                <option key={r.code} value={r.code}>
                  {r.name} ({r.code})
                </option>
              ))}
            </select>
            <p className="text-muted-foreground text-xs">
              Drives the Content ID, handles, contacts and language checks.
            </p>
          </div>
          <SelectField
            id="campus_id"
            name="campus_id"
            label="Campus"
            options={campuses.map((c) => ({
              value: c.id,
              label: region ? c.name : `${c.region_code} · ${c.name}`,
            }))}
            help="Choose a Generic option when the piece is not campus-specific."
          />
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="content_type_id">Content type</Label>
            <select
              id="content_type_id"
              name="content_type_id"
              required
              defaultValue=""
              className={selectClass}
            >
              <option value="" disabled>
                Choose a content type
              </option>
              {mediums.map((m) => (
                <optgroup key={m} label={MEDIUM_LABEL[m] ?? m}>
                  {refData.contentTypes
                    .filter((t) => t.medium === m)
                    .map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                </optgroup>
              ))}
            </select>
            <p className="text-muted-foreground text-xs">
              Every piece must name a type so nothing skips the script gate. Pick One-off if nothing
              fits.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="priority">Priority</Label>
            <select id="priority" name="priority" defaultValue="normal" className={selectClass}>
              {Object.entries(PRIORITY_LABEL).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="target_publish_date">Target publish date</Label>
            <Input id="target_publish_date" name="target_publish_date" type="date" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="script_due">Script due</Label>
            <Input id="script_due" name="script_due" type="date" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="production_due">Production due</Label>
            <Input id="production_due" name="production_due" type="date" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="review_due">Review due</Label>
            <Input id="review_due" name="review_due" type="date" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Concept</CardTitle>
          <CardDescription>
            Optional now, required before the script gate. Everything here feeds the AI scores
            later.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <SelectField
            id="objective_id"
            name="objective_id"
            label="Primary objective"
            options={refData.objectives.map((o) => ({ value: o.id, label: o.name }))}
          />
          <SelectField
            id="secondary_objective_id"
            name="secondary_objective_id"
            label="Secondary objective"
            options={refData.objectives.map((o) => ({ value: o.id, label: o.name }))}
          />
          <SelectField
            id="pillar_id"
            name="pillar_id"
            label="Content pillar"
            options={refData.pillars.map((p) => ({ value: p.id, label: p.name }))}
          />
          <div className="space-y-2">
            <Label htmlFor="target_audience">Target audience</Label>
            <Input id="target_audience" name="target_audience" />
          </div>
          <fieldset className="space-y-2 sm:col-span-2">
            <legend className="text-sm font-medium">Platforms</legend>
            <div className="flex flex-wrap gap-4">
              {refData.platforms.map((p) => (
                <label key={p.id} className="flex items-center gap-2 text-sm">
                  <Checkbox name="platform_ids" value={p.id} /> {p.name}
                </label>
              ))}
            </div>
          </fieldset>
          <fieldset className="space-y-2 sm:col-span-2">
            <legend className="text-sm font-medium">Brand differentiators</legend>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {refData.differentiators.map((d) => (
                <label key={d.id} className="flex items-center gap-2 text-sm">
                  <Checkbox name="differentiator_ids" value={d.id} /> {d.name}
                </label>
              ))}
            </div>
          </fieldset>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="hook">Hook</Label>
            <Input id="hook" name="hook" />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="concept">Core concept</Label>
            <Textarea id="concept" name="concept" rows={3} />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="core_message">Core message</Label>
            <Textarea id="core_message" name="core_message" rows={2} />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="audience_takeaway">Audience takeaway</Label>
            <Input
              id="audience_takeaway"
              name="audience_takeaway"
              placeholder="What should the audience understand after seeing this?"
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="cta">Call to action</Label>
            <Input id="cta" name="cta" />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="creative_direction">Creative direction</Label>
            <Textarea id="creative_direction" name="creative_direction" rows={2} />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="reference_notes">Reference material and notes</Label>
            <Textarea id="reference_notes" name="reference_notes" rows={2} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Gates</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <label className="flex items-center gap-2 text-sm">
            <Checkbox name="requires_ai_disclosure" /> Will use AI imagery (disclosure confirmation
            required at publish)
          </label>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox name="content_review_required" /> Requires the optional human Content Review
            stage
          </label>
        </CardContent>
      </Card>

      <FormMessage state={state} />
      <SubmitButton pendingText="Creating…">Create request</SubmitButton>
    </form>
  );
}
