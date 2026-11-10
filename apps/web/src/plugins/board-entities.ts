import "server-only";
import { EntityRegistry } from "@/core/entities/public";
import { taskEntityProvider } from "@/core/tasks/server";
import { noteEntityProvider } from "@/core/notes/server";
import { marketingEntityProviders } from "@/modules/marketing/server/board-entities";
import { growthEntityProviders } from "@/modules/marketing/server/growth-entities";
import { marketingPlugin } from "./marketing";
// The trusted application host binds domain adapters. Core Boards import only
// the public host, never this plugin-private implementation or persistence.
for (const provider of [
  ...marketingEntityProviders,
  ...growthEntityProviders,
]) {
  if (
    provider.metadata.sourcePlugin !== marketingPlugin.manifest.id ||
    !marketingPlugin.manifest.capabilities.includes(
      provider.metadata.readCapability!,
    )
  )
    throw Error("Undeclared plugin entity capability");
}
export const boardEntityRegistry = new EntityRegistry([
  taskEntityProvider,
  noteEntityProvider,
  ...marketingEntityProviders,
  ...growthEntityProviders,
]);
