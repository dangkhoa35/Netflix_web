import {signOut} from "next-auth/react"
import React from 'react';
import { useRouter } from 'next/router';
import { IoSettingsOutline } from 'react-icons/io5';
import { AiOutlineLogout } from 'react-icons/ai';

import { getHeaderAvatarSrc } from "../libs/displayAvatar";
import { useAppSelector} from "../store/index";

interface AccountMenuPorps {
    visible?: boolean;
}
const AccountMenu:React.FC<AccountMenuPorps> = ({visible}) => {
    const currentUser = useAppSelector((state) => state.profile.profile);
    const router = useRouter();
    const headerAvatarSrc = getHeaderAvatarSrc(currentUser?.image);
    
    if(!visible){
        return null;
    }

    const handleSettings = () => {
        router.push('/settings');
    };

    return (
        <div className="absolute bg-black/95 backdrop-blur-md w-56 top-14 right-0 py-2 flex-col border-gray-800 border-2 rounded-lg shadow-2xl z-50">
            <div className="flex flex-col gap-1">
                {/* User Info Section */}
                <div className="px-4 py-3 border-b border-gray-700">
                    <div className="flex flex-row gap-3 items-center w-full">
                        <img 
                            className="w-10 h-10 rounded-md flex-shrink-0" 
                            src={headerAvatarSrc}
                            alt="Profile pic"
                        />
                        <div className="flex-1 min-w-0">
                            <p className="text-white font-semibold truncate text-sm">
                                {currentUser?.name || "Người dùng"}
                            </p>
                            <p className="text-gray-400 text-xs truncate">
                                {currentUser?.email || ""}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Settings Section */}
                <button
                    onClick={handleSettings}
                    className="px-4 py-3 text-left flex items-center gap-3 text-white hover:bg-white/10 transition-colors duration-150"
                >
                    <IoSettingsOutline className="w-5 h-5 flex-shrink-0" />
                    <span className="text-sm font-medium">Cài đặt</span>
                </button>

                {/* Divider */}
                <hr className="bg-gray-700 border-0 h-px my-1"/>

                {/* Sign Out Button */}
                <button
                    onClick={() => signOut({ redirect: true, callbackUrl: '/auth' })}
                    className="px-4 py-3 text-left flex items-center gap-3 text-red-400 hover:bg-red-500/10 transition-colors duration-150 rounded-b-md"
                >
                    <AiOutlineLogout className="w-5 h-5 flex-shrink-0" />
                    <span className="text-sm font-medium">Đăng xuất</span>
                </button>
            </div>
        </div>
    )
}

export default AccountMenu 
