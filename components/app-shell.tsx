"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChevronDown,
  HeartHandshake,
  UserRound,
  Wifi,
} from "lucide-react";

import { navigationItems, getPageCopy } from "@/lib/navigation";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { MissedMedicationNotifications } from "@/components/missed-medication-notifications";

function RecipientSwitcher({ mobile = false }: { mobile?: boolean }) {
  return (
    <button
      type="button"
      className={cn("recipient-switcher", mobile && "recipient-switcher-mobile")}
      aria-label="Change care recipient, currently Margaret"
    >
      <span className="recipient-initial" aria-hidden="true">M</span>
      <span className="recipient-copy">
        <span className="recipient-eyebrow">Caring for</span>
        <span className="recipient-name">Margaret</span>
      </span>
      <ChevronDown className="recipient-chevron" aria-hidden="true" size={16} strokeWidth={1.8} />
    </button>
  );
}

function NavLinks({ mobile = false }: { mobile?: boolean }) {
  const pathname = usePathname();

  return (
    <div className={cn("nav-links", mobile && "nav-links-mobile")}>
      {navigationItems.map(({ href, label, icon: Icon }) => {
        const isActive = pathname === href || (href === "/home" && pathname.startsWith("/home/"));

        return (
          <Link
            key={href}
            href={href}
            className={cn("nav-link", isActive && "nav-link-active")}
            aria-current={isActive ? "page" : undefined}
            aria-label={label}
            title={label}
          >
            <Icon className="nav-icon" size={20} strokeWidth={1.8} aria-hidden="true" />
            <span className="nav-label">{label}</span>
          </Link>
        );
      })}
    </div>
  );
}

function DeviceStatus() {
  const deviceNeedsAttention = false;

  if (!deviceNeedsAttention) return null;

  return (
    <div className="device-status" aria-label="Margaret’s device is connected">
      <span className="device-status-icon" aria-hidden="true">
        <Wifi size={16} strokeWidth={1.8} />
      </span>
      <span className="device-status-copy">
        <span className="device-status-label">Device status</span>
        <span className="device-status-text">
          <span className="status-dot" aria-hidden="true" />
          Margaret’s device is connected
        </span>
      </span>
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  if (pathname.startsWith("/setup")) {
    return <>{children}</>;
  }

  const { title, subtitle } = getPageCopy(pathname);

  return (
    <div className="app-shell">
      <aside className="desktop-sidebar" aria-label="Primary navigation">
        <div className="sidebar-inner">
          <Link href="/home" className="brand" aria-label="CareCompanion home">
            <span className="brand-mark" aria-hidden="true">
              <HeartHandshake size={18} strokeWidth={1.8} />
            </span>
            <span className="brand-wordmark">CareCompanion</span>
          </Link>

          <div className="sidebar-recipient">
            <RecipientSwitcher />
          </div>

          <nav className="sidebar-navigation" aria-label="Caregiver workspace">
            <p className="sidebar-section-label">Workspace</p>
            <NavLinks />
          </nav>

          <div className="sidebar-profile">
            <Link className="profile-button" href="/profile" aria-label="Open David’s profile">
              <Avatar className="profile-avatar h-10 w-10">
                <AvatarFallback> D </AvatarFallback>
              </Avatar>
              <span className="profile-copy">
                <span className="profile-eyebrow">Caregiver</span>
                <span className="profile-name">David</span>
              </span>
            </Link>
          </div>
        </div>
      </aside>

      <div className="mobile-frame">
        <div className="content-frame">
          <header className="desktop-header">
            <div className="page-heading">
              <p className="page-kicker">Caring for Margaret</p>
              <h1>{title}</h1>
              <p>{subtitle}</p>
            </div>
            <div className="header-actions">
              <DeviceStatus />
              <MissedMedicationNotifications />
              <Button asChild variant="ghost" size="icon" aria-label="Open David’s profile">
                <Link href="/profile">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="text-xs">D</AvatarFallback>
                  </Avatar>
                </Link>
              </Button>
            </div>
          </header>

          <main id="main-content" className="main-content">
            {children}
          </main>
        </div>

        <nav className="mobile-bottom-nav" aria-label="Mobile navigation">
          <NavLinks mobile />
          <div className="mobile-nav-profile" aria-label="Signed in as David">
            <UserRound size={16} strokeWidth={1.8} aria-hidden="true" />
            <span>David</span>
          </div>
        </nav>
      </div>
    </div>
  );
}
