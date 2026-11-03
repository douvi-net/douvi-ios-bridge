use serde::Serialize;
use std::fs;
use std::io::Read;
use std::path::Path;

const MAX_BYTES: u64 = 1_048_576;
const ALLOWED: [&str; 5] = [
    "pubspec.yaml",
    "pubspec.lock",
    "ios/Podfile",
    "ios/Runner.xcodeproj/project.pbxproj",
    "ios/Runner/Info.plist",
];

#[derive(Serialize)]
pub struct ProjectFile {
    path: String,
    content: String,
}

// Only called with a root selected by the native dialog. No arbitrary path IPC.
pub fn read_metadata(root: &Path) -> Result<Vec<ProjectFile>, String> {
    let root = root
        .canonicalize()
        .map_err(|_| "Cannot open selected project folder.")?;
    if !root.is_dir() {
        return Err("Select a project folder.".into());
    }
    let mut files = Vec::new();
    for relative in ALLOWED {
        let candidate = root.join(relative);
        if !candidate.exists() {
            continue;
        }
        let resolved = candidate
            .canonicalize()
            .map_err(|_| "Cannot resolve project metadata.")?;
        if !resolved.starts_with(&root) {
            return Err("Project metadata must stay inside the selected folder.".into());
        }
        let file = fs::File::open(&resolved).map_err(|_| "Cannot read project metadata.")?;
        let metadata = file
            .metadata()
            .map_err(|_| "Cannot inspect project metadata.")?;
        if !metadata.is_file() || metadata.len() > MAX_BYTES {
            return Err("Project metadata must be a regular file no larger than 1 MiB.".into());
        }
        let mut bytes = Vec::new();
        file.take(MAX_BYTES + 1)
            .read_to_end(&mut bytes)
            .map_err(|_| "Cannot read project metadata.")?;
        if bytes.len() as u64 > MAX_BYTES {
            return Err("Project metadata exceeds 1 MiB.".into());
        }
        let content = String::from_utf8(bytes).map_err(|_| "Project metadata must be UTF-8.")?;
        files.push(ProjectFile {
            path: relative.into(),
            content,
        });
    }
    Ok(files)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::time::{SystemTime, UNIX_EPOCH};
    fn temp() -> std::path::PathBuf {
        let id = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_nanos();
        let p = std::env::temp_dir().join(format!("bridge-test-{}-{id}", std::process::id()));
        fs::create_dir_all(&p).unwrap();
        p
    }
    #[test]
    fn reads_only_allowlisted_metadata() {
        let root = temp();
        fs::write(root.join("pubspec.yaml"), "name: example").unwrap();
        fs::write(root.join("secret.p8"), "must never reach frontend").unwrap();
        let files = read_metadata(&root).unwrap();
        assert_eq!(files.len(), 1);
        assert_eq!(files[0].path, "pubspec.yaml");
        fs::remove_dir_all(root).unwrap();
    }
    #[test]
    fn rejects_large_metadata() {
        let root = temp();
        fs::write(root.join("pubspec.yaml"), vec![b'x'; MAX_BYTES as usize + 1]).unwrap();
        assert!(read_metadata(&root).is_err());
        fs::remove_dir_all(root).unwrap();
    }
    #[test]
    fn missing_directory_is_an_error() {
        let root = temp();
        fs::remove_dir_all(&root).unwrap();
        assert!(read_metadata(&root).is_err());
    }
    #[cfg(unix)]
    #[test]
    fn rejects_external_symlink() {
        use std::os::unix::fs::symlink;
        let root = temp();
        let outside = temp();
        fs::write(outside.join("external.yaml"), "private").unwrap();
        symlink(outside.join("external.yaml"), root.join("pubspec.yaml")).unwrap();
        assert!(read_metadata(&root).is_err());
        fs::remove_dir_all(root).unwrap();
        fs::remove_dir_all(outside).unwrap();
    }
}
