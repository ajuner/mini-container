use battery::{units::ratio::percent, Manager, State};

#[tauri::command]
fn getBatteryInfo() -> u64 {
    let manager = Manager::new().unwrap();
    let batteries = manager.batteries().unwrap();
    let mut p = 0.0;

    for battery in batteries {
        let battery = battery.unwrap();
        p = battery.state_of_charge().value * 100.0;
        println!("设备电量: {:.1}%", battery.state_of_charge().value * 100.0);
        println!("电池状态: {:?}", battery.state());
    }

    return p as u64;
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![getBatteryInfo])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
