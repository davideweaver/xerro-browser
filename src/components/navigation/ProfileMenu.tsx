import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Sun, Moon, Settings, LogOut } from "lucide-react";
import { useTheme } from "next-themes";
import { useAuth } from "@/context/AuthContext";

type Props = {
  onAfterClick?: () => void;
};

export const ProfileMenu: React.FC<Props> = ({ onAfterClick }) => {
  const { theme, setTheme } = useTheme();
  const { logout } = useAuth();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const handleAfterClick = () => {
    setOpen(false);
    onAfterClick?.();
  };

  const handleToggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
    handleAfterClick();
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-12 w-12 rounded-lg"
        >
          <Avatar className="h-8 w-8">
            <AvatarImage src="/avatar.jpg" alt="Dave Weaver" />
            <AvatarFallback className="text-xs font-semibold">DW</AvatarFallback>
          </Avatar>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-52" align="start" side="top" sideOffset={10}>
        <div className="grid gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="justify-start font-normal"
            onClick={() => { navigate("/system"); handleAfterClick(); }}
          >
            <Settings className="h-4 w-4 text-muted-foreground mr-2" />
            Settings
          </Button>

          <hr className="my-1" />

          <Button
            variant="ghost"
            size="sm"
            className="justify-start font-normal"
            onClick={handleToggleTheme}
          >
            {theme === "dark" ? (
              <Moon className="h-4 w-4 text-muted-foreground mr-2" />
            ) : (
              <Sun className="h-4 w-4 text-muted-foreground mr-2" />
            )}
            Toggle Dark Mode
          </Button>

          <hr className="my-1" />

          <Button
            variant="ghost"
            size="sm"
            className="justify-start font-normal"
            onClick={() => { logout(); handleAfterClick(); }}
          >
            <LogOut className="h-4 w-4 text-muted-foreground mr-2" />
            Logout
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
};
