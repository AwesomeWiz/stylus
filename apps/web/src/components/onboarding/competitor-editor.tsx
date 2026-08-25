"use client";

import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type {
  CompetitorRow,
  CompetitorType,
} from "@/lib/supabase/database.types";

import { FormField, Select } from "./form-field";

type EditableCompetitor = Pick<
  CompetitorRow,
  | "id"
  | "instagram"
  | "name"
  | "relevance"
  | "short_description"
  | "type"
  | "website"
>;

const emptyCompetitor = (): EditableCompetitor => ({
  id: crypto.randomUUID(),
  instagram: "",
  name: "",
  relevance: "",
  short_description: "",
  type: "DIRECT",
  website: "",
});

export function CompetitorEditor({
  initialCompetitors,
}: {
  initialCompetitors: EditableCompetitor[];
}) {
  const [competitors, setCompetitors] = useState(initialCompetitors);
  const update = (
    index: number,
    field: keyof EditableCompetitor,
    value: string,
  ) =>
    setCompetitors((current) =>
      current.map((competitor, itemIndex) =>
        itemIndex === index ? { ...competitor, [field]: value } : competitor,
      ),
    );

  return (
    <div className="space-y-5">
      <input
        name="competitors"
        type="hidden"
        value={JSON.stringify(
          competitors.map((competitor) => ({
            id: initialCompetitors.some(({ id }) => id === competitor.id)
              ? competitor.id
              : undefined,
            instagram: competitor.instagram ?? "",
            name: competitor.name,
            relevance: competitor.relevance ?? "",
            shortDescription: competitor.short_description ?? "",
            type: competitor.type,
            website: competitor.website ?? "",
          })),
        )}
      />
      {competitors.length === 0 ? (
        <div className="border-border bg-muted/40 rounded-md border border-dashed px-4 py-6 text-center">
          <p className="text-sm font-medium">No competitors added</p>
          <p className="text-muted-foreground mt-1 text-xs">
            That is perfectly valid for an early-stage startup.
          </p>
        </div>
      ) : null}
      {competitors.map((competitor, index) => (
        <section
          className="border-border space-y-4 border-b pb-5"
          key={competitor.id}
        >
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Competitor {index + 1}</h3>
            <Button
              aria-label={`Remove competitor ${index + 1}`}
              onClick={() =>
                setCompetitors((current) =>
                  current.filter((_, itemIndex) => itemIndex !== index),
                )
              }
              size="icon"
              type="button"
              variant="ghost"
            >
              <Trash2 aria-hidden="true" className="size-4" />
            </Button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Name" name={`competitor-name-${index}`} required>
              <Input
                id={`competitor-name-${index}`}
                onChange={(event) => update(index, "name", event.target.value)}
                value={competitor.name}
              />
            </FormField>
            <FormField label="Type" name={`competitor-type-${index}`} required>
              <Select
                id={`competitor-type-${index}`}
                onChange={(event) =>
                  update(index, "type", event.target.value as CompetitorType)
                }
                value={competitor.type}
              >
                <option value="DIRECT">Direct</option>
                <option value="INDIRECT">Indirect</option>
                <option value="ALTERNATIVE">Alternative</option>
                <option value="INSPIRATION">Inspiration</option>
              </Select>
            </FormField>
            <FormField label="Website" name={`competitor-website-${index}`}>
              <Input
                id={`competitor-website-${index}`}
                onChange={(event) =>
                  update(index, "website", event.target.value)
                }
                type="url"
                value={competitor.website ?? ""}
              />
            </FormField>
            <FormField label="Instagram" name={`competitor-instagram-${index}`}>
              <Input
                id={`competitor-instagram-${index}`}
                onChange={(event) =>
                  update(index, "instagram", event.target.value)
                }
                value={competitor.instagram ?? ""}
              />
            </FormField>
          </div>
          <FormField
            label="Short description"
            name={`competitor-description-${index}`}
          >
            <Input
              id={`competitor-description-${index}`}
              onChange={(event) =>
                update(index, "short_description", event.target.value)
              }
              value={competitor.short_description ?? ""}
            />
          </FormField>
          <FormField
            label="Why they are relevant"
            name={`competitor-relevance-${index}`}
          >
            <Input
              id={`competitor-relevance-${index}`}
              onChange={(event) =>
                update(index, "relevance", event.target.value)
              }
              value={competitor.relevance ?? ""}
            />
          </FormField>
        </section>
      ))}
      <Button
        onClick={() =>
          setCompetitors((current) => [...current, emptyCompetitor()])
        }
        type="button"
        variant="secondary"
      >
        <Plus aria-hidden="true" className="size-4" /> Add competitor
      </Button>
    </div>
  );
}
