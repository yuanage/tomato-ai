use std::fs;
use std::path::PathBuf;

/// 允许镜像到文件的存储键白名单（杜绝路径注入）
const FS_ALLOWED_KEYS: [&str; 4] = ["tasks", "pomodoro_records", "settings", "ai_agent_state"];

fn data_file(app: &tauri::AppHandle, key: &str) -> Result<PathBuf, String> {
  if !FS_ALLOWED_KEYS.contains(&key) {
    return Err(format!("invalid storage key: {key}"));
  }
  let dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
  fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
  Ok(dir.join(format!("{key}.json")))
}

/// 写文件镜像：安卓 WebView 进程被杀后 IndexedDB 可能丢失/损坏，文件层兜底保证数据不丢
#[tauri::command]
fn fs_save(app: tauri::AppHandle, key: String, value: String) -> Result<(), String> {
  let path = data_file(&app, &key)?;
  fs::write(path, value).map_err(|e| e.to_string())
}

#[tauri::command]
fn fs_load(app: tauri::AppHandle, key: String) -> Result<Option<String>, String> {
  let path = data_file(&app, &key)?;
  match fs::read_to_string(path) {
    Ok(s) => Ok(Some(s)),
    Err(e) if e.kind() == std::io::ErrorKind::NotFound => Ok(None),
    Err(e) => Err(e.to_string()),
  }
}

#[tauri::command]
fn fs_remove(app: tauri::AppHandle, key: String) -> Result<(), String> {
  let path = data_file(&app, &key)?;
  if path.exists() {
    fs::remove_file(path).map_err(|e| e.to_string())?;
  }
  Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .invoke_handler(tauri::generate_handler![fs_save, fs_load, fs_remove])
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
