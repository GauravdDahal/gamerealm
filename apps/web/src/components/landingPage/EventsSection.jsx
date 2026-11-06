"use client";
import React, { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { Gift, Send } from "lucide-react";

// Dynamically import AOS to avoid SSR issues
const AOS = dynamic(() => import("aos"), { ssr: false });

const bonusCards = [
  {
    title: "Refer And Earn",
    description: "Invite your friends and earn exclusive rewards for each successful referral!",
    buttonText: "Refer Now",
    icon: <Send className="w-6 h-6 text-white" />,
    gradient: "from-green-400 to-blue-500",
    btnGradient: "from-green-500 to-blue-600",
  },
  {
    title: "Upcoming Bonuses",
    description: "Stay tuned for exciting rewards and exclusive bonus opportunities!",
    buttonText: "View Bonuses",
    icon: <Gift className="w-6 h-6 text-white" />,
    gradient: "from-purple-500 to-pink-500",
    btnGradient: "from-purple-500 to-pink-600",
  },
];

export default function EventSection() {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    import("aos").then((AOS) => {
      AOS.init({ duration: 1000, once: true });
    });
  }, []);

  return (
      <section id="tournaments" className="py-26 bg-gray-900">
          <div className="container mx-auto px-4 text-center">
              <h2
                  className="text-4xl sm:text-9xl md:text-4xl lg:text-5xl font-godofwar mb-4"
                  {...(isClient && { 'data-aos': 'fade-down' })}>
                  Earn Rewards And Bonuses
              </h2>
              <p
                  className="text-gray-400 mb-16 max-w-2xl mx-auto "
                  {...(isClient && {
                      'data-aos': 'fade-down',
                      'data-aos-delay': '100',
                  })}>
                  Participate in our referral program and upcoming bonuses to
                  maximize your rewards.
              </p>

              <div className="grid md:grid-cols-2 gap-10">
                  {bonusCards.map((card, index) => (
                      <div
                          key={index}
                          className="relative p-1 rounded-xl shadow-lg transform transition-all hover:scale-105"
                          {...(isClient && {
                              'data-aos':
                                  index % 2 === 0 ? 'fade-right' : 'fade-left',
                              'data-aos-delay': index * 200,
                          })}>
                          <div className="relative bg-gray-800 p-8 rounded-xl border border-gray-700 shadow-md">
                              <div className="flex items-center gap-4 mb-4">
                                  <div
                                      className={`w-14 h-14 flex items-center justify-center rounded-lg bg-gradient-to-r ${card.gradient}`}>
                                      {card.icon}
                                  </div>
                                  <h3 className="text-3xl font-aldo text-white">
                                      {card.title}
                                  </h3>
                              </div>

                              <p className="text-gray-400 text-left mb-6">
                                  {card.description}
                              </p>

                              <button
                                  className={` bg-gradient-to-r ${card.btnGradient} text-white px-6 py-3 rounded-full font-medium transition-all hover:opacity-80 shadow-lg`}>
                                  {card.buttonText}
                              </button>
                          </div>
                      </div>
                  ))}
              </div>
          </div>
      </section>
  )
}
