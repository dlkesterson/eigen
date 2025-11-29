'use client';

import { Sidebar } from '@/components/sidebar';
import { Header } from '@/components/header';
import { MainContent } from '@/components/main-content';

export default function Home() {
	return (
		<div className='flex h-screen w-screen overflow-hidden bg-linear-to-br from-slate-950 via-slate-900 to-slate-950'>
			<Sidebar />
			<div className='flex flex-1 flex-col overflow-hidden'>
				<Header />
				<MainContent />
			</div>
		</div>
	);
}
