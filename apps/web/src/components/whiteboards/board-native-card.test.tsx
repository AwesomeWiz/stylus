import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, it, expect } from "vitest";
import { createLocalObject } from "@/modules/whiteboards/operations";
import {
  BoardEntityContext,
  BoardEntityTypesContext,
  createBoardEntityStore,
} from "./board-entity-store";
import { BoardNativeCard } from "./board-native-card";
import { BoardSearch } from "./board-search";
const org = crypto.randomUUID(),
  reference = {
    organizationId: org,
    entityId: crypto.randomUUID(),
    entityType: "core.task",
  };
const row = createLocalObject(
  "ENTITY_CARD",
  crypto.randomUUID(),
  org,
  crypto.randomUUID(),
  [],
  { x: 0, y: 0 },
  { content: { reference } },
);
afterEach(cleanup);
describe("native card projections", () => {
  it("humanizes enum status while retaining archived state and semantic canonical opener", () => {
    const store = createBoardEntityStore();
    store.set([
      {
        reference,
        status: "available",
        projection: {
          title: "Reviewed title",
          status: "IN_PROGRESS",
          archived: true,
          href: "/tasks?task=" + reference.entityId,
          details: [{ label: "Priority", value: "HIGH" }],
        },
      },
    ]);
    render(
      <BoardEntityContext.Provider value={store}>
        <BoardNativeCard row={row} />
      </BoardEntityContext.Provider>,
    );
    expect(screen.getByText("In progress")).toBeInTheDocument();
    expect(screen.getByText("Archived")).toBeInTheDocument();
    expect(screen.getByText("High")).toBeInTheDocument();
    expect(screen.queryByText("IN_PROGRESS")).toBeNull();
    expect(
      screen.getByRole("link", { name: /Open .*Reviewed title/ }),
    ).toHaveAttribute("href", "/tasks?task=" + reference.entityId);
  });
  it("purges privileged title and opener when access is unavailable, including Board search", () => {
    const store = createBoardEntityStore();
    store.set([
      {
        reference,
        status: "available",
        projection: {
          title: "Authorized title",
          archived: false,
          href: "/tasks?task=" + reference.entityId,
          details: [],
        },
      },
    ]);
    render(
      <BoardEntityContext.Provider value={store}>
        <BoardEntityTypesContext.Provider
          value={
            new Map([
              [
                "core.task",
                {
                  id: "core.task",
                  label: "Task",
                  icon: "task",
                  binding: "live",
                  routePrefix: "/tasks",
                  searchable: true,
                  creatable: false,
                },
              ],
            ])
          }
        >
          <BoardNativeCard row={row} />
          <BoardSearch rows={[row]} onLocate={() => {}}>
            <span>Layers</span>
          </BoardSearch>
        </BoardEntityTypesContext.Provider>
      </BoardEntityContext.Provider>,
    );
    expect(screen.getByText("Authorized title")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Open Task/ })).toHaveAttribute(
      "href",
      expect.stringContaining(reference.entityId),
    );
    act(() => store.set([{ reference, status: "unavailable" }]));
    expect(screen.queryByText("Authorized title")).not.toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(screen.getByText("Item unavailable")).toBeInTheDocument();
  });
  it("keeps stable per-reference snapshots for unrelated updates and stores no data in rows", () => {
    const store = createBoardEntityStore(),
      result = {
        reference,
        status: "available" as const,
        projection: {
          title: "Current",
          archived: false,
          href: "/tasks",
          details: [],
        },
      };
    store.set([result]);
    const old = [...store.snapshot().values()][0];
    store.set([structuredClone(result)]);
    expect([...store.snapshot().values()][0]).toBe(old);
    expect(row.content).toEqual({ reference });
    store.retain([reference], true);
    expect(store.snapshot().size).toBe(0);
  });
});
