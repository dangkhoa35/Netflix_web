import type { GetServerSidePropsContext } from "next";
import Head from "next/head"
import { getServerSession } from "next-auth";
import { signOut } from "next-auth/react";
import { authOptions } from "../libs/authOptions";
import { useRouter } from "next/router";
import { useCallback, useEffect, useState } from "react";
import { profileActions } from "../store/profile";
import { useAppDispatch} from "../store/index";

import useCurrentUser from "../hooks/useCurrentUser";
import { DEFAULT_AVATAR_SRC, getHeaderAvatarSrc } from "../libs/displayAvatar";

interface UserCardProps {
  name: string;
  imgSrc: string;
}

export async function getServerSideProps(context: GetServerSidePropsContext) {
  const session = await getServerSession(context.req, context.res, authOptions);

  if (!session) {
    return {
      redirect: {
        destination: '/auth',
        permanent: false,
      }
    }
  }

  // Don't auto-redirect to home - profiles is the account selector page
  return {
    props: {}
  }
}

const UserCard: React.FC<UserCardProps> = ({ name, imgSrc }) => {
  return (
    <div className="group flex-row w-32 md:w-44 mx-auto">
        <div className="w-32 h-32 md:w-44 md:h-44 rounded-md flex items-center justify-center border-2 border-transparent group-hover:cursor-pointer group-hover:border-white overflow-hidden transition-all duration-200">
          <img draggable={false} className="w-full h-full object-cover" src={imgSrc} alt={name} />
        </div>
      <div className="mt-4 text-gray-400 text-lg md:text-2xl text-center group-hover:text-white truncate">{name}</div>
   </div>
  );
}

const Profile = () => {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { data: currentUser } = useCurrentUser();
  const [profiles, setProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentUser?.id) {
      dispatch(profileActions.updateProfile(currentUser));
    }
  }, [currentUser?.id, dispatch])

  useEffect(() => {
    const fetchProfiles = async () => {
      try {
        const res = await fetch('/api/profile-list');
        if (res.ok) {
          const data = await res.json();
          setProfiles(data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchProfiles();
  }, []);

  const selectProfile = useCallback((profile?: any) => {
    // For now, selecting any profile just sets the current user's intro state
    router.push('/?intro=1');
  }, [router]);

  const handleLogout = useCallback(async () => {
    await signOut({ callbackUrl: '/auth' });
  }, []);

  return (
    <>
    <Head>
        <link rel="shortcut icon" href={DEFAULT_AVATAR_SRC} />
        <title>{currentUser?.name}</title>
    </Head>
    <div className="flex items-center h-full justify-center relative bg-black">
      <button
        onClick={() => router.back()}
        className="absolute top-6 left-6 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded transition-colors"
      >
        Quay lại
      </button>
      <button
        onClick={handleLogout}
        className="absolute top-6 right-6 px-4 py-2 bg-red-700 hover:bg-red-600 text-white rounded transition-colors"
      >
        Đăng xuất
      </button>
      <div className="flex flex-col">
        <h1 className="text-3xl md:text-6xl text-white text-center">Who&#39;s watching?</h1>
        <div className="flex items-center justify-center flex-wrap gap-4 md:gap-8 mt-10">
          {loading ? (
            <div className="text-white">Loading...</div>
          ) : profiles.length > 0 ? (
            profiles.map((profile) => (
              <div key={profile.id} onClick={() => selectProfile(profile)}>
                <UserCard
                  name={profile.name}
                  imgSrc={getHeaderAvatarSrc(profile.image)}
                />
              </div>
            ))
          ) : (
            <div onClick={() => selectProfile()}>
              <UserCard
                name={currentUser?.name || "User"}
                imgSrc={getHeaderAvatarSrc(currentUser?.image)}
              />
            </div>
          )}
        </div>
      </div>
    </div>
    </>
  );
}

export default Profile;
