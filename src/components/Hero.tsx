import Image from 'next/image';
import React from 'react';

const Hero: React.FC = () => {
    return (
        <section
            id="hero"
            className="relative flex items-center justify-center px-5 h-screen overflow-hidden pb-0 pt-32 md:pt-40"
        >
            {/* Background Image with Blur Fix */}
            <div className="absolute inset-0 -z-20 w-full h-full overflow-hidden">
                <Image
                    src="/images/masjid-interior.webp"
                    layout="fill"
                    objectFit="cover"
                    quality={100}
                    priority
                    unoptimized
                    alt="Masjid Interior"
                />
                {/* Blurred Overlay to Prevent White Edges */}
                <div className="absolute -inset-5 w-[110%] h-[110%] bg-black/20"></div>
            </div>

            {/* Bottom Gradient for Contrast */}
            <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent via-black/40 to-black"></div>

            {/* Text Content */}
            <div className="relative text-center z-10 max-w-lg md:max-w-3xl">
                <h1 className="text-4xl md:text-7xl text-white leading-tight">
                    إِنَّنِىٓ أَنَا ٱللَّهُ لَآ إِلَـٰهَ إِلَّآ أَنَا۠ فَٱعْبُدْنِى وَأَقِمِ ٱلصَّلَوٰةَ لِذِكْرِىٓ
                </h1>
                <p className="mt-6 text-white text-3xl">
                    Indeed, I am Allāh. There is no deity except Me, so worship Me and establish prayer for My remembrance.
                </p>
                <p className="mt-4 text-white text-2xl italic">
                    — Surah Tāhā, 20:14 (Saheeh International)
                </p>
            </div>
        </section>
    );
};

export default Hero;