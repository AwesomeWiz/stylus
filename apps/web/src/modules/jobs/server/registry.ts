import "server-only";

import { createJobRegistry } from "@/core/jobs/public";
import { builtInPluginRegistry } from "@/plugins";

import { coreTestEchoJob } from "../definitions/core-test-echo";

export const applicationJobRegistry = createJobRegistry([
  coreTestEchoJob,
  ...builtInPluginRegistry
    .list()
    .flatMap((plugin) => plugin.jobDefinitions ?? []),
]);
