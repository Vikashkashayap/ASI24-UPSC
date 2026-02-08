import React from 'react';
import { Rocket, Home } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTheme } from '../../hooks/useTheme';

const ComingSoon: React.FC = () => {
    const { theme } = useTheme();

    return (
        <div className={`flex flex-col items-center justify-center min-h-[60vh] text-center px-4 transition-all duration-300 ${theme === 'dark' ? 'text-slate-100' : 'text-slate-900'
            }`}>
            <div className={`p-6 rounded-full mb-8 relative ${theme === 'dark' ? 'bg-fuchsia-500/10' : 'bg-fuchsia-100'
                }`}>
                <div className="absolute inset-0 rounded-full animate-ping opacity-25 bg-fuchsia-500"></div>
                <Rocket className={`w-16 h-16 ${theme === 'dark' ? 'text-fuchsia-400' : 'text-fuchsia-600'
                    }`} />
            </div>

            <h1 className="text-4xl md:text-5xl font-extrabold mb-4 tracking-tight">
                Coming <span className="text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-500 to-indigo-500">Soon</span>
            </h1>

            <p className={`text-lg md:text-xl max-w-md mx-auto mb-10 leading-relaxed ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'
                }`}>
                We're currently perfecting this feature for your UPSC journey.
                Get ready for something truly extraordinary.
            </p>

            <Link
                to="/home"
                className={`inline-flex items-center gap-2 px-8 py-3 rounded-full font-bold transition-all duration-300 transform hover:scale-105 hover:shadow-xl ${theme === 'dark'
                        ? 'bg-gradient-to-r from-fuchsia-600 to-indigo-600 text-white shadow-fuchsia-900/40'
                        : 'bg-gradient-to-r from-fuchsia-500 to-indigo-500 text-white shadow-fuchsia-200/50'
                    }`}
            >
                <Home className="w-5 h-5" />
                Return Home
            </Link>

            <div className="mt-16 grid grid-cols-3 gap-8 w-full max-w-lg opacity-40">
                <div className={`h-1 rounded-full ${theme === 'dark' ? 'bg-slate-800' : 'bg-slate-200'}`}></div>
                <div className={`h-1 rounded-full bg-fuchsia-500 shadow-[0_0_8px_rgba(217,70,239,0.8)]`}></div>
                <div className={`h-1 rounded-full ${theme === 'dark' ? 'bg-slate-800' : 'bg-slate-200'}`}></div>
            </div>
        </div>
    );
};

export default ComingSoon;
