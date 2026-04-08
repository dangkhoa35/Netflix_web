'use client';

import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface ProfileState {
    id?: string;
    createdAt?: string;
    email?: string;
    emailVerified?: string | null;
    favoriteIds?: string[];
    image?: string | null;
    name?: string;
    updatedAt?: string;
}

interface initialState {
    profile: ProfileState
}

const  initialState:initialState = {
    profile: {
        id:"",
        createdAt:"",
        email:"",
        emailVerified:"",
        favoriteIds: [],
        image:"",
        name:"",
        updatedAt:""
    }
}

  
const profileSlice = createSlice({
    name: 'profile',
    initialState,
    reducers: {
        updateProfile(state, action:PayloadAction<ProfileState>) {
           
            state.profile = action.payload 
        }
    }

});

const profileActions = profileSlice.actions;

export default profileSlice;
export { profileActions };
