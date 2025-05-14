// src/features/admin/requests/components/RejectReasonDialog.tsx
import React, { useState, useEffect } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, CircularProgress } from '@mui/material';

interface RejectReasonDialogProps {
    open: boolean;
    onClose: () => void;
    onSubmit: (reason: string) => Promise<void> | void; // Allow async submit
    title?: string;
    isSubmitting?: boolean; // To show loading state on submit button
}

const RejectReasonDialog: React.FC<RejectReasonDialogProps> = ({
    open,
    onClose,
    onSubmit,
    title = "拒绝申请",
    isSubmitting = false,
}) => {
    const [reason, setReason] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        if (!open) {
            setReason('');
            setError('');
        }
    }, [open]);

    const handleDialogClose = () => {
        // 尝试在关闭前回退焦点，避免 ARIA 警告
        if (document.activeElement instanceof HTMLElement) {
            document.activeElement.blur();
        }
        onClose();
    };

    const handleSubmit = async () => {
        if (reason.trim().length < 5) {
            setError("拒绝原因至少需要5个字符。");
            return;
        }
        setError('');

        // 尝试在提交前回退焦点，避免 ARIA 警告
        if (document.activeElement instanceof HTMLElement) {
            document.activeElement.blur();
        }
        await onSubmit(reason.trim());
    };

    return (
        <Dialog open={open} onClose={handleDialogClose} maxWidth="xs" fullWidth>
            <DialogTitle>{title}</DialogTitle>
            <DialogContent>
                <TextField
                    autoFocus
                    margin="dense"
                    label="拒绝原因 *"
                    type="text"
                    fullWidth
                    variant="outlined"
                    multiline
                    rows={4}
                    value={reason}
                    onChange={(e) => { setReason(e.target.value); if (error) setError(''); }}
                    required
                    error={!!error}
                    helperText={error || "请详细填写拒绝该申请的原因。"}
                    disabled={isSubmitting}
                />
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2 }}>
                <Button
                    onClick={handleDialogClose} // <--- 修改这里，调用新的 handleDialogClose
                    disabled={isSubmitting}
                    color="inherit"
                >
                    取消
                </Button>
                <Button
                    onClick={handleSubmit} // handleSubmit 内部已添加 blur()
                    variant="contained"
                    color="error"
                    disabled={isSubmitting || !reason.trim()}
                    startIcon={isSubmitting ? <CircularProgress size={20} color="inherit" /> : null}
                >
                    确认拒绝
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default RejectReasonDialog;