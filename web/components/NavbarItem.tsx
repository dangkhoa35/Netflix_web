import React from "react";
import { useRouter } from "next/router";
import { motion } from "framer-motion";

interface NavbarItemProps {
    label: string;
    href?: string;
}

const NavbarItem: React.FC<NavbarItemProps> = ({label, href}) => {
    const router = useRouter();
    
    const getHref = () => {
        if (href) return href;
        
        switch(label) {
            case "Trang chủ":
                return "/";
            case "Phim bộ":
                return "/series";
            case "Phim lẻ":
                return "/films";
            case "Mới & Phổ biến":
                return "/new";
            case "Danh sách của tôi":
                return "/my-list";
            case "Theo ngôn ngữ":
                return "/languages";
            default:
                return "/";
        }
    };

    const handleClick = (e: React.MouseEvent) => {
        e.preventDefault();
        router.push(getHref());
    };

    const isActive = router.pathname === getHref();

    return (
        <div
            onClick={handleClick}
            className={`
                relative px-4 py-2 cursor-pointer transition-colors duration-200
                ${isActive ? "text-white" : "text-white/60 hover:text-white"}
            `}
        >
            <span className="relative z-10 text-sm font-medium">
                {label}
            </span>
            {isActive && (
                <motion.div
                    layoutId="active-pill"
                    className="absolute inset-0 bg-white/10 rounded-full"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                />
            )}
        </div>
    )
}

export default NavbarItem
