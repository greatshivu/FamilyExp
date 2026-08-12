import React, { useState } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { useIdleLogout } from "@/lib/useIdleLogout";
import { toast } from "sonner";
import {
    LayoutDashboard,
    ListChecks,
    Tags,
    BarChart3,
    LogOut,
    Leaf,
    User as UserIcon,
    ShieldCheck,
    Trash2,
    StickyNote,
    Camera,
} from "lucide-react";

const groupedBaseNav = [
    // Standalone item (no children)
    {
        label: "Dashboard",
        icon: LayoutDashboard,
        children: [
            { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, testid: "nav-dashboard" },
        ],
    },
    {
        label: "Transactions",
        icon: ListChecks,
        children: [
            { to: "/transactions", label: "Transactions", icon: ListChecks, testid: "nav-transactions" },
            { to: "/categories", label: "Categories", icon: Tags, testid: "nav-categories" },
        ],
    },
    {
        label: "Reports",
        icon: BarChart3,
        children: [
            { to: "/notes", label: "Notes", icon: StickyNote, testid: "nav-notes" },
            { to: "/farm-updates", label: "Updates", icon: Camera, testid: "nav-farm-updates" },
            { to: "/reports", label: "Reports", icon: BarChart3, testid: "nav-reports" },
        ],
    },
];

const profileGroup = {
    label: "Profile",
    icon: UserIcon,
    children: [
        { to: "/profile", label: "Profile", icon: UserIcon, testid: "nav-profile" },
    ],
};

const adminGroup = {
    label: "Profile",
    icon: UserIcon,
    children: [
        { to: "/profile", label: "Profile", icon: UserIcon, testid: "nav-profile" },
        { to: "/admin/accounts", label: "Accounts", icon: ShieldCheck, testid: "nav-accounts" },
        { to: "/admin/deletions", label: "Deletions", icon: Trash2, testid: "nav-deletions" },
        { to: "/audits", label: "Audits", icon: ListChecks, testid: "nav-audits" },
    ],
};


const baseNav = [
    { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, testid: "nav-dashboard" },
    { to: "/transactions", label: "Transactions", icon: ListChecks, testid: "nav-transactions" },
    { to: "/notes", label: "Notes", icon: StickyNote, testid: "nav-notes" },
    { to: "/farm-updates", label: "Updates", icon: Camera, testid: "nav-farm-updates" },
    { to: "/categories", label: "Categories", icon: Tags, testid: "nav-categories" },
    { to: "/reports", label: "Reports", icon: BarChart3, testid: "nav-reports" },
    { to: "/profile", label: "Profile", icon: UserIcon, testid: "nav-profile" },
];

const adminExtras = [
    { to: "/admin/accounts", label: "Accounts", icon: ShieldCheck, testid: "nav-accounts" },
    { to: "/admin/deletions", label: "Deletions", icon: Trash2, testid: "nav-deletions" },
];

const FIFTEEN_MIN = 15 * 60 * 1000;

export default function AppLayout({ children }) {
    const { user, logout } = useAuth();
    const [openMenu, setOpenMenu] = useState(null);
    const navigate = useNavigate();

    // const navItems = user?.role === "admin"
    //   ? [...baseNav.slice(0, 4), ...adminExtras, ...baseNav.slice(4)]
    //   : baseNav;

    const navItems = user?.role === "admin"
        ? [...groupedBaseNav, adminGroup]
        : [...groupedBaseNav, profileGroup];

    async function doLogout(reason) {
        await logout();
        if (reason) toast.info(reason);
        navigate("/login");
    }

    useIdleLogout({
        timeoutMs: FIFTEEN_MIN,
        warnBeforeMs: 60_000,
        enabled: !!user,
        onWarning: () => toast.warning("You will be logged out in 1 minute due to inactivity."),
        onLogout: () => doLogout("Logged out due to inactivity."),
    });

    return (
        <div className="min-h-screen bg-paper">
            <header className="sticky top-0 z-50 bg-[#F5F4F0]/85 backdrop-blur-xl border-b border-[#DCD7CB]">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-[#2D4C3B] text-[#F5F4F0] rounded-md flex items-center justify-center">
                            <Leaf className="w-5 h-5" />
                        </div>
                        <div className="leading-tight">
                            <div className="font-display font-black text-[#1C1F1D] text-base">SJSA</div>
                            <div className="text-[10px] tracking-[0.18em] uppercase text-[#8C938F]">
                                Family Manager
                            </div>
                        </div>
                    </div>

                    {/* <nav className="hidden md:flex items-center gap-1">
            {navItems.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                data-testid={n.testid}
                className={({ isActive }) =>
                  `px-3 py-2 rounded-md text-sm font-semibold flex items-center gap-2 transition-colors ${
                    isActive ? "bg-[#2D4C3B] text-[#F5F4F0]" : "text-[#1C1F1D] hover:bg-[#E8E5DC]"
                  }`
                }
              >
                <n.icon className="w-4 h-4" />
                {n.label}
              </NavLink>
            ))}
          </nav> */}
                    <nav className="hidden md:flex items-center gap-4">
                        {navItems.map((group) => {
                            const isParentActive = group.children?.some((child) =>
                                location.pathname.startsWith(child.to)
                            );

                            return (
                                <div key={group.label || group.to} className="relative group">
                                    <div onClick={() =>
                                        group.children &&
                                        setOpenMenu(
                                            openMenu === group.label ? null : group.label
                                        )
                                    }
                                        className={`px-3 py-2 rounded-md text-sm font-semibold flex items-center gap-2 transition-colors cursor-pointer ${isParentActive
                                                ? "bg-[#2D4C3B] text-[#F5F4F0]"
                                                : "text-[#1C1F1D] hover:bg-[#E8E5DC]"
                                            }`}
                                    >
                                        <group.icon className="w-4 h-4" />
                                        {group.label}
                                        {group.children && (
                                            <span className="text-xs" onClick={() =>
                                                group.children &&
                                                setOpenMenu(
                                                    openMenu === group.label ? null : group.label
                                                )
                                            } >
                                                {openMenu === group.label ? "▲" : "▼"}
                                            </span>
                                        )}
                                    </div>

                                    {group.children && openMenu === group.label && (
                                        <div className="absolute left-0 top-full mt-[0px] bg-white shadow-lg rounded-md p-2 z-50">
                                            {group.children.map((item) => (
                                                <NavLink onClick={() => setOpenMenu(null)}
                                                    key={`${group.label}-${item.to}`}
                                                    to={item.to}
                                                    data-testid={item.testid}
                                                    className={({ isActive }) =>
                                                        `block px-3 py-2 rounded-md text-sm font-semibold flex items-center gap-2 transition-colors ${isActive
                                                            ? "bg-[#2D4C3B] text-[#F5F4F0]"
                                                            : "text-[#1C1F1D] hover:bg-[#E8E5DC]"
                                                        }`
                                                    }
                                                >
                                                    <item.icon className="w-4 h-4" />
                                                    {item.label}
                                                </NavLink>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </nav>

                    <div className="flex items-center gap-3">
                        <div className="hidden sm:block text-right leading-tight">
                            <div className="text-sm font-semibold text-[#1C1F1D]" data-testid="header-user-name">
                                {user?.name}
                            </div>
                            <div className="text-xs text-[#5C635F]">
                                {user?.email}{" "}
                                {user?.role === "admin" && (
                                    <span className="bg-[#2D4C3B] text-[#F5F4F0] px-1.5 py-0.5 rounded text-[10px] ml-1 uppercase tracking-wide">admin</span>
                                )}
                            </div>
                        </div>
                        <Button
                            variant="outline" size="sm" onClick={() => doLogout()}
                            data-testid="logout-btn"
                            className="border-[#DCD7CB] text-[#1C1F1D] hover:bg-[#E8E5DC]"
                        >
                            <LogOut className="w-4 h-4 mr-1" />
                            Logout
                        </Button>
                    </div>
                </div>

                <nav className="md:hidden border-t border-[#DCD7CB] overflow-x-auto">
                    <div className="flex gap-1 px-2 py-2 min-w-max">
                        {navItems.map((n) => (
                            <NavLink
                                key={n.to} to={n.to} data-testid={`${n.testid}-mobile`}
                                className={({ isActive }) =>
                                    `px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap flex items-center gap-1.5 ${isActive ? "bg-[#2D4C3B] text-[#F5F4F0]" : "text-[#1C1F1D] bg-[#E8E5DC]"
                                    }`
                                }
                            >
                                <n.icon className="w-3.5 h-3.5" />
                                {n.label}
                            </NavLink>
                        ))}
                    </div>
                </nav>
            </header>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">{children}</main>
        </div>
    );
}
