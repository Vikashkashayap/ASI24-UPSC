import React, { useState } from 'react';

import { BookOpen, X, Sparkles } from 'lucide-react';

import { useTheme } from '../../hooks/useTheme';

import { Button } from '../ui/button';



interface Props {

  suggestions: string[];

}



export const ModelAnswerPanel: React.FC<Props> = ({ suggestions }) => {

  const { theme } = useTheme();

  const isDark = theme === 'dark';

  const [open, setOpen] = useState(false);



  if (!suggestions?.length) return null;



  return (

    <>

      <Button

        onClick={() => setOpen(true)}

        className={`font-semibold shadow-lg transition-all hover:scale-[1.02] ${

          isDark

            ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white border-0'

            : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white border-0 shadow-blue-200/40'

        }`}

      >

        <BookOpen className="w-4 h-4 mr-1.5" />

        Get Model Answer

      </Button>



      {open && (

        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">

          <div

            className={`w-full max-w-lg max-h-[85vh] overflow-y-auto custom-scrollbar rounded-2xl border shadow-2xl ${

              isDark

                ? 'bg-slate-900 border-blue-500/30 shadow-blue-900/30'

                : 'bg-white border-blue-200/60 shadow-blue-200/30'

            }`}

          >

            <div

              className={`sticky top-0 z-10 px-6 py-4 border-b flex items-center justify-between ${

                isDark

                  ? 'bg-slate-900/95 border-slate-700 backdrop-blur-sm'

                  : 'bg-white/95 border-slate-200 backdrop-blur-sm'

              }`}

            >

              <div className="flex items-center gap-2.5">

                <div

                  className={`p-2 rounded-lg ${

                    isDark ? 'bg-blue-500/20' : 'bg-blue-100'

                  }`}

                >

                  <Sparkles

                    className={`w-5 h-5 ${

                      isDark ? 'text-blue-400' : 'text-blue-600'

                    }`}

                  />

                </div>

                <h3

                  className={`font-bold text-lg ${

                    isDark ? 'text-slate-100' : 'text-slate-800'

                  }`}

                >

                  Model Answer — Key Points

                </h3>

              </div>

              <button

                type="button"

                onClick={() => setOpen(false)}

                className={`p-2 rounded-xl transition-colors ${

                  isDark

                    ? 'hover:bg-slate-800 text-slate-400'

                    : 'hover:bg-slate-100 text-slate-500'

                }`}

              >

                <X className="w-5 h-5" />

              </button>

            </div>

            <ol className="p-6 space-y-4">

              {suggestions.map((point, i) => (

                <li

                  key={i}

                  className={`text-sm leading-relaxed flex gap-3 ${

                    isDark ? 'text-slate-300' : 'text-slate-700'

                  }`}

                >

                  <span

                    className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${

                      isDark

                        ? 'bg-blue-500/20 text-blue-300'

                        : 'bg-blue-100 text-blue-700'

                    }`}

                  >

                    {i + 1}

                  </span>

                  <span className="pt-0.5">{point}</span>

                </li>

              ))}

            </ol>

          </div>

        </div>

      )}

    </>

  );

};



export default ModelAnswerPanel;

