import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { open } from "@tauri-apps/plugin-dialog";
import { readDir, rename, exists } from "@tauri-apps/plugin-fs";
import { listen } from "@tauri-apps/api/event";
import {ArrowLeft, Loader2, FolderUp, RotateCcw} from "lucide-react";

// Define a file entry interface for our app
interface AppFileEntry {
  name: string;
  path: string;
  size: number;
}

// Define a rename history entry interface
interface RenameHistoryEntry {
  originalPath: string;
  newPath: string;
}

// Define our own DirEntry type based on the actual structure
interface DirEntry {
  name: string;
  path: string;
  children?: DirEntry[];
}

// Cross-platform path utility functions
const getLastSeparatorIndex = (path: string): number => {
    // Get the index of the last forward slash or backslash
    return Math.max(path.lastIndexOf('/'), path.lastIndexOf('\\'));
};

const extractDirectoryPath = (path: string): string => {
    // Extract the directory path from a full path
    const lastSeparatorIndex = getLastSeparatorIndex(path);
    return path.substring(0, lastSeparatorIndex);
};

const extractFolderName = (dirPath: string): string => {
    // Extract the folder name from a directory path
    const lastSeparatorIndex = getLastSeparatorIndex(dirPath);
    return dirPath.substring(lastSeparatorIndex + 1);
};

const detectPathSeparator = (path: string): string => {
    // Detect which path separator is used in the provided path
    return path.includes('\\') ? '\\' : '/';
};

const joinPaths = (dirPath: string, fileName: string): string => {
    // Join a directory path and filename using the appropriate separator
    const separator = detectPathSeparator(dirPath);
    return `${dirPath}${separator}${fileName}`;
};

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

function Dashboard(): React.ReactElement {
    const navigate = useNavigate();
    const [isProcessing, setIsProcessing] = useState<boolean>(false);
    const [isDragging, setIsDragging] = useState<boolean>(false);
    // State for undo functionality
    const [renameHistory, setRenameHistory] = useState<RenameHistoryEntry[]>([]);
    const [canUndo, setCanUndo] = useState<boolean>(false);
    const [isUndoing, setIsUndoing] = useState<boolean>(false);

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
        
        // Clear undo history if there's a new operation starting
        if (canUndo) {
            setRenameHistory([]);
            setCanUndo(false);
        }
        
        try {
            // Extract the paths array from the payload
            const droppedPaths = event.payload.paths || [];
            
            if (!droppedPaths || droppedPaths.length === 0) {
                alert("No valid folders were dropped.");
                setIsProcessing(false);
                return;
            }
            
            // Get the first path (we only support single folder drop)
            const folderPath = droppedPaths[0];
            
            // Check if path is valid
            if (!folderPath || typeof folderPath !== 'string') {
                alert("Invalid folder path received.");
                setIsProcessing(false);
                return;
            }
            
            // Process the dropped folder
            processDroppedFolder(folderPath);
        } catch (error) {
            console.error("Error in handleDragDropEvent:", error);
            alert(`Error processing dropped folder: ${error}`);
            setIsProcessing(false);
        }
    };
    
    // Process the dropped folder
    const processDroppedFolder = async (folderPath: string) => {
        try {
            try {
                // First try to read as a directory
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
                    alert("No supported image files found in the dropped folder.");
                    setIsProcessing(false);
                    return;
                }
                
                // Create file objects with properly constructed paths
                const processedFiles = imageFiles.map(entry => {
                    // Construct full path using cross-platform path joining
                    const fullPath = joinPaths(folderPath, entry.name || "");
                    
                    return {
                        name: entry.name || "unknown",
                        path: fullPath,
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
                // If reading as directory fails, the path might be a file
                // Extract the directory path and try again
                // Check if the path has a file extension
                const hasFileExtension = /\.\w+$/.test(folderPath);
                
                if (hasFileExtension) {
                    // It's a file, get its directory
                    const dirPath = extractDirectoryPath(folderPath);
                    
                    // Now try to read the directory
                    const entries = await readDir(dirPath);
                    
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
                        alert("No supported image files found in the parent directory.");
                        setIsProcessing(false);
                        return;
                    }
                    
                    // Create file objects with properly constructed paths
                    const processedFiles = imageFiles.map(entry => {
                        const fullPath = joinPaths(dirPath, entry.name || "");
                        return {
                            name: entry.name || "unknown",
                            path: fullPath,
                            size: 0
                        };
                    });
                    
                    // Sort files by name to ensure consistent ordering
                    const sortedFiles = naturalSort(processedFiles);
                    
                    // Process files
                    setTimeout(() => {
                        processFiles(sortedFiles);
                    }, 1000);
                } else {
                    // Not a file and not a readable directory
                    console.error("Error reading directory:", dirError);
                    alert(`Error reading directory: ${dirError}`);
                    setIsProcessing(false);
                }
            }
        } catch (fsError) {
            console.error("Error accessing filesystem:", fsError);
            alert(`Error accessing filesystem: ${fsError}`);
            setIsProcessing(false);
        }
    };
    
    // Function to select folder using Tauri dialog
    const selectFolder = async () => {
        try {
            // Clear undo history if there's a new operation starting
            if (canUndo) {
                const shouldProceed = window.confirm("Starting a new operation will clear the undo history. Do you want to proceed?");
                if (!shouldProceed) {
                    return;
                }
                setRenameHistory([]);
                setCanUndo(false);
            }

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
                    // Use cross-platform path joining
                    const fullPath = joinPaths(folderPath, entry.name || "");
                    return {
                        name: entry.name || "unknown",
                        path: fullPath,
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
                console.error("Error reading directory:", fsError);
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
                    console.error("File path is missing in file object:", files[0]);
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
                    // Use cross-platform path handling
                    // Extract directory path using our cross-platform helper
                    const dirPath = extractDirectoryPath(files[0].path);
                    
                    // Extract folder name using our cross-platform helper
                    const folderName = extractFolderName(dirPath);

                    let successCount = 0;
                    let errorCount = 0;
                    // Temporary array to store successful rename operations
                    const tempRenameHistory: RenameHistoryEntry[] = [];

                    for (let i = 0; i < result.length; i++) {
                        const file = result[i];
                        const fileExt = file.name.split('.').pop() || '';
                        const newName = `${folderName}_${String(i + 1).padStart(3, '0')}.${fileExt}`;
                        
                        // Extract directory path for this file
                        const fileDir = extractDirectoryPath(file.path);
                        
                        // Use cross-platform path joining
                        const newPath = joinPaths(fileDir, newName);
                        
                        try {
                            // Store original path before renaming
                            tempRenameHistory.push({
                                originalPath: file.path,
                                newPath: newPath
                            });
                            
                            // Use string parameters as required by Tauri API
                            await rename(file.path, newPath);
                            successCount++;
                        } catch (error) {
                            console.error("Failed to rename:", file.path, "to", newPath, error);
                            errorCount++;
                            // Remove the failed operation from history
                            tempRenameHistory.pop();
                        }
                    }

                    // Only update rename history if some renames were successful
                    if (successCount > 0) {
                        setRenameHistory(tempRenameHistory);
                        setCanUndo(true);
                    }

                    const message = errorCount > 0 
                        ? `Operation completed with ${successCount} successful and ${errorCount} failed renames.`
                        : "Files reordered and renamed successfully!";
                    alert(message);
                } catch (renameError) {
                    console.error("Rename process error:", renameError);
                    alert(`Error in rename process: ${renameError}`);
                }
            }
        } catch (error) {
            console.error("File processing error:", error);
            alert(`Error processing files: ${error}`);
        } finally {
            setIsProcessing(false);
        }
    };

    // Undo rename operations
    const undoRenames = async () => {
        if (renameHistory.length === 0) {
            alert("Nothing to undo.");
            return;
        }

        setIsUndoing(true);
        let successCount = 0;
        let errorCount = 0;
        let notFoundCount = 0;

        try {
            // Process rename history in reverse order
            for (let i = renameHistory.length - 1; i >= 0; i--) {
                const { originalPath, newPath } = renameHistory[i];
                
                try {
                    // Check if the new path still exists
                    const fileExists = await exists(newPath);
                    
                    if (!fileExists) {
                        console.error(`File not found: ${newPath}`);
                        notFoundCount++;
                        continue;
                    }

                    // Use string parameters as required by Tauri API
                    await rename(newPath, originalPath);
                    successCount++;
                } catch (error) {
                    console.error("Failed to undo rename:", error);
                    errorCount++;
                }
            }

            let message = `Undo completed with ${successCount} successful reversions.`;
            if (errorCount > 0 || notFoundCount > 0) {
                message += ` ${errorCount} operations failed.`;
                if (notFoundCount > 0) {
                    message += ` ${notFoundCount} files were not found (may have been moved or deleted).`;
                }
            }
            
            alert(message);
            
            // Clear the undo history if everything was successful
            if (errorCount === 0 && notFoundCount === 0) {
                setRenameHistory([]);
                setCanUndo(false);
            } else {
                // Remove successfully undone operations from history
                const updatedHistory = renameHistory.filter((_, index) => {
                    const reverseIndex = renameHistory.length - 1 - index;
                    return reverseIndex >= successCount;
                });
                setRenameHistory(updatedHistory);
                setCanUndo(updatedHistory.length > 0);
            }
            
        } catch (error) {
            console.error("Error during undo operation:", error);
            alert(`Error undoing renames: ${error}`);
        } finally {
            setIsUndoing(false);
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
                onClick={!isProcessing && !isUndoing ? selectFolder : undefined}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`w-full h-full border-2 border-dashed rounded-lg p-10 cursor-pointer text-center flex items-center justify-center transition ${isDragging ? 'border-electric bg-blue-50' : 'border-gray-300'}`}
            >
                <AnimatePresence mode="wait">
                    {!isProcessing && !isUndoing && <motion.div
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
                            disabled={isProcessing || isUndoing}
                        >
                            Select Folder
                        </motion.button>
                    </motion.div>}

                    {(isProcessing || isUndoing) && <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="flex gap-2 w-full h-full justify-center items-center"
                    >
                        <Loader2 className="w-5 h-5 animate-spin text-neutral-950 opacity-80" />
                        <p className="text-neutral-950 opacity-80 font-medium">
                            {isProcessing ? "Processing files..." : "Undoing changes..."}
                        </p>
                    </motion.div>}
                </AnimatePresence>
            </div>

            {/* Show operation stats */}
            {canUndo && !isUndoing && !isProcessing && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="w-full flex justify-between items-center"
                >
                    <p className="text-sm text-neutral-950">
                        <span className="font-medium">{renameHistory.length}</span> file(s) were renamed in the last operation.
                    </p>

                    {/* Undo button */}
                    {canUndo && (
                        <motion.button
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            onClick={undoRenames}
                            disabled={isUndoing || isProcessing}
                            className="flex items-center gap-1 px-3 py-1 text-neutral-950 bg-neutral-200 shadow-md hover:shadow-lg hover:border-none border-none transition hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isUndoing ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <RotateCcw className="w-4 h-4" />
                            )}
                            <span className="text-sm font-medium">Undo</span>
                        </motion.button>
                    )}
                </motion.div>
            )}
        </div>
    );
}

export default Dashboard; 