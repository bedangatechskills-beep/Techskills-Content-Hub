"use client";

import { useActionState } from "react";
import { updateContentForm } from "@/lib/content/actions";
import type { ContentDetail, ReferenceData } from "@/lib/content/queries";
import { PRIORITY_LABEL } from "@/lib/workflow/statuses";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { SubmitButton } from "@/components/forms/submit-button";
import { FormMessage } from "@/components/forms/form-message";
import { SelectField, selectClass } from "./select-field";

interface Perms {
  canEditConcept: boolean;
  canAssignProduction: boolean;
}

interface Props {
  detail: ContentDetail;
  refData: ReferenceData;
  perms: Perms;
}

function Hidden({ detail, section }: { detail: ContentDetail; section: string }) {
  return (
    <>
      <input type="hidden" name="content_id" value={detail.record.id} />
      <input type="hidden" name="content_code" value={detail.record.content_id} />
      <input type="hidden" name="_section" value={section} />
    </>
  );
}

function ReadOnlyNote({ children }: { children: React.ReactNode }) {
  return <p className="text-muted-foreground text-xs">{children}</p>;
}

export function RequestForm({ detail, refData, perms }: Props) {
  const [state, action] = useActionState(updateContentForm, null);
  const r = detail.record;
  const ro = !perms.canEditConcept;
  return (
    <Card>
      <CardHeader>
        <CardTitle>Request</CardTitle>
        <CardDescription>Title, classification, priority and dates.</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={action} className="grid gap-4 sm:grid-cols-2">
          <Hidden detail={detail} section="request" />
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="title">Title</Label>
            <Input id="title" name="title" defaultValue={r.title} required disabled={ro} />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              name="description"
              defaultValue={r.description ?? ""}
              rows={3}
              disabled={ro}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="request_type">Request type</Label>
            <Input
              id="request_type"
              name="request_type"
              defaultValue={r.request_type ?? ""}
              disabled={ro}
            />
          </div>
          <SelectField
            id="program_id"
            name="program_id"
            label="Program"
            defaultValue={r.program_id}
            disabled={ro}
            options={refData.programs.map((p) => ({ value: p.id, label: p.name }))}
          />
          <SelectField
            id="campaign_id"
            name="campaign_id"
            label="Campaign"
            defaultValue={r.campaign_id}
            disabled={ro}
            options={refData.campaigns.map((c) => ({ value: c.id, label: c.name }))}
          />
          <SelectField
            id="campus_id"
            name="campus_id"
            label={`Campus (${r.region_code})`}
            defaultValue={r.campus_id}
            disabled={ro}
            options={refData.campuses
              .filter((c) => c.region_code === r.region_code)
              .map((c) => ({ value: c.id, label: c.name }))}
          />
          <SelectField
            id="content_type_id"
            name="content_type_id"
            label="Content type"
            defaultValue={r.content_type_id}
            required
            disabled={ro}
            options={refData.contentTypes.map((t) => ({ value: t.id, label: t.name }))}
          />
          <div className="space-y-2">
            <Label htmlFor="priority">Priority</Label>
            <select
              id="priority"
              name="priority"
              defaultValue={r.priority}
              className={selectClass}
              disabled={ro}
            >
              {Object.entries(PRIORITY_LABEL).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="target_publish_date">Target publish date</Label>
            <Input
              id="target_publish_date"
              name="target_publish_date"
              type="date"
              defaultValue={r.target_publish_date ?? ""}
              disabled={ro}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="script_due">Script due</Label>
            <Input
              id="script_due"
              name="script_due"
              type="date"
              defaultValue={r.script_due ?? ""}
              disabled={ro}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="review_due">Review due</Label>
            <Input
              id="review_due"
              name="review_due"
              type="date"
              defaultValue={r.review_due ?? ""}
              disabled={ro}
            />
          </div>
          <div className="space-y-3 sm:col-span-2">
            <FormMessage state={state} />
            {ro ? (
              <ReadOnlyNote>
                Editing request fields needs the concept permission (DM or Production Manager).
              </ReadOnlyNote>
            ) : (
              <SubmitButton pendingText="Saving…">Save request</SubmitButton>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

export function ConceptForm({ detail, refData, perms }: Props) {
  const [state, action] = useActionState(updateContentForm, null);
  const r = detail.record;
  const ro = !perms.canEditConcept;
  const platformSet = new Set(detail.platformIds);
  const diffSet = new Set(detail.differentiatorIds);
  return (
    <Card>
      <CardHeader>
        <CardTitle>Idea &amp; concept</CardTitle>
        <CardDescription>
          Objective, audience, hook, message and CTA. The AI script score and the final approval
          screen read these.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={action} className="grid gap-4 sm:grid-cols-2">
          <Hidden detail={detail} section="concept" />
          <SelectField
            id="objective_id"
            name="objective_id"
            label="Primary objective"
            defaultValue={r.objective_id}
            disabled={ro}
            options={refData.objectives.map((o) => ({ value: o.id, label: o.name }))}
          />
          <SelectField
            id="secondary_objective_id"
            name="secondary_objective_id"
            label="Secondary objective"
            defaultValue={r.secondary_objective_id}
            disabled={ro}
            options={refData.objectives.map((o) => ({ value: o.id, label: o.name }))}
          />
          <SelectField
            id="pillar_id"
            name="pillar_id"
            label="Content pillar"
            defaultValue={r.pillar_id}
            disabled={ro}
            options={refData.pillars.map((p) => ({ value: p.id, label: p.name }))}
          />
          <div className="space-y-2">
            <Label htmlFor="target_audience">Target audience</Label>
            <Input
              id="target_audience"
              name="target_audience"
              defaultValue={r.target_audience ?? ""}
              disabled={ro}
            />
          </div>
          <fieldset className="space-y-2 sm:col-span-2" disabled={ro}>
            <legend className="text-sm font-medium">Platforms</legend>
            <div className="flex flex-wrap gap-4">
              {refData.platforms.map((p) => (
                <label key={p.id} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    name="platform_ids"
                    value={p.id}
                    defaultChecked={platformSet.has(p.id)}
                    disabled={ro}
                  />{" "}
                  {p.name}
                </label>
              ))}
            </div>
          </fieldset>
          <fieldset className="space-y-2 sm:col-span-2" disabled={ro}>
            <legend className="text-sm font-medium">Brand differentiators</legend>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {refData.differentiators.map((d) => (
                <label key={d.id} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    name="differentiator_ids"
                    value={d.id}
                    defaultChecked={diffSet.has(d.id)}
                    disabled={ro}
                  />{" "}
                  {d.name}
                </label>
              ))}
            </div>
          </fieldset>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="hook">Hook</Label>
            <Input id="hook" name="hook" defaultValue={r.hook ?? ""} disabled={ro} />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="concept">Core concept</Label>
            <Textarea
              id="concept"
              name="concept"
              defaultValue={r.concept ?? ""}
              rows={3}
              disabled={ro}
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="core_message">Core message</Label>
            <Textarea
              id="core_message"
              name="core_message"
              defaultValue={r.core_message ?? ""}
              rows={2}
              disabled={ro}
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="audience_takeaway">Audience takeaway</Label>
            <Input
              id="audience_takeaway"
              name="audience_takeaway"
              defaultValue={r.audience_takeaway ?? ""}
              disabled={ro}
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="cta">Call to action</Label>
            <Input id="cta" name="cta" defaultValue={r.cta ?? ""} disabled={ro} />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="creative_direction">Creative direction</Label>
            <Textarea
              id="creative_direction"
              name="creative_direction"
              defaultValue={r.creative_direction ?? ""}
              rows={2}
              disabled={ro}
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="reference_notes">Reference material and notes</Label>
            <Textarea
              id="reference_notes"
              name="reference_notes"
              defaultValue={r.reference_notes ?? ""}
              rows={2}
              disabled={ro}
            />
          </div>
          <div className="space-y-3 sm:col-span-2">
            <FormMessage state={state} />
            {ro ? (
              <ReadOnlyNote>
                Concept fields are edited by the DM Team and the Production Manager.
              </ReadOnlyNote>
            ) : (
              <SubmitButton pendingText="Saving…">Save concept</SubmitButton>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

export function ProductionForm({ detail, refData, perms }: Props) {
  const [state, action] = useActionState(updateContentForm, null);
  const r = detail.record;
  const ro = !perms.canAssignProduction;
  const people = refData.people.map((p) => ({ value: p.id, label: p.full_name }));
  return (
    <Card>
      <CardHeader>
        <CardTitle>Owners &amp; production</CardTitle>
        <CardDescription>
          Who owns the piece and where the working files live. Assignment is logged and notifies the
          assignee.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={action} className="grid gap-4 sm:grid-cols-2">
          <Hidden detail={detail} section="production" />
          <SelectField
            id="dm_owner_id"
            name="dm_owner_id"
            label="DM owner"
            defaultValue={r.dm_owner_id}
            disabled={ro}
            options={people}
            placeholder="Unassigned"
          />
          <SelectField
            id="production_manager_id"
            name="production_manager_id"
            label="Production manager"
            defaultValue={r.production_manager_id}
            disabled={ro}
            options={people}
            placeholder="Unassigned"
          />
          <SelectField
            id="production_assignee_id"
            name="production_assignee_id"
            label="Production assignee"
            defaultValue={r.production_assignee_id}
            disabled={ro}
            options={people}
            placeholder="Unassigned"
          />
          <div className="space-y-2">
            <Label htmlFor="production_due">Production due</Label>
            <Input
              id="production_due"
              name="production_due"
              type="date"
              defaultValue={r.production_due ?? ""}
              disabled={ro}
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="production_folder_url">Production folder URL</Label>
            <Input
              id="production_folder_url"
              name="production_folder_url"
              type="url"
              placeholder="https://…"
              defaultValue={r.production_folder_url ?? ""}
              disabled={ro}
            />
            <p className="text-muted-foreground text-xs">
              SharePoint or Drive. The folder should be named after the Content ID.
            </p>
          </div>
          <div className="space-y-3 sm:col-span-2">
            <FormMessage state={state} />
            {ro ? (
              <ReadOnlyNote>
                Assignment needs the production permission (Production Manager) or DM concept
                rights.
              </ReadOnlyNote>
            ) : (
              <SubmitButton pendingText="Saving…">Save owners</SubmitButton>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

export function SettingsForm({ detail, perms }: Omit<Props, "refData">) {
  const [state, action] = useActionState(updateContentForm, null);
  const r = detail.record;
  const ro = !perms.canEditConcept;
  return (
    <Card>
      <CardHeader>
        <CardTitle>Gate settings</CardTitle>
        <CardDescription>Which optional checks apply to this piece.</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={action} className="space-y-4">
          <Hidden detail={detail} section="settings" />
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              name="requires_ai_disclosure"
              defaultChecked={r.requires_ai_disclosure}
              disabled={ro}
            />{" "}
            Uses AI imagery (disclosure confirmation required at publish)
          </label>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              name="content_review_required"
              defaultChecked={r.content_review_required}
              disabled={ro}
            />{" "}
            Requires the optional Content Review stage
          </label>
          <div className="max-w-xs space-y-2">
            <Label htmlFor="min_reviewer_responses">Minimum reviewer responses</Label>
            <Input
              id="min_reviewer_responses"
              name="min_reviewer_responses"
              type="number"
              min={1}
              max={10}
              defaultValue={r.min_reviewer_responses}
              disabled={ro}
            />
          </div>
          <FormMessage state={state} />
          {ro ? (
            <ReadOnlyNote>Gate settings are edited by the DM Team.</ReadOnlyNote>
          ) : (
            <SubmitButton pendingText="Saving…">Save settings</SubmitButton>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
