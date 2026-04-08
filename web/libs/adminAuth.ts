const parseAdminEmails = (): string[] => {
  const raw = process.env.ADMIN_EMAILS || "";
  return raw
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
};

export const isAdminEmail = (email?: string | null): boolean => {
  if (!email) return false;
  const adminEmails = parseAdminEmails();
  if (adminEmails.length === 0) return false;
  return adminEmails.includes(email.trim().toLowerCase());
};

