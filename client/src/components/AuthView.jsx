import React, { useState } from "react";
import { auth } from "../firebase";
import {
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword
} from "firebase/auth";

/** Glassmorphic Auth View */
const AuthView = ({ mode, setMode }) => {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setLoading(true);
        try {
            if (mode === "login") {
                await signInWithEmailAndPassword(auth, email, password);
            } else {
                await createUserWithEmailAndPassword(auth, email, password);
            }
        } catch (err) {
            setError(err.message.replace("Firebase: ", ""));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-100 via-slate-50 to-white">
            <div className="w-full max-w-md animate-in fade-in zoom-in-95 duration-500">
                <div className="text-center mb-10 space-y-2">
                    <h1 className="text-3xl font-black text-slate-800 tracking-tight">DocuAI</h1>
                    <p className="text-slate-500 font-medium">Intelligent Document Processing</p>
                </div>

                <div className="bg-white/70 backdrop-blur-xl rounded-[2.5rem] shadow-2xl shadow-indigo-200/50 border border-white p-10 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-purple-500" />

                    <h2 className="text-xl font-bold text-slate-800 mb-8">
                        {mode === "login" ? "Welcome Back" : "Create Account"}
                    </h2>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Email Address</label>
                            <input
                                type="email"
                                required
                                className="w-full px-5 py-3.5 rounded-2xl bg-slate-50 border border-slate-100 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all outline-none text-sm font-medium"
                                placeholder="name@company.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Password</label>
                            <input
                                type="password"
                                required
                                className="w-full px-5 py-3.5 rounded-2xl bg-slate-50 border border-slate-100 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all outline-none text-sm font-medium"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>

                        {error && (
                            <div className="p-3.5 rounded-xl bg-red-50 border border-red-100 text-red-500 text-[11px] font-bold leading-relaxed">
                                {error}
                            </div>
                        )}

                        <button
                            disabled={loading}
                            className="w-full py-4 rounded-2xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-sm shadow-xl shadow-slate-200 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                mode === "login" ? "Sign In" : "Get Started"
                            )}
                        </button>
                    </form>

                    <div className="mt-8 pt-6 border-t border-slate-100 text-center">
                        <p className="text-xs text-slate-400 font-medium">
                            {mode === "login" ? "Don't have an account?" : "Already have an account?"}
                            <button
                                onClick={() => setMode(mode === "login" ? "signup" : "login")}
                                className="ml-1.5 text-indigo-600 font-bold hover:underline"
                            >
                                {mode === "login" ? "Create one" : "Sign in"}
                            </button>
                        </p>
                    </div>
                </div>

                <p className="mt-8 text-center text-[10px] font-bold text-slate-300 uppercase tracking-widest">
                    Securely powered by Firebase Auth
                </p>
            </div>
        </div>
    );
};

export default AuthView;
