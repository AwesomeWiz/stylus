import "server-only";

import { createJobRegistry } from "@/core/jobs/public";
import { builtInPluginRegistry } from "@/plugins";

import { coreTestEchoJob } from "../definitions/core-test-echo";
import { coreTestWorkerEchoJob } from "../definitions/core-test-worker-echo";

export const applicationJobRegistry = createJobRegistry([
  coreTestEchoJob,
  coreTestWorkerEchoJob,
  ...builtInPluginRegistry
    .list()
    .flatMap((plugin) => plugin.jobDefinitions ?? []),
]);
