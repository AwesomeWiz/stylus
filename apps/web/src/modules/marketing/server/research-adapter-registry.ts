import "server-only";

import type {
  ResearchAdapterContext,
  ResearchSourceAdapter,
} from "./research-sources";
import { createHackerNewsAdapter } from "./hacker-news-adapter";
import { createRssAtomAdapter } from "./rss-atom-adapter";

export class ResearchSourceAdapterRegistry {
  readonly #adapters = new Map<string, ResearchSourceAdapter<unknown>>();

  constructor(adapters: ResearchSourceAdapter<unknown>[]) {
    adapters.forEach((adapter) => {
      if (this.#adapters.has(adapter.id))
        throw new Error(`Duplicate research adapter: ${adapter.id}`);
      this.#adapters.set(adapter.id, adapter);
    });
  }

  get(id: string) {
    return this.#adapters.get(id);
  }

  list() {
    return [...this.#adapters.values()];
  }

  retrieve(id: string, request: unknown, context: ResearchAdapterContext) {
    const adapter = this.#adapters.get(id);
    if (!adapter) throw new Error("Unknown research adapter");
    return adapter.retrieve(adapter.requestSchema.parse(request), context);
  }
}

export const researchSourceAdapterRegistry = new ResearchSourceAdapterRegistry([
  createHackerNewsAdapter() as ResearchSourceAdapter<unknown>,
  createRssAtomAdapter() as ResearchSourceAdapter<unknown>,
]);
