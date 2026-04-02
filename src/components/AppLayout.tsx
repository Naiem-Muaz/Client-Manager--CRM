import React from "react";
import { useState } from "react";
import { useUser } from "swr";
import { Link } from "@/components/ui/link";
import { getPageUrl, logOut } from "@/lib/utils";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  LayoutDashboard,
  Users,
  CheckSquare,
  FileText,
  MessageSquare,
  LogOut,
  ChevronDown,
} from "lucide-react";
import {
  DashboardPage,
  ClientsPage,
  TasksPage,
  NotesPage,
} from "@/product-types";

const navigationItems = [
  {
    title: "Dashboard",
    url: getPageUrl(DashboardPage),
    icon: LayoutDashboard,
  },
  {
    title: "Clients",
    url: getPageUrl(ClientsPage),
    icon: Users,
  },
  {
    title: "Tasks",
    url: getPageUrl(TasksPage),
    icon: CheckSquare,
  },
  {
    title: "Notes",
    url: getPageUrl(NotesPage),
    icon: FileText,
  },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const user = useUser();

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
          <div className="px-4 py-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
                <span className="text-lg font-bold text-primary-foreground">
                  AF
                </span>
              </div>
              <div>
                <h2 className="text-base font-semibold text-foreground">
                  Accountancy Firm
                </h2>
                <p className="text-xs text-muted-foreground">
                  Client Management
                </p>
              </div>
            </div>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                {navigationItems.map((item) => {
                  const isActive = window.location.pathname.startsWith(
                    item.url
                  );
                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild isActive={isActive}>
                        <Link to={item.url}>
                          <item.icon className="h-4 w-4" />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <SidebarMenuButton className="h-auto py-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user.profileImageUrl} />
                      <AvatarFallback className="bg-accent text-accent-foreground">
                        {user.firstName?.[0] ||
                          user.email?.[0]?.toUpperCase() ||
                          "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-1 flex-col items-start text-left">
                      <span className="text-sm font-medium">
                        {user.firstName && user.lastName
                          ? `${user.firstName} ${user.lastName}`
                          : user.name || "User"}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {user.email}
                      </span>
                    </div>
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  </SidebarMenuButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem disabled>
                    <span className="text-xs text-muted-foreground">
                      {user.email}
                    </span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => logOut()}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Sign Out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <SidebarTrigger className="m-4" />
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
}
