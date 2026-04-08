import Head from "next/head"
import axios from 'axios';
import { useCallback, useEffect, useMemo, useState } from "react";
import type { NextPage } from 'next'
import { getProviders, signIn } from "next-auth/react"
import { useRouter } from "next/router";
import Input from "../components/input";
import Footer from "../components/Footer";

import {FcGoogle} from 'react-icons/fc';
import {FaGithub} from "react-icons/fa"

const Auth: NextPage = () => {
    const router = useRouter();
    const [username, setUsername] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [variant, setVariant] = useState("login");
    const [isLoading, setIsLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");
    const [providerMap, setProviderMap] = useState<Record<string, unknown> | null>(null);

    useEffect(() => {
        let isMounted = true;

        getProviders()
            .then((providers) => {
                if (!isMounted) return;
                setProviderMap((providers as Record<string, unknown>) || {});
            })
            .catch(() => {
                if (!isMounted) return;
                setProviderMap({});
            });

        return () => {
            isMounted = false;
        };
    }, []);

    useEffect(() => {
        if (typeof router.query.error !== "string") return;

        const oauthErrorMap: Record<string, string> = {
            OAuthSignin: "OAuth sign-in failed. Please check provider config.",
            OAuthCallback: "OAuth callback failed. Check callback URL in provider app.",
            OAuthCreateAccount: "Cannot create OAuth account.",
            EmailCreateAccount: "Cannot create account with this email.",
            Callback: "Sign-in callback error.",
            OAuthAccountNotLinked: "This email is linked with another sign-in method.",
            AccessDenied: "Access denied by provider.",
            Verification: "Verification token is invalid or expired.",
            Default: "Unable to sign in right now.",
        };

        setErrorMsg(oauthErrorMap[router.query.error] || oauthErrorMap.Default);
    }, [router.query.error]);

    const isGoogleAvailable = useMemo(() => Boolean(providerMap?.google), [providerMap]);
    const isGithubAvailable = useMemo(() => Boolean(providerMap?.github), [providerMap]);

    const toggleVariant = useCallback(() => {
            setVariant((currVariant) => currVariant === 'login' ? 'register' : 'login')
            setErrorMsg("");
    }, [])

    
    const login = useCallback(async () => {
        if (!email || !password) {
            setErrorMsg("Vui lòng nhập email và mật khẩu");
            return;
        }
        setIsLoading(true);
        setErrorMsg("");
        try {
            const response = await signIn('credentials', {
                email,
                password,
                redirect: false,
            });

            if (response?.error) {
                setErrorMsg(response.error === 'CredentialsSignin' 
                    ? 'Email hoặc mật khẩu không đúng' 
                    : response.error);
                setIsLoading(false);
                return;
            }

            // Login success - redirect manually
            window.location.href = '/profiles';
        } catch (error) {
            setErrorMsg("Đã xảy ra lỗi, vui lòng thử lại");
            setIsLoading(false);
        }
    }, [email, password]);


    const register = useCallback(async () => {
        if (!email || !password || !username) {
            setErrorMsg("Vui lòng nhập đầy đủ thông tin");
            return;
        }
        setIsLoading(true);
        setErrorMsg("");
        try {
            await axios.post('/api/register', {
                email,
                name: username,
                password,
            });

            // After registration, login
            const response = await signIn('credentials', {
                email,
                password,
                redirect: false,
            });

            if (response?.error) {
                setErrorMsg(response.error);
                setIsLoading(false);
                return;
            }

            window.location.href = '/profiles';
        } catch (error: any) {
            const msg = error?.response?.data?.error || "Đăng ký thất bại, vui lòng thử lại";
            setErrorMsg(msg);
            setIsLoading(false);
        }
    }, [email, username, password]);


    const guestLogin = useCallback(async () => {
        const guestEmail: string[] = ["test1@gmail.com", "test2@gmail.com", 
        "test3@gmail.com", "test4@gmail.com", "test5@gmail.com", "test6@gmail.com"];
        const randomNumber: number =  Math.floor(Math.random() * 6);
        setIsLoading(true);
        setErrorMsg("");

        try {
            const response = await signIn('credentials', {
                email: guestEmail[randomNumber],
                password: "123321",
                redirect: false,
            });

            if (response?.error) {
                setErrorMsg("Guest login thất bại. Hãy đăng ký tài khoản mới.");
                setIsLoading(false);
                return;
            }

            window.location.href = '/profiles';
        } catch (error) {
            setErrorMsg("Đã xảy ra lỗi");
            setIsLoading(false);
        }
    }, [])

    const googleLogin = useCallback(async () => {
        if (!isGoogleAvailable) {
            setErrorMsg("Google login is not configured.");
            return;
        }
        setErrorMsg("");
        await signIn('google', {callbackUrl: '/profiles'})
    }, [isGoogleAvailable])

    const githubLogin = useCallback(async () => {
        if (!isGithubAvailable) {
            setErrorMsg("GitHub login is not configured.");
            return;
        }
        setErrorMsg("");
        await signIn('github', {callbackUrl: '/profiles'})
    }, [isGithubAvailable])

    return (
        <>
        <Head>
            <link rel="shortcut icon" href="/images/favicon.png" />
            <title>Authenticate</title>
        </Head>
        <div className="relative w-full h-full bg-[url('../public/images/hero.jpg')]  bg-no-repeat bg-fixed bg-cover bg-center">
            <div className=" w-full h-full bg-black lg:bg-opacity-50">
                <nav className="px-3 sm:px-12 py-4">
                    <img src="images/logo.png" alt="logo" className="h-5 sm:h-10" />
                </nav>
                <div className="flex justify-center">
                    <div className="bg-black bg-opacity-70 px-6 py-6 self-cnter mt-1 lg:w-2/5 lg:max-w-md rounded-md w-full sm:px-16">
                        <h2 className="text-white text-4xl mb-8 font-semibold">
                            {variant === 'login' ? 'Sign In': 'Register'}
                        </h2>
                        <div className="flex flex-col gap-4 sm:gap-4">
                            {variant === 'register' &&  
                            <Input
                                label="Username"
                                onChange={(e: React.ChangeEvent<HTMLInputElement> ) => { setUsername(e.target.value); }}
                                id="username"
                                type="text"
                                value={username}
                            />}
                           

                            <Input
                                label="Email"
                                onChange={(e: React.ChangeEvent<HTMLInputElement> ) => { setEmail(e.target.value); }}
                                id="email"
                                type="email"
                                value={email}
                            />

                            <Input
                                label="Password"
                                onChange={(e: React.ChangeEvent<HTMLInputElement> ) => { setPassword(e.target.value); }}
                                id="passowrd"
                                type="password"
                                value={password}
                            />

                        </div>

                        {errorMsg && (
                            <p className="text-red-500 text-sm mt-4 text-center">{errorMsg}</p>
                        )}
                
                        <button onClick={isLoading ? () => {} : (variant === 'login'? login : register)} className="bg-red-600 py-3 text-white rounded-md w-full mt-10 hover:bg-red-700 transition"> 
                            {isLoading ? "Loading..." : (variant === 'login' ? 'Login' : 'Sign Up')} 
                        </button>

                        <div className="flex flex-row gap-4 items-center mt-6 justify-center">
                            <button
                                type="button"
                                onClick={googleLogin}
                                disabled={!isGoogleAvailable}
                                className={`w-10 h-10 bg-white rounded-full flex items-center justify-center transition ${
                                    isGoogleAvailable ? "cursor-pointer hover:opacity-80" : "opacity-40 cursor-not-allowed"
                                }`}
                            >
                                <FcGoogle size={30}/>
                            </button>
                            <button
                                type="button"
                                onClick={githubLogin}
                                disabled={!isGithubAvailable}
                                className={`w-10 h-10 bg-white rounded-full flex items-center justify-center transition ${
                                    isGithubAvailable ? "cursor-pointer hover:opacity-80" : "opacity-40 cursor-not-allowed"
                                }`}
                            >
                                <FaGithub size={30}/>
                            </button>
                        </div>


                        <p className="text-neutral-500 mt-8 sm:mt-6">
                        {variant === 'login' ? 'First time using Netflix?' : 'Already have an account?'} 
                            <span onClick={toggleVariant} className="text-white ml-1 hover:underline cursor-pointer">
                                {variant === 'login' ? 'Create an account': 'Login' }
                            </span>
                        </p>

            

                        {variant === 'login' &&  (
                            <p className="bg-transparent  text-neutral-500 text-xl text-center rounded-md w-full mt-3 transition">OR</p>
                        )}
                        {variant === 'login' &&  (

                            <button onClick={guestLogin} className="bg-transparent  text-red-600 rounded-md w-full mt-3 hover:underline transition"> 
                                Login as a guest
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
        <Footer />
        </>

    );
}

export default Auth;
