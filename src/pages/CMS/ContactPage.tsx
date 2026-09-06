import React, { useState } from 'react';
import { Mail, Phone, MapPin, MessageCircle, Send } from 'lucide-react';
import { useUIStore } from '../../store/useUIStore';
import { Button } from '../../components/common/Button';

export const ContactPage: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('Product Enquiry');
  const [message, setMessage] = useState('');
  const { addToast } = useUIStore();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addToast({
      type: 'success',
      title: 'Message Transmitted',
      description: 'Our concierge desk will respond to your enquiry within 4 business hours.',
    });
    setName('');
    setEmail('');
    setMessage('');
  };

  return (
    <div className="w-full bg-[#FAFAFA] font-poppins min-h-screen py-16">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <span className="text-[11px] text-[#3F3F8F] font-semibold tracking-widest uppercase block mb-1">
            CLIENT CONCIERGE
          </span>
          <h1 className="font-wondra text-4xl text-black">GET IN TOUCH</h1>
          <p className="text-xs text-[#666666] mt-1 max-w-md mx-auto">
            Our styling advisors and customer care team are available to assist you Monday to Saturday.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 text-xs text-left">
          {/* Contact Details (Col 5) */}
          <div className="lg:col-span-5 bg-white p-8 border border-[#E7E7E7] rounded-[4px] shadow-sm space-y-6">
            <h3 className="font-wondra text-2xl text-black">DIRECT CHANNELS</h3>

            <div className="space-y-4 text-[#444444]">
              <div className="flex items-start gap-3">
                <div className="p-2.5 rounded-full bg-[#EEEEF8] text-[#3F3F8F] shrink-0 mt-0.5">
                  <Mail className="w-4 h-4" />
                </div>
                <div>
                  <h5 className="font-semibold text-black uppercase text-[11px]">Email Concierge</h5>
                  <p className="text-[#666666]">connectus.tanoah@gmail.com</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="p-2.5 rounded-full bg-[#EEEEF8] text-[#3F3F8F] shrink-0 mt-0.5">
                  <Phone className="w-4 h-4" />
                </div>
                <div>
                  <h5 className="font-semibold text-black uppercase text-[11px]">Telephone Support</h5>
                  <p className="text-[#666666]">+91 8714141849</p>
                  <span className="text-[10px] text-[#888888]">10:00 AM – 7:00 PM IST</span>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="p-2.5 rounded-full bg-[#EEEEF8] text-[#3F3F8F] shrink-0 mt-0.5">
                  <MapPin className="w-4 h-4" />
                </div>
                <div>
                  <h5 className="font-semibold text-black uppercase text-[11px]">Tanoah Studio & Office</h5>
                  <p className="text-[#666666]">Tanoah, Rappal, Pudukkad P O, Thrissur, Kerala 680301</p>
                </div>
              </div>
            </div>

            <a
              href="https://wa.me/918714141849"
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center gap-2 w-full py-3 bg-[#25D366] hover:bg-[#1EBE5D] text-white font-semibold rounded-[4px] uppercase tracking-wider transition-colors"
            >
              <MessageCircle className="w-4 h-4 fill-current" />
              <span>Direct WhatsApp Concierge</span>
            </a>
          </div>

          {/* Contact Form (Col 7) */}
          <div className="lg:col-span-7 bg-white p-8 border border-[#E7E7E7] rounded-[4px] shadow-sm">
            <h3 className="font-wondra text-2xl text-black mb-6">SEND A TRANSMISSION</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-[11px] font-semibold text-black uppercase mb-1">Your Name *</label>
                <input
                  required
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full p-2.5 border border-[#E7E7E7] rounded-[4px] focus:outline-none focus:border-[#3F3F8F]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-black uppercase mb-1">Email Address *</label>
                <input
                  required
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full p-2.5 border border-[#E7E7E7] rounded-[4px] focus:outline-none focus:border-[#3F3F8F]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-black uppercase mb-1">Subject</label>
                <select
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full p-2.5 border border-[#E7E7E7] rounded-[4px] focus:outline-none focus:border-[#3F3F8F] bg-white"
                >
                  <option value="Product Enquiry">Product Details & Styling</option>
                  <option value="Order Status">Order Status & Dispatch</option>
                  <option value="Return / Exchange">Returns & Exchange Support</option>
                  <option value="Press / Wholesale">Press & Wholesale Collaboration</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-black uppercase mb-1">Your Message *</label>
                <textarea
                  required
                  rows={4}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full p-2.5 border border-[#E7E7E7] rounded-[4px] focus:outline-none focus:border-[#3F3F8F]"
                />
              </div>

              <Button variant="primary" size="lg" type="submit" icon={<Send className="w-4 h-4" />} className="w-full py-3.5">
                SUBMIT MESSAGE
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
