import React, { useState, useRef, useMemo, useCallback, useEffect } from 'react';
import { Invoice, Item, InvoiceType, Currency } from './types';
import { InvoiceForm } from './components/InvoiceForm';
import { InvoicePreview } from './components/InvoicePreview';
import { DownloadIcon } from './components/icons';

// These would be available on the window object from the CDN scripts in index.html
declare const jspdf: any;
declare const html2canvas: any;
declare const ColorThief: any;

const DEFAULT_THEME_COLOR = '#10B981'; // Green

const getInitialInvoiceState = (): Invoice => {
    return {
        logo: null,
        invoiceType: 'Invoice',
        invoiceNumber: '',
        date: '',
        dueDate: '',
        business: { name: '', address: '', email: '' },
        client: { name: '', address: '', email: '' },
        items: [
            { id: 1, description: '', quantity: 0, price: 0, hsn: '' },
        ],
        cgstRate: 0,
        sgstRate: 0,
        igstRate: 0,
        taxRate: 0,
        discountRate: 0,
        currency: 'INR',
        bankDetails: {
            name: '',
            accountNumber: '',
            bankName: '',
            ifscCode: '',
            upiId: '',
        },
        notes: '',
        themeColor: DEFAULT_THEME_COLOR,
    };
};

const loadInitialState = (): Invoice => {
    const defaults = getInitialInvoiceState();
    const savedDraft = localStorage.getItem('invoiceDraft');
    if (savedDraft) {
        try {
            const parsed = JSON.parse(savedDraft);
            // Ensure themeColor has a fallback if it's missing from old drafts
            return { ...defaults, ...parsed, themeColor: parsed.themeColor || DEFAULT_THEME_COLOR };
        } catch (e) {
            console.error('Failed to parse saved draft, starting fresh.', e);
            return defaults;
        }
    }
    return defaults;
};


const App: React.FC = () => {
    const [invoice, setInvoice] = useState<Invoice>(loadInitialState);
    const [isHovering, setIsHovering] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    const [isLogoUploading, setIsLogoUploading] = useState(false);
    const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

    const invoicePreviewRef = useRef<HTMLDivElement>(null);
    const autoSaveTimeoutRef = useRef<number | null>(null);

    useEffect(() => {
        if (autoSaveTimeoutRef.current) {
            clearTimeout(autoSaveTimeoutRef.current);
        }
        autoSaveTimeoutRef.current = window.setTimeout(() => {
            try {
                localStorage.setItem('invoiceDraft', JSON.stringify(invoice));
            } catch (error) {
                console.error("Error auto-saving to localStorage", error);
                showFeedback("Couldn't save draft. Storage may be full.", 'error');
            }
        }, 1000); // Auto-save after 1 second of inactivity

        return () => {
            if (autoSaveTimeoutRef.current) {
                clearTimeout(autoSaveTimeoutRef.current);
            }
        };
    }, [invoice]);

    const handleInvoiceChange = useCallback(<K extends keyof Invoice>(key: K, value: Invoice[K]) => {
        setInvoice(prev => ({ ...prev, [key]: value }));
    }, []);

    const handleItemChange = useCallback((index: number, updatedItem: Item) => {
        const newItems = [...invoice.items];
        newItems[index] = updatedItem;
        handleInvoiceChange('items', newItems);
    }, [invoice.items, handleInvoiceChange]);

    const handleAddItem = useCallback(() => {
        const newItem: Item = {
            id: new Date().getTime(),
            description: '',
            quantity: 0,
            price: 0,
            hsn: '',
        };
        handleInvoiceChange('items', [...invoice.items, newItem]);
    }, [invoice.items, handleInvoiceChange]);

    const handleRemoveItem = useCallback((id: number) => {
        const filteredItems = invoice.items.filter(item => item.id !== id);
        handleInvoiceChange('items', filteredItems);
    }, [invoice.items, handleInvoiceChange]);

    const showFeedback = (message: string, type: 'success' | 'error') => {
        setFeedback({ message, type });
        setTimeout(() => setFeedback(null), 3000);
    };

    const handleLogoUpload = useCallback((file: File) => {
        setIsLogoUploading(true);
        const reader = new FileReader();
        reader.onloadend = () => {
            const logoUrl = reader.result as string;
            handleInvoiceChange('logo', logoUrl);

            const image = new Image();
            image.onload = () => {
                try {
                    const colorThief = new ColorThief();
                    const dominantColor = colorThief.getColor(image);
                    const hexColor = `#${dominantColor.map((c: number) => c.toString(16).padStart(2, '0')).join('')}`;
                    handleInvoiceChange('themeColor', hexColor);
                } catch (error) {
                    console.error('ColorThief error:', error);
                    handleInvoiceChange('themeColor', DEFAULT_THEME_COLOR); // Fallback on error
                } finally {
                    setIsLogoUploading(false);
                }
            };
            image.onerror = () => {
                 console.error("Error loading image for color extraction");
                 setIsLogoUploading(false);
                 showFeedback('Could not process image for color theming.', 'error');
            };
            image.src = logoUrl;
        };
        reader.onerror = () => {
            console.error("Error reading file");
            setIsLogoUploading(false);
            showFeedback('Failed to upload logo. Please try another file.', 'error');
        };
        reader.readAsDataURL(file);
    }, [handleInvoiceChange]);

    const handleRemoveLogo = useCallback(() => {
        handleInvoiceChange('logo', null);
        handleInvoiceChange('themeColor', DEFAULT_THEME_COLOR);
    }, [handleInvoiceChange]);
    
    const calculations = useMemo(() => {
        const subtotal = invoice.items.reduce((acc, item) => acc + item.quantity * item.price, 0);
        const discountAmount = subtotal * (invoice.discountRate / 100);
        const taxableAmount = subtotal - discountAmount;
        const cgstAmount = taxableAmount * (invoice.cgstRate / 100);
        const sgstAmount = taxableAmount * (invoice.sgstRate / 100);
        const igstAmount = taxableAmount * (invoice.igstRate / 100);
        const genericTaxAmount = taxableAmount * (invoice.taxRate / 100);
        const taxAmount = cgstAmount + sgstAmount + igstAmount + genericTaxAmount;
        const total = taxableAmount + taxAmount;

        return { subtotal, discountAmount, taxAmount, total, cgstAmount, sgstAmount, igstAmount, genericTaxAmount };
    }, [invoice.items, invoice.cgstRate, invoice.sgstRate, invoice.igstRate, invoice.taxRate, invoice.discountRate]);

    const generatePdfBlob = useCallback(async (): Promise<Blob | null> => {
        if (!invoicePreviewRef.current) return null;

        try {
            const { jsPDF } = jspdf;
            const canvas = await html2canvas(invoicePreviewRef.current, { scale: 3 });
            const imgData = canvas.toDataURL('image/png');
            
            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'pt',
                format: 'a4'
            });

            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();
            
            const canvasWidth = canvas.width;
            const canvasHeight = canvas.height;
            const canvasAspectRatio = canvasWidth / canvasHeight;
            
            let imgWidth = pdfWidth;
            let imgHeight = pdfWidth / canvasAspectRatio;

            if (imgHeight > pdfHeight) {
                imgHeight = pdfHeight;
                imgWidth = pdfHeight * canvasAspectRatio;
            }

            const x = (pdfWidth - imgWidth) / 2;
            const y = 0;

            pdf.addImage(imgData, 'PNG', x, y, imgWidth, imgHeight);
            return pdf.output('blob');
        } catch (error) {
            console.error("Failed to generate PDF blob:", error);
            showFeedback('Failed to generate PDF. Please try again.', 'error');
            return null;
        }
    }, []);

    const handleDownloadPdf = async () => {
        if (invoice.invoiceNumber.trim() === '') {
            showFeedback('Invoice number cannot be empty.', 'error');
            return;
        }
        setIsDownloading(true);
        const blob = await generatePdfBlob();
        if (blob) {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${invoice.invoiceType.toLowerCase().replace(' ', '-')}-${invoice.invoiceNumber}.pdf`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }
        setIsDownloading(false);
    };
    
    const darkenColor = (hex: string, percent: number): string => {
        if (!hex || hex.length < 7) return hex;
        let R = parseInt(hex.substring(1, 3), 16);
        let G = parseInt(hex.substring(3, 5), 16);
        let B = parseInt(hex.substring(5, 7), 16);
        const factor = (100 - percent) / 100;
        R = Math.max(0, Math.floor(R * factor));
        G = Math.max(0, Math.floor(G * factor));
        B = Math.max(0, Math.floor(B * factor));
        const RR = R.toString(16).padStart(2, '0');
        const GG = G.toString(16).padStart(2, '0');
        const BB = B.toString(16).padStart(2, '0');
        return `#${RR}${GG}${BB}`;
    };

    const themeColor = invoice.themeColor || DEFAULT_THEME_COLOR;
    const buttonStyle = {
        backgroundColor: isHovering ? darkenColor(themeColor, 10) : themeColor,
        transition: 'background-color 0.2s ease-in-out',
    };

    return (
        <div className="min-h-screen font-sans text-gray-800">
            <header className="bg-white shadow-sm no-print">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
                    <div className="flex items-center space-x-4">
                        <h1 className="text-2xl font-bold text-gray-900">Generator</h1>
                        <label htmlFor="invoiceTypeSelect" className="sr-only">Select Invoice Type</label>
                        <select
                            id="invoiceTypeSelect"
                            value={invoice.invoiceType}
                            onChange={(e) => handleInvoiceChange('invoiceType', e.target.value as InvoiceType)}
                            className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-green-500 focus:border-green-500 block p-2 transition"
                        >
                            <option value="Invoice">Invoice</option>
                            <option value="Tax Invoice">Tax Invoice</option>
                            <option value="Quotation">Quotation</option>
                            <option value="Proforma Invoice">Proforma Invoice</option>
                            <option value="Estimate">Estimate</option>
                        </select>
                    </div>
                    <div className="flex items-center space-x-2">
                        <button 
                          onClick={handleDownloadPdf}
                          disabled={isDownloading}
                          style={buttonStyle}
                          onMouseEnter={() => setIsHovering(true)}
                          onMouseLeave={() => setIsHovering(false)}
                          className="flex items-center space-x-2 text-white px-4 py-2 rounded-md transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed">
                            <DownloadIcon />
                            <span>{isDownloading ? 'Downloading...' : 'Download PDF'}</span>
                        </button>
                    </div>
                </div>
            </header>

            <main className="container mx-auto p-4 sm:p-6 lg:p-8">
                {feedback && (
                    <div className="mb-6">
                        <div 
                        className={`p-4 rounded-md text-white text-center transition-opacity duration-300 ${feedback.type === 'success' ? 'bg-green-500' : 'bg-red-500'}`}
                        role="alert"
                        >
                            {feedback.message}
                        </div>
                    </div>
                )}
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                    <div className="lg:col-span-2 no-print">
                        <InvoiceForm 
                            invoice={invoice} 
                            onInvoiceChange={handleInvoiceChange}
                            onItemChange={handleItemChange}
                            onAddItem={handleAddItem}
                            onRemoveItem={handleRemoveItem}
                            onLogoUpload={handleLogoUpload}
                            onRemoveLogo={handleRemoveLogo}
                            isLogoUploading={isLogoUploading}
                        />
                    </div>
                    <div className="lg:col-span-3">
                         <div className="bg-white rounded-lg shadow-lg">
                            <InvoicePreview 
                                ref={invoicePreviewRef} 
                                invoice={invoice} 
                                calculations={calculations}
                            />
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default App;