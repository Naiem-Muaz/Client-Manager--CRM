import React, { useState } from 'react';

interface ClientDetailsStepProps {
    type: 'Individual' | 'Company';
    initialData: any;
    onSubmit: (data: any) => void;
    onBack: () => void;
}

export function ClientDetailsStep({ type, initialData, onSubmit, onBack }: ClientDetailsStepProps) {
    const [formData, setFormData] = useState({
        legalName: initialData?.legalName || '', // Individual: Full Name, Company: Company Name
        firstName: initialData?.firstName || '',
        lastName: initialData?.lastName || '',
        nino: initialData?.nino || '',
        utr: initialData?.utr || '',
        companyNumber: initialData?.companyNumber || '',
        vatNumber: initialData?.vatNumber || '',
        addressLine1: initialData?.address?.line1 || initialData?.registeredAddress?.line1 || '',
        addressTown: initialData?.address?.town || initialData?.registeredAddress?.town || '',
        addressPostcode: initialData?.address?.postcode || initialData?.registeredAddress?.postcode || '',
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        // Transform flat form data back to structured object
        const payload = {
            entityType: type,
            legalName: type === 'Company' ? formData.legalName : `${formData.firstName} ${formData.lastName}`,
            firstName: type === 'Individual' ? formData.firstName : undefined,
            lastName: type === 'Individual' ? formData.lastName : undefined,
            nino: type === 'Individual' ? formData.nino : undefined,
            utr: formData.utr,
            companyNumber: type === 'Company' ? formData.companyNumber : undefined,
            vatNumber: type === 'Company' ? formData.vatNumber : undefined,
            address: {
                line1: formData.addressLine1,
                town: formData.addressTown,
                postcode: formData.addressPostcode
            }
        };

        onSubmit(payload);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="text-center">
                <h3 className="text-lg font-medium text-slate-900">
                    {type === 'Company' ? 'Confirm Company Details' : 'Enter Client Details'}
                </h3>
                <p className="text-slate-500 mt-1">Review and complete the client information.</p>
            </div>

            <div className="space-y-4">
                {type === 'Individual' && (
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">First Name</label>
                            <input
                                name="firstName"
                                value={formData.firstName}
                                onChange={handleChange}
                                required
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                        </div>
                        <div>
                             <label className="block text-sm font-medium text-slate-700 mb-1">Last Name</label>
                            <input
                                name="lastName"
                                value={formData.lastName}
                                onChange={handleChange}
                                required
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                        </div>
                    </div>
                )}

                {type === 'Company' && (
                    <div>
                         <label className="block text-sm font-medium text-slate-700 mb-1">Company Name</label>
                            <input
                                name="legalName"
                                value={formData.legalName}
                                onChange={handleChange}
                                required
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                    </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                     <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">UTR (Tax Reference)</label>
                        <input
                            name="utr"
                            value={formData.utr}
                            onChange={handleChange}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                    </div>
                     {type === 'Individual' ? (
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">NINO</label>
                            <input
                                name="nino"
                                value={formData.nino}
                                onChange={handleChange}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                        </div>
                     ) : (
                         <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Company Number</label>
                            <input
                                name="companyNumber"
                                value={formData.companyNumber}
                                onChange={handleChange}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                        </div>
                     )}
                </div>

                {type === 'Company' && (
                     <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">VAT Number</label>
                        <input
                            name="vatNumber"
                            value={formData.vatNumber}
                            onChange={handleChange}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                    </div>
                )}

                <div className="pt-4 border-t border-slate-200">
                    <h4 className="text-sm font-medium text-slate-900 mb-3">Address</h4>
                     <div className="space-y-3">
                        <div>
                            <input
                                name="addressLine1"
                                placeholder="Address Line 1"
                                value={formData.addressLine1}
                                onChange={handleChange}
                                required
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                             <input
                                name="addressTown"
                                placeholder="Town/City"
                                value={formData.addressTown}
                                onChange={handleChange}
                                required
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                             <input
                                name="addressPostcode"
                                placeholder="Postcode"
                                value={formData.addressPostcode}
                                onChange={handleChange}
                                required
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                        </div>
                     </div>
                </div>
            </div>

            <div className="flex justify-between pt-6">
                <button
                    type="button"
                    onClick={onBack}
                    className="px-4 py-2 text-slate-600 hover:text-slate-900 font-medium"
                >
                    Back
                </button>
                <button
                    type="submit"
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium shadow-sm"
                >
                    Create Client
                </button>
            </div>
        </form>
    );
}
