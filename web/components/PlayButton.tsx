import React from 'react';
import { BsFillPlayFill } from 'react-icons/bs';
import { useRouter } from 'next/router';
import { navigateToWatch } from '../libs/watchNavigation';

interface PlayButtonProps {
  movieId: string ;
}

const PlayButton: React.FC<PlayButtonProps> = ({ movieId }) => {
  const router = useRouter();

  return (
    <button
      onClick={() => {
        void navigateToWatch(router, movieId);
      }}
      className="
        group
        bg-white
        rounded-md
        py-1 md:py-2
        px-2 md:px-4
        w-auto
        text-xs lg:text-lg
        font-semibold
        flex
        flex-row
        items-center
        hover:bg-neutral-200
        transition-all duration-200
        hover:-translate-y-1
        hover:shadow-[0_12px_26px_rgba(0,0,0,0.35)]
        "
    >
      <BsFillPlayFill className="w-4 md:w-7 text-black mr-1 transition-colors duration-200 group-hover:text-red-600" />
      <span className="text-black transition-colors duration-200 group-hover:text-red-600">
        Play
      </span>
    </button>
  );
}

export default PlayButton;
