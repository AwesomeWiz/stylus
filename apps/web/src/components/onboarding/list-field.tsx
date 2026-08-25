"use client";

import { Plus, X } from "lucide-react";
import { useId, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function ListField({
  description,
  initialValues = [],
  label,
  name,
  placeholder,
}: {
  description?: string;
  initialValues?: string[];
  label: string;
  name: string;
  placeholder: string;
}) {
  const generatedId = useId();
  const [items, setItems] = useState(() =>
    initialValues.length ? initialValues : [""],
  );

  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium">{label}</legend>
      {description ? (
        <p className="text-muted-foreground text-xs leading-5">{description}</p>
      ) : null}
      {items.map((item, index) => (
        <div className="flex gap-2" key={`${generatedId}-${index}`}>
          <Input
            aria-label={`${label} item ${index + 1}`}
            name={name}
            onChange={(event) =>
              setItems((current) =>
                current.map((value, itemIndex) =>
                  itemIndex === index ? event.target.value : value,
                ),
              )
            }
            placeholder={placeholder}
            value={item}
          />
          <Button
            aria-label={`Remove ${label.toLowerCase()} item ${index + 1}`}
            disabled={items.length === 1}
            onClick={() =>
              setItems((current) =>
                current.filter((_, itemIndex) => itemIndex !== index),
              )
            }
            size="icon"
            type="button"
            variant="ghost"
          >
            <X aria-hidden="true" className="size-4" />
          </Button>
        </div>
      ))}
      <Button
        onClick={() => setItems((current) => [...current, ""])}
        type="button"
        variant="secondary"
      >
        <Plus aria-hidden="true" className="size-4" /> Add item
      </Button>
    </fieldset>
  );
}
