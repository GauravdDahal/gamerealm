'use client';

import React, { useEffect, useState } from 'react';
import { Gift, Gamepad2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuth } from "@/hooks/auth";
import { createClient } from '@/lib/supabase/client';
import { useSiteContent } from '@/lib/useSiteContent';

const defaultBanner = {
  heading: 'Play And Earn Rewards',
  text: 'Join our gaming community and earn amazing rewards! Play our featured games, compete with others, and collect points for exclusive rewards.',
  is_active: true
};

/**
 * The invitation banner for visitors who are not signed in. Signed-in players
 * see the bonus cards below it instead (BonusesSection).
 */
function App() {
  const { user } = useAuth();
  const router = useRouter();
  const cta = useSiteContent('cta');
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

  if (user) return null;

  return (
    <section className="bg-gray-900">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 pt-16 sm:pt-24 pb-4">
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl shadow-xl overflow-hidden">
          <div className="px-6 py-12 sm:px-12 sm:py-16">
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
                  <button
                    onClick={() => router.push('/users')}
                    className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-4 border border-transparent text-base font-medium rounded-md text-purple-600 bg-white hover:bg-purple-50 hover:transform hover:scale-105 transition-all duration-200 shadow-lg">
                    <Gift className="w-5 h-5 mr-2" />
                    {cta.signin_label}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default App;
