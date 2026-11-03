import assert from "node:assert/strict";

// Read PE resources directly: legacy GDI/.NET icon decoding can mishandle the
// PNG frames emitted by the pinned Tauri CLI. No executable code is loaded.
export function verifyEmbeddedIcon(executable, ico) {
  assert.equal(executable.subarray(0, 2).toString(), "MZ");
  const pe = executable.readUInt32LE(0x3c);
  assert.equal(executable.readUInt32LE(pe), 0x00004550);
  const sectionCount = executable.readUInt16LE(pe + 6);
  assert(sectionCount > 0 && sectionCount < 100);
  const optionalSize = executable.readUInt16LE(pe + 20);
  const optional = pe + 24;
  const magic = executable.readUInt16LE(optional);
  assert(magic === 0x10b || magic === 0x20b);
  const directories = optional + (magic === 0x10b ? 96 : 112);
  const resourceRva = executable.readUInt32LE(directories + 16);
  const resourceSize = executable.readUInt32LE(directories + 20);
  const sections = Array.from({ length: sectionCount }, (_, index) => {
    const start = optional + optionalSize + index * 40;
    return {
      rva: executable.readUInt32LE(start + 12),
      bytes: executable.readUInt32LE(start + 16),
      offset: executable.readUInt32LE(start + 20),
    };
  });
  function mapped(rva, size) {
    const section = sections.find((item) => rva >= item.rva && rva + size <= item.rva + item.bytes);
    assert(section, "Resource RVA is outside the PE section data.");
    const start = section.offset + rva - section.rva;
    assert(start + size <= executable.length);
    return start;
  }
  const root = mapped(resourceRva, resourceSize);
  function directoryOffset(relative, size) {
    assert(relative >= 0 && relative + size <= resourceSize);
    return root + relative;
  }
  const resources = [];
  const visited = new Set();
  function walk(relative, keys = []) {
    assert(keys.length <= 2 && !visited.has(relative), "Invalid resource directory tree.");
    visited.add(relative);
    const start = directoryOffset(relative, 16);
    const count = executable.readUInt16LE(start + 12) + executable.readUInt16LE(start + 14);
    assert(count <= 4096);
    directoryOffset(relative, 16 + count * 8);
    for (let index = 0; index < count; index++) {
      const key = executable.readUInt32LE(start + 16 + index * 8);
      const target = executable.readUInt32LE(start + 20 + index * 8);
      // RT_ICON (3) and RT_GROUP_ICON (14); other resources are irrelevant.
      if (keys.length === 0 && key !== 3 && key !== 14) continue;
      if (target & 0x80000000) {
        walk(target & 0x7fffffff, [...keys, key]);
      } else {
        assert.equal(keys.length, 2);
        const entry = directoryOffset(target, 16);
        const rva = executable.readUInt32LE(entry);
        const size = executable.readUInt32LE(entry + 4);
        const dataStart = mapped(rva, size);
        resources.push({
          type: keys[0],
          id: keys[1],
          language: key,
          data: executable.subarray(dataStart, dataStart + size),
        });
      }
    }
  }
  walk(0);

  assert.equal(ico.readUInt16LE(0), 0);
  assert.equal(ico.readUInt16LE(2), 1);
  const expectedCount = ico.readUInt16LE(4);
  assert(expectedCount > 0 && expectedCount <= 64);
  const expected = new Map();
  for (let index = 0; index < expectedCount; index++) {
    const entry = 6 + index * 16;
    const size = ico.readUInt32LE(entry + 8);
    const offset = ico.readUInt32LE(entry + 12);
    const key = `${ico[entry] || 256}x${ico[entry + 1] || 256}`;
    assert(offset + size <= ico.length && !expected.has(key));
    expected.set(key, ico.subarray(offset, offset + size));
  }
  const groups = resources.filter((item) => item.type === 14);
  assert(groups.length > 0, "The executable has no icon group.");
  for (const group of groups) {
    assert.equal(group.data.readUInt16LE(0), 0);
    assert.equal(group.data.readUInt16LE(2), 1);
    assert.equal(group.data.readUInt16LE(4), expectedCount);
    const seen = new Set();
    for (let index = 0; index < expectedCount; index++) {
      const entry = 6 + index * 14;
      const key = `${group.data[entry] || 256}x${group.data[entry + 1] || 256}`;
      const size = group.data.readUInt32LE(entry + 8);
      const id = group.data.readUInt16LE(entry + 12);
      const image = resources.find(
        (item) => item.type === 3 && item.id === id && item.language === group.language,
      );
      assert(
        image && expected.has(key) && !seen.has(key),
        "Missing or duplicate embedded icon frame.",
      );
      assert.equal(image.data.length, size);
      assert(
        image.data.equals(expected.get(key)),
        `Embedded ${key} icon differs from the approved ICO.`,
      );
      seen.add(key);
    }
  }
  return {
    result: "PASS",
    match: "exact-resource-bytes",
    groups: groups.length,
    frames_per_group: expectedCount,
    frame_sizes: [...expected.keys()],
  };
}
