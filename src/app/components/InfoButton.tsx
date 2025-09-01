import React, { useState } from "react";
import { Button, Dialog, DialogHeader, DialogBody, DialogFooter } from "@/styles/material-tailwind-wrapper";
import { InformationCircleIcon } from "@heroicons/react/24/outline";

interface InfoButtonProps {
  title: string;
  content: React.ReactNode;

  // 2025-05-03: added new props for more varied display of button
  displayStyle?: "icon" | "button" | "inline";
  size?: "sm" | "md" | "lg";

  // Dialog window size control
  dialogSize?: "xs" | "sm" | "md" | "lg" | "xl" | "xxl";
}

// Size mappings for different components
const sizeConfigs = {
  sm: {
    button: "text-sm py-1",
    icon: "h-[1rem] w-[1rem]",
  },
  md: {
    button: "text-base py-2",
    icon: "h-[1.3rem] w-[1.3rem]",
  },
  lg: {
    button: "text-lg py-3",
    icon: "h-[1.8rem] w-[1.8rem]",
  },
} as const;

const InfoButton: React.FC<InfoButtonProps> = ({
  title,
  content,
  displayStyle = "icon", // Default to icon style
  size = "md", // Default to medium size
  dialogSize = "md"
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleOpen = () => setIsOpen(!isOpen);

  // Render different button styles based on displayStyle prop
  const renderButton = () => {
    switch (displayStyle) {
      case "icon":
        return (
          <Button variant='text' className={`p-0 min-w-0 rounded-full ${sizeConfigs[size].button}`} onClick={handleOpen}>
            <InformationCircleIcon className={`${sizeConfigs[size].icon} text-white`} />
          </Button>
        );

      case "button":
        return (
          <Button variant='outlined' className={`${sizeConfigs[size].button}`} onClick={handleOpen} color='light-blue'>
            Help Info
          </Button>
        );

      case "inline":
        return (
          <Button
            variant='text'
            className={`${sizeConfigs[size].button} inline-flex items-center gap-1 text-blue-500 hover:text-blue-700`}
            onClick={handleOpen}>
            <InformationCircleIcon className={`${sizeConfigs[size].icon}`} />
            <span>More Info</span>
          </Button>
        );

      default:
        // Default to icon style if invalid displayStyle provided
        return (
          <Button variant='text' className={`p-0 min-w-0 rounded-full ${sizeConfigs[size].button}`} onClick={handleOpen}>
            <InformationCircleIcon className={`${sizeConfigs[size].icon} text-white`} />
          </Button>
        );
    }
  };

  return (
    <>
      {renderButton()}
      <Dialog open={isOpen} handler={handleOpen} size={dialogSize}>
        <DialogHeader>{title}</DialogHeader>
        <DialogBody divider>{content}</DialogBody>
        <DialogFooter>
          <Button variant='gradient' color='green' onClick={handleOpen}>
            <span>Close</span>
          </Button>
        </DialogFooter>
      </Dialog>
    </>
  );
};

export default InfoButton;
