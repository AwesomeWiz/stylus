const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// The caller must authenticate the fictional owner first. This read deliberately
// uses that owner's existing RLS path, never the Auth-administration client.
export async function verifyDemoOrganization(owner, manifest, check, step) {
  if (
    !uuid.test(manifest.organizationId ?? "") ||
    !uuid.test(manifest.users?.[0]?.id ?? "")
  )
    throw Error("STOP: fixture organization identity is not recorded");
  const organization = check(
    await owner
      .from("organizations")
      .select("id,name,created_by")
      .eq("id", manifest.organizationId)
      .single(),
    step,
  );
  if (
    organization?.id !== manifest.organizationId ||
    organization.name !== manifest.name ||
    organization.created_by !== manifest.users[0].id
  )
    throw Error("STOP: fixture organization identity mismatch");
  return organization;
}
