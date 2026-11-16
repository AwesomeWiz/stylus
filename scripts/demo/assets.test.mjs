import assert from "node:assert/strict";
import test from "node:test";
import { ensureDemoAsset, cleanupDemoAssets } from "./assets.mjs";

async function fixture() {
  const manifest = {
    organizationId: "10000000-0000-4000-8000-000000000001",
    ids: { board: "10000000-0000-4000-8000-000000000002" },
    allocations: { section: "10000000-0000-4000-8000-000000000003" },
  };
  let bytes,
    info,
    removed = false,
    deletes = 0;
  const bucket = {
    async upload(path, body, options) {
      assert.equal(options.upsert, false);
      bytes = body;
      info = {
        id: "10000000-0000-4000-8000-000000000004",
        name: path,
        bucketId: "board-images",
      };
      return { data: { id: info.id, path } };
    },
    async info() {
      return { data: info };
    },
    async download() {
      return removed
        ? { error: { statusCode: "404" } }
        : { data: new Blob([bytes]) };
    },
    async remove(paths) {
      assert.deepEqual(paths, [info.name]);
      deletes++;
      removed = true;
      return { data: [{ id: info.id, name: info.name }] };
    },
  };
  const owner = {
    storage: {
      from(name) {
        assert.equal(name, "board-images");
        return bucket;
      },
    },
    async rpc(name, args) {
      assert.equal(name, "apply_board_operation");
      assert.equal(args.p_board_id, manifest.ids.board);
      return { data: [] };
    },
  };
  const check = (result) => {
    if (result.error) throw Error("transport failure");
    return result.data;
  };
  const args = {
    owner,
    manifest,
    check,
    save() {},
    allocate() {
      return "10000000-0000-4000-8000-000000000005";
    },
  };
  await ensureDemoAsset(args);
  return {
    args,
    manifest,
    get deletes() {
      return deletes;
    },
    changeInfo(value) {
      info = { ...info, ...value };
    },
    changeBytes() {
      bytes = Buffer.from("unexpected");
    },
  };
}
test("private fixture cleanup checks exact Storage ID, path, bucket and bytes before any removal", async () => {
  for (const change of [
    { id: "10000000-0000-4000-8000-000000000099" },
    { name: "other/path.png" },
    { bucketId: "other" },
    "bytes",
    "manifest",
  ]) {
    const f = await fixture();
    if (change === "bytes") f.changeBytes();
    else if (change === "manifest")
      f.manifest.assets[0].path = "foreign/path.png";
    else f.changeInfo(change);
    await assert.rejects(cleanupDemoAssets(f.args), /STOP:/);
    assert.equal(f.deletes, 0);
  }
});
test("private fixture cleanup removes one exact object and confirms absence", async () => {
  const f = await fixture();
  await cleanupDemoAssets(f.args);
  assert.equal(f.deletes, 1);
  assert.equal(f.manifest.assets[0].removed, true);
});
