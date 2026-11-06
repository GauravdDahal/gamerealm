"use client";
import { useState, useEffect } from "react";
import dynamic from 'next/dynamic';

const LottieComponent = dynamic(() => import('lottie-react'), {
  loading: () => <div className="w-20 h-20"></div>,
  ssr: false
});

const features = [
  { 
    animation: "/Lottie/secure.json", 
    title: "Secure & Fair Gaming",
    description: "Advanced encryption and certified RNG technology ensure your gaming experience is both safe and fair.",
    aos: "fade-left"
  },
  { 
    animation: "/Lottie/premium.json", 
    title: "Premium Game Selection",
    description: "Access hundreds of high-quality casino games from top providers, updated regularly with new releases.",
    aos: "fade-left"
  },
  { 
    animation: "/Lottie/winner.json", 
    title: "Competitive Rewards",
    description: "Enjoy industry-leading winning rates and exclusive bonus programs designed to maximize your chances.",
    aos: "fade-left"
  },
  { 
    animation: "/Lottie/reward.json", 
    title: "Smart Investment Gaming",
    description: "Strategic gaming options with real earning potential through our innovative reward systems.",
    aos: "fade-left"
  }
];

export default function WhyChooseUs() {
  const [animationData, setAnimationData] = useState({});
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);

    const loadAnimations = async () => {
      const data = {};
      
      // Use Promise.all for parallel loading
      const animationPromises = features.map(async (feature) => {
        try {
          const response = await fetch(feature.animation);
          if (!response.ok) throw new Error(`Failed to load ${feature.animation}`);
          data[feature.animation] = await response.json();
        } catch (error) {
          console.error(`Error loading animation ${feature.animation}:`, error);
          // Fallback to a default or skip
          data[feature.animation] = null;
        }
      });

      await Promise.all(animationPromises);
      setAnimationData(data);
    };

    loadAnimations();
  }, []);

  return (
      <section className="bg-[#151C28] h-auto text-white p-1 sm:p-4 md:p-3  lg:p-30 relative overflow-hidden">
          <div className="absolute inset-0 opacity-10 pointer-events-none">
              <div className="absolute top-1/4 left-1/4 text-6xl sm:text-5xl">
                  ♠
              </div>
              <div className="absolute top-1/2 right-1/4 text-6xl sm:text-5xl">
                  ♥
              </div>
              <div className="absolute bottom-1/4 left-1/3 text-6xl sm:text-5xl">
                  ♦
              </div>
              <div className="absolute top-1/3 right-1/3 text-6xl sm:text-5xl">
                  ♣
              </div>
          </div>

          <div className="container mx-auto px-4">
              <div className="grid lg:grid-cols-2 gap-12 items-center">
                  <div className="w-full space-y-6">
                      <h1
                          data-aos="fade-down"
                          className="text-5xl sm:text-4xl font-glance leading-tight sm:pt-3">
                          Why Play Our Casino
                      </h1>
                      <p
                          data-aos="fade-down"
                          data-aos-delay="100"
                          className="text-lg text-gray-300 max-w-xl">
                          Experience the thrill of premium online gaming with
                          industry-leading security and endless entertainment
                          options.
                      </p>
                      <p
                          data-aos="fade-down"
                          data-aos-delay="200"
                          className="text-gray-400">
                          Join thousands of players worldwide who trust our
                          platform for its reliability, fairness, and
                          exceptional gaming experience. Our commitment to
                          transparency and player satisfaction has made us a
                          leading choice in the online gaming community, with a
                          track record of creating memorable gaming moments and
                          lasting player relationships.
                      </p>
                  </div>

                  <div className="grid md:grid-cols-2 gap-10">
                      {isClient &&
                          features.map(
                              (
                                  { animation, title, description, aos },
                                  index,
                              ) => {
                                  const currentAnimationData =
                                      animationData[animation]

                                  return (
                                      <div
                                          key={index}
                                          className="space-y-4 last:mb-8"
                                          data-aos={aos}
                                          data-aos-delay={index * 200}>
                                          <div className="w-20 h-20 flex  items-center justify-center">
                                              {currentAnimationData ? (
                                                  <LottieComponent
                                                      animationData={
                                                          currentAnimationData
                                                      }
                                                      loop={true}
                                                      aria-label={`${title} animation`}
                                                  />
                                              ) : (
                                                  <div className="w-20 h-20 bg-gray-800 rounded-full font-godofwar animate-pulse"></div>
                                              )}
                                          </div>
                                          <h3 className="text-xl font-glance">
                                              {title}
                                          </h3>
                                          <p className="text-gray-400">
                                              {description}
                                          </p>
                                      </div>
                                  )
                              },
                          )}
                  </div>
              </div>
          </div>
      </section>
  )
}