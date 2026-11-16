import { createHash, randomBytes } from "node:crypto";
import { requireObject, requireUuid, requireSuccess } from "./responses.mjs";

// Follow the same invitation/acceptance contract as the application. A service
// key and direct membership writes are deliberately unnecessary here.
export async function ensureDemoTeam({
  owner,
  createClient,
  url,
  key,
  manifest,
  check,
  save,
}) {
  manifest.teamInvitations ??= {};
  for (const [index, user] of manifest.users.slice(1).entries()) {
    const role = index === 0 ? "MEMBER" : "VIEWER";
    const member = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    check(
      await member.auth.signInWithPassword({
        email: user.email,
        password: manifest.password,
      }),
      `authenticate fictional ${role}`,
    );
    const identity = requireObject(
      check(await member.auth.getUser(), `verify fictional ${role} session`),
      "team Auth response",
    );
    requireObject(identity.user, "team Auth user");
    if (identity.user.id !== user.id || identity.user.email !== user.email)
      throw Error("STOP: team session identity mismatch");
    const read = () =>
      member
        .from("memberships")
        .select("organization_id,user_id,role,removed_at")
        .eq("organization_id", manifest.organizationId)
        .eq("user_id", user.id)
        .maybeSingle();
    let membership = check(
      await read(),
      `inspect fictional ${role} membership`,
    );
    let invitation = manifest.teamInvitations[user.id];
    if (!membership) {
      if (invitation && !invitation.id)
        throw Error(
          "STOP: invitation response is unconfirmed; preserve its exact intent for review",
        );
      if (!invitation) {
        invitation = {
          token: randomBytes(32).toString("base64url"),
          role,
          userId: user.id,
        };
        manifest.teamInvitations[user.id] = invitation;
        save();
        invitation.id = check(
          await owner.rpc("create_organization_invitation", {
            p_organization_id: manifest.organizationId,
            p_email: user.email,
            p_role: role,
            p_token_hash: createHash("sha256")
              .update(invitation.token)
              .digest("hex"),
            p_expires_at: new Date(Date.now() + 86400000).toISOString(),
          }),
          `invite fictional ${role}`,
        );
        requireUuid(invitation.id, "invitation ID");
        save();
      }
      if (invitation.userId !== user.id || invitation.role !== role)
        throw Error("STOP: recorded invitation identity mismatch");
      if (!invitation.token)
        throw Error(
          "STOP: an accepted fixture membership changed; review before resuming",
        );
      const accepted = check(
        await member.rpc("accept_organization_invitation", {
          p_token: invitation.token,
        }),
        `accept fictional ${role} invitation`,
      );
      if (accepted !== manifest.organizationId)
        throw Error("STOP: invitation accepted a different organization");
      membership = check(await read(), `verify fictional ${role} membership`);
    }
    if (
      membership?.organization_id !== manifest.organizationId ||
      membership.user_id !== user.id ||
      membership.role !== role ||
      membership.removed_at !== null
    )
      throw Error("STOP: fictional team membership mismatch");
    if (!invitation?.id)
      throw Error(
        "STOP: fixture membership has no recorded invitation identity",
      );
    invitation.accepted = true;
    delete invitation.token;
    save();
    requireSuccess(await member.auth.signOut(), `sign out fictional ${role}`);
  }
  manifest.teamReady = true;
  save();
}
