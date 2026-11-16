import { createHash } from "node:crypto";
import { requireObject, requireRows, requireUuid } from "./responses.mjs";

// An authored 1px PNG swatch, not a fetched or third-party asset.
const swatch = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
  "base64",
);
const digest = (bytes) => createHash("sha256").update(bytes).digest("hex");
function scope(manifest, asset) {
  if (
    !/^[0-9a-f-]{36}$/i.test(asset.elementId) ||
    asset.path !==
      `${manifest.organizationId}/${manifest.ids.board}/${asset.elementId}.png` ||
    asset.sha256 !== digest(swatch)
  )
    throw Error("STOP: private demo asset identity mismatch");
}
export async function ensureDemoAsset({
  owner,
  manifest,
  allocate,
  check,
  save,
}) {
  manifest.assets ??= [
    { elementId: allocate("image"), sha256: digest(swatch) },
  ];
  if (manifest.assets.length !== 1) throw Error("STOP: unexpected demo assets");
  const asset = manifest.assets[0];
  requireObject(asset, "demo asset");
  asset.path ??= `${manifest.organizationId}/${manifest.ids.board}/${asset.elementId}.png`;
  scope(manifest, asset);
  save();
  const bucket = owner.storage.from("board-images");
  if (!asset.uploaded) {
    const uploaded = requireObject(
      check(
        await bucket.upload(asset.path, swatch, {
          contentType: "image/png",
          upsert: false,
        }),
        "upload exact private demo swatch",
      ),
      "uploaded asset response",
    );
    if (uploaded.path !== asset.path || !uploaded.id)
      throw Error("STOP: private upload identity unconfirmed");
    asset.storageId = uploaded.id;
    requireUuid(asset.storageId, "uploaded asset ID");
    asset.uploaded = true;
    save();
  }
  await verifyDemoAssets({ owner, manifest, check });
  check(
    await owner.rpc("apply_board_operation", {
      p_board_id: manifest.ids.board,
      p_upserts: [
        {
          id: asset.elementId,
          element_type: "IMAGE",
          x: 940,
          y: 510,
          width: 120,
          height: 120,
          rotation: 0,
          z_index: 20,
          parent_id: manifest.allocations.section,
          locked: false,
          content: { alt: "Authored fictional demo swatch" },
          style: {},
          metadata: {
            storagePath: asset.path,
          },
        },
      ],
      p_archive_ids: [],
    }),
    "attach private demo image through Board API",
  );
}
export async function verifyDemoAssets({ owner, manifest, check }) {
  if (!Array.isArray(manifest.assets))
    throw Error("STOP: exact asset inventory is required");
  for (const asset of manifest.assets) {
    requireObject(asset, "demo asset");
    scope(manifest, asset);
    if (!asset.storageId || !asset.uploaded)
      throw Error("STOP: demo asset upload unconfirmed");
    const info = requireObject(
      check(
        await owner.storage.from("board-images").info(asset.path),
        "verify private demo storage identity",
      ),
      "Storage identity response",
    );
    if (
      info.id !== asset.storageId ||
      info.name !== asset.path ||
      info.bucketId !== "board-images"
    )
      throw Error("STOP: private demo storage identity changed");
    const blob = check(
      await owner.storage.from("board-images").download(asset.path),
      "verify exact private demo asset",
    );
    if (!blob || typeof blob.arrayBuffer !== "function")
      throw Error("STOP: invalid Storage bytes response");
    if (digest(Buffer.from(await blob.arrayBuffer())) !== asset.sha256)
      throw Error("STOP: demo asset bytes changed");
  }
}
export async function cleanupDemoAssets({ owner, manifest, check, save }) {
  await verifyDemoAssets({ owner, manifest, check });
  for (const asset of manifest.assets ?? []) {
    const bucket = owner.storage.from("board-images");
    const removed = requireRows(
      check(
        await bucket.remove([asset.path]),
        "remove exact private demo asset",
      ),
      "removed Storage objects",
    );
    if (
      removed.length !== 1 ||
      removed[0].id !== asset.storageId ||
      removed[0].name !== asset.path
    )
      throw Error("STOP: private asset deletion identity mismatch");
    const result = await bucket.download(asset.path);
    if (
      !result.error ||
      !["404", "400"].includes(String(result.error.statusCode))
    )
      throw Error("STOP: private demo asset absence unconfirmed");
    asset.removed = true;
    save();
  }
}
