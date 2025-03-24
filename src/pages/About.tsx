import React from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {ArrowLeft} from "lucide-react";

function Dashboard(): React.ReactElement {
    const navigate = useNavigate();

    return (
        <div className="w-full h-full flex flex-col items-center justify-between bg-white p-4 gap-4">
            <AnimatePresence>
                <motion.div
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
                className="w-full h-full p-10 flex items-center justify-center transition"
            >
                <AnimatePresence mode="wait">
                    <motion.div
                        initial={{ y: 10, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        className="flex flex-col gap-6 w-full max-w-2xl"
                    >
                        <div className="space-y-4">
                            <section className="bg-neutral-50 p-6 rounded-lg shadow-sm">
                                <h2 className="text-lg font-semibold text-neutral-950 mb-2">What is Cordova?</h2>
                                <p className="text-neutral-700 leading-relaxed">
                                    Cordova is a small utility to sort the pages of books scanned with a double-sided scanner. It is designed to be simple and easy to use, and aims to reduce as much friction and manual work possible to sort through pages.
                                </p>
                            </section>

                            <section className="bg-neutral-50 p-6 rounded-lg shadow-sm">
                                <h2 className="text-lg font-semibold text-neutral-950 mb-2">Get Started</h2>
                                <p className="text-neutral-700 leading-relaxed">
                                    Just click on the "CORDOVA" logo above and select the folder where you have the image files that need to be sorted. The specific pattern is already fed into the application.
                                </p>
                            </section>

                            <footer className="text-center text-neutral-500 text-sm mt-8">
                                <p>Version 1.0.0</p>
                                <p>A product by <span className="font-medium text-neutral-950">Subhajit Kundu</span></p>
                            </footer>
                        </div>
                    </motion.div>
                </AnimatePresence>
            </div>
        </div>
    );
}

export default Dashboard;