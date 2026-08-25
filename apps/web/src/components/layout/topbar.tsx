import { Bell, Menu } from "lucide-react";

import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/ui/search-input";
import { Sheet } from "@/components/ui/sheet";

import { Sidebar } from "./sidebar";

export function Topbar() {
  return (
    <header className="bg-background/95 sticky top-0 z-30 flex h-16 items-center gap-3 border-b px-4 backdrop-blur-sm sm:px-6 lg:px-8">
      <div className="lg:hidden">
        <Sheet
          title="Main navigation"
          trigger={
            <Button aria-label="Open navigation" size="icon" variant="ghost">
              <Menu aria-hidden="true" className="size-5" />
            </Button>
          }
        >
          <Sidebar />
        </Sheet>
      </div>
      <SearchInput className="max-w-md flex-1" />
      <div className="ml-auto flex items-center gap-1">
        <Button aria-label="View notifications" size="icon" variant="ghost">
          <Bell aria-hidden="true" className="size-[18px]" />
        </Button>
      </div>
    </header>
  );
}
