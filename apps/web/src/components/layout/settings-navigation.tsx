import { settingsNavigation, getNavigationIcon } from "./navigation";
import { NavigationLink } from "./navigation-link";

export function SettingsNavigation() {
  return (
    <nav aria-label="Settings destinations" className="mt-6 border-y py-2">
      <ul className="grid gap-x-8 sm:grid-cols-2 lg:grid-cols-3">
        {settingsNavigation.map((item) => {
          const Icon = getNavigationIcon(item.icon);
          return (
            <li key={item.href}>
              <NavigationLink
                href={item.href}
                className="text-muted-foreground hover:text-foreground flex min-h-11 items-center gap-3 rounded-md px-2 text-sm hover:underline"
              >
                <Icon aria-hidden="true" className="size-4 shrink-0" />
                {item.label}
              </NavigationLink>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
