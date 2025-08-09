import React from "react";

const monthlyDonations = [
  { amount: 5, link: "https://buy.stripe.com/9AQ4jHcFV47ybkc8wC" },
  { amount: 10, link: "https://buy.stripe.com/7sI3fD21hbA0fAs6ot" },
  { amount: 20, link: "https://buy.stripe.com/7sI2bz49p7jKgEwfZ2" },
  { amount: 50, link: "https://buy.stripe.com/7sI8zXbBRavWbkcfZ1" },
  { amount: 100, link: "https://buy.stripe.com/bIY7vTeO3fQg1JC5km" },
  { amount: 150, link: "https://buy.stripe.com/6oE4jHgWb8nObkc3cj" }
]

const DonatePage: React.FC = () => (
  <section className="py-32 px-5 flex flex-col items-center justify-center">
    <h1 className="text-3xl font-bold">Make a Donation</h1>

    <div className="mt-12 max-w-3xl">
      <h3 className="text-2xl text-center font-bold">Monthly Donation</h3>
      <div
        className="
          grid 
          grid-cols-1 
          sm:grid-cols-2 
          md:grid-cols-3 
          gap-6 
          mt-6
          w-full
        "
      >
        {
          monthlyDonations.map((donation) => (
            <a
              key={donation.amount}
              href={donation.link}
              target="_blank"
              className="
                text-white bg-primary border-2 border-primary 
                hover:border-primary hover:bg-transparent hover:text-primary 
                px-6 py-3 transition-colors 
                w-full block text-center
              "
            >
              ${donation.amount} / month
            </a>
          ))
        }
      </div>
    </div>

    <div className="mt-12 max-w-3xl flex items-center justify-center flex-col">
      <h3 className="text-2xl text-center font-bold">One-time Donation</h3>
      <a
        href="https://donate.stripe.com/4gwcQdaxNavW9c4aEF"
        target="_blank"
        className="mt-6 text-white bg-primary border-2 border-primary hover:border-primary hover:bg-transparent hover:text-primary px-12 py-3 transition-colors"
      >
        Donate
      </a>
      <p className="text-center text-lg mt-4">
        Donations via e-transfer: <strong>masjidomar2020@gmail.com</strong>
      </p>
    </div>

    <div className="mt-12 max-w-xl">
      <p className="text-center text-lg">
        Your donations help Masjid Omar maintain its facility, pay for essential utilities, and fund programs that benefit the community.
      </p>
    </div>
  </section>
);

export default DonatePage;