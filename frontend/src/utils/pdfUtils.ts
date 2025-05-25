// src/utils/pdfUtils.ts
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export const exportElementToPDF = async (elementId: string, filename: string = 'export'): Promise<void> => {
    const elementToCapture = document.getElementById(elementId);
    if (!elementToCapture) {
        console.error(`Element with ID "${elementId}" not found for PDF export.`);
        alert('导出失败：找不到指定元素。');
        return;
    }

    try {
        // Provide user feedback that PDF generation is in progress
        // This could be a toast, a modal, or just an alert.
        // For simplicity, an alert is used here.
        const generatingPdfAlert = document.createElement('div');
        generatingPdfAlert.innerText = '正在生成PDF，请稍候...';
        generatingPdfAlert.style.position = 'fixed';
        generatingPdfAlert.style.bottom = '20px';
        generatingPdfAlert.style.left = '50%';
        generatingPdfAlert.style.transform = 'translateX(-50%)';
        generatingPdfAlert.style.padding = '10px 20px';
        generatingPdfAlert.style.backgroundColor = '#333';
        generatingPdfAlert.style.color = 'white';
        generatingPdfAlert.style.borderRadius = '5px';
        generatingPdfAlert.style.zIndex = '10000';
        document.body.appendChild(generatingPdfAlert);


        const canvas = await html2canvas(elementToCapture, {
            scale: 2, // Higher scale for better resolution
            useCORS: true, // If external images are present
            logging: process.env.NODE_ENV === 'development', // Enable logging only in dev
            // Attempt to capture more of the page if it's scrollable within the element
            // windowWidth: elementToCapture.scrollWidth,
            // windowHeight: elementToCapture.scrollHeight,
        });

        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF({
            orientation: 'landscape', // Or 'portrait' depending on content
            unit: 'pt', // points, mm, cm, in, px
            format: 'a4',
        });

        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        const canvasWidth = canvas.width;
        const canvasHeight = canvas.height;

        // Calculate the ratio to fit the image onto the PDF page while maintaining aspect ratio
        const ratio = Math.min(pdfWidth / canvasWidth, pdfHeight / canvasHeight);

        const imgX = (pdfWidth - canvasWidth * ratio) / 2; // Center horizontally
        const imgY = 10; // Margin from top

        pdf.addImage(imgData, 'PNG', imgX, imgY, canvasWidth * ratio, canvasHeight * ratio);
        pdf.save(`${filename}.pdf`);

        document.body.removeChild(generatingPdfAlert); // Remove progress alert

    } catch (error) {
        console.error('Error exporting element to PDF:', error);
        alert(`导出PDF时发生错误: ${error instanceof Error ? error.message : String(error)}`);
        const generatingPdfAlert = document.querySelector('div[style*="fixed"][style*="bottom"]'); // Attempt to remove alert if it exists
        if (generatingPdfAlert) document.body.removeChild(generatingPdfAlert);
    }
};