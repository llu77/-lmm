import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button.tsx";
import { Authenticated, Unauthenticated } from "convex/react";
import { SignInButton } from "@/components/ui/signin.tsx";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet.tsx";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu.tsx";
import {
  LayoutDashboardIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  CoinsIcon,
  UsersIcon,
  PackageIcon,
  FileTextIcon,
  ClipboardListIcon,
  ShieldCheckIcon,
  MenuIcon,
  LogOutIcon,
  BrainIcon,
  SettingsIcon,
  DollarSignIcon,
  ReceiptIcon,
  ChevronDownIcon,
  WalletIcon,
  BoxIcon
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth.ts";
import { useBranch } from "@/hooks/use-branch.ts";

export default function Navbar() {
  const location = useLocation();
  const { signoutRedirect } = useAuth();
  const { branchName } = useBranch();
  const [isOpen, setIsOpen] = useState(false);

  const navGroups = {
    dashboard: { path: "/dashboard", label: "لوحة التحكم", icon: LayoutDashboardIcon },
    finance: {
      label: "المالية",
      icon: WalletIcon,
      items: [
        { path: "/revenues", label: "الإيرادات", icon: TrendingUpIcon },
        { path: "/expenses", label: "المصروفات", icon: TrendingDownIcon },
        { path: "/bonus", label: "البونص", icon: CoinsIcon },
      ]
    },
    employees: {
      label: "الموظفون",
      icon: UsersIcon,
      items: [
        { path: "/employees", label: "إدارة الموظفين", icon: UsersIcon },
        { path: "/advances-deductions", label: "السلف والخصومات", icon: DollarSignIcon },
        { path: "/payroll", label: "مسير الرواتب", icon: ReceiptIcon },
      ]
    },
    requests: {
      label: "الطلبات",
      icon: BoxIcon,
      items: [
        { path: "/product-orders", label: "طلبات المنتجات", icon: PackageIcon },
        { path: "/employee-requests", label: "طلبات الموظفين", icon: FileTextIcon },
        { path: "/my-requests", label: "طلباتي", icon: ClipboardListIcon },
        { path: "/manage-requests", label: "إدارة الطلبات", icon: ShieldCheckIcon },
      ]
    },
    system: {
      label: "النظام",
      icon: SettingsIcon,
      items: [
        { path: "/ai-assistant", label: "مساعد AI", icon: BrainIcon },
        { path: "/system-support", label: "دعم النظام", icon: SettingsIcon },
      ]
    }
  };

  // Helper to check if any item in a group is active
  const isGroupActive = (items: { path: string }[]) => {
    return items.some(item => location.pathname === item.path);
  };

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-primary shadow-md">
      <div className="container flex h-16 items-center justify-between">
        {/* Logo and Brand */}
        <Link to="/dashboard" className="flex items-center gap-3 text-primary-foreground font-bold hover:opacity-90 transition-opacity">
          <img 
            src="https://cdn.hercules.app/file_X3jdTiCKmUjHC4szRS5CixU4" 
            alt="Logo"
            className="h-12 w-12 object-contain"
            style={{ backgroundColor: 'transparent' }}
          />
          <div className="flex flex-col gap-1">
            <span className="text-2xl hidden sm:block">نظام الإدارة المالية</span>
            <span className="text-lg sm:hidden">الإدارة المالية</span>
            {branchName && (
              <span className="rounded-full bg-primary-foreground px-3 py-0.5 text-xs font-bold text-primary shadow-md">
                {branchName}
              </span>
            )}
          </div>
        </Link>

        {/* Desktop Navigation */}
        <Authenticated>
          <div className="hidden lg:flex items-center gap-1">
            {/* Dashboard */}
            <Button
              variant={location.pathname === navGroups.dashboard.path ? "secondary" : "ghost"}
              size="sm"
              asChild
              className={location.pathname === navGroups.dashboard.path
                ? "font-bold text-sm"
                : "text-primary-foreground hover:bg-primary-foreground/20 font-semibold text-sm"
              }
            >
              <Link to={navGroups.dashboard.path}>
                <navGroups.dashboard.icon className="size-4 ml-2" />
                {navGroups.dashboard.label}
              </Link>
            </Button>

            {/* Finance Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant={isGroupActive(navGroups.finance.items) ? "secondary" : "ghost"}
                  size="sm"
                  className={isGroupActive(navGroups.finance.items)
                    ? "font-bold text-sm"
                    : "text-primary-foreground hover:bg-primary-foreground/20 font-semibold text-sm"
                  }
                >
                  <navGroups.finance.icon className="size-4 ml-2" />
                  {navGroups.finance.label}
                  <ChevronDownIcon className="size-3 mr-2" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {navGroups.finance.items.map((item) => (
                  <DropdownMenuItem key={item.path} asChild>
                    <Link to={item.path} className="flex items-center cursor-pointer">
                      <item.icon className="size-4 ml-2" />
                      {item.label}
                    </Link>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Employees Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant={isGroupActive(navGroups.employees.items) ? "secondary" : "ghost"}
                  size="sm"
                  className={isGroupActive(navGroups.employees.items)
                    ? "font-bold text-sm"
                    : "text-primary-foreground hover:bg-primary-foreground/20 font-semibold text-sm"
                  }
                >
                  <navGroups.employees.icon className="size-4 ml-2" />
                  {navGroups.employees.label}
                  <ChevronDownIcon className="size-3 mr-2" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {navGroups.employees.items.map((item) => (
                  <DropdownMenuItem key={item.path} asChild>
                    <Link to={item.path} className="flex items-center cursor-pointer">
                      <item.icon className="size-4 ml-2" />
                      {item.label}
                    </Link>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Requests Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant={isGroupActive(navGroups.requests.items) ? "secondary" : "ghost"}
                  size="sm"
                  className={isGroupActive(navGroups.requests.items)
                    ? "font-bold text-sm"
                    : "text-primary-foreground hover:bg-primary-foreground/20 font-semibold text-sm"
                  }
                >
                  <navGroups.requests.icon className="size-4 ml-2" />
                  {navGroups.requests.label}
                  <ChevronDownIcon className="size-3 mr-2" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {navGroups.requests.items.map((item) => (
                  <DropdownMenuItem key={item.path} asChild>
                    <Link to={item.path} className="flex items-center cursor-pointer">
                      <item.icon className="size-4 ml-2" />
                      {item.label}
                    </Link>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* System Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant={isGroupActive(navGroups.system.items) ? "secondary" : "ghost"}
                  size="sm"
                  className={isGroupActive(navGroups.system.items)
                    ? "font-bold text-sm"
                    : "text-primary-foreground hover:bg-primary-foreground/20 font-semibold text-sm"
                  }
                >
                  <navGroups.system.icon className="size-4 ml-2" />
                  {navGroups.system.label}
                  <ChevronDownIcon className="size-3 mr-2" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {navGroups.system.items.map((item) => (
                  <DropdownMenuItem key={item.path} asChild>
                    <Link to={item.path} className="flex items-center cursor-pointer">
                      <item.icon className="size-4 ml-2" />
                      {item.label}
                    </Link>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </Authenticated>

        {/* Right Side Actions */}
        <div className="flex items-center gap-2">
          <Authenticated>
            {/* Desktop Actions */}
            <div className="hidden lg:flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => signoutRedirect()}
                className="text-primary-foreground hover:bg-primary-foreground/20 font-semibold text-sm"
              >
                <LogOutIcon className="size-4 ml-2" />
                تسجيل الخروج
              </Button>
            </div>

            {/* Mobile Menu */}
            <Sheet open={isOpen} onOpenChange={setIsOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="lg:hidden text-primary-foreground hover:bg-primary-foreground/20"
                >
                  <MenuIcon className="size-6" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-72 overflow-y-auto">
                <SheetHeader className="space-y-2 pb-4">
                  <SheetTitle className="flex items-center gap-2 text-right text-base font-bold">
                    <img
                      src="https://cdn.hercules.app/file_X3jdTiCKmUjHC4szRS5CixU4"
                      alt="Logo"
                      className="h-10 w-10 object-contain"
                      style={{ backgroundColor: 'transparent' }}
                    />
                    القائمة الرئيسية
                  </SheetTitle>
                  {branchName && (
                    <div className="rounded-full bg-primary px-3 py-1 text-center text-xs font-bold text-primary-foreground shadow-md">
                      {branchName}
                    </div>
                  )}
                </SheetHeader>

                <div className="flex flex-col gap-6 mt-4">
                  {/* Dashboard */}
                  <div className="space-y-2">
                    <Button
                      variant={location.pathname === navGroups.dashboard.path ? "secondary" : "ghost"}
                      size="sm"
                      asChild
                      className={location.pathname === navGroups.dashboard.path ? "font-bold justify-start w-full" : "justify-start w-full font-semibold"}
                      onClick={() => setIsOpen(false)}
                    >
                      <Link to={navGroups.dashboard.path}>
                        <navGroups.dashboard.icon className="size-4 ml-2" />
                        {navGroups.dashboard.label}
                      </Link>
                    </Button>
                  </div>

                  {/* Finance Section */}
                  <div className="space-y-2">
                    <div className="px-2 text-xs font-bold text-muted-foreground flex items-center gap-2">
                      <navGroups.finance.icon className="size-3.5" />
                      {navGroups.finance.label}
                    </div>
                    {navGroups.finance.items.map((item) => {
                      const Icon = item.icon;
                      const isActive = location.pathname === item.path;
                      return (
                        <Button
                          key={item.path}
                          variant={isActive ? "secondary" : "ghost"}
                          size="sm"
                          asChild
                          className={isActive ? "font-bold justify-start w-full" : "justify-start w-full"}
                          onClick={() => setIsOpen(false)}
                        >
                          <Link to={item.path}>
                            <Icon className="size-4 ml-2" />
                            {item.label}
                          </Link>
                        </Button>
                      );
                    })}
                  </div>

                  {/* Employees Section */}
                  <div className="space-y-2">
                    <div className="px-2 text-xs font-bold text-muted-foreground flex items-center gap-2">
                      <navGroups.employees.icon className="size-3.5" />
                      {navGroups.employees.label}
                    </div>
                    {navGroups.employees.items.map((item) => {
                      const Icon = item.icon;
                      const isActive = location.pathname === item.path;
                      return (
                        <Button
                          key={item.path}
                          variant={isActive ? "secondary" : "ghost"}
                          size="sm"
                          asChild
                          className={isActive ? "font-bold justify-start w-full" : "justify-start w-full"}
                          onClick={() => setIsOpen(false)}
                        >
                          <Link to={item.path}>
                            <Icon className="size-4 ml-2" />
                            {item.label}
                          </Link>
                        </Button>
                      );
                    })}
                  </div>

                  {/* Requests Section */}
                  <div className="space-y-2">
                    <div className="px-2 text-xs font-bold text-muted-foreground flex items-center gap-2">
                      <navGroups.requests.icon className="size-3.5" />
                      {navGroups.requests.label}
                    </div>
                    {navGroups.requests.items.map((item) => {
                      const Icon = item.icon;
                      const isActive = location.pathname === item.path;
                      return (
                        <Button
                          key={item.path}
                          variant={isActive ? "secondary" : "ghost"}
                          size="sm"
                          asChild
                          className={isActive ? "font-bold justify-start w-full" : "justify-start w-full"}
                          onClick={() => setIsOpen(false)}
                        >
                          <Link to={item.path}>
                            <Icon className="size-4 ml-2" />
                            {item.label}
                          </Link>
                        </Button>
                      );
                    })}
                  </div>

                  {/* System Section */}
                  <div className="space-y-2">
                    <div className="px-2 text-xs font-bold text-muted-foreground flex items-center gap-2">
                      <navGroups.system.icon className="size-3.5" />
                      {navGroups.system.label}
                    </div>
                    {navGroups.system.items.map((item) => {
                      const Icon = item.icon;
                      const isActive = location.pathname === item.path;
                      return (
                        <Button
                          key={item.path}
                          variant={isActive ? "secondary" : "ghost"}
                          size="sm"
                          asChild
                          className={isActive ? "font-bold justify-start w-full" : "justify-start w-full"}
                          onClick={() => setIsOpen(false)}
                        >
                          <Link to={item.path}>
                            <Icon className="size-4 ml-2" />
                            {item.label}
                          </Link>
                        </Button>
                      );
                    })}
                  </div>

                  {/* Logout */}
                  <div className="border-t pt-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setIsOpen(false);
                        signoutRedirect();
                      }}
                      className="justify-start text-destructive hover:text-destructive w-full"
                    >
                      <LogOutIcon className="size-4 ml-2" />
                      تسجيل الخروج
                    </Button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </Authenticated>
          
          <Unauthenticated>
            <SignInButton />
          </Unauthenticated>
        </div>
      </div>
    </nav>
  );
}
