import ProgramCard from "./Programs/ProgramCard"

const Programs: React.FC = () => {
  return (
    <section id="programs" className="py-32 px-5 flex flex-col items-center justify-center">
      <p className="text-2xl tracking-wider text-center">WEEKLY PROGRAMS</p>

      <div className="mt-16 flex flex-col space-y-12">
        <ProgramCard
          imgUrl="/images/tafsir-halaqa.webp"
          heading="Friday Weekly Halaqa"
          title="Tafsīr-ul-Qur’ān"
          description="An explanation of the meanings of the Noble Qur’ān, its virtues and its wisdoms, and advice on how to live by them in our daily lives."
          note="Open Q&A at the end."
          timing="On Fridays"
        />

        <ProgramCard
          imgUrl="/images/seerah-halaqa.webp"
          heading="Saturday Weekly Halaqa"
          title="Seerah of Prophet Muhammad ﷺ"
          description="Join us each week as we look at key moments from the Seerah, drawing on the Prophet's ﷺ life to find practical advice for Muslim youth today."
          note="Open Q&A at the end, with free refreshments served."
          timing="On Saturdays"
        />

        <ProgramCard
          imgUrl="/images/arabic-class.webp"
          heading="Weekly Class"
          title="Arabic (Brothers)"
          description="Classes focused on reading, speaking, and understanding of the Arabic language. Open to all ages and levels."
          note="For registration & more information, please contact (604) 300-1082 (call, text, or WhatsApp) or email imam@masjidomar.ca"
          timing="On Wednesdays & Thursdays"
        />

        <ProgramCard
          imgUrl="/images/quran-class.webp"
          heading="Weekly Class"
          title="Qur’ān (Brothers)"
          description="Classes focused on the recitation and memorization of the Qur’ān. Open to all ages and levels."
          note="For registration & more information, please contact (604) 300-1082 (call, text, or WhatsApp) or email imam@masjidomar.ca"
          timing="On Saturdays"
        />

      </div>

    </section>
  )
}

export default Programs