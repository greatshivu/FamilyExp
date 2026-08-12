import React from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

/**
 * Reusable confirm dialog. Usage:
 *   const [state, setState] = useState({open: false});
 *   <ConfirmDialog state={state} onCancel={...} onConfirm={...} />
 */
export default function ConfirmDialog({
  open,
  onOpenChange,
  title = "Are you sure?",
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  destructive = false,
  onConfirm,
  testid,
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent data-testid={testid}>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {description && <AlertDialogDescription>{description}</AlertDialogDescription>}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel data-testid={`${testid}-cancel`}>{cancelLabel}</AlertDialogCancel>
          <AlertDialogAction
            asChild
          >
            <Button
              onClick={onConfirm}
              data-testid={`${testid}-confirm`}
              className={destructive ? "bg-[#C35A42] hover:bg-[#a64a36] text-[#F5F4F0]" : "bg-[#2D4C3B] hover:bg-[#1E3629] text-[#F5F4F0]"}
            >
              {confirmLabel}
            </Button>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
