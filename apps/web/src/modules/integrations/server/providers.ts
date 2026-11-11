import "server-only";
import type {
  ConnectionRow,
  IntegrationProvider,
  ResourceLocator,
  ResourcePage,
  ResourceProjection,
  SearchInput,
} from "@/core/integrations/public";
import { githubResolve, githubResolveBatch, githubSearch } from "./github";
import { googleResolve, googleResolveBatch, googleSearch } from "./google";
import { IntegrationError } from "./errors";

export interface IntegrationResourceAdapter {
  search(
    connection: ConnectionRow,
    token: string,
    input: SearchInput,
  ): Promise<ResourcePage>;
  resolve(
    connection: ConnectionRow,
    token: string,
    locator: ResourceLocator,
  ): Promise<ResourceProjection>;
  resolveMany(
    connection: ConnectionRow,
    token: string,
    locators: ResourceLocator[],
  ): Promise<(ResourceProjection | IntegrationError)[]>;
}
function githubLocator(value: ResourceLocator) {
  if (value.provider !== "github") throw new IntegrationError("denied");
  return value;
}
function googleLocator(value: ResourceLocator) {
  if (value.provider === "github") throw new IntegrationError("denied");
  return value;
}
const google: IntegrationResourceAdapter = {
  search: (connection, token, input) => {
    if (connection.provider === "github") throw new IntegrationError("denied");
    return googleSearch(connection.provider, token, input);
  },
  resolve: (_, token, locator) => googleResolve(token, googleLocator(locator)),
  resolveMany: (_, token, locators) =>
    googleResolveBatch(token, locators.map(googleLocator)),
};
/** Static trusted adapters, never browser-registered URLs or executable content. */
export const resourceAdapters: Readonly<
  Record<IntegrationProvider, IntegrationResourceAdapter>
> = Object.freeze({
  github: {
    search: githubSearch,
    resolve: (connection, token, locator) =>
      githubResolve(connection, token, githubLocator(locator)),
    resolveMany: (connection, token, locators) =>
      githubResolveBatch(connection, token, locators.map(githubLocator)),
  },
  "google-drive": google,
  "google-calendar": google,
});
