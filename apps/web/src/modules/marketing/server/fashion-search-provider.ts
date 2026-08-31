import "server-only";

export type FashionSearchCandidate = {
  sourceId: string;
  title: string | null;
  url: string;
};

export interface FashionSearchProvider {
  readonly id: string;
  search(input: {
    allowedDomains: string[];
    maximum: number;
    queryTerms: string[];
    signal: AbortSignal;
  }): Promise<FashionSearchCandidate[]>;
}

// TASK-017C defines the narrow boundary but does not introduce a mandatory
// paid search integration. Known-source RSS retrieval remains functional.
export function getFashionSearchProvider(): FashionSearchProvider | null {
  return null;
}
