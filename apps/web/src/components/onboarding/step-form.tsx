"use client";
import { ArrowLeft, ArrowRight } from "lucide-react";
import type { Route } from "next";
import { z } from "zod";
import { parseOnboardingFields } from "@/modules/onboarding/form-values";
import { useRouter } from "next/navigation";
import {
  startTransition,
  useActionState,
  useEffect,
  useRef,
  useState,
} from "react";
import { StepFields, type StepData } from "./step-fields";
import { Button } from "@/components/ui/button";
import {
  saveOnboardingStepAction,
  resolveOnboardingDraftAction,
} from "@/modules/onboarding/actions";
import { initialOnboardingActionState } from "@/modules/onboarding/schemas";
import {
  getOnboardingPath,
  getOnboardingStep,
  type OnboardingStepSlug,
} from "@/modules/onboarding/steps";
import type { OnboardingDraft } from "@/modules/onboarding/drafts";
import {
  OnboardingDraftContext,
  OnboardingErrorsContext,
} from "./draft-context";
import { OnboardingLink } from "./navigation";
import { useDraftSave } from "./use-draft-save";
export function OnboardingStepForm({
  data,
  editing,
  step,
  draft,
  organizationId,
  returnToReview = false,
}: {
  data: StepData;
  editing: boolean;
  step: OnboardingStepSlug;
  draft: OnboardingDraft;
  organizationId: string;
  returnToReview?: boolean;
}) {
  const [state, dispatch, pending] = useActionState(
      saveOnboardingStepAction,
      initialOnboardingActionState,
    ),
    form = useRef<HTMLFormElement>(null),
    [submitting, setSubmitting] = useState(false),
    [resolutionError, setResolutionError] = useState(""),
    router = useRouter(),
    save = useDraftSave({ form, organizationId, step, draft }),
    current = getOnboardingStep(step)!;
  const [localErrors, setLocalErrors] = useState<Record<string, string[]>>();
  const errors = localErrors ?? state.fieldErrors;
  const backHref = returnToReview
    ? "/onboarding/review?edit=1"
    : current.number > 1
      ? getOnboardingPath(current.number - 1) + (editing ? "?edit=1" : "")
      : editing
        ? "/company/profile"
        : "/organization/new";
  useEffect(() => {
    if (state.status === "error" || localErrors) {
      form.current?.querySelector<HTMLElement>("[aria-invalid=true]")?.focus();
    }
  }, [state, localErrors]);
  async function resolve(keep: boolean) {
    setSubmitting(true);
    setResolutionError("");
    try {
      const result = await resolveOnboardingDraftAction({
        organizationId,
        step,
        revision: draft.updated_at,
        keep,
      });
      if (result.status !== "success") {
        setResolutionError(
          result.message ?? "The draft could not be resolved.",
        );
        return;
      }
      router.refresh();
    } catch {
      setResolutionError(
        "The response was interrupted. Reload to review your saved draft.",
      );
    } finally {
      setSubmitting(false);
    }
  }
  return (
    <OnboardingDraftContext value={draft.updated_at ? draft.fields : undefined}>
      <form
        ref={form}
        className="space-y-6 [&_button]:min-h-11 [&_button]:min-w-11 [&_input:not([type=checkbox])]:min-h-11 [&_select]:min-h-11"
        noValidate
        onChangeCapture={save.changed}
        onClickCapture={(event) => {
          if (
            (event.target as HTMLElement).closest("[data-draft-fields] button")
          )
            save.changed();
        }}
        onSubmit={async (event) => {
          event.preventDefault();
          if (submitting || pending || draft.conflicted) return;
          try {
            parseOnboardingFields(step, new FormData(form.current!));
            setLocalErrors(undefined);
          } catch (error) {
            if (error instanceof z.ZodError) {
              const fields: Record<string, string[]> = {};
              for (const issue of error.issues)
                (fields[String(issue.path[0] ?? "form")] ??= []).push(
                  issue.message,
                );
              setLocalErrors(fields);
            } else
              setLocalErrors({ competitors: ["Check the competitor fields."] });
            return;
          }
          setSubmitting(true);
          const ok = await save.flush();
          if (!ok) {
            setSubmitting(false);
            return;
          }
          const fields = new FormData(form.current!);
          fields.set("baseRevision", save.base.current ?? "");
          fields.set("draftRevision", save.revision.current ?? "");
          save.markCommitted();
          startTransition(() => dispatch(fields));
          setSubmitting(false);
        }}
      >
        <input type="hidden" name="step" value={step} />
        <input
          type="hidden"
          name="mode"
          value={editing ? "edit" : "onboarding"}
        />
        <input
          type="hidden"
          name="returnTo"
          value={returnToReview ? "review" : ""}
        />
        <input type="hidden" name="organizationId" value={organizationId} />
        <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-3">
          <p
            role="status"
            aria-live="polite"
            className="text-muted-foreground text-xs"
          >
            {save.status === "saving"
              ? "Saving draft…"
              : save.status === "saved"
                ? "Draft saved · Continue confirms this step"
                : save.status === "unsaved"
                  ? "Unsaved changes"
                  : save.status === "error"
                    ? "Draft not confirmed"
                    : save.status === "conflict"
                      ? "Company profile changed since this draft"
                      : "Progress saves as you edit"}
          </p>
          {save.status === "error" ? (
            <Button variant="secondary" onClick={() => void save.flush()}>
              Retry draft save
            </Button>
          ) : null}
        </div>
        {save.message ? (
          <p role="alert" className="text-sm">
            {save.message}
          </p>
        ) : null}
        {draft.conflicted ? (
          <section
            aria-label="Resolve saved draft"
            className="space-y-3 rounded-md border p-4"
          >
            <p className="text-sm">
              Another edit changed the Company Profile. Review your saved draft
              below, then choose which version to continue with.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button disabled={submitting} onClick={() => void resolve(true)}>
                Keep this draft
              </Button>
              <Button
                disabled={submitting}
                variant="secondary"
                onClick={() => void resolve(false)}
              >
                Use current profile
              </Button>
            </div>
            {resolutionError ? <p role="alert">{resolutionError}</p> : null}
          </section>
        ) : null}
        {state.message ? (
          <p role="alert" className="text-destructive text-sm">
            {state.message}
          </p>
        ) : errors ? (
          <p role="alert" className="text-destructive text-sm">
            Review the highlighted fields.
          </p>
        ) : null}
        <fieldset
          data-draft-fields
          disabled={pending || draft.conflicted}
          className="min-w-0"
        >
          <OnboardingErrorsContext value={errors}>
            <StepFields data={data} errors={errors} step={step} />
          </OnboardingErrorsContext>
        </fieldset>
        {step === "competitors" ? (
          <p className="text-muted-foreground text-sm">
            No competitors known? Keep the list empty and Continue to skip for
            now.
          </p>
        ) : null}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-5">
          {current.number > 1 || editing ? (
            <OnboardingLink
              className="text-muted-foreground inline-flex min-h-11 items-center gap-2 px-2 text-sm underline"
              href={backHref as Route}
            >
              <ArrowLeft aria-hidden="true" className="size-4" />
              Back
            </OnboardingLink>
          ) : (
            <span />
          )}
          <Button
            type="submit"
            disabled={submitting || pending || draft.conflicted}
          >
            {pending || submitting
              ? "Saving…"
              : returnToReview
                ? "Save and return to Review"
                : editing
                  ? "Save changes"
                  : "Continue"}
            <ArrowRight aria-hidden="true" className="size-4" />
          </Button>
        </div>
      </form>
    </OnboardingDraftContext>
  );
}
