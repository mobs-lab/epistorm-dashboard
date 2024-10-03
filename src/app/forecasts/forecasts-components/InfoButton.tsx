import React, {useState} from 'react';
import {Button, Dialog, DialogHeader, DialogBody, DialogFooter} from "../../CSS/material-tailwind-wrapper";
import {InformationCircleIcon} from "@heroicons/react/24/outline";

interface InfoButtonProps {
    title: string;
    content: React.ReactNode;
}

const InfoButton: React.FC<InfoButtonProps> = ({title, content}) => {
    const [isOpen, setIsOpen] = useState(false);

    const handleOpen = () => setIsOpen(!isOpen);

    return (
        <>
            <Button
                variant="text"
                className="p-0 min-w-0 rounded-full"
                onClick={handleOpen}
            >
                <InformationCircleIcon className="h-5 w-5 text-white"/>
            </Button>
            <Dialog open={isOpen} handler={handleOpen}>
                <DialogHeader>{title}</DialogHeader>
                <DialogBody divider className="h-[calc(100vh-30rem)] overflow-auto">
                    {content}
                </DialogBody>
                <DialogFooter>
                    <Button variant="gradient" color="green" onClick={handleOpen}>
                        <span>Close</span>
                    </Button>
                </DialogFooter>
            </Dialog>
        </>
    );
};

export default InfoButton;