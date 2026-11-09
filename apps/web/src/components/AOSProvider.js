"use client";

import { useEffect } from 'react';
import AOS from 'aos';
import 'aos/dist/aos.css';

const AOSProvider = () => {
    useEffect(() => {
        AOS.init({ once: true, easing: 'ease-out', duration: 450, offset: 40, disable: () => window.matchMedia('(prefers-reduced-motion: reduce)').matches });
    }, []);

    return null;
};

export default AOSProvider;
