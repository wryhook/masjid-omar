import Link from "next/link"

const Donations: React.FC = () => {
	return (
		<section id="donations" className="py-32 px-5 bg-foreground flex flex-col items-center justify-center">
			<p className="text-2xl tracking-wider text-center text-white">DONATIONS</p>

			<div className="relative text-center z-10 max-w-lg md:max-w-5xl mt-16">
				<h1 className="text-2xl md:text-6xl text-white leading-tight">
					اَلَّذِيۡنَ يُنۡفِقُوۡنَ اَمۡوَالَهُمۡ بِالَّيۡلِ وَالنَّهَارِ سِرًّا وَّعَلَانِيَةً فَلَهُمۡ اَجۡرُهُمۡ عِنۡدَ رَبِّهِمۡ​ۚ وَلَا خَوۡفٌ عَلَيۡهِمۡ وَلَا هُمۡ يَحۡزَنُوۡنَ
				</h1>
				<p className="mt-10 text-white text-2xl">
					Those who spend their wealth [in Allāh&apos;s way] by night and by day, secretly and publicly - they will have their reward with their Lord. And no fear will there be concerning them, nor will they grieve.
				</p>
				<p className="mt-6 text-white text-xl italic">
					— Surah Baqarah, 2:274 (Saheeh International)
				</p>
			</div>

			<Link
				href="https://donate.stripe.com/4gwcQdaxNavW9c4aEF"
				className="mt-12 text-primary font-medium bg-white border-2 border-white hover:border-white hover:bg-transparent hover:text-white px-8 py-3 transition-colors"
			>
				Donate
			</Link>
		</section>
	)
}

export default Donations