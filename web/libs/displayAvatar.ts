const DEFAULT_BLUE_AVATAR = "/images/default-blue.png";
export const DEFAULT_AVATAR_SRC = DEFAULT_BLUE_AVATAR;

export const getHeaderAvatarSrc = (image?: string | null) => {
  if (image && image.trim() !== "") return image;
  return DEFAULT_BLUE_AVATAR;
};
