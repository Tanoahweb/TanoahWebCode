import React from 'react';
import { useLocation } from 'react-router-dom';
import { MessageCircle } from 'lucide-react';

interface FloatingWhatsAppProps {
  phoneNumber?: string;
  defaultMessage?: string;
}

export const FloatingWhatsApp: React.FC<FloatingWhatsAppProps> = ({
  phoneNumber = '918714141849',
  defaultMessage = 'Hello TANOAH, I would like assistance with an order/product.',
}) => {
  const location = useLocation();
  const isProductPage = location.pathname.startsWith('/products/');

  // Hide on Product Detail Pages to prevent obscuring product title, price, and mobile sticky checkout bar
  if (isProductPage) {
    return null;
  }

  const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(defaultMessage)}`;

  return (
    <a
      href={whatsappUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-6 left-6 z-40 bg-[#25D366] text-white p-3.5 rounded-full shadow-2xl hover:scale-110 active:scale-95 transition-all duration-300 flex items-center justify-center group"
      aria-label="Chat on WhatsApp with TANOAH Support"
      title="WhatsApp Support"
    >
      <MessageCircle className="w-6 h-6 fill-current" />
      <span className="max-w-0 overflow-hidden whitespace-nowrap group-hover:max-w-xs transition-all duration-300 ease-in-out text-xs font-poppins font-medium group-hover:ml-2">
        Chat with Us
      </span>
    </a>
  );
};
