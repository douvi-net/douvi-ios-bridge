#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod project;

#[tauri::command]
async fn choose_project(app: tauri::AppHandle) -> Result<Option<Vec<project::ProjectFile>>, String> {
    use tauri_plugin_dialog::DialogExt;
    tauri::async_runtime::spawn_blocking(move || {
        let selected = app.dialog().file().blocking_pick_folder();
        match selected {
            None => Ok(None),
            Some(path) => {
                let path = path
                    .into_path()
                    .map_err(|_| "Select a local folder.".to_string())?;
                project::read_metadata(&path).map(Some)
            }
        }
    })
    .await
    .map_err(|_| "Folder inspection was interrupted.".to_string())?
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![choose_project])
        .run(tauri::generate_context!())
        .expect("Could not start Douvi iOS Bridge");
}
