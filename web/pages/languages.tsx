import React, { useMemo, useState } from "react";
import { GetServerSidePropsContext } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "../libs/authOptions";
import useMovieList from "../hooks/useMovieList";
import Navbar from "../components/Navbar";
import MovieList from "../components/MovieList";
import InfoModal from "../components/InfoModal";

export async function getServerSideProps(context: GetServerSidePropsContext) {
  const session = await getServerSession(context.req, context.res, authOptions);
  if (!session) {
    return {
      redirect: {
        destination: "/auth",
        permanent: false,
      },
    };
  }
  return { props: {} };
}

type LanguageGroup = {
  label: string;
  aliases: string[];
};

const LANGUAGE_GROUPS: LanguageGroup[] = [
  { label: "Tiếng Việt", aliases: ["Tiếng Việt", "Vietnamese", "vi"] },
  { label: "Tiếng Anh", aliases: ["Tiếng Anh", "English", "en"] },
  { label: "Tiếng Trung", aliases: ["Tiếng Trung", "Chinese", "中文", "zh"] },
  { label: "Tiếng Hàn", aliases: ["Tiếng Hàn", "Korean", "한국어", "ko"] },
  { label: "Tiếng Nhật", aliases: ["Tiếng Nhật", "Japanese", "日本語", "ja"] },
  { label: "Tiếng Thái", aliases: ["Tiếng Thái", "Thai", "ภาษาไทย", "th"] },
];

const normalizeText = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

const toLanguageList = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string");
  }

  if (typeof value === "string" && value.trim()) {
    return value.split(",").map((part) => part.trim());
  }

  return [];
};

const isLanguageMatch = (movieLanguages: string[], aliases: string[]) => {
  const normalizedAliases = aliases.map(normalizeText);

  return movieLanguages.some((lang) => {
    const normalizedLang = normalizeText(lang);
    return normalizedAliases.some(
      (alias) =>
        normalizedLang === alias ||
        normalizedLang.includes(alias) ||
        alias.includes(normalizedLang)
    );
  });
};

const LanguagesPage: React.FC = () => {
  const { data: moviesList = [] } = useMovieList();
  const [selectedLanguage, setSelectedLanguage] = useState<string | null>(null);

  const filteredMovies = useMemo(() => {
    if (!selectedLanguage || moviesList.length === 0) return [];

    const languageGroup = LANGUAGE_GROUPS.find((lang) => lang.label === selectedLanguage);
    if (!languageGroup) return [];

    return moviesList.filter((movie: any) => {
      const movieLanguages = toLanguageList(movie?.language);
      if (movieLanguages.length === 0) return false;
      return isLanguageMatch(movieLanguages, languageGroup.aliases);
    });
  }, [moviesList, selectedLanguage]);

  return (
    <div className="bg-black min-h-screen">
      <Navbar />
      <InfoModal />
      <div className="pt-24 pb-40 px-4 md:px-12">
        <h1 className="text-white text-2xl font-semibold mb-6">Browse by Languages</h1>

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-8">
          {LANGUAGE_GROUPS.map((lang) => (
            <button
              key={lang.label}
              onClick={() =>
                setSelectedLanguage(selectedLanguage === lang.label ? null : lang.label)
              }
              className={`rounded-lg p-6 text-center cursor-pointer transition ${
                selectedLanguage === lang.label
                  ? "bg-red-600 text-white"
                  : "bg-zinc-800 text-white hover:bg-zinc-700"
              }`}
            >
              {lang.label}
            </button>
          ))}
        </div>

        {selectedLanguage && (
          <div>
            <MovieList title={`Movies in ${selectedLanguage}`} data={filteredMovies} />
          </div>
        )}
      </div>
    </div>
  );
};

export default LanguagesPage;
