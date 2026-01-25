import { NavLink } from 'react-router-dom';
import { MessageSquare, Server, Cpu, Box, LayoutGrid } from 'lucide-react';
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

const Sidebar = () => {
    const navItems = [
        { name: 'Chat', icon: MessageSquare, path: '/' },
        { name: 'Server Selection', icon: Server, path: '/servers' },
        { name: 'My Containers', icon: Box, path: '/containers' },
    ];

    return (
        <aside className="w-[260px] h-screen bg-[#171717] border-r border-[#303030] flex flex-col text-gray-200">
            <div className="p-4 border-b border-[#303030]">
                <h1 className="text-xl font-bold flex items-center gap-2 text-brand-500">
                    <LayoutGrid className="w-6 h-6" />
                    Infra402
                </h1>
            </div>

            <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
                {navItems.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        className={({ isActive }) =>
                            `flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${isActive
                                ? 'bg-[#303030] text-white'
                                : 'text-gray-400 hover:text-white hover:bg-[#252525]'
                            }`
                        }
                    >
                        <item.icon className="w-4 h-4" />
                        {item.name}
                    </NavLink>
                ))}
            </nav>

            <div className="p-4 border-t border-[#303030] bg-[#1a1a1a]">
                <div className="mb-2">
                    <Wallet>
                        <ConnectWallet className="w-full bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg !h-10 px-3 flex items-center justify-start gap-2 transition-all">
                            <Avatar className="h-5 w-5" />
                            <Name className="text-sm" />
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
                <div className="text-xs text-gray-500 text-center">
                    v0.1.0 Beta
                </div>
            </div>
        </aside>
    );
};

export default Sidebar;
