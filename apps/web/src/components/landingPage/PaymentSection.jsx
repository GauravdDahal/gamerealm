'use client';
import React from 'react'

export default function PaymentSection() {
    return (
        <div className="bg-gray-900 p-6 md:py-10 md:px-10 lg:px-20 xl:px-60 rounded-lg">
            <h2 className="text-xl font-medium text-white mb-4">
                Payment Methods
            </h2>
            <div className="flex flex-wrap gap-4">
                <button className="transition-transform hover:scale-105">
                    <img
                        src="/assets/images/paymentSectionImg/mastercard.jpg"
                        alt="Cash on Delivery"
                        className="h-12 sm:h-16 rounded-md"
                    />
                </button>
                <div className="flex flex-wrap gap-4">
                    <button className="transition-transform hover:scale-105">
                        <img
                            src="/assets/images/paymentSectionImg/visa.jpg"
                            alt="Cash on Delivery"
                            className="h-12 sm:h-16 rounded-md"
                        />
                    </button>
                </div>
            </div>
        </div>
    )
}
