import "server-only";
import { createSign } from "node:crypto";
import { z } from "zod";
import type {
  ConnectionRow,
  RepositoryChoice,
  ResourceLocator,
  ResourcePage,
  ResourceProjection,
  SearchInput,
} from "@/core/integrations/public";
import { requireConfigured } from "./config";
import { IntegrationError } from "./errors";
import { bearer, providerRequest } from "./http";

const id = z.number().int().positive();
const repoSchema = z.object({
  id,
  full_name: z.string().regex(/^[\w.-]+\/[\w.-]+$/),
});
const installationSchema = z.object({
  id,
  app_id: id,
  account: z.object({ login: z.string().max(160) }),
  suspended_at: z.string().nullable().optional(),
});
export async function githubRequest(
  token: string,
  path: string,
  init: RequestInit = {},
) {
  const result = await providerRequest(`https://api.github.com${path}`, {
    ...init,
    headers: {
      ...bearer(token),
      "X-GitHub-Api-Version": "2026-03-10",
      ...init.headers,
    },
  });
  if (path === "/graphql") {
    const value = z
      .object({
        errors: z
          .array(
            z.object({
              type: z.string().max(80).optional(),
              extensions: z
                .object({ code: z.string().max(80).optional() })
                .optional(),
            }),
          )
          .max(30)
          .optional(),
      })
      .parse(result);
    const codes = value.errors?.map((e) => e.type ?? e.extensions?.code) ?? [];
    if (codes.includes("RATE_LIMITED"))
      throw new IntegrationError("rate-limit");
    if (codes.includes("UNAUTHENTICATED"))
      throw new IntegrationError("authorization");
  }
  return result;
}
function appJwt() {
  const e = requireConfigured("github"),
    now = Math.floor(Date.now() / 1000);
  const base = [
    { alg: "RS256", typ: "JWT" },
    { iat: now - 60, exp: now + 540, iss: e.STYLUS_GITHUB_APP_ID },
  ]
    .map((v) => Buffer.from(JSON.stringify(v)).toString("base64url"))
    .join(".");
  try {
    const signature = createSign("RSA-SHA256")
      .update(base)
      .sign(e.STYLUS_GITHUB_PRIVATE_KEY!.replaceAll("\\n", "\n"), "base64url");
    return `${base}.${signature}`;
  } catch {
    throw new IntegrationError("setup");
  }
}
export async function githubInstallations(token: string, page = 1) {
  const e = requireConfigured("github");
  const result = z
    .object({
      installations: z.array(installationSchema).max(100),
      total_count: z.number(),
    })
    .parse(
      await githubRequest(
        token,
        `/user/installations?per_page=25&page=${page}`,
      ),
    );
  return {
    items: result.installations
      .filter(
        (i) => String(i.app_id) === e.STYLUS_GITHUB_APP_ID && !i.suspended_at,
      )
      .map((i) => ({ id: String(i.id), title: i.account.login })),
    hasMore: result.total_count > page * 25,
  };
}
export async function githubRepositories(
  token: string,
  installationId: string,
  page = 1,
) {
  const result = z
    .object({
      repositories: z.array(repoSchema).max(100),
      total_count: z.number(),
    })
    .parse(
      await githubRequest(
        token,
        `/user/installations/${installationId}/repositories?per_page=25&page=${page}`,
      ),
    );
  return {
    items: result.repositories.map((r) => ({
      id: String(r.id),
      fullName: r.full_name,
    })),
    hasMore: result.total_count > page * 25,
  };
}
/** Recheck exact installation, then intersect selection with the user's access. */
export async function verifyGithubSelection(
  token: string,
  installationId: string,
  selected: RepositoryChoice[],
) {
  const e = requireConfigured("github");
  const installation = installationSchema.parse(
    await githubRequest(appJwt(), `/app/installations/${installationId}`),
  );
  if (
    String(installation.app_id) !== e.STYLUS_GITHUB_APP_ID ||
    installation.suspended_at
  )
    throw new IntegrationError("denied");
  // Direct per-repository metadata uses the user token (the App/user intersection),
  // not an App JWT. Final installation token issuance verifies installation membership.
  const verified: RepositoryChoice[] = [];
  for (const r of selected) {
    const value = repoSchema.parse(
      await githubRequest(token, `/repositories/${r.id}`),
    );
    if (value.full_name !== r.fullName) throw new IntegrationError("denied");
    verified.push({ id: String(value.id), fullName: value.full_name });
  }
  const connection = {
    config: { installationId, repositories: verified },
  } as ConnectionRow;
  await githubInstallationToken(connection);
  return { name: installation.account.login, repositories: verified };
}
export async function githubInstallationToken(connection: ConnectionRow) {
  const config = connection.config;
  if (
    !config.installationId ||
    !/^\d{1,20}$/.test(config.installationId) ||
    !config.repositories?.length
  )
    throw new IntegrationError("denied");
  const result = z.object({ token: z.string().min(1).max(2000) }).parse(
    await githubRequest(
      appJwt(),
      `/app/installations/${config.installationId}/access_tokens`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          repository_ids: config.repositories.map((r) => Number(r.id)),
          permissions: {
            metadata: "read",
            issues: "read",
            pull_requests: "read",
            contents: "read",
          },
        }),
      },
    ),
  );
  return result.token;
}
function selectedRepository(
  connection: ConnectionRow,
  value: { repositoryId: string; repository?: string },
) {
  const repo = connection.config.repositories?.find(
    (r) =>
      r.id === value.repositoryId &&
      (!value.repository || value.repository === r.fullName),
  );
  if (!repo) throw new IntegrationError("denied");
  return repo;
}
const artifactSchema = z.object({
  number: z.number().optional(),
  title: z.string().optional(),
  state: z.string().optional(),
  merged_at: z.string().nullable().optional(),
  sha: z.string().optional(),
  commit: z.object({ message: z.string() }).optional(),
  pull_request: z.unknown().optional(),
});
function project(
  locator: Extract<ResourceLocator, { provider: "github" }>,
  value: unknown,
): ResourceProjection {
  const row = artifactSchema.parse(value),
    base = `https://github.com/${locator.repository}`;
  if (locator.kind !== "repository" && !row.title && !row.commit)
    throw new IntegrationError("unavailable");
  const title =
    locator.kind === "repository"
      ? locator.repository
      : locator.kind === "commit"
        ? (row.commit?.message.split("\n")[0] ?? "Commit")
        : `#${row.number} · ${row.title}`;
  return {
    locator,
    title: title.slice(0, 200),
    url:
      base +
      (locator.kind === "repository"
        ? ""
        : locator.kind === "commit"
          ? `/commit/${locator.id}`
          : `/${locator.kind === "issue" ? "issues" : "pull"}/${locator.id}`),
    detail: `${locator.kind.replaceAll("-", " ")} · ${locator.repository}`,
    state: row.merged_at ? "Merged" : row.state,
    checkedAt: new Date().toISOString(),
  };
}
export async function githubResolve(
  connection: ConnectionRow,
  token: string,
  locator: Extract<ResourceLocator, { provider: "github" }>,
) {
  selectedRepository(connection, locator);
  const value = (await githubResolveBatch(connection, token, [locator]))[0];
  if (!value || value instanceof IntegrationError)
    throw value ?? new IntegrationError("unavailable");
  return value;
}
/** Bounded GraphQL metadata aliases resolve linked rows in one provider call. */
export async function githubResolveBatch(
  connection: ConnectionRow,
  token: string,
  locators: Extract<ResourceLocator, { provider: "github" }>[],
) {
  if (!locators.length || locators.length > 5)
    throw new IntegrationError("invalid");
  const variables: Record<string, string | number> = {},
    declarations: string[] = [],
    fields: string[] = [];
  for (const [index, l] of locators.entries()) {
    selectedRepository(connection, l);
    const [owner, name] = l.repository.split("/");
    if (!owner || !name) throw new IntegrationError("invalid");
    variables[`o${index}`] = owner;
    variables[`n${index}`] = name;
    declarations.push(`$o${index}:String!,$n${index}:String!`);
    let field = "";
    if (l.kind === "issue" || l.kind === "pull-request") {
      if (!/^\d{1,9}$/.test(l.id)) throw new IntegrationError("invalid");
      variables[`i${index}`] = Number(l.id);
      declarations.push(`$i${index}:Int!`);
      field = `item:${l.kind === "issue" ? "issue" : "pullRequest"}(number:$i${index}){number title state${l.kind === "pull-request" ? " mergedAt" : ""}}`;
    } else if (l.kind === "commit") {
      variables[`i${index}`] = l.id;
      declarations.push(`$i${index}:GitObjectID!`);
      field = `item:object(oid:$i${index}){... on Commit{oid messageHeadline}}`;
    }
    fields.push(
      `r${index}:repository(owner:$o${index},name:$n${index}){databaseId nameWithOwner ${field}}`,
    );
  }
  const response = z
    .object({
      data: z.record(z.string(), z.unknown()).nullable().optional(),
      errors: z.array(z.unknown()).optional(),
    })
    .parse(
      await githubRequest(token, "/graphql", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: `query(${declarations.join(",")}){${fields.join(" ")}}`,
          variables,
        }),
      }),
    );
  return locators.map((l, index) => {
    try {
      const repo = z
        .object({
          databaseId: z.number(),
          nameWithOwner: z.string(),
          item: z.unknown().optional(),
        })
        .parse(response.data?.[`r${index}`]);
      if (
        String(repo.databaseId) !== l.repositoryId ||
        repo.nameWithOwner !== l.repository
      )
        throw Error();
      if (l.kind === "repository") return project(l, {});
      if (l.kind === "commit") {
        const item = z
          .object({ oid: z.string(), messageHeadline: z.string() })
          .parse(repo.item);
        if (item.oid !== l.id) throw Error();
        return project(l, {
          sha: item.oid,
          commit: { message: item.messageHeadline },
        });
      }
      const item = z
        .object({
          number: z.number(),
          title: z.string(),
          state: z.string(),
          mergedAt: z.string().nullable().optional(),
        })
        .parse(repo.item);
      if (String(item.number) !== l.id) throw Error();
      return project(l, {
        ...item,
        state: item.state.toLowerCase(),
        merged_at: item.mergedAt,
      });
    } catch {
      return new IntegrationError("denied");
    }
  });
}
export async function githubSearch(
  connection: ConnectionRow,
  token: string,
  input: SearchInput,
): Promise<ResourcePage> {
  const kind = input.kind ?? "repository";
  if (input.cursor && !/^[a-zA-Z0-9+/=_-]{1,512}$/.test(input.cursor))
    throw new IntegrationError("invalid");
  if (kind === "repository")
    return {
      items: (connection.config.repositories ?? [])
        .filter((r) =>
          r.fullName.toLowerCase().includes(input.query.toLowerCase()),
        )
        .map((r) =>
          project(
            {
              provider: "github",
              kind,
              repository: r.fullName,
              repositoryId: r.id,
              id: r.id,
            },
            {},
          ),
        ),
    };
  const selected = selectedRepository(connection, {
      repositoryId: input.repositoryId ?? "",
    }),
    [owner, name] = selected.fullName.split("/");
  if (!owner || !name) throw new IntegrationError("invalid");
  const pageInfo = "pageInfo{hasNextPage endCursor}";
  const field =
    kind === "commit"
      ? "branch:defaultBranchRef{target{... on Commit{result:history(first:25,after:$after){nodes{oid messageHeadline} " +
        pageInfo +
        "}}}}"
      : kind === "issue"
        ? "result:issues(first:25,after:$after,states:[OPEN,CLOSED],orderBy:{field:UPDATED_AT,direction:DESC}){nodes{number title state} " +
          pageInfo +
          "}"
        : "result:pullRequests(first:25,after:$after,states:[OPEN,CLOSED,MERGED],orderBy:{field:UPDATED_AT,direction:DESC}){nodes{number title state mergedAt} " +
          pageInfo +
          "}";
  const response = z
    .object({
      data: z.object({ repository: z.unknown() }).nullable().optional(),
    })
    .parse(
      await githubRequest(token, "/graphql", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query:
            "query($owner:String!,$name:String!,$after:String){repository(owner:$owner,name:$name){databaseId nameWithOwner " +
            field +
            "}}",
          variables: { owner, name, after: input.cursor ?? null },
        }),
      }),
    );
  const repo = z
    .object({
      databaseId: z.number(),
      nameWithOwner: z.string(),
      result: z.unknown().optional(),
      branch: z
        .object({
          target: z.object({ result: z.unknown().optional() }).nullable(),
        })
        .nullable()
        .optional(),
    })
    .parse(response.data?.repository);
  if (
    String(repo.databaseId) !== selected.id ||
    repo.nameWithOwner !== selected.fullName
  )
    throw new IntegrationError("denied");
  if (kind === "commit" && !repo.branch?.target?.result) return { items: [] };
  const page = z
    .object({
      nodes: z
        .array(
          z.object({
            number: z.number().optional(),
            title: z.string().optional(),
            state: z.string().optional(),
            mergedAt: z.string().nullable().optional(),
            oid: z.string().optional(),
            messageHeadline: z.string().optional(),
          }),
        )
        .max(25),
      pageInfo: z.object({
        hasNextPage: z.boolean(),
        endCursor: z.string().nullable(),
      }),
    })
    .parse(kind === "commit" ? repo.branch?.target?.result : repo.result);
  const items = page.nodes
    .map((row) => {
      const id = kind === "commit" ? row.oid : row.number?.toString();
      if (
        !id ||
        (kind === "commit"
          ? !/^[a-f0-9]{40}(?:[a-f0-9]{24})?$/.test(id)
          : !/^[1-9]\d{0,8}$/.test(id))
      )
        throw new IntegrationError("unavailable");
      return project(
        {
          provider: "github",
          kind,
          repository: selected.fullName,
          repositoryId: selected.id,
          id,
        },
        kind === "commit"
          ? { sha: row.oid, commit: { message: row.messageHeadline } }
          : {
              number: row.number,
              title: row.title,
              state: row.state?.toLowerCase(),
              merged_at: row.mergedAt,
            },
      );
    })
    .filter((r) => r.title.toLowerCase().includes(input.query.toLowerCase()));
  return {
    items,
    ...(page.pageInfo.hasNextPage && page.pageInfo.endCursor
      ? { cursor: page.pageInfo.endCursor }
      : {}),
  };
}
