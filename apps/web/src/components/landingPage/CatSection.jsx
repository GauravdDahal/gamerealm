'use client';

import React, { useEffect, useState } from 'react';
import { Gift } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuth } from "@/hooks/auth";
import { createClient } from '@/lib/supabase/client';
import { useSiteContent } from '@/lib/useSiteContent';

const defaultBanner = {
  heading: 'Your first spin is free',
  text: 'Create an account to spin the lucky wheel every day, claim deposit bonuses and chat with our team.',
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

  if (user !== null) return null;

  return (
    <section className="bg-gray-900 pt-16 md:pt-24">
      <div className="wrap">
        <div className="flex flex-col gap-8 rounded-2xl border border-line bg-surface2 p-8 md:p-12 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <h2 className="section-title">{banner.heading}</h2>
            <p className="mt-4 text-lg text-muted">{banner.text}</p>
          </div>
          <button onClick={() => router.push('/users')} className="btn btn-primary btn-lg w-full shrink-0 sm:w-auto">
            <Gift aria-hidden="true" />
            {cta.signin_label}
          </button>
        </div>
      </div>
    </section>
  );
}

export default App;
