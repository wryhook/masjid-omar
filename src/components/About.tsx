
const About: React.FC = () => {
	return (
		<section id="about" className="py-32 px-5 bg-foreground flex flex-col items-center">
			<p className="text-2xl tracking-wider text-center text-white">ABOUT</p>

			<div className="relative z-10 max-w-lg md:max-w-3xl mt-16">
				<p className="text-white text-xl">
					The Othman Bin Affan Islamic Society is a Charitable Islamic Society incorporated in 2012.
				</p>
				<p className="mt-10 text-white text-3xl">
					Our Mission
				</p>
				<p className="mt-3 text-white text-xl">
					To advance, teach, promulgate, and preach the Islāmic faith according to the Qur’ān and the Sunnah of Prophet Muhammad ﷺ, as understood and practiced by the Sahāba, and the three virtuous generations that came after them. Through this, we hope to encourage and aid in the growth, nurture, practice, and manifestation of Islām in our community.
				</p>
			</div>
		</section>
	)
}

export default About