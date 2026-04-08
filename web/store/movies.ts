'use client';

import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface movieState {
    title: string,
    description: string,
    videoUrl: string,
    thumbnailUrl: string,
    genre: string,
    categories?: string[],
    duration: number,
    id: string,
    code?: string,
    slug?: string,
    studio?: string,
    director?: string,
    cast?: string[],
    status?: string,
    ageRating?: string,
    releaseDate?: string,
    imageUrl?: string,
    posterUrl?: string,
    backdropUrl?: string,
    trailerUrl?: string,
    tags?: string[],
    subtitles?: string[];
}

interface initialState {
    movies: movieState[],
    showModal: boolean,
    movie: movieState[]
}

type MoviePayload = movieState | movieState[];

const toMovieArray = (payload: MoviePayload): movieState[] =>
  Array.isArray(payload) ? payload : [payload];

const  initialState:initialState = {
    movies: [],
    showModal: false,
    movie: [{
        title: "",
        description: "",
        videoUrl: "",
        thumbnailUrl: "",
        genre: "",
        duration: 0,
        id:  "",
    }],
}

  
const movieSlice = createSlice({
    name: 'movies',
    initialState,
    reducers: {
        updateMovieList(state, action:PayloadAction<movieState[]>) {
            state.movies = action.payload 
        },
        updateMovie(state, action:PayloadAction<MoviePayload>) {
            state.movie = toMovieArray(action.payload);
        },
        showModal(state, action:PayloadAction<MoviePayload>) {
            state.showModal = true;
            state.movie = toMovieArray(action.payload);
        },
        hideModal(state) {
            state.showModal = false;
            state.movie = [{
                title: "",
                description: "",
                videoUrl: "",
                thumbnailUrl: "",
                genre: "",
                duration: 0,
                id:  "",
            }]
        }
    }

});

const movieActions = movieSlice.actions;

export default movieSlice;
export { movieActions };
