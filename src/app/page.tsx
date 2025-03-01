import About from "@/components/About";
import Donations from "@/components/Donations";
import Hero from "@/components/Hero";
import Programs from "@/components/Programs";

const HomePage: React.FC = () => {
  return (
    <>
      <Hero />
      <Donations />
      <Programs />
      <About />
    </>
  );
};

export default HomePage;
