import React, { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useDropzone } from "react-dropzone";
import { motion, AnimatePresence } from "framer-motion";
import { open } from "@tauri-apps/plugin-dialog";
import { readDir, rename } from "@tauri-apps/plugin-fs";
import { ArrowLeft } from "lucide-react";

// Define a file entry interface for our app
interface AppFileEntry {
  name: string;
  path: string;
  size: number;
}

// Define our own DirEntry type based on the actual structure
interface DirEntry {
  name: string;
  path: string;
  children?: DirEntry[];
}

// Helper function to get directory path from a file path
function getDirectoryPath(filePath: string | undefined): string {
    if (!filePath) {
        console.error("getDirectoryPath received undefined path");
        return "";
    }
    const parts = filePath.split(/[/\\]/);
    parts.pop(); // Remove filename
    return parts.join('/');
}

function naturalSort(arr: AppFileEntry[]): AppFileEntry[] {
    // Clone the array to avoid modifying the original
    const result = [...arr];

    return result.sort((a, b) => {
        // Handle edge cases
        if (!a.name) return -1;
        if (!b.name) return 1;

        const nameA = a.name.toString();
        const nameB = b.name.toString();

        // Split the names into chunks of string and number parts
        const chunksA = nameA.split(/(\d+)/).filter(Boolean);
        const chunksB = nameB.split(/(\d+)/).filter(Boolean);

        // Compare each chunk
        const minLength = Math.min(chunksA.length, chunksB.length);

        for (let i = 0; i < minLength; i++) {
            const chunkA = chunksA[i];
            const chunkB = chunksB[i];

            // Check if both chunks are numeric
            const isNumA = /^\d+$/.test(chunkA);
            const isNumB = /^\d+$/.test(chunkB);

            if (isNumA && isNumB) {
                // Compare as numbers
                const numA = parseInt(chunkA, 10);
                const numB = parseInt(chunkB, 10);

                if (numA !== numB) {
                    return numA - numB;
                }
            } else {
                // Compare as strings (case-insensitive)
                const strCompare = chunkA.localeCompare(chunkB, undefined, {sensitivity: 'base'});

                if (strCompare !== 0) {
                    return strCompare;
                }
            }
        }

        // If all compared chunks are equal, the shorter name comes first
        return chunksA.length - chunksB.length;
    });
}

function Dashboard(): React.ReactElement {
    const navigate = useNavigate();
    const [files, setFiles] = useState<AppFileEntry[]>([]);
    const [folderName, setFolderName] = useState<string>("");
    const [isProcessing, setIsProcessing] = useState<boolean>(false);
    const dropzoneRef = useRef<HTMLDivElement>(null);

    // Function to select folder using Tauri dialog
    const selectFolder = async () => {
        try {
            console.log("Opening folder dialog...");
            // Open folder selection dialog
            const selected = await open({
                directory: true,
                multiple: false,
                title: "Select Image Folder"
            });
            
            console.log("Dialog result:", selected);
            
            if (selected === null) {
                // User cancelled the selection
                console.log("Selection cancelled");
                return;
            }
            
            const folderPath = selected as string;
            console.log("Selected folder path:", folderPath);
            
            // Get folder name from path
            const pathParts = folderPath.split(/[/\\]/);
            const name = pathParts[pathParts.length - 1];

            setFolderName(name);
            
            console.log("Reading directory contents...");
            try {
                // Read directory contents using Tauri FS API
                const entries = await readDir(folderPath);
                console.log("Directory entries:", JSON.stringify(entries, null, 2));
                
                // Log the type and properties of the first entry if available
                if (entries.length > 0) {
                    const firstEntry = entries[0];
                    console.log("First entry type:", typeof firstEntry);
                    console.log("First entry keys:", Object.keys(firstEntry));
                    console.log("First entry:", firstEntry);
                }
                
                // Filter for image files - treat entries as our DirEntry type
                const imageFiles = (entries as unknown as DirEntry[]).filter(entry => {
                    if (!entry.name) return false;
                    const ext = entry.name.split('.').pop()?.toLowerCase();
                    return ext === 'jpg' || ext === 'jpeg' || ext === 'png' || 
                           ext === 'gif' || ext === 'webp' || ext === 'bmp';
                });
                
                console.log("Image files found:", imageFiles);
                
                // Create file objects with name, path and size
                const processedFiles = imageFiles.map(entry => {
                    console.log("Processing entry:", entry);
                    // Construct the full path by joining the folder path with the file name
                    const fullPath = `${folderPath}/${entry.name}`;
                    return {
                        name: entry.name || "unknown",
                        path: fullPath, // Use the constructed full path
                        size: 0 // We don't have size, so default to 0
                    };
                });
                
                // Sort files by name to ensure consistent ordering
                const sortedFiles = naturalSort(processedFiles);
                console.log("Sorted files:", sortedFiles.map(f => f.name));
                
                setFiles(sortedFiles);
                
            } catch (fsError) {
                console.error("FS error:", fsError);
                alert(`Error reading directory: ${fsError}`);
            }
            
        } catch (error) {
            console.error("Error selecting folder:", error);
            alert(`Error selecting folder: ${error}`);
        }
    };

    // Process files and implement reordering algorithm
    const processFiles = async () => {
        if (files.length === 0) {
            alert("Please select files first");
            return;
        }
        
        setIsProcessing(true);
        
        try {
            // Implementation of the reordering algorithm from the requirements
            if (files.length > 0) {
                // Create a copy of files array to work with
                const filesCopy = [...files];
                const result = [];

                console.log('Files from the file system:', filesCopy)

                console.log("Input files (sorted by name):", filesCopy.map(f => f.name));

                // Step 1: Add the last element first
                result.push(filesCopy[filesCopy.length - 1]);

                // Step 2: Apply "skip 2, take 2" pattern going backwards
                const taken = new Set();
                taken.add(filesCopy.length - 1); // Mark last element as taken

                // Start from second-to-last element
                let i = filesCopy.length - 2;
                let skipCount = 0;

                while (i >= 0) {
                    if (skipCount < 2) {
                        // Skip this element
                        skipCount++;
                    } else {
                        // Take 2 elements
                        let takeCount = 0;
                        while (takeCount < 2 && i >= 0) {
                            result.push(filesCopy[i]);
                            taken.add(i);
                            takeCount++;
                            i--;
                        }
                        // Reset skip counter
                        skipCount = 0;
                        continue;
                    }
                    i--;
                }

                // Step 3: Add skipped elements in original order
                for (let i = 0; i < filesCopy.length; i++) {
                    if (!taken.has(i)) {
                        result.push(filesCopy[i]);
                    }
                }
                
                console.log("Original files:", filesCopy.map(f => f.name));
                console.log("Reordered files:", result.map(f => f.name));
                
                // Now rename files according to their new order
                try {
                    const updatedFiles = [];
                    for (let i = 0; i < result.length; i++) {
                        const file = result[i];
                        console.log("Processing file for rename:", file);
                        
                        if (!file.path) {
                            console.error(`File at index ${i} has no path:`, file);
                            continue; // Skip this file
                        }
                        
                        const folderDir = getDirectoryPath(file.path);
                        const extension = file.name.split('.').pop() || '';
                        const newName = `image_${(i + 1).toString().padStart(3, '0')}.${extension}`;
                        const newPath = `${folderDir}/${newName}`;
                        
                        console.log(`Renaming ${file.path} to ${newPath}`);
                        
                        try {
                            // Use rename function for Tauri v2
                            await rename(file.path, newPath);
                            
                            updatedFiles.push({
                                ...file,
                                name: newName,
                                path: newPath
                            });
                        } catch (renameErr) {
                            console.error(`Error renaming file ${file.path}:`, renameErr);
                            // Still add the original file to the result
                            updatedFiles.push(file);
                        }
                    }
                    
                    // Update the files array with the renamed files
                    setFiles(updatedFiles);
                    alert("Files reordered and renamed successfully!");
                    console.log("Renamed files:", updatedFiles.map(f => f.name));
                } catch (renameError) {
                    console.error("Error in rename process:", renameError);
                    alert(`Error in rename process: ${renameError}`);
                    
                    // Still update the UI with the reordered files
                    setFiles(result);
                }
            }
        } catch (error) {
            console.error("Error processing files:", error);
            alert(`Error processing files: ${error}`);
        } finally {
            setIsProcessing(false);
        }
    };

    // For dropzone UI consistency, but we'll actually use the Tauri dialog instead
    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop: () => {}, // We won't use this since we're using Tauri dialog
        noClick: true,
        accept: {
            'image/*': []
        }
    });

    return (
        <div className="w-full h-full flex flex-col items-center justify-between bg-white p-4">
            <AnimatePresence>
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="w-full justify-between flex items-center"
                >
                    <button
                        onClick={() => navigate("/")}
                        className="px-2 py-1 bg-neutral-200 shadow-md hover:shadow-lg hover:border-none border-none transition hover:scale-110"
                    >
                        <ArrowLeft className="w-4 h-4 text-neutral-950" />
                    </button>

                    <p>Put your files here</p>
                </motion.div>
            </AnimatePresence>

            <AnimatePresence>
                {files.length > 0 && (
                    <motion.div 
                        className="w-full"
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.3 }}
                    >
                        <motion.div 
                            className="w-full mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200"
                            initial={{ scale: 0.95 }}
                            animate={{ scale: 1 }}
                            transition={{ duration: 0.2 }}
                        >
                            <motion.h2 
                                className="text-xl font-semibold mb-2"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.1 }}
                            >
                                Selected: {folderName}
                            </motion.h2>
                            <motion.p 
                                className="text-gray-600 mb-4"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.2 }}
                            >
                                {files.length} image files found
                            </motion.p>
                            
                            <motion.div 
                                className="max-h-60 overflow-y-auto mb-4 p-2 border border-gray-200 rounded bg-white"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.3 }}
                            >
                                {files.slice(0, 10).map((file, index) => (
                                    <motion.div 
                                        key={index} 
                                        className="text-sm text-gray-600 py-1 flex justify-between"
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: 0.1 * index + 0.3 }}
                                    >
                                        <span>{file.name}</span>
                                        <span className="text-gray-400">({(file.size / 1024).toFixed(2)} KB)</span>
                                    </motion.div>
                                ))}
                                {files.length > 10 && (
                                    <motion.div 
                                        className="text-sm text-gray-500 py-1 italic text-center"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        transition={{ delay: 1.5 }}
                                    >
                                        ...and {files.length - 10} more files
                                    </motion.div>
                                )}
                            </motion.div>
                            
                            <div className="flex gap-2">
                                <motion.button 
                                    onClick={processFiles}
                                    className="bg-green-600 text-white font-medium py-1.5 px-4 text-sm rounded-md hover:bg-green-700 transition-colors"
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    disabled={isProcessing}
                                >
                                    {isProcessing ? "Processing..." : "Process Images"}
                                </motion.button>
                                
                                <motion.button 
                                    onClick={() => {
                                        setFiles([]);
                                        setFolderName("");
                                    }}
                                    className="bg-gray-500 text-white font-medium py-1.5 px-4 text-sm rounded-md hover:bg-gray-600 transition-colors"
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    disabled={isProcessing}
                                >
                                    Clear
                                </motion.button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <motion.div
                className="w-full flex-1"
                animate={{ scale: isDragActive ? 1.02 : 1 }}
                whileHover={{ boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)" }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
            >
                <div
                    ref={dropzoneRef}
                    {...getRootProps()}
                    className={`w-full h-full border-2 border-dashed rounded-lg p-10 cursor-pointer text-center flex items-center justify-center transition
                    ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-blue-400'}`}
                    style={{
                        borderColor: isDragActive ? '#2563eb' : '#d1d5db'
                    }}
                >
                    <input {...getInputProps()} />

                    <AnimatePresence mode="wait">
                        <motion.div 
                            key="inactive"
                            className="flex flex-col w-full h-full justify-center items-center"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                        >
                            <motion.p 
                                className="text-gray-500 mb-2"
                                initial={{ y: 10, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: 0.1 }}
                            >
                                Select a folder with image files
                            </motion.p>
                            <motion.button 
                                onClick={selectFolder}
                                className="bg-blue-600 text-white font-medium py-1.5 px-3 text-sm rounded-md hover:bg-blue-700 transition-colors"
                                initial={{ y: 10, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: 0.3 }}
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                disabled={isProcessing}
                            >
                                Select Folder
                            </motion.button>
                        </motion.div>
                    </AnimatePresence>
                </div>
            </motion.div>

            <motion.a
                onClick={() => navigate("/")}
                className="cursor-pointer w-full mt-8 text-center text-neutral-950 hover:text-neutral-800/80 hover:underline font-medium transition"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                whileHover={{ scale: 1.02 }}
            >
                Back to Home
            </motion.a>
        </div>
    );
}

export default Dashboard; 