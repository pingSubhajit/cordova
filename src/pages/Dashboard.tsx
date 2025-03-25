import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { open } from "@tauri-apps/plugin-dialog";
import { readDir, rename } from "@tauri-apps/plugin-fs";
import { listen } from "@tauri-apps/api/event";
import {ArrowLeft, Loader2, FolderUp} from "lucide-react";

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
    const result = [...arr];

    return result.sort((a, b) => {
        if (!a.name) return -1;
        if (!b.name) return 1;

        const nameA = a.name.toString();
        const nameB = b.name.toString();

        const chunksA = nameA.split(/(\d+)/).filter(Boolean);
        const chunksB = nameB.split(/(\d+)/).filter(Boolean);

        const minLength = Math.min(chunksA.length, chunksB.length);

        for (let i = 0; i < minLength; i++) {
            const chunkA = chunksA[i];
            const chunkB = chunksB[i];

            const isNumA = /^\d+$/.test(chunkA);
            const isNumB = /^\d+$/.test(chunkB);

            if (isNumA && isNumB) {
                const numA = parseInt(chunkA, 10);
                const numB = parseInt(chunkB, 10);

                if (numA !== numB) {
                    return numA - numB;
                }
            } else {
                const strCompare = chunkA.localeCompare(chunkB, undefined, {sensitivity: 'base'});

                if (strCompare !== 0) {
                    return strCompare;
                }
            }
        }

        return chunksA.length - chunksB.length;
    });
}

// Helper function to handle paths cross-platform
const extractDirectoryPath = (path: string): string => {
    // Handle both forward slashes and backslashes (for Windows)
    const lastForwardSlash = path.lastIndexOf('/');
    const lastBackslash = path.lastIndexOf('\\');
    const lastSlashIndex = Math.max(lastForwardSlash, lastBackslash);
    
    if (lastSlashIndex > 0) {
        return path.substring(0, lastSlashIndex);
    }
    return path;
};

// Helper function to join paths in a cross-platform way
const joinPaths = (directory: string, filename: string): string => {
    // Determine which slash type the path uses (prefer what's already in the path)
    const separator = directory.includes('\\') ? '\\' : '/';
    return `${directory}${separator}${filename}`;
};

function Dashboard(): React.ReactElement {
    const navigate = useNavigate();
    const [isProcessing, setIsProcessing] = useState<boolean>(false);
    const [isDragging, setIsDragging] = useState<boolean>(false);

    // Set up the file drop listener
    useEffect(() => {
        // Add a general event listener to track all events
        const unlistenAll = listen("tauri://event", () => {});

        // Try multiple possible events for Tauri drag and drop
        const listeners: Promise<() => void>[] = [];
        
        // Original event name for v2
        listeners.push(listen("tauri://drag-drop", handleDragDropEvent));
        
        // Alternative event names that might be used
        listeners.push(listen("tauri://file-drop", handleDragDropEvent));
        listeners.push(listen("tauri://drop", handleDragDropEvent));
        listeners.push(listen("tauri://drop-files", handleDragDropEvent));
        
        // Clean up the listeners when the component unmounts
        return () => {
            listeners.forEach(listener => listener.then((fn: () => void) => fn()));
            unlistenAll.then((fn: () => void) => fn());
        };
    }, [isProcessing]);

    // Handle drag drop event from Tauri
    const handleDragDropEvent = async (event: any) => {
        if (isProcessing) return;
        
        setIsDragging(false);
        setIsProcessing(true);
        
        try {
            // Extract the paths array from the payload
            const droppedPaths = event.payload.paths || [];
            
            if (!droppedPaths || droppedPaths.length === 0) {
                alert("No valid folders were dropped.");
                setIsProcessing(false);
                return;
            }
            
            // Get the first path (we only support single folder drop)
            const path = droppedPaths[0];

            // Check if path is valid
            if (!path || typeof path !== 'string') {
                alert("Invalid path received.");
                setIsProcessing(false);
                return;
            }
            
            // Extract directory path
            let folderPath = path;
            
            // Check if the path looks like a file rather than a directory
            const hasFileExtension = /\.[a-zA-Z0-9]+$/.test(path);
            if (hasFileExtension) {
                // Extract the parent directory path using our helper function
                folderPath = extractDirectoryPath(path);
            }
            
            // Process the extracted directory path
            processDroppedFolder(folderPath);
        } catch (error) {
            alert(`Error processing dropped folder: ${error}`);
            setIsProcessing(false);
        }
    };
    
    // Process the dropped folder
    const processDroppedFolder = async (folderPath: string) => {
        try {
            // First, check if the path exists and is a directory before attempting to read
            try {
                // Pass string path directly as required by Tauri API
                const entries = await readDir(folderPath);
                
                // Filter for image files
                const imageFiles = (entries as unknown as DirEntry[]).filter(entry => {
                    if (!entry.name) return false;
                    const ext = entry.name.split('.').pop()?.toLowerCase();
                    return [
                        'jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp',
                        'tif', 'tiff', 'svg', 'heif', 'heic', 'raw',
                        'cr2', 'nef', 'arw', 'dng', 'avif', 'jxr',
                        'jp2', 'j2k', 'psd'
                    ].includes(ext || '');
                });

                if (imageFiles.length === 0) {
                    alert("No supported image files found in the folder.");
                    setIsProcessing(false);
                    return;
                }
                
                // Create file objects with properly constructed paths
                const processedFiles = imageFiles.map(entry => {
                    // Construct full path by joining folder path and filename
                    const fullPath = joinPaths(folderPath, entry.name);
                    
                    return {
                        name: entry.name || "unknown",
                        path: fullPath,  // Use the constructed full path
                        size: 0
                    };
                });
                
                // Sort files by name to ensure consistent ordering
                const sortedFiles = naturalSort(processedFiles);

                // Process files immediately after selection
                setTimeout(() => {
                    processFiles(sortedFiles);
                }, 1000);
                
            } catch (dirError) {
                // Check if the error contains a specific message about not being a directory
                const errorMessage = String(dirError);
                if (errorMessage.includes("Not a directory")) {
                    alert("Please drop a folder, not a file. If you dropped a file, try dropping its parent folder instead.");
                } else {
                    alert(`Error reading directory: ${dirError}`);
                }
                setIsProcessing(false);
            }
        } catch (fsError) {
            alert(`Error processing folder: ${fsError}`);
            setIsProcessing(false);
        }
    };
    
    // Function to select folder using Tauri dialog
    const selectFolder = async () => {
        try {
            setIsProcessing(true);

            const selected = await open({
                directory: true,
                multiple: false,
                title: "Select Image Folder"
            });
            
            if (!selected) {
                setIsProcessing(false);
                return;
            }
            
            const folderPath = selected as string;
            
            try {
                // Use string path directly as required by Tauri API
                const entries = await readDir(folderPath);
                
                // Filter for image files
                const imageFiles = (entries as unknown as DirEntry[]).filter(entry => {
                    if (!entry.name) return false;
                    const ext = entry.name.split('.').pop()?.toLowerCase();
                    return [
                        'jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp',
                        'tif', 'tiff', 'svg', 'heif', 'heic', 'raw',
                        'cr2', 'nef', 'arw', 'dng', 'avif', 'jxr',
                        'jp2', 'j2k', 'psd'
                    ].includes(ext || '');
                });
                
                if (imageFiles.length === 0) {
                    alert("No supported image files found in the selected folder.");
                    setIsProcessing(false);
                    return;
                }
                
                // Create file objects with properly constructed paths
                const processedFiles = imageFiles.map(entry => {
                    // Construct full path by joining folder path and filename
                    const fullPath = joinPaths(folderPath, entry.name);
                    return {
                        name: entry.name || "unknown",
                        path: fullPath,  // Use the constructed full path
                        size: 0
                    };
                });
                
                // Sort files by name to ensure consistent ordering
                const sortedFiles = naturalSort(processedFiles);

                // Process files immediately after selection
                setTimeout(() => {
                    processFiles(sortedFiles);
                }, 1000);
                
            } catch (fsError) {
                alert(`Error reading directory: ${fsError}`);
                setIsProcessing(false);
            }
            
        } catch (error) {
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
            if (files.length > 0) {
                // Check if files have valid paths
                if (!files[0].path) {
                    alert("File path is missing. Cannot process files.");
                    setIsProcessing(false);
                    return;
                }
                
                const filesCopy = [...files];
                const result = [];

                // Step 1: Add the last element first
                result.push(filesCopy[filesCopy.length - 1]);

                // Step 2: Apply "skip 2, take 2" pattern going backwards
                const taken = new Set();
                taken.add(filesCopy.length - 1);

                let i = filesCopy.length - 2;
                let skipCount = 0;

                while (i >= 0) {
                    if (skipCount < 2) {
                        skipCount++;
                    } else {
                        let takeCount = 0;
                        while (takeCount < 2 && i >= 0) {
                            result.push(filesCopy[i]);
                            taken.add(i);
                            takeCount++;
                            i--;
                        }
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
                
                try {
                    // Extract directory path manually by removing everything after the last slash
                    const filePath = files[0].path;
                    const dirPath = extractDirectoryPath(filePath);
                    
                    // Extract folder name manually
                    // Use the lastIndexOf with both slash types
                    const lastForwardSlash = dirPath.lastIndexOf('/');
                    const lastBackslash = dirPath.lastIndexOf('\\');
                    const lastSlashIndex = Math.max(lastForwardSlash, lastBackslash);
                    const folderName = dirPath.substring(lastSlashIndex + 1);

                    let successCount = 0;
                    let errorCount = 0;

                    for (let i = 0; i < result.length; i++) {
                        const file = result[i];
                        const fileExt = file.name.split('.').pop() || '';
                        const newName = `${folderName}_${String(i + 1).padStart(3, '0')}.${fileExt}`;
                        
                        // Extract directory path for this file
                        const fileDir = extractDirectoryPath(file.path);
                        
                        // Join the paths using our cross-platform helper
                        const newPath = joinPaths(fileDir, newName);
                        
                        try {
                            // Use string parameters instead of an object for rename
                            await rename(file.path, newPath);
                            successCount++;
                        } catch (error) {
                            errorCount++;
                        }
                    }

                    const message = errorCount > 0 
                        ? `Operation completed with ${successCount} successful and ${errorCount} failed renames.`
                        : "Files reordered and renamed successfully!";
                    alert(message);
                } catch (renameError) {
                    alert(`Error in rename process: ${renameError}`);
                }
            }
        } catch (error) {
            alert(`Error processing files: ${error}`);
        } finally {
            setIsProcessing(false);
        }
    };

    // Handle drag events for visual feedback only
    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        if (!isDragging) setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        // The actual file processing is handled by the Tauri event listener
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
                onClick={!isProcessing ? selectFolder : undefined}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`w-full h-full border-2 border-dashed rounded-lg p-10 cursor-pointer text-center flex items-center justify-center transition ${isDragging ? 'border-electric bg-blue-50' : 'border-gray-300'}`}
            >
                <AnimatePresence mode="wait">
                    {!isProcessing && <motion.div
                        key="inactive"
                        className="flex flex-col w-full h-full justify-center items-center"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        <motion.div
                            className="mb-4"
                            initial={{ y: 10, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.1 }}
                        >
                            <FolderUp className="w-12 h-12 text-neutral-400 mx-auto mb-2" />
                        </motion.div>
                        <motion.p
                            className="text-neutral-950 opacity-80 font-medium mb-2"
                            initial={{ y: 10, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.2 }}
                        >
                            {isDragging ? "Drop folder here" : "Drag & drop a folder or click to browse"}
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