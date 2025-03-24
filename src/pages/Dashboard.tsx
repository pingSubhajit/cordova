import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { open } from "@tauri-apps/plugin-dialog";
import { readDir, rename } from "@tauri-apps/plugin-fs";
import {ArrowLeft, Loader2} from "lucide-react";

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
    const [isProcessing, setIsProcessing] = useState<boolean>(false);

    // Function to select folder using Tauri dialog
    const selectFolder = async () => {
        try {
            console.log("Opening folder dialog...");
            setIsProcessing(true);

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
                setIsProcessing(false);
                return;
            }
            
            const folderPath = selected as string;
            console.log("Selected folder path:", folderPath);
            
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
                           ext === 'gif' || ext === 'webp' || ext === 'bmp' ||
                           ext === 'tif' || ext === 'tiff' || ext === 'svg' ||
                           ext === 'heif' || ext === 'heic' || ext === 'raw' ||
                           ext === 'cr2' || ext === 'nef' || ext === 'arw' ||
                           ext === 'dng' || ext === 'avif' || ext === 'jxr' ||
                           ext === 'jp2' || ext === 'j2k' || ext === 'psd';
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

                // Process files immediately after selection
                setTimeout(() => {
                    processFiles(sortedFiles);
                }, 1000);
                
            } catch (fsError) {
                console.error("FS error:", fsError);
                alert(`Error reading directory: ${fsError}`);
            }
            
        } catch (error) {
            console.error("Error selecting folder:", error);
            alert(`Error selecting folder: ${error}`);
            setIsProcessing(false);
        }
    };

    // Process files and implement reordering algorithm
    const processFiles = async (files: AppFileEntry[]) => {
        if (files.length === 0) {
            alert("Please select files first");
            return;
        }
        
        try {
            // Implementation of the reordering algorithm from the requirements
            if (files.length > 0) {
                // Create a copy of files arrays to work with
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
                    // Extract the folder name to use as prefix
                    const folderPath = files[0].path.substring(0, files[0].path.lastIndexOf('/'));
                    const folderName = folderPath.split('/').pop() || 'image';
                    console.log(`Using folder name "${folderName}" as prefix`);

                    let successCount = 0;
                    let errorCount = 0;

                    for (let i = 0; i < result.length; i++) {
                        const file = result[i];
                        const fileExt = file.name.split('.').pop() || '';
                        // Use folder name as prefix instead of "image_"
                        const newName = `${folderName}_${String(i + 1).padStart(3, '0')}.${fileExt}`;
                        const dirPath = file.path.substring(0, file.path.lastIndexOf('/'));
                        const newPath = `${dirPath}/${newName}`;
                        
                        try {
                            console.log(`Renaming ${file.path} to ${newPath}`);
                            await rename(file.path, newPath);
                            successCount++;
                        } catch (error) {
                            console.error(`Error renaming file: ${error}`);
                            errorCount++;
                        }
                    }

                    alert("Files reordered and renamed successfully!");
                    console.log("Renamed files:", result.map(f => f.name));
                } catch (renameError) {
                    console.error("Error in rename process:", renameError);
                    alert(`Error in rename process: ${renameError}`);
                }
            }
        } catch (error) {
            console.error("Error processing files:", error);
            alert(`Error processing files: ${error}`);
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="w-full h-full flex flex-col items-center justify-between bg-white p-4 gap-4">
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

                    <p onClick={() => navigate("/dashboard")} className="uppercase font-bold text-neutral-950 text-2xl">Cordova</p>

                    <p
                        className="text-neutral-950 opacity-80 font-medium cursor-pointer hover:underline hover:opacity-100 underline-offset-2 transition"
                        onClick={() => navigate("/about")}
                    >About</p>
                </motion.div>
            </AnimatePresence>

            <div
                onClick={selectFolder}
                className="w-full h-full border-2 border-dashed rounded-lg p-10 cursor-pointer text-center flex items-center justify-center transition"
            >
                <AnimatePresence mode="wait">
                    {!isProcessing && <motion.div
                        key="inactive"
                        className="flex flex-col w-full h-full justify-center items-center"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        <motion.p
                            className="text-neutral-950 opacity-80 font-medium mb-2"
                            initial={{ y: 10, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.1 }}
                        >
                            Select a folder with image files
                        </motion.p>
                        <motion.button
                            className="bg-electric text-white font-medium py-1.5 px-3 text-sm rounded-md hover:bg-electric/90 transition-colors hover:scale-110"
                            initial={{ y: 10, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.3 }}
                            disabled={isProcessing}
                        >
                            Select Folder
                        </motion.button>
                    </motion.div>}

                    {isProcessing && <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="flex gap-2 w-full h-full justify-center items-center"
                    >
                        <Loader2 className="w-5 h-5 animate-spin text-neutral-950 opacity-80" />
                        <p className="text-neutral-950 opacity-80 font-medium">Processing files...</p>
                    </motion.div>}
                </AnimatePresence>
            </div>
        </div>
    );
}

export default Dashboard; 