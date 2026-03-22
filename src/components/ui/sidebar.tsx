"use client"

import * as React from "react"
import { PanelLeft } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const SIDEBAR_WIDTH = "18rem"
const SIDEBAR_WIDTH_ICON = "4.5rem"
const SIDEBAR_WIDTH_MOBILE = "18rem"
const SIDEBAR_KEYBOARD_SHORTCUT = "b"
const MOBILE_BREAKPOINT = 1024

type SidebarContextValue = {
  state: "expanded" | "collapsed"
  open: boolean
  setOpen: (open: boolean) => void
  openMobile: boolean
  setOpenMobile: (open: boolean) => void
  isMobile: boolean
  toggleSidebar: () => void
}

const SidebarContext = React.createContext<SidebarContextValue | null>(null)

function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState(false)

  React.useEffect(() => {
    const mediaQuery = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    const update = () => setIsMobile(mediaQuery.matches)
    update()
    mediaQuery.addEventListener("change", update)
    return () => mediaQuery.removeEventListener("change", update)
  }, [])

  return isMobile
}

function useSidebar() {
  const context = React.useContext(SidebarContext)

  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider.")
  }

  return context
}

function SidebarProvider({
  defaultOpen = true,
  open: openProp,
  onOpenChange,
  style,
  className,
  children,
  ...props
}: React.ComponentProps<"div"> & {
  defaultOpen?: boolean
  open?: boolean
  onOpenChange?: (open: boolean) => void
}) {
  const isMobile = useIsMobile()
  const [openMobile, setOpenMobile] = React.useState(false)
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(defaultOpen)

  const open = openProp ?? uncontrolledOpen
  const setOpen = React.useCallback(
    (value: boolean) => {
      if (onOpenChange) {
        onOpenChange(value)
        return
      }

      setUncontrolledOpen(value)
    },
    [onOpenChange],
  )

  const toggleSidebar = React.useCallback(() => {
    if (isMobile) {
      setOpenMobile((current) => !current)
      return
    }

    setOpen(!open)
  }, [isMobile, open, setOpen])

  React.useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key.toLowerCase() !== SIDEBAR_KEYBOARD_SHORTCUT) {
        return
      }

      if (!(event.metaKey || event.ctrlKey)) {
        return
      }

      event.preventDefault()
      toggleSidebar()
    }

    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [toggleSidebar])

  const state = open ? "expanded" : "collapsed"

  return (
    <SidebarContext.Provider
      value={{
        state,
        open,
        setOpen,
        openMobile,
        setOpenMobile,
        isMobile,
        toggleSidebar,
      }}
    >
      <div
        data-slot="sidebar-wrapper"
        data-state={state}
        data-mobile={isMobile ? "true" : "false"}
        style={
          {
            "--sidebar-width": SIDEBAR_WIDTH,
            "--sidebar-width-icon": SIDEBAR_WIDTH_ICON,
            "--sidebar-width-mobile": SIDEBAR_WIDTH_MOBILE,
            ...style,
          } as React.CSSProperties
        }
        className={cn("group/sidebar-wrapper flex min-h-screen w-full", className)}
        {...props}
      >
        {children}
      </div>
    </SidebarContext.Provider>
  )
}

function Sidebar({
  side = "left",
  variant = "sidebar",
  collapsible = "offcanvas",
  className,
  children,
  ...props
}: React.ComponentProps<"aside"> & {
  side?: "left" | "right"
  variant?: "sidebar" | "floating" | "inset"
  collapsible?: "offcanvas" | "icon" | "none"
}) {
  const { state, openMobile, setOpenMobile, isMobile } = useSidebar()
  const collapsed = collapsible === "icon" && state === "collapsed"

  if (isMobile) {
    return (
      <>
        <div
          className={cn(
            "fixed inset-0 z-40 bg-earth-900/30 backdrop-blur-[2px] transition-opacity duration-200",
            openMobile ? "opacity-100" : "pointer-events-none opacity-0",
          )}
          onClick={() => setOpenMobile(false)}
        />
        <aside
          data-slot="sidebar"
          data-mobile="true"
          className={cn(
            "fixed inset-y-0 z-50 flex w-[var(--sidebar-width-mobile)] flex-col border-r border-white/60 bg-[color:var(--color-card)]/95 p-3 shadow-[0_24px_64px_-36px_rgba(39,38,21,0.45)] backdrop-blur-xl transition-transform duration-200",
            side === "left" ? "left-0" : "right-0 border-l border-r-0",
            openMobile
              ? "translate-x-0"
              : side === "left"
                ? "-translate-x-full"
                : "translate-x-full",
            className,
          )}
          {...props}
        >
          {children}
        </aside>
      </>
    )
  }

  return (
    <aside
      data-slot="sidebar"
      data-state={state}
      data-collapsible={collapsed ? "icon" : collapsible}
      data-variant={variant}
      className={cn(
        "relative hidden border-r border-white/60 bg-transparent lg:flex",
        side === "right" ? "order-last border-l border-r-0" : "order-first",
        className,
      )}
      style={{
        width:
          collapsible === "none"
            ? "var(--sidebar-width)"
            : collapsed
              ? "var(--sidebar-width-icon)"
              : "var(--sidebar-width)",
      }}
      {...props}
    >
      <div
        className={cn(
          "zentrale-sidebar flex h-screen w-full flex-col overflow-hidden transition-[width,padding] duration-200",
          variant === "floating" && "rounded-[1.75rem]",
          collapsed ? "px-2 py-3" : "px-3 py-4",
        )}
      >
        {children}
      </div>
    </aside>
  )
}

function SidebarInset({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sidebar-inset"
      className={cn("min-w-0 flex-1", className)}
      {...props}
    />
  )
}

function SidebarTrigger({ className, ...props }: React.ComponentProps<typeof Button>) {
  const { toggleSidebar } = useSidebar()

  return (
    <Button
      data-slot="sidebar-trigger"
      variant="ghost"
      size="icon"
      className={cn("rounded-full", className)}
      onClick={toggleSidebar}
      {...props}
    >
      <PanelLeft />
      <span className="sr-only">Seitenleiste umschalten</span>
    </Button>
  )
}

function SidebarRail({ className, ...props }: React.ComponentProps<"button">) {
  const { toggleSidebar } = useSidebar()

  return (
    <button
      type="button"
      data-slot="sidebar-rail"
      onClick={toggleSidebar}
      className={cn(
        "absolute inset-y-0 -right-2 hidden w-2 rounded-full bg-transparent transition hover:bg-white/60 lg:block",
        className,
      )}
      {...props}
    >
      <span className="sr-only">Seitenleiste umschalten</span>
    </button>
  )
}

function SidebarHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sidebar-header"
      className={cn("flex flex-col gap-3 border-b border-earth-500/10 pb-4", className)}
      {...props}
    />
  )
}

function SidebarFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sidebar-footer"
      className={cn("mt-auto flex flex-col gap-3 border-t border-earth-500/10 pt-4", className)}
      {...props}
    />
  )
}

function SidebarContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sidebar-content"
      className={cn("flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto py-4", className)}
      {...props}
    />
  )
}

function SidebarGroup({ className, ...props }: React.ComponentProps<"section">) {
  return (
    <section
      data-slot="sidebar-group"
      className={cn("flex flex-col gap-2", className)}
      {...props}
    />
  )
}

function SidebarGroupLabel({ className, ...props }: React.ComponentProps<"div">) {
  const { state } = useSidebar()

  return (
    <div
      data-slot="sidebar-group-label"
      className={cn(
        "px-2 text-[0.68rem] font-medium uppercase tracking-[0.24em] text-earth-400 transition-opacity",
        state === "collapsed" && "pointer-events-none h-0 overflow-hidden opacity-0",
        className,
      )}
      {...props}
    />
  )
}

function SidebarGroupContent({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="sidebar-group-content" className={cn("flex flex-col gap-1", className)} {...props} />
}

function SidebarMenu({ className, ...props }: React.ComponentProps<"ul">) {
  return <ul data-slot="sidebar-menu" className={cn("flex flex-col gap-1", className)} {...props} />
}

function SidebarMenuItem({ className, ...props }: React.ComponentProps<"li">) {
  return <li data-slot="sidebar-menu-item" className={cn("list-none", className)} {...props} />
}

function SidebarMenuButton({
  asChild = false,
  isActive = false,
  className,
  children,
  ...props
}: React.ComponentProps<"button"> & {
  asChild?: boolean
  isActive?: boolean
}) {
  const { state } = useSidebar()
  const child = React.isValidElement(children)
    ? (children as React.ReactElement<{ className?: string }>)
    : null

  const sharedClassName = cn(
    "group/menu-button flex w-full items-center gap-3 rounded-[1.15rem] px-3 py-2.5 text-sm text-earth-500 transition-colors hover:bg-white/75 hover:text-earth-700",
    isActive && "bg-white text-earth-700 shadow-brand-soft",
    state === "collapsed" && "justify-center px-2 [&>div]:hidden [&>span]:hidden",
    className,
  )

  if (asChild && child) {
    return React.cloneElement(child, {
      className: cn(sharedClassName, child.props.className),
    })
  }

  return (
    <button data-slot="sidebar-menu-button" data-active={isActive} className={sharedClassName} {...props}>
      {children}
    </button>
  )
}

function SidebarMenuBadge({ className, ...props }: React.ComponentProps<"span">) {
  const { state } = useSidebar()

  return (
    <span
      data-slot="sidebar-menu-badge"
      className={cn(
        "ml-auto rounded-full bg-earth-50 px-2 py-0.5 text-[0.72rem] font-medium text-earth-500",
        state === "collapsed" && "hidden",
        className,
      )}
      {...props}
    />
  )
}

export {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
  useSidebar,
}
