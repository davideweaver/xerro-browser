import { useEffect } from "react";
import useScrollToTop from "@/hooks/use-scroll-to-top";
import { Loader2 } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
// import { ScrollArea } from "@radix-ui/react-scroll-area";

const DEFAULT_PADDING = 24;

type Props = {
  children?: React.ReactNode;
  title?: React.ReactNode;
  description?: React.ReactNode;
  tools?: React.ReactNode;
  bodyHorzPadding?: number;
  bodyTopOffset?: number;
  maintainScrollPosition?: boolean;
  loading?: boolean;
  content?: ContentType;
  icon?: React.ComponentType<React.SVGProps<SVGSVGElement>>;
};

export type ContentType = "fixed" | "full" | "fixedWithScroll";

const Container: React.FC<Props> = ({
  children,
  title,
  description,
  tools = null,
  bodyHorzPadding: bodyPadding,
  bodyTopOffset: topOffset,
  maintainScrollPosition = false,
  loading = false,
  content = "full",
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  icon: _icon,
}) => {
  useScrollToTop(!maintainScrollPosition);
  const bodyHorzPadding = bodyPadding ?? DEFAULT_PADDING;
  const isMobile = useIsMobile();

  // fixedWithScroll is the same as fixed, but has scrollbars
  const isScrollable = content === "fixedWithScroll";
  const isFixed = content === "fixed" || content === "fixedWithScroll";

  useEffect(() => {
    if (isFixed) {
      document.documentElement.style.overflowY = "hidden";
      return () => {
        document.documentElement.style.overflowY = "auto";
      };
    }
  }, [isFixed]);

  // Container classes and styles based on fullHeight prop
  const containerClasses = isFixed
    ? "h-screen flex flex-col p-0 ml-0 overflow-hidden"
    : "h-screen p-0 ml-0";

  // Add safe-area-inset-top for iOS PWA mode
  const containerStyle = isMobile
    ? { paddingTop: "calc(1rem + env(safe-area-inset-top))" }
    : { paddingTop: "2rem" };

  // Header classes and styles based on fullHeight prop
  const headerClasses = isFixed
    ? `flex max-w-screen-lg flex-col lg:flex-row items-start w-full mb-6 lg:flex-shrink-0`
    : "flex max-w-screen-lg flex-col lg:flex-row items-start w-full mb-4 lg:mb-10";

  const headerStyle = isFixed
    ? {
        paddingLeft: DEFAULT_PADDING,
        paddingRight: DEFAULT_PADDING,
      }
    : {
        paddingLeft: DEFAULT_PADDING,
        paddingRight: DEFAULT_PADDING,
        marginBottom: topOffset ?? 40,
      };

  const titleClasses = isFixed ? "pb-2 lg:pb-0" : "pb-2 lg:pb-0";
  const titleStyle = isMobile
    ? { marginLeft: 40, maxWidth: "calc(100% - 40px)" }
    : {};

  // Content area classes and styles based on fullHeight prop
  const contentClasses = isFixed
    ? "max-w-screen-lg flex-1 min-h-0 overflow-hidden"
    : "max-w-screen-lg";

  const contentStyle = isFixed
    ? {
        paddingLeft: isMobile ? 0 : bodyHorzPadding,
        paddingRight: isMobile ? 0 : bodyHorzPadding,
        paddingBottom: 0,
        marginBottom: 0,
        overflow: "hidden",
      }
    : {
        paddingLeft: bodyHorzPadding,
        paddingRight: bodyHorzPadding,
        paddingBottom: isMobile ? 64 : 50, // Add bottom padding for mobile navbar (64px + 16px margin)
        width: isMobile ? "100vw" : "100%",
        overflow: "hidden",
      };

  return (
    <div className={containerClasses} style={containerStyle}>
      {/* Header */}
      <div className={headerClasses} style={headerStyle}>
        <div className={`${titleClasses} min-w-0 flex-1`} style={titleStyle}>
          <h1
            className="font-bold flex items-center break-words"
            style={{
              fontSize: 28,
              lineHeight: 1.2,
              marginTop: 6,
              overflowWrap: "break-word",
              wordBreak: "break-word",
            }}
          >
            {title}{" "}
            {loading && (
              <Loader2 className="h-6 w-6 ml-2 flex-shrink-0 animate-spin text-muted-foreground" />
            )}
          </h1>
          {description && (
            <div className="text-sm text-muted-foreground mb-4 md:mb-0 min-w-0 w-full break-words">
              {description}
            </div>
          )}
        </div>
        <div className="flex flex-row gap-2 items-center flex-shrink-0 lg:ml-auto">
          {tools}
        </div>
      </div>

      {/* Main content area */}
      {!loading && (
        <div className={contentClasses} style={contentStyle}>
          {isFixed && (
            <div
              style={{
                height: "100%",
                width: "100%",
                overflow: isScrollable ? "auto" : "hidden",
              }}
            >
              {children}
            </div>
          )}
          {!isFixed && children}
        </div>
      )}
    </div>
  );
};

export default Container;
