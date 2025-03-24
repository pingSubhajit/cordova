// Prevent showing a console window on Windows
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::fs;
use std::path::Path;
use std::collections::HashSet;
use std::io;

// Function to list all image files in a folder
#[tauri::command]
fn list_image_files(folder_path: String) -> Result<Vec<String>, String> {
    let path = Path::new(&folder_path);
    
    if !path.exists() {
        return Err(format!("Folder does not exist: {}", folder_path));
    }
    
    if !path.is_dir() {
        return Err(format!("Not a directory: {}", folder_path));
    }
    
    let image_extensions: HashSet<&str> = [
        "jpg", "jpeg", "png", "gif", "bmp", "webp", "tiff", "tif"
    ].iter().cloned().collect();
    
    let mut image_files = Vec::new();
    
    for entry in fs::read_dir(path).map_err(|e| e.to_string())? {
        let entry = entry.map_err(|e| e.to_string())?;
        let file_path = entry.path();
        
        if file_path.is_file() {
            if let Some(extension) = file_path.extension() {
                if let Some(ext_str) = extension.to_str() {
                    if image_extensions.contains(&ext_str.to_lowercase().as_str()) {
                        image_files.push(file_path.to_string_lossy().to_string());
                    }
                }
            }
        }
    }
    
    // Sort files by name
    image_files.sort();
    
    Ok(image_files)
}

// Function to reorder and rename files according to the specified pattern
#[tauri::command]
fn reorder_and_rename_files(folder_path: String, file_paths: Vec<String>) -> Result<(), String> {
    if file_paths.is_empty() {
        return Err("No files to process".to_string());
    }
    
    // Create output directory
    let original_path = Path::new(&folder_path);
    let output_folder_name = format!("{}_reordered", original_path.file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("output"));
    
    let output_path = original_path.parent()
        .unwrap_or(Path::new(""))
        .join(output_folder_name);
    
    // Create the output directory if it doesn't exist
    if !output_path.exists() {
        fs::create_dir_all(&output_path).map_err(|e| format!("Failed to create output directory: {}", e))?;
    }
    
    // Apply the reordering algorithm
    let reordered_files = reorder_files(&file_paths);
    
    // Rename and copy files to the output directory
    for (index, file_path) in reordered_files.iter().enumerate() {
        let source_path = Path::new(file_path);
        let extension = source_path.extension()
            .and_then(|ext| ext.to_str())
            .unwrap_or("");
        
        // Create new file name with padding zeros for proper sorting
        let new_filename = format!("{:04}.{}", index + 1, extension);
        let dest_path = output_path.join(new_filename);
        
        // Copy the file
        copy_file(source_path, &dest_path)
            .map_err(|e| format!("Failed to copy file: {}", e))?;
    }
    
    Ok(())
}

// Helper function to copy a file
fn copy_file(source: &Path, destination: &Path) -> io::Result<()> {
    fs::copy(source, destination)?;
    Ok(())
}

// Implementation of the reordering algorithm
fn reorder_files(files: &[String]) -> Vec<String> {
    if files.is_empty() {
        return Vec::new();
    }
    
    let mut result = Vec::new();
    let mut skipped = Vec::new();
    
    // Start with the last file
    if let Some(last) = files.last() {
        result.push(last.clone());
    }
    
    // Track files we've processed
    let mut processed = HashSet::new();
    processed.insert(files.len() - 1); // Last file index
    
    // Current index for iterations
    let mut current_index = files.len() as isize - 3; // Start after skipping 2 from the end
    
    // Process files according to the pattern
    while current_index >= 0 {
        // Take 2 files (or whatever is left)
        let end_index = current_index + 2;
        let take_count = if end_index < files.len() as isize { 2 } else { 1 };
        
        for i in 0..take_count {
            let index = (current_index + i) as usize;
            if index < files.len() {
                result.push(files[index].clone());
                processed.insert(index);
            }
        }
        
        // Skip 2 for next iteration
        current_index -= 4;
    }
    
    // Add skipped files in their original order
    for (i, file) in files.iter().enumerate() {
        if !processed.contains(&i) {
            skipped.push(file.clone());
        }
    }
    
    // Combine results
    result.extend(skipped);
    
    result
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![
            list_image_files,
            reorder_and_rename_files
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
