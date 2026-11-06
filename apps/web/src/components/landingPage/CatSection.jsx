'use client';

import React, { useEffect, useState } from 'react';
import { Gift, Award, Star, Trophy, Clock, Gamepad2, Flame, Target } from 'lucide-react';
import { useAuth } from "@/hooks/auth";
import { createClient } from '@/lib/supabase/client';

const defaultBanner = {
  heading: 'Play And Earn Rewards',
  text: 'Join our gaming community and earn amazing rewards! Play our featured games, compete with others, and collect points for exclusive rewards.',
  is_active: true
};

function App() {
  const { user } = useAuth();
  const [banner, setBanner] = useState(defaultBanner);

  useEffect(() => {
    const fetchBanner = async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('cta_banners')
        .select('heading, body, is_active')
        .eq('is_active', true)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error || !data) {
        if (error) console.error('Error fetching CTA banner:', error);
        setBanner(defaultBanner);
        return;
      }
      setBanner({ heading: data.heading, text: data.body, is_active: data.is_active });
    };

    fetchBanner();
  }, []);

  return (
    <section className="min-h-[400px] bg-gray-900">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl shadow-xl overflow-hidden">
          <div className="px-6 py-12 sm:px-12 sm:py-16">
            {!user ? (
              <div className="space-y-12">
                <div className="lg:flex lg:items-center lg:justify-between">
                  <div className="lg:w-0 lg:flex-1">
                    <div className="flex items-center gap-3 mb-4">
                      <Gamepad2 className="w-8 h-8 text-purple-200" />
                      <h2 className="text-3xl font-godofwar tracking-tight text-white sm:text-4xl md:text-5xl">
                        {banner.heading}
                      </h2>
                    </div>
                    <p className="mt-4 max-w-3xl text-lg text-purple-100">
                      {banner.text}
                    </p>
                  </div>
                  <div className="mt-8 lg:mt-0 lg:flex-shrink-0 lg:ml-8">
                    <div className="inline-flex w-full sm:w-auto justify-center">
                      <button className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-4 border border-transparent text-base font-medium rounded-md text-purple-600 bg-white hover:bg-purple-50 hover:transform hover:scale-105 transition-all duration-200 shadow-lg">
                        <Gift className="w-5 h-5 mr-2" />
                        Sign in to Play
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-8">
                <div className="bg-white/5 rounded-lg p-6 backdrop-blur-sm">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <Gamepad2 className="w-6 h-6 text-purple-300" />
                      <h3 className="text-xl font-semibold text-white">Play to gain</h3>
                    </div>
                    <div className="flex items-center gap-2">
                      <Flame className="w-5 h-5 text-orange-400" />
                      <span className="text-orange-400 font-semibold">2x Points Event!</span>
                    </div>
                  </div>
                  <div className="bg-gradient-to-r from-purple-800/50 to-indigo-800/50 rounded-lg p-6">
                    <div className="flex flex-col md:flex-row items-center gap-6">
                      <div className="w-full md:w-2/3">
                        <h4 className="text-lg font-semibold text-white mb-2">Space Shooter Challenge</h4>
                        <p className="text-purple-100 mb-4">Score over 1000 points to earn rewards! Current event offers double points for all achievements.</p>
                        <button className="inline-flex items-center px-6 py-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors">
                          <Gamepad2 className="w-5 h-5 mr-2" />
                          Play Now
                        </button>
                      </div>
                      <div className="w-full md:w-1/3 bg-white/10 rounded-lg p-4">
                        <h5 className="text-white font-semibold mb-2">Rewards:</h5>
                        <ul className="space-y-2">
                          <li className="flex items-center text-purple-100">
                            <Star className="w-4 h-4 text-yellow-400 mr-2" />
                            Score 1000+ : 100 points
                          </li>
                          <li className="flex items-center text-purple-100">
                            <Star className="w-4 h-4 text-yellow-400 mr-2" />
                            Score 5000+ : 500 points
                          </li>
                          <li className="flex items-center text-purple-100">
                            <Trophy className="w-4 h-4 text-yellow-400 mr-2" />
                            Daily High Score: 1000 points
                          </li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

export default App;