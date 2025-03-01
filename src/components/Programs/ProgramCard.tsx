import React from "react";

type ProgramCardProps = {
  imgUrl: string;
  heading: string;
  title: string;
  description: string;
  note: string;
  timing: string;
};

const ProgramCard: React.FC<ProgramCardProps> = ({ imgUrl, heading, title, description, note, timing }) => {
  return (
    <div className="flex flex-col sm:flex-row max-w-5xl mx-auto">
      {/* Left Side - Image */}
      <div className="w-full sm:w-1/2 relative">
        <div
          className="bg-cover bg-center bg-no-repeat w-full aspect-[1/1]"
          style={{ backgroundImage: `url(${imgUrl})` }}
        ></div>
      </div>

      {/* Right Side - Text */}
      <div className="w-full sm:w-1/2 flex flex-col justify-center bg-[#fff9f5] p-12">
        <p className="text-lg">{heading}</p>
        <h2 className="text-3xl font-semibold text-gray-800 mt-5">{title}</h2>
        <p className="mt-3">{description}</p>
        <p className="italic mt-6">{note}</p>
        <p className="text-xl font-semibold mt-6">{timing}</p>
      </div>
    </div>
  );
};

export default ProgramCard;