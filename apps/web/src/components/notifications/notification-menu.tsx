"use client";

import { Bell, CheckCheck, Circle } from "lucide-react";
import { useState } from "react";

import type { NotificationSummary } from "@/modules/notifications/server/data";
import {
  markAllNotificationsReadAction,
  markNotificationReadAction,
} from "@/modules/notifications/actions";

function notificationTime(value: string) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function NotificationMenu({ items, unreadCount }: NotificationSummary) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        aria-controls="notification-popover"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ""}`}
        className="text-muted-foreground hover:bg-muted hover:text-foreground relative flex size-9 min-h-9 items-center justify-center rounded-md"
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        <Bell aria-hidden="true" className="size-[18px]" />
        {unreadCount ? (
          <span className="bg-destructive text-destructive-foreground absolute -top-1 -right-1 flex min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-semibold">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        ) : null}
      </button>
      {open ? (
        <div
          aria-label="Recent notifications"
          className="bg-popover absolute top-[calc(100%+0.5rem)] right-0 z-50 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-md border shadow-md"
          id="notification-popover"
          onKeyDown={(event) => {
            if (event.key === "Escape") setOpen(false);
          }}
          role="dialog"
        >
          <div className="flex items-center justify-between border-b px-3 py-2.5">
            <p className="text-sm font-semibold">Notifications</p>
            {unreadCount ? (
              <form action={markAllNotificationsReadAction}>
                <button
                  className="text-muted-foreground hover:text-foreground flex min-h-8 items-center gap-1.5 text-xs font-medium"
                  type="submit"
                >
                  <CheckCheck aria-hidden="true" className="size-3.5" />
                  Mark all read
                </button>
              </form>
            ) : null}
          </div>
          {items.length ? (
            <ul className="max-h-96 overflow-y-auto">
              {items.map((notification) => (
                <li className="border-b last:border-b-0" key={notification.id}>
                  <form action={markNotificationReadAction}>
                    <input
                      name="notificationId"
                      type="hidden"
                      value={notification.id}
                    />
                    <button
                      className="hover:bg-muted/60 flex w-full gap-2.5 px-3 py-3 text-left"
                      type="submit"
                    >
                      <Circle
                        aria-hidden="true"
                        className={
                          notification.read_at
                            ? "text-muted-foreground mt-1 size-2.5 shrink-0"
                            : "fill-primary text-primary mt-1 size-2.5 shrink-0"
                        }
                      />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2">
                          <span className="truncate text-sm font-medium">
                            {notification.title}
                          </span>
                          <span className="sr-only">
                            {notification.read_at ? "Read" : "Unread"}
                          </span>
                        </span>
                        <span className="text-muted-foreground mt-0.5 block text-xs leading-5">
                          {notification.body}
                        </span>
                        <time
                          className="text-muted-foreground mt-1 block text-[11px]"
                          dateTime={notification.created_at}
                        >
                          {notificationTime(notification.created_at)}
                        </time>
                      </span>
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground px-4 py-8 text-center text-sm">
              No notifications yet.
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}
