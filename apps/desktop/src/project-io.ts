import { invoke, isTauri } from "@tauri-apps/api/core";
import { metadataPaths, type ProjectFile } from "../../../packages/core/src";

export { isTauri };
export async function chooseNativeProject(): Promise<ProjectFile[] | null> {
  return invoke<ProjectFile[] | null>("choose_project");
}
export async function readFolderFiles(files: FileList): Promise<ProjectFile[]> {
  if (files.length > 100000)
    throw new Error("Folder is too large. Select the Flutter application folder.");
  const selected: { file: File; path: string }[] = [];
  let root: string | undefined;
  for (const file of Array.from(files)) {
    const parts = file.webkitRelativePath.split("/");
    const thisRoot = parts.shift();
    if (!thisRoot || (root && root !== thisRoot))
      throw new Error("Choose exactly one project folder.");
    root = thisRoot;
    const path = parts.join("/");
    if (metadataPaths.has(path)) selected.push({ file, path });
  }
  return Promise.all(
    selected.map(async ({ file, path }) => {
      if (file.size > 1_048_576) throw new Error("Project metadata file exceeds 1 MiB.");
      return { path, content: await file.text() };
    }),
  );
}
export async function readDroppedFolder(item: DataTransferItem): Promise<ProjectFile[]> {
  const entry = item.webkitGetAsEntry();
  if (!entry?.isDirectory) throw new Error("Drop one project folder, not individual files.");
  const dir = entry as FileSystemDirectoryEntry;
  const result: ProjectFile[] = [];
  for (const path of metadataPaths) {
    const file = await new Promise<File | null>((resolve) =>
      dir.getFile(
        path,
        {},
        (e) => {
          if (!e.isFile) {
            resolve(null);
            return;
          }
          (e as FileSystemFileEntry).file(resolve, () => resolve(null));
        },
        () => resolve(null),
      ),
    );
    if (file) {
      if (file.size > 1_048_576) throw new Error("Project metadata file exceeds 1 MiB.");
      result.push({ path, content: await file.text() });
    }
  }
  return result;
}
export function downloadText(name: string, content: string): void {
  const url = URL.createObjectURL(new Blob([content], { type: "text/plain;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
