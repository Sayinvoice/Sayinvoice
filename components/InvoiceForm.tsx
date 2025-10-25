import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Invoice, Item, Business, Client, BankDetails, Currency } from '../types';
import { TrashIcon, PlusIcon, SpinnerIcon, CalendarIcon } from './icons';

interface InvoiceFormProps {
    invoice: Invoice;
    onInvoiceChange: <K extends keyof Invoice>(key: K, value: Invoice[K]) => void;
    onItemChange: (index: number, updatedItem: Item) => void;
    onAddItem: () => void;
    onRemoveItem: (id: number) => void;
    onLogoUpload: (file: File) => void;
    onRemoveLogo: () => void;
    isLogoUploading: boolean;
}

const CalendarView: React.FC<{
    selectedDate: string;
    onDateSelect: (date: string) => void;
    onClose: () => void;
}> = ({ selectedDate, onDateSelect, onClose }) => {
    const calendarRef = useRef<HTMLDivElement>(null);
    
    const getValidDateOrDefault = (dateStr: string) => {
        const date = dateStr ? new Date(dateStr.replace(/-/g, '/')) : new Date();
        return !isNaN(date.getTime()) ? date : new Date();
    };

    const initialDate = getValidDateOrDefault(selectedDate);
    const [currentMonth, setCurrentMonth] = useState(new Date(initialDate.getFullYear(), initialDate.getMonth(), 1));

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (calendarRef.current && !calendarRef.current.contains(event.target as Node)) {
                onClose();
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [onClose]);

    useEffect(() => {
        const newSelectedDate = getValidDateOrDefault(selectedDate);
        setCurrentMonth(new Date(newSelectedDate.getFullYear(), newSelectedDate.getMonth(), 1));
    }, [selectedDate]);

    const changeMonth = (offset: number) => {
        setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + offset, 1));
    };

    const handleDateClick = (day: number) => {
        const newDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
        const formattedDate = newDate.toISOString().split('T')[0];
        onDateSelect(formattedDate);
    };

    const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
    const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay();
    
    const selectedDateObj = selectedDate ? new Date(selectedDate.replace(/-/g, '/')) : null;
    const isValidSelectedDate = !!selectedDateObj && !isNaN(selectedDateObj.getTime());

    const blanks = Array(firstDayOfMonth).fill(null);
    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
    const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    return (
        <div ref={calendarRef} className="absolute z-10 mt-2 w-72 bg-white border border-gray-200 rounded-lg shadow-xl p-4">
            <div className="flex justify-between items-center mb-4">
                <button type="button" onClick={() => changeMonth(-1)} className="p-2 rounded-full hover:bg-gray-100" aria-label="Previous month">
                    <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path></svg>
                </button>
                <span className="font-bold text-gray-800">{currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}</span>
                <button type="button" onClick={() => changeMonth(1)} className="p-2 rounded-full hover:bg-gray-100" aria-label="Next month">
                    <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
                </button>
            </div>
            <div className="grid grid-cols-7 text-center text-xs text-gray-500 mb-2">
                {weekDays.map(day => <div key={day}>{day}</div>)}
            </div>
            <div className="grid grid-cols-7 gap-y-1 text-center">
                {blanks.map((_, i) => <div key={`blank-${i}`}></div>)}
                {days.map(day => {
                    const isSelected = isValidSelectedDate && selectedDateObj.getFullYear() === currentMonth.getFullYear() && selectedDateObj.getMonth() === currentMonth.getMonth() && selectedDateObj.getDate() === day;
                    const today = new Date();
                    const isToday = today.getFullYear() === currentMonth.getFullYear() && today.getMonth() === currentMonth.getMonth() && today.getDate() === day;
                    
                    const buttonClasses = `w-9 h-9 rounded-full flex items-center justify-center transition duration-150 text-sm ${isSelected ? 'bg-green-600 text-white font-bold' : 'hover:bg-gray-100'} ${!isSelected && isToday ? 'text-green-600 font-bold' : ''} ${!isSelected && !isToday ? 'text-gray-700' : ''}`;
                    
                    return (
                        <div key={day} className="flex justify-center items-center">
                            <button type="button" onClick={() => handleDateClick(day)} className={buttonClasses}>{day}</button>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};


const SectionCard: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <div className="bg-white p-6 rounded-lg shadow-lg mb-6 transition-shadow hover:shadow-xl">
        <h3 className="text-xl font-bold border-b border-gray-200 pb-3 mb-5 text-gray-800">{title}</h3>
        {children}
    </div>
);

const InputGroup: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
    <div className={`grid grid-cols-1 gap-4 ${className}`}>
        {children}
    </div>
);

const FormInput: React.FC<React.InputHTMLAttributes<HTMLInputElement> & { label: string }> = ({ label, id, ...props }) => (
    <div>
        <label htmlFor={id} className="block text-sm font-medium text-gray-600 mb-1">{label}</label>
        <input id={id} {...props} className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500 transition font-medium text-gray-900 placeholder:text-gray-400" />
    </div>
);

const FormSelect: React.FC<React.SelectHTMLAttributes<HTMLSelectElement> & { label: string }> = ({ label, id, children, ...props }) => (
    <div>
        <label htmlFor={id} className="block text-sm font-medium text-gray-600 mb-1">{label}</label>
        <select id={id} {...props} className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500 transition font-medium text-gray-900">
            {children}
        </select>
    </div>
);


const FormDateInput: React.FC<React.InputHTMLAttributes<HTMLInputElement> & { label: string }> = ({ label, id, value, onChange, ...props }) => {
    const [isCalendarOpen, setIsCalendarOpen] = useState(false);
    const [isFocused, setIsFocused] = useState(false);

    const handleDateSelect = (date: string) => {
        const event = {
            target: { value: date }
        } as React.ChangeEvent<HTMLInputElement>;
        if (onChange) {
            onChange(event);
        }
        setIsCalendarOpen(false);
    };

    return (
        <div>
            <label htmlFor={id} className="block text-sm font-medium text-gray-600 mb-1">{label}</label>
            <div className="relative">
                <input
                    id={id}
                    type={(isFocused || value) ? 'date' : 'text'}
                    value={value}
                    onChange={onChange}
                    onFocus={() => {
                        setIsFocused(true);
                        setIsCalendarOpen(true);
                    }}
                    onBlur={() => setIsFocused(false)}
                    {...props}
                    className="w-full pl-3 pr-10 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500 transition font-medium text-gray-900 placeholder:text-gray-400"
                />
                <div
                    role="button"
                    tabIndex={0}
                    aria-label={`Open ${label} picker`}
                    onClick={() => setIsCalendarOpen(prev => !prev)}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setIsCalendarOpen(prev => !prev) }}}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center cursor-pointer rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                >
                    <CalendarIcon />
                </div>
                {isCalendarOpen && (
                    <CalendarView
                        selectedDate={value as string}
                        onDateSelect={handleDateSelect}
                        onClose={() => setIsCalendarOpen(false)}
                    />
                )}
            </div>
        </div>
    );
};

const FormTextarea: React.FC<React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string }> = ({ label, id, ...props }) => (
     <div>
        <label htmlFor={id} className="block text-sm font-medium text-gray-600 mb-1">{label}</label>
        <textarea id={id} {...props} rows={3} className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500 transition font-medium text-gray-900 placeholder:text-gray-400"></textarea>
    </div>
);

// A simplified input for the items grid, without a label
const ItemInput: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = (props) => (
    <input {...props} className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500 transition font-medium text-gray-900 placeholder:text-gray-500 text-sm" />
);

export const InvoiceForm: React.FC<InvoiceFormProps> = ({ 
    invoice, 
    onInvoiceChange, 
    onItemChange, 
    onAddItem, 
    onRemoveItem, 
    onLogoUpload,
    onRemoveLogo,
    isLogoUploading
}) => {
    const invoiceNumberPlaceholder = useMemo(() => `INV-${Math.floor(1000 + Math.random() * 9000)}`, []);
    const todayPlaceholder = useMemo(() => new Date().toISOString().split('T')[0], []);

    const handleBusinessChange = (field: keyof Business, value: string) => {
        onInvoiceChange('business', { ...invoice.business, [field]: value });
    };
    
    const handleClientChange = (field: keyof Client, value: string) => {
        onInvoiceChange('client', { ...invoice.client, [field]: value });
    };

    const handleBankDetailsChange = (field: keyof BankDetails, value: string) => {
        onInvoiceChange('bankDetails', { ...invoice.bankDetails, [field]: value });
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            onLogoUpload(e.target.files[0]);
        }
    };
    
    const handleNumberInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        // Prevent typing 'e', 'E', '+', '-' in number inputs
        if (['e', 'E', '+', '-'].includes(e.key)) {
            e.preventDefault();
        }
    };

    return (
        <div className="space-y-6">
            <SectionCard title="Branding">
                <div className="flex items-center space-x-4 mb-2">
                    <label htmlFor="logo-upload" className="block text-sm font-medium text-gray-600">Company Logo</label>
                    {isLogoUploading && <SpinnerIcon />}
                </div>
                <input 
                    id="logo-upload" 
                    type="file" 
                    onChange={handleFileSelect} 
                    accept="image/*" 
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100 disabled:opacity-50"
                    disabled={isLogoUploading}
                />
                 {invoice.logo && !isLogoUploading && (
                    <div className="mt-4 flex items-center space-x-4">
                        <img src={invoice.logo} alt="Company Logo" className="h-16 w-auto border p-1 rounded-md shadow-sm" />
                        <button 
                            onClick={onRemoveLogo} 
                            className="p-2 text-red-500 hover:text-red-700 hover:bg-red-100 rounded-full transition"
                            aria-label="Remove logo"
                        >
                            <TrashIcon />
                        </button>
                    </div>
                )}
            </SectionCard>

            <SectionCard title="Invoice Details">
                <InputGroup className="sm:grid-cols-2">
                    <FormInput
                        label="Invoice Number"
                        id="invoiceNumber"
                        value={invoice.invoiceNumber}
                        placeholder={invoiceNumberPlaceholder}
                        onChange={(e) => onInvoiceChange('invoiceNumber', e.target.value)}
                        type="text"
                    />
                    <FormSelect label="Currency" id="currency" value={invoice.currency} onChange={(e) => onInvoiceChange('currency', e.target.value as Currency)}>
                        <option value="INR">INR (₹)</option>
                        <option value="USD">USD ($)</option>
                        <option value="EUR">EUR (€)</option>
                        <option value="GBP">GBP (£)</option>
                    </FormSelect>
                    <FormDateInput label="Invoice Date" id="date" value={invoice.date} onChange={(e) => onInvoiceChange('date', e.target.value)} placeholder={todayPlaceholder} />
                    <FormDateInput label="Due Date" id="dueDate" value={invoice.dueDate} onChange={(e) => onInvoiceChange('dueDate', e.target.value)} placeholder={todayPlaceholder} />
                </InputGroup>
            </SectionCard>

            <SectionCard title="Your Details">
                <InputGroup>
                    <FormInput label="Business Name" id="businessName" value={invoice.business.name} onChange={(e) => handleBusinessChange('name', e.target.value)} />
                    <FormTextarea label="Business Address" id="businessAddress" value={invoice.business.address} onChange={(e) => handleBusinessChange('address', e.target.value)} />
                    <FormInput label="Business Email" id="businessEmail" type="email" value={invoice.business.email} onChange={(e) => handleBusinessChange('email', e.target.value)} />
                </InputGroup>
            </SectionCard>

            <SectionCard title="Client Details">
                <InputGroup>
                    <FormInput label="Client Name" id="clientName" value={invoice.client.name} onChange={(e) => handleClientChange('name', e.target.value)} />
                    <FormTextarea label="Client Address" id="clientAddress" value={invoice.client.address} onChange={(e) => handleClientChange('address', e.target.value)} />
                    <FormInput label="Client Email" id="clientEmail" type="email" value={invoice.client.email} onChange={(e) => handleClientChange('email', e.target.value)} />
                </InputGroup>
            </SectionCard>

            <SectionCard title="Invoice Items">
                 <div className="hidden md:grid md:grid-cols-12 gap-x-3 mb-2 text-sm font-semibold text-gray-500 px-2">
                    <div className="md:col-span-4">Description</div>
                    <div className="md:col-span-2">Qty</div>
                    <div className="md:col-span-2">Price</div>
                    <div className="md:col-span-2">HSN/SAC</div>
                </div>
                 <div className="space-y-3">
                    {invoice.items.map((item, index) => (
                        <div key={item.id} className="grid grid-cols-1 md:grid-cols-12 gap-x-3 gap-y-2 items-center p-2 bg-gray-50/50 border rounded-lg">
                            <div className="md:col-span-4">
                                <label htmlFor={`item-desc-${item.id}`} className="sr-only">Item Description for item {index + 1}</label>
                                <ItemInput id={`item-desc-${item.id}`} placeholder="Item Description" value={item.description} onChange={(e) => onItemChange(index, { ...item, description: e.target.value })} />
                            </div>
                            <div className="md:col-span-2">
                                <label htmlFor={`item-qty-${item.id}`} className="sr-only">Qty for item {index + 1}</label>
                                <ItemInput
                                    id={`item-qty-${item.id}`}
                                    type="text"
                                    inputMode="numeric"
                                    placeholder="Qty"
                                    aria-label={`Qty for ${item.description || `item ${index + 1}`}`}
                                    value={item.quantity === 0 ? '' : item.quantity}
                                    onChange={(e) => onItemChange(index, { ...item, quantity: parseFloat(e.target.value) || 0 })}
                                    onKeyDown={handleNumberInputKeyDown}
                                />
                            </div>
                            <div className="md:col-span-2">
                                <label htmlFor={`item-price-${item.id}`} className="sr-only">Price for item {index + 1}</label>
                                <ItemInput
                                    id={`item-price-${item.id}`}
                                    type="text"
                                    inputMode="decimal"
                                    placeholder="Price"
                                    aria-label={`Price for ${item.description || `item ${index + 1}`}`}
                                    value={item.price === 0 ? '' : item.price}
                                    onChange={(e) => onItemChange(index, { ...item, price: parseFloat(e.target.value) || 0 })}
                                    onKeyDown={handleNumberInputKeyDown}
                                />
                            </div>
                             <div className="md:col-span-2">
                                <label htmlFor={`item-hsn-${item.id}`} className="sr-only">HSN/SAC for item {index + 1}</label>
                                <ItemInput id={`item-hsn-${item.id}`} placeholder="HSN/SAC" value={item.hsn} onChange={(e) => onItemChange(index, { ...item, hsn: e.target.value })} />
                            </div>
                            <div className="md:col-span-2 flex items-center justify-end">
                                <button onClick={() => onRemoveItem(item.id)} className="p-2 text-red-500 hover:text-red-700 hover:bg-red-100 rounded-full transition" aria-label={`Remove ${item.description || `item ${index + 1}`}`}>
                                    <TrashIcon />
                                </button>
                            </div>
                        </div>
                    ))}
                    <button onClick={onAddItem} className="flex items-center space-x-2 text-green-600 font-semibold hover:text-green-800 transition pt-2">
                        <PlusIcon />
                        <span>Add Item</span>
                    </button>
                </div>
            </SectionCard>

            <SectionCard title="Taxes & Discounts">
                <InputGroup className="sm:grid-cols-2">
                    <FormInput label="CGST Rate (%)" id="cgstRate" type="text" inputMode="decimal" value={invoice.cgstRate} onChange={(e) => onInvoiceChange('cgstRate', parseFloat(e.target.value) || 0)} onKeyDown={handleNumberInputKeyDown} />
                    <FormInput label="SGST Rate (%)" id="sgstRate" type="text" inputMode="decimal" value={invoice.sgstRate} onChange={(e) => onInvoiceChange('sgstRate', parseFloat(e.target.value) || 0)} onKeyDown={handleNumberInputKeyDown} />
                    <FormInput label="IGST Rate (%)" id="igstRate" type="text" inputMode="decimal" value={invoice.igstRate} onChange={(e) => onInvoiceChange('igstRate', parseFloat(e.target.value) || 0)} onKeyDown={handleNumberInputKeyDown} />
                    <FormInput label="Tax Rate (%)" id="taxRate" type="text" inputMode="decimal" value={invoice.taxRate} onChange={(e) => onInvoiceChange('taxRate', parseFloat(e.target.value) || 0)} onKeyDown={handleNumberInputKeyDown} />
                    <div className="sm:col-span-2">
                        <FormInput label="Discount Rate (%)" id="discountRate" type="text" inputMode="decimal" value={invoice.discountRate} onChange={(e) => onInvoiceChange('discountRate', parseFloat(e.target.value) || 0)} onKeyDown={handleNumberInputKeyDown} />
                    </div>
                </InputGroup>
            </SectionCard>

            <SectionCard title="Bank Details">
                <InputGroup className="sm:grid-cols-2">
                    <FormInput label="Account Holder" id="bankHolderName" value={invoice.bankDetails.name} onChange={(e) => handleBankDetailsChange('name', e.target.value)} />
                    <FormInput label="Account Number" id="bankAccountNumber" value={invoice.bankDetails.accountNumber} onChange={(e) => handleBankDetailsChange('accountNumber', e.target.value)} />
                    <FormInput label="Bank Name" id="bankName" value={invoice.bankDetails.bankName} onChange={(e) => handleBankDetailsChange('bankName', e.target.value)} />
                    <FormInput label="IFSC Code" id="bankIfscCode" value={invoice.bankDetails.ifscCode} onChange={(e) => handleBankDetailsChange('ifscCode', e.target.value)} />
                    <div className="sm:col-span-2">
                         <FormInput label="UPI ID (for QR Code)" id="upiId" value={invoice.bankDetails.upiId || ''} onChange={(e) => handleBankDetailsChange('upiId', e.target.value)} />
                    </div>
                </InputGroup>
            </SectionCard>

            <SectionCard title="Notes / Terms">
                <InputGroup>
                    <FormTextarea 
                        label="Notes or Terms & Conditions" 
                        id="invoiceNotes" 
                        value={invoice.notes}
                        onChange={(e) => onInvoiceChange('notes', e.target.value)}
                        placeholder="e.g., Payment is due within 15 days. Late payments are subject to a fee."
                    />
                </InputGroup>
            </SectionCard>

        </div>
    );
};