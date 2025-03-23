import React, { useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useDropzone } from "react-dropzone";
import { motion, AnimatePresence } from "framer-motion";
import {ArrowLeft} from "lucide-react";

function Dashboard(): React.ReactElement {
    const navigate = useNavigate();
    const [files, setFiles] = useState<File[]>([]);
    const [folderName, setFolderName] = useState<string>("");
    const dropzoneRef = useRef<HTMLDivElement>(null);

    // Enhanced drag and drop handling
    const onDrop = useCallback((acceptedFiles: File[]) => {
        // Filter for image files
        const imageFiles = acceptedFiles.filter(file => {
            console.log("File type:", file.type);
            return file.type.startsWith('image/');
        });

        if (imageFiles.length > 0) {
            setFolderName("Dropped Images");
            setFiles(imageFiles);
        }
    }, []);

    // Direct DOM-level event handlers
    const handleNativeDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            const droppedFiles = Array.from(e.dataTransfer.files);
            
            const imageFiles = droppedFiles.filter(file => 
                file.type.startsWith('image/')
            );

            if (imageFiles.length > 0) {
                setFolderName("Dropped Images");
                setFiles(imageFiles);
            }
        }
    }, []);

    const handleNativeDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
    }, []);

    const handleNativeDragEnter = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
    }, []);

    // Configure dropzone
    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        noClick: true,
        accept: {
            'image/*': []
        }
    });

    // Handle folder selection via button
    const handleSelectFolder = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.webkitdirectory = true;
        input.multiple = true;
        
        input.onchange = (e) => {
            const target = e.target as HTMLInputElement;
            if (!target.files || target.files.length === 0) return;
            
            const allFiles = Array.from(target.files);
            const imageFiles = allFiles.filter(file => 
                file.type.startsWith('image/')
            );
            
            if (allFiles.length > 0 && allFiles[0].webkitRelativePath) {
                const filePath = allFiles[0].webkitRelativePath;
                const folder = filePath.split('/')[0];
                setFolderName(folder);
            } else {
                setFolderName("Selected Folder");
            }
            
            setFiles(imageFiles);
        };
        
        input.click();
    };

    const processFiles = () => {
        console.log("Processing files:", files);
        // TODO: Implement image renaming and sorting logic
    };

    return (
        <div className="w-full h-full flex flex-col gap-4 items-center justify-between bg-white p-4">
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
                                >
                                    Process Images
                                </motion.button>
                                
                                <motion.button 
                                    onClick={() => {
                                        setFiles([]);
                                        setFolderName("");
                                    }}
                                    className="bg-gray-500 text-white font-medium py-1.5 px-4 text-sm rounded-md hover:bg-gray-600 transition-colors"
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
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
                    onDrop={handleNativeDrop}
                    onDragOver={handleNativeDragOver}
                    onDragEnter={handleNativeDragEnter}
                    className={`w-full h-full border-2 border-dashed rounded-lg p-10 cursor-pointer text-center flex items-center justify-center transition
                    ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-blue-400'}`}
                    style={{
                        borderColor: isDragActive ? '#2563eb' : '#d1d5db'
                    }}
                >
                    <input {...getInputProps()} />
                    <AnimatePresence mode="wait">
                        {isDragActive ? (
                            <motion.p 
                                key="active"
                                className="text-blue-500 font-medium"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                            >
                                Drop your images here
                            </motion.p>
                        ) : (
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
                                    Drag and drop images here
                                </motion.p>
                                <motion.p 
                                    className="text-gray-400 text-sm"
                                    initial={{ y: 10, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    transition={{ delay: 0.2 }}
                                >
                                    or
                                </motion.p>
                                <motion.button 
                                    onClick={handleSelectFolder}
                                    className="bg-blue-600 text-white font-medium py-1.5 px-3 text-sm rounded-md hover:bg-blue-700 transition-colors"
                                    initial={{ y: 10, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    transition={{ delay: 0.3 }}
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                >
                                    Select Folder
                                </motion.button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </motion.div>
        </div>
    );
}

export default Dashboard; 