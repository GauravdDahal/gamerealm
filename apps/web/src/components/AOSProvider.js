"use client";

import { useEffect } from 'react';
import AOS from 'aos';
import 'aos/dist/aos.css';

const AOSProvider = () => {
    useEffect(() => {
        AOS.init({ once: true, easing: 'ease-out', duration: 800 });
    }, []);

    return null;
};

export default AOSProvider;
