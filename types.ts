export interface Business {
    name: string;
    address: string;
    email: string;
}

export interface Client {
    name: string;
    address: string;
    email: string;
}

export interface Item {
    id: number;
    description: string;
    quantity: number;
    price: number;
    hsn: string;
}

export interface BankDetails {
    name: string;
    accountNumber: string;
    bankName: string;
    ifscCode: string;
    upiId?: string;
}

export type InvoiceType = 'Invoice' | 'Tax Invoice' | 'Quotation' | 'Proforma Invoice' | 'Estimate';
export type Currency = 'INR' | 'USD' | 'EUR' | 'GBP';

export interface Invoice {
    logo: string | null;
    invoiceType: InvoiceType;
    invoiceNumber: string;
    date: string;
    dueDate: string;
    business: Business;
    client: Client;
    items: Item[];
    cgstRate: number;
    sgstRate: number;
    igstRate: number;
    taxRate: number;
    discountRate: number;
    currency: Currency;
    bankDetails: BankDetails;
    notes: string;
    themeColor: string;
}