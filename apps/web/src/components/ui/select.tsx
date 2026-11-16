"use client";
import {
  Children,
  isValidElement,
  useId,
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type SelectHTMLAttributes,
} from "react";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Popover, usePopup, moveOptionFocus } from "./popover";

type Option = {
  value: string;
  label: ReactNode;
  text: string;
  disabled: boolean;
  group?: string;
};
function optionsOf(
  children: ReactNode,
  group?: string,
  groupDisabled = false,
): Option[] {
  return Children.toArray(children).flatMap((child) => {
    if (
      !isValidElement<{
        value?: string | number;
        children?: ReactNode;
        disabled?: boolean;
        label?: string;
      }>(child)
    )
      return [];
    if (child.type === "option") {
      const text = Children.toArray(child.props.children).join("");
      return [
        {
          value: String(child.props.value ?? text),
          label: child.props.children,
          text,
          disabled: groupDisabled || !!child.props.disabled,
          group,
        },
      ];
    }
    return optionsOf(
      child.props.children,
      child.type === "optgroup" ? child.props.label : group,
      groupDisabled || !!child.props.disabled,
    );
  });
}

/** Styled selection with the same options, form payload and change events as select. */
export function Select({
  children,
  value,
  defaultValue,
  onChange,
  className,
  id: suppliedId,
  disabled,
  required,
  name,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  const generated = useId(),
    id = suppliedId ?? generated,
    options = optionsOf(children);
  const initial = String(
    defaultValue ?? options.find((o) => !o.disabled)?.value ?? "",
  );
  const [local, setLocal] = useState(initial);
  const [popupWidth, setPopupWidth] = useState(240);
  const current = String(value ?? local),
    native = useRef<HTMLSelectElement>(null);
  const { anchor, host, open, setOpen } = usePopup<HTMLButtonElement>();
  const selected = options.find((o) => o.value === current);
  useEffect(() => {
    const form = native.current?.form;
    if (!form || value !== undefined) return;
    const reset = () => setLocal(initial);
    form.addEventListener("reset", reset);
    return () => form.removeEventListener("reset", reset);
  }, [value, initial]);
  function close(restore: boolean) {
    setOpen(false);
    if (restore) anchor.current?.focus({ preventScroll: true });
  }
  function choose(next: string) {
    const element = native.current;
    if (!element) return;
    element.value = next;
    element.dispatchEvent(new Event("change", { bubbles: true }));
    close(true);
  }
  return (
    <>
      <button
        ref={anchor}
        id={id}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open && !disabled}
        aria-controls={id + "-options"}
        aria-label={props["aria-label"]}
        aria-labelledby={props["aria-labelledby"]}
        aria-describedby={props["aria-describedby"]}
        aria-invalid={props["aria-invalid"]}
        aria-required={required || props["aria-required"]}
        disabled={disabled}
        className={cn(
          "border-input bg-background text-foreground focus-visible:border-ring focus-visible:ring-ring/30 hover:bg-muted/40 flex min-h-11 w-full min-w-0 items-center justify-between gap-3 rounded-md border py-2 pr-3 pl-3 text-left text-sm focus-visible:ring-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        onClick={(e) => {
          setPopupWidth(
            Math.max(240, e.currentTarget.getBoundingClientRect().width),
          );
          setOpen(!open);
        }}
        onKeyDown={(e) => {
          if (["ArrowDown", "ArrowUp", "Home", "End"].includes(e.key)) {
            e.preventDefault();
            setPopupWidth(
              Math.max(240, e.currentTarget.getBoundingClientRect().width),
            );
            setOpen(true);
          }
        }}
      >
        <span className="min-w-0 truncate">{selected?.label ?? current}</span>
        <ChevronDown aria-hidden className="size-4 shrink-0" />
      </button>
      <select
        {...props}
        id={undefined}
        ref={native}
        name={name}
        hidden
        aria-hidden="true"
        aria-label={undefined}
        aria-labelledby={undefined}
        tabIndex={-1}
        disabled={disabled}
        required={required}
        value={current}
        onChange={(e) => {
          setLocal(e.currentTarget.value);
          onChange?.(e);
        }}
        onInvalid={(e) => {
          e.preventDefault();
          anchor.current?.focus();
        }}
        onFocus={() => anchor.current?.focus()}
      >
        {children}
      </select>
      <Popover
        open={open && !disabled}
        host={host}
        onClose={close}
        anchor={anchor}
        id={id + "-options"}
        label={props["aria-label"] ?? "Choose an option"}
        role="listbox"
        width={popupWidth}
        maxHeight={320}
      >
        <div
          onKeyDown={(e) => {
            moveOptionFocus(e);
            if (
              e.key.length === 1 &&
              e.key !== " " &&
              !e.ctrlKey &&
              !e.metaKey
            ) {
              const match = options.find(
                (o) =>
                  !o.disabled &&
                  o.text
                    .toLocaleLowerCase()
                    .startsWith(e.key.toLocaleLowerCase()),
              );
              if (match)
                document
                  .getElementById(id + "-option-" + options.indexOf(match))
                  ?.focus();
            }
          }}
        >
          {options.map((option, index) => (
            <div key={option.value}>
              {option.group && option.group !== options[index - 1]?.group ? (
                <p className="text-muted-foreground px-3 pt-3 pb-1 text-xs">
                  {option.group}
                </p>
              ) : null}
              <button
                type="button"
                id={id + "-option-" + index}
                role="option"
                tabIndex={-1}
                disabled={option.disabled}
                aria-selected={current === option.value}
                data-autofocus={
                  current === option.value && !option.disabled
                    ? "true"
                    : undefined
                }
                className="hover:bg-muted focus:bg-muted aria-selected:bg-accent/60 flex min-h-11 w-full items-center justify-between gap-3 rounded px-3 py-2 text-left text-sm break-words outline-offset-[-2px] disabled:cursor-not-allowed disabled:opacity-50"
                onClick={() => choose(option.value)}
              >
                <span className="min-w-0 [overflow-wrap:anywhere]">
                  {option.label}
                </span>
                {current === option.value ? (
                  <Check aria-hidden className="size-4 shrink-0" />
                ) : null}
              </button>
            </div>
          ))}
        </div>
      </Popover>
    </>
  );
}
