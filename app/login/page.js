"use client";

import { signIn, signOut, useSession } from "next-auth/react";

export default function LoginPage() {
    const { data: session } = useSession();

    return (
        <section className="flex flex-col items-center justify-center py-16 text-center">
            {!session ? (
                <>
                    <h1 className="text-3xl font-bold mb-6">Login to Pseudo Cafe</h1>
                    <button
                        onClick={() => signIn("google")}
                        className="bg-yellow-500 w-55 hover:bg-yellow-600 text-black font-semibold py-3 px-6 rounded-lg transition-all"
                    >
                        Sign in with Google
                    </button>
                    <br /><button
                        onClick={() => signIn("facebook")}
                        className="bg-yellow-500 w-55 hover:bg-yellow-600 text-black font-semibold py-3 px-6 rounded-lg transition-all"
                    >
                        Sign in with Facebook
                    </button>
                </>
            ) : (
                <>
                    <h1 className="text-3xl font-bold mb-6">Welcome, {session.user.name} 👋</h1>
                    <img src={session.user.image} alt="Profile" className="w-16 h-16 rounded-full mb-4" />
                    <p className="mb-6">{session.user.email}</p>
                    <button
                        onClick={() => signOut()}
                        className="bg-red-500 hover:bg-red-600 text-white font-semibold py-3 px-6 rounded-lg transition-all"
                    >
                        Sign out
                    </button>
                </>
            )}
        </section>
    );
}
