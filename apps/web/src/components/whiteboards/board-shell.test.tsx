import { describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ enabled: vi.fn(), navigation: vi.fn() }));
vi.mock("@/modules/plugins/server/data", () => ({
  getEnabledOrganizationPluginIds: mocks.enabled,
}));
vi.mock("@/plugins", () => ({ getApplicationNavigation: mocks.navigation }));
vi.mock("./whiteboard-workspace", () => ({ WhiteboardWorkspace: () => null }));
import { board } from "@/test/board-fixtures";
import { BoardShell } from "./board-shell";
describe("BoardShell", () => {
  it("uses public plugin navigation and remounts private editor state on role changes", async () => {
    mocks.enabled.mockResolvedValue(["marketing"]);
    mocks.navigation.mockReturnValue([]);
    const props = {
      workspace: {
        board,
        elements: [],
        comments: [],
        imageUrls: {},
        members: [],
      },
      identity: { displayName: "Member", email: "member@example.test" },
      organization: {
        id: board.organization_id,
        name: "Organization",
        role: "MEMBER" as const,
      },
      logoutAction: async () => {},
      canMutate: true,
      currentUserId: board.created_by,
    };
    const editable = await BoardShell(props),
      readonly = await BoardShell({
        ...props,
        canMutate: false,
        organization: { ...props.organization, role: "VIEWER" },
      });
    expect(mocks.enabled).toHaveBeenCalledWith(board.organization_id);
    expect(mocks.navigation).toHaveBeenCalledWith(["marketing"]);
    expect(editable.key).not.toBe(readonly.key);
    expect(readonly.props.canMutate).toBe(false);
  });
});
