import React, { forwardRef, useRef, useEffect } from 'react';
import { Invoice } from '../types';

declare const QRious: any;

interface InvoicePreviewProps {
    invoice: Invoice;
    calculations: {
        subtotal: number;
        discountAmount: number;
        total: number;
        cgstAmount: number;
        sgstAmount: number;
        igstAmount: number;
        genericTaxAmount: number;
    };
}

const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: 2,
    }).format(amount);
};

const toWords = (num: number): string => {
    if (!isFinite(num)) return 'Invalid Number'; // Handles NaN and Infinity
    if (num < 0) return `Minus ${toWords(Math.abs(num))}`;

    const ones = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
    const tens = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];

    const convertLessThanOneThousand = (n: number): string => {
        let currentWords = '';
        if (n >= 100) {
            currentWords += ones[Math.floor(n / 100)] + ' hundred';
            n %= 100;
            if (n > 0) currentWords += ' and ';
        }
        if (n > 0) {
            if (n < 20) {
                currentWords += ones[n];
            } else {
                currentWords += tens[Math.floor(n / 10)];
                if (n % 10 > 0) {
                    currentWords += ' ' + ones[n % 10];
                }
            }
        }
        return currentWords;
    };

    const numberPart = Math.floor(num);
    const decimalPart = Math.round((num - numberPart) * 100);

    if (numberPart === 0 && decimalPart === 0) return 'Zero Rupees Only';

    let rupeesInWords = '';
    if (numberPart > 0) {
        const wordsArray: string[] = [];
        let tempNum = numberPart;
        
        const crore = Math.floor(tempNum / 10000000);
        if (crore > 0) {
            wordsArray.push(convertLessThanOneThousand(crore) + ' crore');
            tempNum %= 10000000;
        }
        const lakh = Math.floor(tempNum / 100000);
        if (lakh > 0) {
            wordsArray.push(convertLessThanOneThousand(lakh) + ' lakh');
            tempNum %= 100000;
        }
        const thousand = Math.floor(tempNum / 1000);
        if (thousand > 0) {
            wordsArray.push(convertLessThanOneThousand(thousand) + ' thousand');
            tempNum %= 1000;
        }
        if (tempNum > 0) {
            wordsArray.push(convertLessThanOneThousand(tempNum));
        }
        rupeesInWords = wordsArray.join(' ');
    }

    let result = '';
    if (rupeesInWords) {
        result = rupeesInWords.charAt(0).toUpperCase() + rupeesInWords.slice(1) + ' Rupees';
    }

    if (decimalPart > 0) {
        const paiseInWords = convertLessThanOneThousand(decimalPart);
        if (result) {
            result += ' and ';
        }
        result += paiseInWords.charAt(0).toUpperCase() + paiseInWords.slice(1) + ' Paise';
    }
    
    return result.trim() + ' Only';
};

const getContrastColor = (hexColor: string): string => {
    if (!hexColor) return '#ffffff';
    const hex = hexColor.replace('#', '');
    if (hex.length !== 6) return '#ffffff';
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
    return (yiq >= 128) ? '#000000' : '#ffffff';
};


const ColorfulTemplate = forwardRef<HTMLDivElement, InvoicePreviewProps>(({ invoice, calculations }, ref) => {
    const { subtotal, discountAmount, total, cgstAmount, sgstAmount, igstAmount, genericTaxAmount } = calculations;
    const qrCodeRef = useRef<HTMLCanvasElement>(null);

    const themeColor = invoice.themeColor || '#10B981';
    const contrastColor = getContrastColor(themeColor);

    useEffect(() => {
        if (qrCodeRef.current && invoice.currency === 'INR' && invoice.bankDetails.upiId && typeof QRious !== 'undefined') {
            const upiString = `upi://pay?pa=${invoice.bankDetails.upiId}&pn=${encodeURIComponent(invoice.business.name || 'Payee')}&am=${total.toFixed(2)}&cu=INR`;
            new QRious({
                element: qrCodeRef.current,
                value: upiString,
                size: 128,
                level: 'H' // High error correction
            });
        }
    }, [invoice.bankDetails.upiId, invoice.business.name, total, invoice.currency]);

    return (
        <div ref={ref} id="invoice-preview" className="p-10 bg-white font-sans text-gray-800 max-w-4xl mx-auto">
            <header className="flex justify-between items-start pb-6 border-b-2 border-gray-100">
                <div>
                    {invoice.logo && <img src={invoice.logo} alt="Company Logo" className="h-20 w-auto mb-4" />}
                    <h2 className="text-2xl font-bold text-gray-900">{invoice.business.name || 'Your Business Name'}</h2>
                    <p className="text-sm text-gray-600 whitespace-pre-line">{invoice.business.address || 'Your Address'}</p>
                    <p className="text-sm text-gray-600">{invoice.business.email || 'your.email@example.com'}</p>
                </div>
                <div className="text-right">
                    <h1 className="text-4xl font-bold uppercase" style={{ color: themeColor }}>{invoice.invoiceType}</h1>
                    <p className="text-sm text-gray-600 mt-2"># {invoice.invoiceNumber}</p>
                </div>
            </header>

            <section className="grid grid-cols-2 gap-4 mt-8">
                <div>
                    <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Bill To</h3>
                    <p className="font-bold text-lg text-gray-900">{invoice.client.name || 'Client Name'}</p>
                    <p className="text-sm text-gray-600 whitespace-pre-line">{invoice.client.address || 'Client Address'}</p>
                    <p className="text-sm text-gray-600">{invoice.client.email || 'client.email@example.com'}</p>
                </div>
                <div className="text-right">
                     <div className="grid grid-cols-2">
                        <span className="font-semibold text-gray-700">Date:</span>
                        <span className="text-gray-800">{invoice.date}</span>
                    </div>
                    <div className="grid grid-cols-2 mt-1">
                         <span className="font-semibold text-gray-700">Due Date:</span>
                        <span className="text-gray-800">{invoice.dueDate}</span>
                    </div>
                </div>
            </section>
            
            <section className="mt-10">
                <table className="w-full text-left">
                    <thead style={{ backgroundColor: themeColor, color: contrastColor }}>
                        <tr>
                            <th scope="col" className="p-3 text-sm font-semibold uppercase tracking-wider">Item</th>
                            <th scope="col" className="p-3 text-sm font-semibold uppercase tracking-wider text-center">HSN/SAC</th>
                            <th scope="col" className="p-3 text-sm font-semibold uppercase tracking-wider text-center">Qty</th>
                            <th scope="col" className="p-3 text-sm font-semibold uppercase tracking-wider text-right">Price</th>
                            <th scope="col" className="p-3 text-sm font-semibold uppercase tracking-wider text-right">Total</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {invoice.items.map(item => (
                            <tr key={item.id}>
                                <td className="p-3 text-gray-800">{item.description}</td>
                                <td className="p-3 text-center text-gray-800">{item.hsn}</td>
                                <td className="p-3 text-center text-gray-800">{item.quantity}</td>
                                <td className="p-3 text-right text-gray-800">{formatCurrency(item.price, invoice.currency)}</td>
                                <td className="p-3 text-right font-medium text-gray-800">{formatCurrency(item.quantity * item.price, invoice.currency)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </section>
            
            <section className="flex justify-end mt-8">
                <div className="w-full max-w-sm space-y-2 text-sm">
                    <div className="flex justify-between"><span className="text-gray-600">Subtotal:</span><span className="font-medium text-gray-800">{formatCurrency(subtotal, invoice.currency)}</span></div>
                    <div className="flex justify-between"><span className="text-gray-600">Discount ({invoice.discountRate}%):</span><span className="font-medium text-gray-800">-{formatCurrency(discountAmount, invoice.currency)}</span></div>
                    {invoice.cgstRate > 0 && <div className="flex justify-between"><span className="text-gray-600">CGST ({invoice.cgstRate}%):</span><span className="font-medium text-gray-800">{formatCurrency(cgstAmount, invoice.currency)}</span></div>}
                    {invoice.sgstRate > 0 && <div className="flex justify-between"><span className="text-gray-600">SGST ({invoice.sgstRate}%):</span><span className="font-medium text-gray-800">{formatCurrency(sgstAmount, invoice.currency)}</span></div>}
                    {invoice.igstRate > 0 && <div className="flex justify-between"><span className="text-gray-600">IGST ({invoice.igstRate}%):</span><span className="font-medium text-gray-800">{formatCurrency(igstAmount, invoice.currency)}</span></div>}
                    {invoice.taxRate > 0 && <div className="flex justify-between"><span className="text-gray-600">Tax ({invoice.taxRate}%):</span><span className="font-medium text-gray-800">{formatCurrency(genericTaxAmount, invoice.currency)}</span></div>}
                    <div className="flex justify-between items-center p-3 mt-2 rounded-md" style={{ backgroundColor: themeColor, color: contrastColor }}><span className="font-bold text-lg">Total:</span><span className="font-bold text-lg">{formatCurrency(total, invoice.currency)}</span></div>
                </div>
            </section>
            
            {invoice.currency === 'INR' && (
                <section className="mt-8 bg-gray-50 p-4 rounded-md text-sm"><p className="font-semibold text-gray-600">Amount in words:</p><p className="font-medium italic text-gray-800 mt-1">{toWords(total)}</p></section>
            )}

            {invoice.notes && (
                <section className="mt-8 text-sm text-gray-600">
                    <h4 className="font-semibold text-gray-800 mb-2">Notes / Terms & Conditions:</h4>
                    <p className="whitespace-pre-line">{invoice.notes}</p>
                </section>
            )}

            <div className="mt-12 border-t pt-6 text-sm text-gray-600">
                <div className="flex justify-between items-start">
                    {(invoice.bankDetails.bankName || invoice.bankDetails.accountNumber) && (
                        <div>
                            <h4 className="font-semibold text-gray-800 mb-1">Bank Details:</h4>
                            <p><strong>Account Holder:</strong> {invoice.bankDetails.name}</p>
                            <p><strong>Account Number:</strong> {invoice.bankDetails.accountNumber}</p>
                            <p><strong>Bank Name:</strong> {invoice.bankDetails.bankName}</p>
                            <p><strong>IFSC Code:</strong> {invoice.bankDetails.ifscCode}</p>
                        </div>
                    )}
                    {invoice.currency === 'INR' && invoice.bankDetails.upiId && (
                        <div className="text-center ml-4">
                             <h4 className="font-semibold text-gray-800 mb-2">Scan to Pay</h4>
                             <canvas ref={qrCodeRef}></canvas>
                        </div>
                    )}
                </div>
            </div>

            <footer className="mt-16 text-center text-xs text-gray-400 border-t pt-4"><p>Thank you for your business!</p></footer>
        </div>
    );
});

export const InvoicePreview = forwardRef<HTMLDivElement, InvoicePreviewProps>(({ invoice, calculations }, ref) => {
    return <ColorfulTemplate ref={ref} invoice={invoice} calculations={calculations} />;
});