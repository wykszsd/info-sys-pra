// src/components/common/ConfirmDialog.tsx
import React from 'react';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import Slide from '@mui/material/Slide';
import type { TransitionProps } from '@mui/material/transitions';
import CircularProgress from '@mui/material/CircularProgress'; // For loading state

const Transition = React.forwardRef(function Transition(
    props: TransitionProps & {
        children: React.ReactElement<any, any>;
    },
    ref: React.Ref<unknown>,
) {
    return <Slide direction="up" ref={ref} {...props} />;
});

interface ConfirmDialogProps {
    open: boolean;
    onClose: () => void;
    onConfirm: () => void | Promise<void>; // Allow async confirm
    title: string;
    contentText: string | React.ReactNode;
    confirmText?: string;
    cancelText?: string;
    confirmButtonColor?: 'inherit' | 'primary' | 'secondary' | 'success' | 'error' | 'info' | 'warning';
    isConfirming?: boolean; // To show loading on confirm button
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
    open,
    onClose,
    onConfirm,
    title,
    contentText,
    confirmText = "确认",
    cancelText = "取消",
    confirmButtonColor = "primary",
    isConfirming = false,
}) => {

    const handleConfirm = async () => {
        await onConfirm(); // Await if it's a promise
        // onClose(); // Parent should handle closing on success/failure of onConfirm
    };

    return (
        <Dialog
            open={open}
            TransitionComponent={Transition}
            keepMounted
            onClose={onClose}
            aria-labelledby="confirm-dialog-title"
            aria-describedby="confirm-dialog-description"
            maxWidth="xs"
            fullWidth
        >
            <DialogTitle id="confirm-dialog-title">{title}</DialogTitle>
            <DialogContent>
                <DialogContentText id="confirm-dialog-description">
                    {contentText}
                </DialogContentText>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2 }}>
                <Button onClick={onClose} disabled={isConfirming} color="inherit">
                    {cancelText}
                </Button>
                <Button
                    onClick={handleConfirm}
                    color={confirmButtonColor}
                    variant="contained"
                    disabled={isConfirming}
                    startIcon={isConfirming ? <CircularProgress size={20} color="inherit" /> : null}
                >
                    {confirmText}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default ConfirmDialog;