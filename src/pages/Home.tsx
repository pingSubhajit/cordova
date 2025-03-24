import React from "react";
import { useNavigate } from "react-router-dom";
import bg from "../assets/bg.svg";
import { motion } from "framer-motion";

function Home(): React.ReactElement {
    const navigate = useNavigate();

    const handleGetStarted = () => {
        navigate("/dashboard");
    };

    return (
        <div className="w-full h-full flex flex-col items-center justify-between pb-3 bg-white">
            <motion.div 
                className="w-full h-[500px] relative flex flex-col items-center justify-center gap-6 p-16 text-center text-white"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.8 }}
            >
                {/* Background Pattern */}
                <motion.img 
                    src={bg} 
                    alt="Background Pattern" 
                    className="absolute inset-0 w-full h-full object-cover"
                    initial={{ scale: 1.1 }}
                    animate={{ scale: 1 }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                />
                
                {/* Logo */}
                <motion.div 
                    className="z-10"
                    initial={{ y: -20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.5, delay: 0.3 }}
                >
                    <svg width="65" height="72" viewBox="0 0 67 73" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <circle cx="60.7991" cy="35.9237" r="5.68066" fill="white"/>
                        <path d="M31.831 0C34.0903 0 36.1237 0.387317 37.9312 1.16195C39.8033 1.87203 41.5139 2.67895 43.0632 3.58269C44.677 4.48643 46.194 5.32561 47.6142 6.10025C49.0343 6.81033 50.4868 7.16537 51.9715 7.16537C53.1334 7.10082 54.4568 6.93944 55.9415 6.68122C57.2325 6.42301 58.7173 6.0357 60.3956 5.51927C62.1386 4.9383 64.0751 4.09911 66.2054 3.00171C64.0751 5.0674 62.3322 6.81033 60.9766 8.23049C59.6855 9.58611 58.685 10.7158 57.9749 11.6195C57.1357 12.6524 56.5225 13.4593 56.1351 14.0403C55.7478 14.7503 55.1668 15.8155 54.3922 17.2356C53.6821 18.5267 52.7138 20.2696 51.4873 22.4644C50.2608 24.5947 48.7116 27.4027 46.8395 30.8886C46.8395 26.4344 46.3877 22.9808 45.4839 20.5278C44.6447 18.0748 43.7087 16.2028 42.6759 14.9117C41.4494 13.427 40.0615 12.491 38.5122 12.1037C37.092 11.91 35.6719 12.1682 34.2517 12.8783C32.8315 13.5238 31.4114 14.4921 29.9912 15.7832C28.6356 17.0742 27.3123 18.6235 26.0212 20.431C24.7947 22.1739 23.665 24.0137 22.6322 25.9503C21.6639 27.8869 20.857 29.8557 20.2115 31.8569C19.5659 33.7934 19.1463 35.6009 18.9527 37.2793C18.759 38.764 18.7267 40.5069 18.8558 42.5081C18.9849 44.4447 19.2754 46.4458 19.7273 48.5115C20.1792 50.5126 20.7602 52.4815 21.4702 54.4181C22.1803 56.3547 23.0518 58.0976 24.0846 59.6469C25.182 61.1316 26.4085 62.3581 27.7641 63.3264C29.1198 64.2301 30.669 64.6497 32.4119 64.5852C34.3485 64.4561 36.2528 63.8751 38.1249 62.8422C39.7387 62.0031 41.3848 60.712 43.0632 58.9691C44.7416 57.1616 46.194 54.6117 47.4205 51.3196L61.7512 53.9339C57.6199 58.9691 53.5853 62.7454 49.6476 65.263C45.7744 67.7805 42.2885 69.5557 39.19 70.5886C35.575 71.7505 32.1537 72.2992 28.9261 72.2347C24.8593 71.7828 21.0506 70.5563 17.5002 68.5552C13.9498 66.554 10.8836 64.1333 8.30144 61.293C5.78388 58.3881 3.81501 55.225 2.39485 51.8037C0.974686 48.3824 0.361433 45.0256 0.555092 41.7334C0.684198 39.5386 1.13607 36.9888 1.9107 34.0839C2.68534 31.1145 3.71818 28.0805 5.00924 24.982C6.36485 21.8834 7.97868 18.8494 9.85071 15.88C11.7227 12.9106 13.7884 10.2639 16.0478 7.94001C18.3071 5.55155 20.7602 3.64724 23.4068 2.22707C26.118 0.742358 28.9261 0 31.831 0Z" fill="white"/>
                    </svg>
                </motion.div>

                {/* Title */}
                <motion.h1 
                    className="text-6xl font-bold z-10"
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.5, delay: 0.5 }}
                >
                    Sort, effortlessly
                </motion.h1>

                {/* Subtitle */}
                <motion.p 
                    className="text-xl max-w-96 z-10"
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.5, delay: 0.7 }}
                >
                    Easily rename, sort and manage scanned documents based on presets
                </motion.p>

            </motion.div>

           {/* Button */}
           <motion.button
               onClick={handleGetStarted}
               className="bg-peacock text-white font-medium py-3 px-16 rounded-xl hover:bg-peacock/90 transition"
               initial={{ opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
               transition={{ duration: 0.6, delay: 1.1 }}
               whileHover={{ scale: 1.05 }}
               whileTap={{ scale: 0.95 }}
           >
               Get Started
           </motion.button>

           {/* Footer */}
           <motion.div 
               className="text-xs text-neutral-950 opacity-80 font-medium"
               initial={{ opacity: 0 }}
               animate={{ opacity: 0.8 }}
               transition={{ duration: 0.8, delay: 1.3 }}
           >
               A product by Subhajit Kundu
           </motion.div>
        </div>
    );
}

export default Home; 