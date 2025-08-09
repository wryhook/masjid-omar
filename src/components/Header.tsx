'use client';

import { siteDetails } from '@/data/siteDetails';
import { Menu, MenuButton, MenuItem, MenuItems, Transition } from '@headlessui/react';
import Image from 'next/image';
import Link from 'next/link';
import React, { useState } from 'react';
import { HiBars3, HiChevronDown, HiOutlineXMark } from 'react-icons/hi2';
import Container from './Container';

const Header: React.FC = () => {
	const [isOpen, setIsOpen] = useState(false);

	const toggleMenu = () => {
		setIsOpen(!isOpen);
	};

	const menuItems = [
		{ text: 'Programs', url: '/#programs' },
		{ text: 'About', url: '/#about' },
	];

	const dropdownItems = [
		{ text: 'Daily Prayer Times', url: 'https://awqat.net/Masjids/BCOmar/omar.html' },
		{ text: 'Ramadan Calendar', url: '/images/ramadan-calendar.jpg' },
	];

	return (
		<header className="bg-background fixed top-0 left-0 right-0 md:absolute z-50 mx-auto w-full">
			<Container className="!px-0">
				<nav className="mx-auto flex justify-between items-center py-2 px-5 md:py-4">
					{/* Logo */}
					<Link href="/" className="flex items-center gap-2">
						<Image src="/images/logo.png" alt={siteDetails.siteName} width={120} height={120} />
					</Link>

					{/* Desktop Menu */}
					<ul className="hidden md:flex space-x-10 items-center">
						<Menu as="li" className="relative">
							<MenuButton className="text-foreground hover:text-foreground-accent transition-colors inline-flex items-center">
								Prayer Times
								<HiChevronDown className="ml-1 h-4 w-4" aria-hidden="true" />
							</MenuButton>
							<MenuItems
								className="absolute left-0 mt-2 w-48 z-50 origin-top-right bg-foreground"
								transition
								anchor="bottom start"
							>
								<div>
									{dropdownItems.map((item) => (
										<MenuItem key={item.text}>
											<Link
												href={item.url}
												className="text-white transition-colors block px-4 py-2 hover:bg-white/10"
											>
												{item.text}
											</Link>
										</MenuItem>
									))}
								</div>
							</MenuItems>
						</Menu>
						{menuItems.map(item => (
							<li key={item.text}>
								<Link href={item.url} className="text-foreground hover:text-foreground-accent transition-colors">
									{item.text}
								</Link>
							</li>
						))}
						<li>
							<Link
								href="/donate"
								className="mt-12 text-white font-medium bg-primary border-2 border-primary hover:border-primary hover:bg-transparent hover:text-primary px-8 py-3 transition-colors"
							>
								Donate
							</Link>
						</li>
					</ul>

					{/* Mobile Menu Button */}
					<div className="md:hidden flex items-center">
						<button
							onClick={toggleMenu}
							type="button"
							className=" focus:outline-none rounded-full w-10 h-10 flex items-center justify-center"
							aria-controls="mobile-menu"
							aria-expanded={isOpen}
						>
							{isOpen ? (
								<HiOutlineXMark className="h-6 w-6" aria-hidden="true" />
							) : (
								<HiBars3 className="h-6 w-6" aria-hidden="true" />
							)}
							<span className="sr-only">Toggle navigation</span>
						</button>
					</div>
				</nav>
			</Container>

			{/* Mobile Menu with Transition */}
			<Transition
				show={isOpen}
				enter="transition ease-out duration-200 transform"
				enterFrom="opacity-0 scale-95"
				enterTo="opacity-100 scale-100"
				leave="transition ease-in duration-75 transform"
				leaveFrom="opacity-100 scale-100"
				leaveTo="opacity-0 scale-95"
			>
				<div id="mobile-menu" className="md:hidden bg-background">
					<ul className="flex flex-col space-y-4 pt-4 pb-8 px-6">
						<li className="space-y-2">
							<p className="text-foreground font-medium">Prayer Times</p>
							<ul className="pl-4 space-y-2">
								{dropdownItems.map((item) => (
									<li key={item.text}>
										<Link
											href={item.url}
											className="text-foreground hover:text-primary block"
											onClick={toggleMenu}
										>
											{item.text}
										</Link>
									</li>
								))}
							</ul>
						</li>
						{menuItems.map(item => (
							<li key={item.text}>
								<Link href={item.url} className="text-foreground hover:text-primary block" onClick={toggleMenu}>
									{item.text}
								</Link>
							</li>
						))}
						<li className="pt-4">
							<Link href="https://donate.stripe.com/4gwcQdaxNavW9c4aEF"
								className=" text-white font-medium bg-primary border-2 border-primary hover:border-primary hover:bg-transparent hover:text-primary px-5 py-2 transition-colors" onClick={toggleMenu}
							>
								Donate
							</Link>
						</li>
					</ul>
				</div>
			</Transition>
		</header>
	);
};

export default Header;
