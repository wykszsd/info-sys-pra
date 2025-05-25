// src/features/timetable/components/ExportButton.tsx
import React from 'react';
import { Button } from '@mui/material';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import { exportElementToPDF } from '../../../utils/pdfUtils'; // Adjust path

interface ExportButtonProps {
    elementIdToExport: string;
    filenamePrefix?: string;
    currentWeek?: number | null;
    disabled?: boolean;
}

const ExportButton: React.FC<ExportButtonProps> = ({
    elementIdToExport,
    filenamePrefix = '我的课表',
    currentWeek,
    disabled = false,
}) => {
    const handleExport = () => {
        const finalFilename = currentWeek ? `${filenamePrefix}-第${currentWeek}周` : filenamePrefix;
        exportElementToPDF(elementIdToExport, finalFilename);
    };

    return (
        <Button
            variant="outlined"
            color="primary"
            startIcon={<PictureAsPdfIcon />}
            onClick={handleExport}
            disabled={disabled}
            sx={{ my: 2, ml: 'auto' }} // Margin and align right if in a flex container
        >
            导出为 PDF
        </Button>
    );
};

export default ExportButton;