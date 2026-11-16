import assert from 'node:assert/strict';
// Fail rather than silently downgrade artifacts from a future generator.
export function assertV1Plugin(plugin) {
  assert.equal(plugin.version,'1','Restricted release requires plugin schema v1');
  assert(Object.values(plugin.operations).every(op=>!Object.hasOwn(op,'display')),'Review metadata is deferred');
}
