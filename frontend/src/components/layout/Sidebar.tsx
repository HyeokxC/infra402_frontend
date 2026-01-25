import { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { MessageSquare, Server, Box, LayoutGrid, ChevronLeft, ChevronRight } from 'lucide-react';
import {
    ConnectWallet,
    Wallet,
    WalletDropdown,
    WalletDropdownDisconnect,
} from "@coinbase/onchainkit/wallet";
import {
    Address,
    Avatar,
    Name,
    Identity,
    EthBalance,
} from "@coinbase/onchainkit/identity";

const COLLAPSE_STORAGE_KEY = 'infra402.sidebar.collapsed';

const Sidebar = () => {
    const [collapsed, setCollapsed] = useState(false);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        const stored = window.localStorage.getItem(COLLAPSE_STORAGE_KEY);
        if (stored) {
            setCollapsed(stored === 'true');
        }
    }, []);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        window.localStorage.setItem(COLLAPSE_STORAGE_KEY, String(collapsed));
    }, [collapsed]);

    const navItems = [
        { name: 'Chat', icon: MessageSquare, path: '/' },
        { name: 'Server Selection', icon: Server, path: '/servers' },
        { name: 'My Containers', icon: Box, path: '/containers' },
    ];

    return (
        <aside
            className={`h-screen bg-[#171717] border-r border-[#303030] flex flex-col text-gray-200 transition-all duration-200 ${collapsed ? 'w-[76px]' : 'w-[260px]'
                }`}
        >
            <div className="p-4 border-b border-[#303030] flex items-center justify-between">
                <h1 className="text-xl font-bold flex items-center gap-2 text-brand-500">
                    <LayoutGrid className="w-6 h-6" />
                    {!collapsed && <span>Infra402</span>}
                </h1>
                <button
                    className="p-2 rounded-md text-zinc-400 hover:text-white hover:bg-[#252525] transition-colors"
                    onClick={() => setCollapsed((prev) => !prev)}
                    title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                >
                    {collapsed ? (
                        <ChevronRight className="w-4 h-4" />
                    ) : (
                        <ChevronLeft className="w-4 h-4" />
                    )}
                </button>
            </div>

            <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
                {navItems.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        title={collapsed ? item.name : undefined}
                        className={({ isActive }) =>
                            `flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${isActive
                                ? 'bg-[#303030] text-white'
                                : 'text-gray-400 hover:text-white hover:bg-[#252525]'
                            }`
                        }
                    >
                        <item.icon className="w-4 h-4" />
                        <span className={`${collapsed ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100'} transition-all`}
                        >
                            {item.name}
                        </span>
                    </NavLink>
                ))}
            </nav>

            <div className="p-4 border-t border-[#303030] bg-[#1a1a1a]">
                <div className="mb-2">
                    <Wallet>
                        <ConnectWallet className="w-full bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg !h-10 px-3 flex items-center justify-start gap-2 transition-all">
                            <Avatar className="h-5 w-5" />
                            {!collapsed && <Name className="text-sm" />}
                        </ConnectWallet>
                        <WalletDropdown>
                            <Identity className="px-4 pt-3 pb-2" hasCopyAddressOnClick>
                                <Avatar />
                                <Name />
                                <Address />
                                <EthBalance />
                            </Identity>
                            <WalletDropdownDisconnect />
                        </WalletDropdown>
                    </Wallet>
                </div>
                {!collapsed && (
                    <div className="text-xs text-gray-500 text-center">
                        v0.1.0 Beta
                    </div>
                )}
            </div>
        </aside>
    );
};

export default Sidebar;
