import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { open } from "@tauri-apps/plugin-dialog";
import { readDir, rename } from "@tauri-apps/plugin-fs";
import { sep, dirname, basename } from '@tauri-apps/api/path';
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
                
                // Create file objects with name and path
                const processedFiles = imageFiles.map(entry => ({
                    name: entry.name || "unknown",
                    path: `${folderPath}/${entry.name}`,
                    size: 0
                }));
                
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
                    // Use platform-agnostic path handling
                    const folderPath = await dirname(files[0].path);
                    const folderName = await basename(folderPath);

                    let successCount = 0;
                    let errorCount = 0;

                    for (let i = 0; i < result.length; i++) {
                        const file = result[i];
                        const fileExt = file.name.split('.').pop() || '';
                        const newName = `${folderName}_${String(i + 1).padStart(3, '0')}.${fileExt}`;
                        const dirPath = await dirname(file.path);
                        const pathSeparator = await sep();
                        const newPath = `${dirPath}${pathSeparator}${newName}`;
                        
                        try {
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