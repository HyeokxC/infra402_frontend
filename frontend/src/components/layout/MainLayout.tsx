import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';

const MainLayout = () => {
    return (
        <div className="flex h-screen bg-[#212121] text-white">
            <Sidebar />
            <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
                {/* Header could go here if needed, but for now just the content content */}
                <div className="flex-1 overflow-y-auto p-4 md:p-6 pb-20 md:pb-6 relative">
                    <div className="max-w-4xl mx-auto h-full">
                        <Outlet />
                    </div>
                </div>
            </main>
        </div>
    );
};

export default MainLayout;
