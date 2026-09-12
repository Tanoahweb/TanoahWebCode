import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Package, MapPin, Heart, User, LogOut, RotateCcw, ExternalLink, Download, Plus, Trash2, CheckCircle2, X, AlertTriangle, Lock, Shield, KeyRound, Copy } from 'lucide-react';
import { supabase } from '../../services/supabase';
import { useAuthStore } from '../../store/useAuthStore';
import { useWishlistStore } from '../../store/useWishlistStore';
import { useUIStore } from '../../store/useUIStore';
import { formatPrice } from '../../utils/formatters';
import { Button } from '../../components/common/Button';
import { TaxInvoiceModal } from '../../components/checkout/TaxInvoiceModal';
import { api } from '../../services/api';
import { SavedAddress } from '../../types';
import { validatePhone } from '../../utils/validation';

export const AccountPage: React.FC = () => {
  const { user, profile, signOut, initialize } = useAuthStore();
  const wishlistItems = useWishlistStore((s) => s.items);
  const { addToast } = useUIStore();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'orders' | 'addresses' | 'returns' | 'profile'>('orders');
  const [selectedInvoiceOrder, setSelectedInvoiceOrder] = useState<any | null>(null);

  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [isAddingAddress, setIsAddingAddress] = useState(false);
  const [newAddressForm, setNewAddressForm] = useState({
    first_name: profile?.full_name?.split(' ')[0] || '',
    last_name: profile?.full_name?.split(' ').slice(1).join(' ') || '',
    phone: profile?.phone || (user?.user_metadata?.phone as string) || '',
    address: '',
    apartment: '',
    city: '',
    state: 'Maharashtra',
    postal_code: '',
    is_default: false,
  });

  // Profile & Security states
  const [profileName, setProfileName] = useState(profile?.full_name || (user?.user_metadata?.full_name as string) || '');
  const [profilePhone, setProfilePhone] = useState(profile?.phone || (user?.user_metadata?.phone as string) || '');
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

  // Password update states
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  // Account deletion states
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  useEffect(() => {
    if (profile?.full_name) setProfileName(profile.full_name);
    if (profile?.phone) setProfilePhone(profile.phone);
  }, [profile]);

  const loadUserData = async () => {
    if (!user) return;
    setIsLoadingData(true);
    try {
      const [addrList, orderList] = await Promise.all([
        api.getUserAddresses(user.id, user.email),
        api.getUserOrders(user.id, user.email),
      ]);
      setAddresses(addrList);
      setOrders(orderList);
    } catch (err) {
      console.warn('Error loading user data in account page:', err);
    } finally {
      setIsLoadingData(false);
    }
  };

  useEffect(() => {
    loadUserData();
  }, [user]);

  const handleSaveAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAddressForm.first_name || !newAddressForm.phone || !newAddressForm.address || !newAddressForm.city || !newAddressForm.postal_code) {
      addToast({ type: 'error', title: 'Missing Information', description: 'Please complete all required address fields.' });
      return;
    }

    const phoneCheck = validatePhone(newAddressForm.phone);
    if (!phoneCheck.isValid) {
      addToast({ type: 'error', title: 'Invalid Phone Number', description: phoneCheck.error || 'Please enter a valid 10-digit mobile number.' });
      return;
    }

    try {
      await api.saveUserAddress({
        ...newAddressForm,
        phone: phoneCheck.normalized || newAddressForm.phone.trim(),
        user_id: user?.id,
        email: user?.email,
      });
      addToast({ type: 'success', title: 'Address Saved', description: 'New delivery address has been saved to your account.' });
      setIsAddingAddress(false);
      setNewAddressForm({
        first_name: profile?.full_name?.split(' ')[0] || '',
        last_name: profile?.full_name?.split(' ').slice(1).join(' ') || '',
        phone: profile?.phone || (user?.user_metadata?.phone as string) || '',
        address: '',
        apartment: '',
        city: '',
        state: 'Maharashtra',
        postal_code: '',
        is_default: false,
      });
      loadUserData();
    } catch (err) {
      addToast({ type: 'error', title: 'Save Failed', description: 'Could not save address. Please try again.' });
    }
  };

  const handleDeleteAddress = async (id: string) => {
    try {
      await api.deleteUserAddress(id, user?.id, user?.email);
      addToast({ type: 'success', title: 'Address Removed', description: 'Address was removed from your address book.' });
      loadUserData();
    } catch (err) {
      addToast({ type: 'error', title: 'Action Failed', description: 'Could not delete address.' });
    }
  };

  const handleSetDefaultAddress = async (id: string) => {
    try {
      await api.setDefaultUserAddress(id, user?.id, user?.email);
      addToast({ type: 'success', title: 'Default Address Updated', description: 'Default delivery address has been updated.' });
      loadUserData();
    } catch (err) {
      addToast({ type: 'error', title: 'Action Failed', description: 'Could not update default address.' });
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();

    if (profilePhone && profilePhone.trim()) {
      const phoneCheck = validatePhone(profilePhone);
      if (!phoneCheck.isValid) {
        addToast({ type: 'error', title: 'Invalid Phone Number', description: phoneCheck.error || 'Please enter a valid 10-digit mobile number.' });
        return;
      }
    }

    setIsUpdatingProfile(true);
    try {
      const formattedPhone = profilePhone && profilePhone.trim() ? (validatePhone(profilePhone).normalized || profilePhone.trim()) : '';
      const { error } = await supabase.auth.updateUser({
        data: {
          full_name: profileName,
          phone: formattedPhone,
        },
      });

      if (error) {
        addToast({ type: 'error', title: 'Update Failed', description: error.message });
      } else {
        await initialize();
        addToast({ type: 'success', title: 'Profile Updated', description: 'Your personal details have been saved.' });
      }
    } catch (err: any) {
      addToast({ type: 'error', title: 'Error', description: err.message || 'Could not update profile.' });
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      addToast({ type: 'error', title: 'Password Too Short', description: 'Password must be at least 6 characters.' });
      return;
    }
    if (newPassword !== confirmNewPassword) {
      addToast({ type: 'error', title: 'Passwords Mismatch', description: 'New passwords do not match.' });
      return;
    }

    setIsUpdatingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        addToast({ type: 'error', title: 'Password Update Failed', description: error.message });
      } else {
        setNewPassword('');
        setConfirmNewPassword('');
        addToast({ type: 'success', title: 'Password Changed', description: 'Your new password has been set successfully.' });
      }
    } catch (err: any) {
      addToast({ type: 'error', title: 'Error', description: err.message || 'Could not change password.' });
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText.trim().toUpperCase() !== 'DELETE') {
      addToast({ type: 'error', title: 'Confirmation Required', description: 'Please type DELETE to confirm account deletion.' });
      return;
    }

    setIsDeletingAccount(true);
    try {
      await api.deleteUserAccountPermanently(user?.id);
      addToast({
        type: 'success',
        title: 'Account Permanently Deleted',
        description: 'Your account and personal data have been completely removed.',
      });
      await signOut();
      navigate('/');
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Deletion Failed',
        description: err.message || 'Could not delete account. Please try again.',
      });
      setIsDeletingAccount(false);
    }
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <div className="w-full bg-[#FAFAFA] font-poppins min-h-screen py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Welcome Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-8 border-b border-[#E7E7E7] mb-8 gap-4">
          <div>
            <span className="text-[10px] text-[#3F3F8F] font-semibold tracking-widest uppercase">
              CLIENT DASHBOARD
            </span>
            <h1 className="font-wondra text-3xl sm:text-4xl text-black">
              WELCOME, {profile?.full_name || user?.email?.split('@')[0] || 'GUEST'}
            </h1>
            <p className="text-xs text-[#666666] mt-0.5">{user?.email || 'Logged in user'}</p>
          </div>

          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-4 py-2 border border-[#E7E7E7] hover:border-black rounded-[4px] text-xs font-semibold uppercase text-black bg-white transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>

        {/* Account Body Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 text-xs">
          {/* Tabs Sidebar (Col 3) */}
          <div className="lg:col-span-3 space-y-1 bg-white p-4 border border-[#E7E7E7] rounded-[4px] shadow-sm">
            <button
              onClick={() => setActiveTab('orders')}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-[4px] font-medium transition-colors text-left ${
                activeTab === 'orders' ? 'bg-[#3F3F8F] text-white font-semibold' : 'text-black hover:bg-[#F8F8F8]'
              }`}
            >
              <Package className="w-4 h-4" />
              <span>Order History</span>
            </button>

            <button
              onClick={() => setActiveTab('addresses')}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-[4px] font-medium transition-colors text-left ${
                activeTab === 'addresses' ? 'bg-[#3F3F8F] text-white font-semibold' : 'text-black hover:bg-[#F8F8F8]'
              }`}
            >
              <MapPin className="w-4 h-4" />
              <span>Address Book</span>
            </button>

            <button
              onClick={() => setActiveTab('returns')}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-[4px] font-medium transition-colors text-left ${
                activeTab === 'returns' ? 'bg-[#3F3F8F] text-white font-semibold' : 'text-black hover:bg-[#F8F8F8]'
              }`}
            >
              <RotateCcw className="w-4 h-4" />
              <span>Returns & Exchanges</span>
            </button>

            <button
              onClick={() => setActiveTab('profile')}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-[4px] font-medium transition-colors text-left ${
                activeTab === 'profile' ? 'bg-[#3F3F8F] text-white font-semibold' : 'text-black hover:bg-[#F8F8F8]'
              }`}
            >
              <User className="w-4 h-4" />
              <span>Profile & Security</span>
            </button>

            <Link
              to="/wishlist"
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-[4px] font-medium text-black hover:bg-[#F8F8F8] transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <Heart className="w-4 h-4 text-[#3F3F8F]" />
                <span>Saved Wishlist</span>
              </div>
              <span className="text-[10px] bg-[#EEEEF8] text-[#3F3F8F] px-2 py-0.5 rounded-full font-bold">
                {wishlistItems.length}
              </span>
            </Link>
          </div>

          {/* Tab Content Panel (Col 9) */}
          <div className="lg:col-span-9 bg-white p-6 sm:p-8 border border-[#E7E7E7] rounded-[4px] shadow-sm text-left">
            {activeTab === 'orders' && (
              <div className="space-y-6">
                <h3 className="font-wondra text-2xl text-black">YOUR PURCHASES</h3>
                {isLoadingData ? (
                  <div className="py-12 text-center text-[#666666]">Loading orders...</div>
                ) : orders.length === 0 ? (
                  <div className="p-8 text-center bg-[#FAFAFA] border border-[#E7E7E7] rounded-[4px] space-y-3">
                    <Package className="w-8 h-8 text-[#888888] mx-auto" />
                    <h4 className="font-semibold text-black">No purchases yet</h4>
                    <p className="text-xs text-[#666666]">Explore our collections and discover refined essentials.</p>
                    <Link to="/collections/all">
                      <Button variant="primary" size="sm">Explore Collections</Button>
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {orders.map((ord: any) => {
                      const orderNum = ord.order_number || ord.orderNumber;
                      return (
                        <div key={orderNum} className="border border-[#E7E7E7] rounded-[4px] p-5 space-y-4">
                          <div className="flex flex-wrap justify-between items-center pb-3 border-b border-[#E7E7E7] gap-2">
                            <div>
                              <span className="text-[10px] text-[#888888] uppercase block">Order No.</span>
                              <strong className="font-mono text-sm text-black">{orderNum}</strong>
                            </div>
                            <div>
                              <span className="text-[10px] text-[#888888] uppercase block">Total</span>
                              <strong className="text-black">{formatPrice(ord.grand_total || ord.grandTotal)}</strong>
                            </div>
                            <div>
                              <span className="text-[10px] text-[#888888] uppercase block">Fulfillment</span>
                              <span className="bg-[#EEEEF8] text-[#3F3F8F] font-semibold px-2 py-0.5 rounded-[2px] uppercase text-[10px]">
                                {ord.status || 'CONFIRMED'}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Link to={`/tracking?order=${orderNum}`}>
                                <button className="px-3 py-1.5 border border-[#E7E7E7] hover:border-black rounded-[4px] font-semibold text-xs transition-colors flex items-center gap-1 text-black bg-white">
                                  <span>Milestones</span>
                                </button>
                              </Link>
                              <a
                                href="https://www.indiapost.gov.in/"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-3 py-1.5 bg-[#3F3F8F] text-white hover:bg-black rounded-[4px] font-semibold text-xs transition-colors flex items-center gap-1.5 shadow-sm"
                              >
                                <span>Track on India Post</span>
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            </div>
                          </div>

                          {/* Consignment Banner */}
                          {ord.tracking_number && (
                            <div className="bg-[#FAF9F6] border border-[#3F3F8F]/20 p-2.5 rounded-[4px] flex flex-wrap items-center justify-between gap-2 text-xs">
                              <div className="flex items-center gap-2">
                                <span className="text-[#666666]">India Post Consignment:</span>
                                <span className="font-mono font-bold text-black">{ord.tracking_number}</span>
                              </div>
                              <div className="flex items-center gap-3">
                                <button
                                  type="button"
                                  onClick={() => {
                                    navigator.clipboard.writeText(ord.tracking_number);
                                    addToast({
                                      type: 'success',
                                      title: 'Copied',
                                      description: 'India Post consignment number copied to clipboard.',
                                    });
                                  }}
                                  className="text-[#3F3F8F] hover:underline font-semibold flex items-center gap-1"
                                >
                                  <Copy className="w-3 h-3" />
                                  <span>Copy Number</span>
                                </button>
                                <span className="text-[#CCCCCC]">|</span>
                                <a
                                  href="https://www.indiapost.gov.in/"
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[#3F3F8F] hover:underline font-semibold flex items-center gap-1"
                                >
                                  <span>Open indiapost.gov.in</span>
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              </div>
                            </div>
                          )}

                          <div className="space-y-2">
                            {ord.items?.map((it: any, idx: number) => (
                              <div key={idx} className="flex justify-between items-center text-xs">
                                <span className="font-medium text-black">
                                  {it.product?.title || it.product_title || 'Garment Piece'} ({it.variant?.color_name || it.variant_title || 'Standard'} / {it.variant?.size || ''})
                                </span>
                                <span className="text-[#666666]">Qty: {it.quantity}</span>
                              </div>
                            ))}
                          </div>

                          <div className="pt-2 flex flex-wrap items-center gap-4 text-[11px] border-t border-[#E7E7E7]">
                            <Link to={`/account/returns?order=${orderNum}`} className="text-[#3F3F8F] hover:underline font-semibold">
                              Request Return / Exchange
                            </Link>
                            <button
                              onClick={() => setSelectedInvoiceOrder({
                                orderNumber: orderNum,
                                date: ord.created_at || ord.date,
                                items: ord.items,
                                subtotal: ord.subtotal || ord.grand_total || ord.grandTotal,
                                discount: ord.discount_total || ord.discount || 0,
                                shipping: ord.shipping_total || ord.shipping || 0,
                                codFee: ord.codFee || 0,
                                grandTotal: ord.grand_total || ord.grandTotal,
                                formData: ord.formData || {
                                  firstName: ord.shipping_address?.first_name || profile?.full_name?.split(' ')[0] || 'Client',
                                  lastName: ord.shipping_address?.last_name || profile?.full_name?.split(' ')[1] || '',
                                  email: ord.guest_email || user?.email || 'client@example.com',
                                  phone: ord.guest_phone || ord.shipping_address?.phone || '+91 8714141849',
                                  address: ord.shipping_address?.address || 'Delivery Address',
                                  city: ord.shipping_address?.city || 'Thrissur',
                                  state: ord.shipping_address?.state || 'Kerala',
                                  postalCode: ord.shipping_address?.postal_code || '680301',
                                  paymentMethod: ord.payment_method || 'online',
                                }
                              })}
                              className="text-black hover:text-[#3F3F8F] hover:underline font-semibold flex items-center gap-1"
                            >
                              <Download className="w-3.5 h-3.5 text-[#3F3F8F]" />
                              <span>View Tax Invoice</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'addresses' && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-[#E7E7E7]">
                  <div>
                    <h3 className="font-wondra text-2xl text-black">SAVED ADDRESSES</h3>
                    <p className="text-xs text-[#666666] mt-0.5">Manage your delivery addresses for seamless 1-click checkout.</p>
                  </div>
                  {!isAddingAddress && (
                    <button
                      type="button"
                      onClick={() => setIsAddingAddress(true)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-black hover:bg-[#3F3F8F] text-white rounded-[4px] font-semibold text-xs transition-colors self-start sm:self-auto"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add New Address</span>
                    </button>
                  )}
                </div>

                {/* Add New Address Form Modal/Panel */}
                {isAddingAddress && (
                  <form onSubmit={handleSaveAddress} className="p-5 border-2 border-[#3F3F8F]/30 bg-[#EEEEF8]/10 rounded-[4px] space-y-4">
                    <div className="flex justify-between items-center">
                      <h4 className="font-semibold text-black text-sm">Add New Delivery Address</h4>
                      <button
                        type="button"
                        onClick={() => setIsAddingAddress(false)}
                        className="text-[#888888] hover:text-black"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[11px] font-semibold text-black uppercase mb-1">First Name *</label>
                        <input
                          required
                          type="text"
                          value={newAddressForm.first_name}
                          onChange={(e) => setNewAddressForm({ ...newAddressForm, first_name: e.target.value })}
                          className="w-full p-2 border border-[#E7E7E7] rounded-[4px] bg-white text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-black uppercase mb-1">Last Name *</label>
                        <input
                          required
                          type="text"
                          value={newAddressForm.last_name}
                          onChange={(e) => setNewAddressForm({ ...newAddressForm, last_name: e.target.value })}
                          className="w-full p-2 border border-[#E7E7E7] rounded-[4px] bg-white text-xs"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[11px] font-semibold text-black uppercase mb-1">Mobile Phone *</label>
                        <input
                          required
                          type="tel"
                          placeholder="+91 8714141849"
                          value={newAddressForm.phone}
                          onChange={(e) => setNewAddressForm({ ...newAddressForm, phone: e.target.value })}
                          className="w-full p-2 border border-[#E7E7E7] rounded-[4px] bg-white text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-black uppercase mb-1">Street Address *</label>
                        <input
                          required
                          type="text"
                          placeholder="House / building / street"
                          value={newAddressForm.address}
                          onChange={(e) => setNewAddressForm({ ...newAddressForm, address: e.target.value })}
                          className="w-full p-2 border border-[#E7E7E7] rounded-[4px] bg-white text-xs"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-[11px] font-semibold text-black uppercase mb-1">City *</label>
                        <input
                          required
                          type="text"
                          value={newAddressForm.city}
                          onChange={(e) => setNewAddressForm({ ...newAddressForm, city: e.target.value })}
                          className="w-full p-2 border border-[#E7E7E7] rounded-[4px] bg-white text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-black uppercase mb-1">State *</label>
                        <select
                          value={newAddressForm.state}
                          onChange={(e) => setNewAddressForm({ ...newAddressForm, state: e.target.value })}
                          className="w-full p-2 border border-[#E7E7E7] rounded-[4px] bg-white text-xs"
                        >
                          <option value="Maharashtra">Maharashtra</option>
                          <option value="Delhi">Delhi</option>
                          <option value="Karnataka">Karnataka</option>
                          <option value="Tamil Nadu">Tamil Nadu</option>
                          <option value="Telangana">Telangana</option>
                          <option value="Gujarat">Gujarat</option>
                          <option value="Kerala">Kerala</option>
                          <option value="West Bengal">West Bengal</option>
                          <option value="Rajasthan">Rajasthan</option>
                          <option value="Haryana">Haryana</option>
                          <option value="Uttar Pradesh">Uttar Pradesh</option>
                          <option value="Other">Other States</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-black uppercase mb-1">Postal Code *</label>
                        <input
                          required
                          type="text"
                          maxLength={6}
                          value={newAddressForm.postal_code}
                          onChange={(e) => setNewAddressForm({ ...newAddressForm, postal_code: e.target.value })}
                          className="w-full p-2 border border-[#E7E7E7] rounded-[4px] bg-white text-xs font-mono"
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <input
                        type="checkbox"
                        id="addr_default_chk"
                        checked={newAddressForm.is_default}
                        onChange={(e) => setNewAddressForm({ ...newAddressForm, is_default: e.target.checked })}
                        className="accent-[#3F3F8F] w-4 h-4 rounded cursor-pointer"
                      />
                      <label htmlFor="addr_default_chk" className="text-xs text-black cursor-pointer select-none">
                        Make this my default delivery address
                      </label>
                    </div>

                    <div className="flex items-center gap-2 pt-2">
                      <button
                        type="submit"
                        className="px-4 py-2 bg-black hover:bg-[#3F3F8F] text-white rounded-[4px] font-semibold text-xs transition-colors"
                      >
                        Save Address
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsAddingAddress(false)}
                        className="px-4 py-2 border border-[#E7E7E7] hover:border-black rounded-[4px] font-semibold text-xs transition-colors text-black"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                )}

                {/* Addresses Grid */}
                {addresses.length === 0 && !isAddingAddress ? (
                  <div className="p-8 text-center bg-[#FAFAFA] border border-[#E7E7E7] rounded-[4px] space-y-3">
                    <MapPin className="w-8 h-8 text-[#888888] mx-auto" />
                    <h4 className="font-semibold text-black">No saved addresses found</h4>
                    <p className="text-xs text-[#666666]">Add a delivery address to expedite your future checkout experience.</p>
                    <button
                      type="button"
                      onClick={() => setIsAddingAddress(true)}
                      className="px-4 py-2 bg-black text-white hover:bg-[#3F3F8F] rounded-[4px] font-semibold text-xs transition-colors"
                    >
                      + Add Address Now
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {addresses.map((addr) => (
                      <div
                        key={addr.id}
                        className={`p-4 border rounded-[4px] space-y-1 relative transition-all ${
                          addr.is_default
                            ? 'border-[#3F3F8F] bg-[#EEEEF8]/20 shadow-sm'
                            : 'border-[#E7E7E7] bg-white'
                        }`}
                      >
                        {addr.is_default && (
                          <span className="text-[9px] bg-[#3F3F8F] text-white px-2 py-0.5 rounded font-bold uppercase absolute top-4 right-4">
                            DEFAULT
                          </span>
                        )}
                        <h4 className="font-semibold text-black text-sm">{addr.first_name} {addr.last_name}</h4>
                        <p className="text-[#444444] text-xs leading-relaxed">{addr.address}{addr.apartment ? `, ${addr.apartment}` : ''}</p>
                        <p className="text-[#666666] text-xs">{addr.city}, {addr.state} - <span className="font-mono">{addr.postal_code}</span></p>
                        <p className="text-[#666666] text-xs pt-0.5">Phone: <span className="font-medium text-black">{addr.phone}</span></p>

                        <div className="pt-3 mt-2 border-t border-[#E7E7E7] flex items-center justify-between">
                          {!addr.is_default ? (
                            <button
                              type="button"
                              onClick={() => handleSetDefaultAddress(addr.id)}
                              className="text-xs text-[#3F3F8F] hover:underline font-medium"
                            >
                              Set as Default
                            </button>
                          ) : (
                            <span className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Primary Address
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() => handleDeleteAddress(addr.id)}
                            className="text-xs text-red-500 hover:text-red-700 font-medium inline-flex items-center gap-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Delete</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'returns' && (
              <div className="space-y-6">
                <h3 className="font-wondra text-2xl text-black">DAMAGE & REFUND CLAIMS</h3>
                <p className="text-xs text-[#666666] leading-relaxed">
                  We accept returns and refunds exclusively for damaged or defective items reported within 24 hours of delivery with a mandatory continuous 360° unboxing video and intact price tag. Size and colour exchanges are not supported.
                </p>
                <Link to="/account/returns">
                  <Button variant="primary" size="md">
                    REGISTER DAMAGE CLAIM
                  </Button>
                </Link>
              </div>
            )}

            {activeTab === 'profile' && (
              <div className="space-y-8">
                <div>
                  <h3 className="font-wondra text-2xl text-black">PROFILE & SECURITY</h3>
                  <p className="text-xs text-[#666666] mt-0.5">
                    Manage your personal account details, change your password, or permanently delete your account.
                  </p>
                </div>

                {/* 1. Personal Details */}
                <form onSubmit={handleUpdateProfile} className="p-6 border border-[#E7E7E7] rounded-[4px] space-y-4 bg-white">
                  <div className="flex items-center gap-2 pb-2 border-b border-[#E7E7E7]">
                    <User className="w-4 h-4 text-[#3F3F8F]" />
                    <h4 className="font-semibold text-black text-sm">Personal Information</h4>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-semibold text-black uppercase mb-1">
                        Full Name
                      </label>
                      <input
                        type="text"
                        value={profileName}
                        onChange={(e) => setProfileName(e.target.value)}
                        placeholder="Your full name"
                        className="w-full p-2.5 border border-[#E7E7E7] rounded-[4px] text-xs focus:outline-none focus:border-[#3F3F8F]"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-black uppercase mb-1">
                        Mobile Phone
                      </label>
                      <input
                        type="tel"
                        value={profilePhone}
                        onChange={(e) => setProfilePhone(e.target.value)}
                        placeholder="+91 8714141849"
                        className="w-full p-2.5 border border-[#E7E7E7] rounded-[4px] text-xs focus:outline-none focus:border-[#3F3F8F]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-black uppercase mb-1">
                      Email Address (Account Identifier)
                    </label>
                    <div className="relative">
                      <input
                        type="email"
                        disabled
                        value={user?.email || ''}
                        className="w-full p-2.5 bg-[#F9F9F9] border border-[#E7E7E7] rounded-[4px] text-xs text-neutral-600 cursor-not-allowed"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-emerald-700 font-medium flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Verified
                      </span>
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={isUpdatingProfile}
                      className="px-5 py-2.5 bg-black hover:bg-[#3F3F8F] text-white rounded-[4px] font-semibold text-xs transition-colors"
                    >
                      {isUpdatingProfile ? 'Saving Details...' : 'Save Profile Changes'}
                    </button>
                  </div>
                </form>

                {/* 2. Change Password */}
                <form onSubmit={handleUpdatePassword} className="p-6 border border-[#E7E7E7] rounded-[4px] space-y-4 bg-white">
                  <div className="flex items-center gap-2 pb-2 border-b border-[#E7E7E7]">
                    <KeyRound className="w-4 h-4 text-[#3F3F8F]" />
                    <h4 className="font-semibold text-black text-sm">Update Password</h4>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-semibold text-black uppercase mb-1">
                        New Password
                      </label>
                      <input
                        type="password"
                        placeholder="At least 6 characters"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full p-2.5 border border-[#E7E7E7] rounded-[4px] text-xs focus:outline-none focus:border-[#3F3F8F]"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-black uppercase mb-1">
                        Confirm New Password
                      </label>
                      <input
                        type="password"
                        placeholder="Re-enter new password"
                        value={confirmNewPassword}
                        onChange={(e) => setConfirmNewPassword(e.target.value)}
                        className="w-full p-2.5 border border-[#E7E7E7] rounded-[4px] text-xs focus:outline-none focus:border-[#3F3F8F]"
                      />
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={isUpdatingPassword || !newPassword}
                      className="px-5 py-2.5 bg-black hover:bg-[#3F3F8F] disabled:opacity-40 disabled:hover:bg-black text-white rounded-[4px] font-semibold text-xs transition-colors"
                    >
                      {isUpdatingPassword ? 'Updating Password...' : 'Update Password'}
                    </button>
                  </div>
                </form>

                {/* 3. Danger Zone / Permanent Deletion */}
                <div className="p-6 border border-red-200 bg-red-50/40 rounded-[4px] space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b border-red-200 text-red-700">
                    <AlertTriangle className="w-4 h-4 text-red-600" />
                    <h4 className="font-bold text-sm uppercase tracking-wide">Danger Zone: Delete Account</h4>
                  </div>

                  <p className="text-xs text-neutral-700 leading-relaxed">
                    Permanently delete your Tanoah user account, personal profile, and saved delivery addresses. Once completed, your account cannot be recovered and you will be signed out immediately.
                  </p>

                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setDeleteConfirmText('');
                        setIsDeleteModalOpen(true);
                      }}
                      className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-[4px] font-semibold text-xs transition-colors inline-flex items-center gap-2 shadow-xs"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Delete My Account Permanently</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Account Deletion Confirmation Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white max-w-md w-full p-6 sm:p-8 rounded-lg shadow-2xl border border-red-200 space-y-5 text-left">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="text-center space-y-2">
              <h3 className="text-lg font-bold text-black font-wondra">Permanently Delete Account?</h3>
              <p className="text-xs text-neutral-600 leading-relaxed">
                This action is <strong className="text-red-600">completely irreversible</strong>. Your personal profile, contact information, and saved delivery addresses will be permanently deleted.
              </p>
            </div>

            <div className="p-3.5 bg-red-50 border border-red-100 rounded text-xs text-red-800 space-y-1.5">
              <p className="font-semibold">Confirmation required:</p>
              <p>
                To confirm permanent deletion, please type <strong className="font-mono text-red-900 bg-red-100 px-1.5 py-0.5 rounded border border-red-200">DELETE</strong> in the field below:
              </p>
            </div>

            <div>
              <input
                type="text"
                placeholder="Type DELETE to confirm"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                className="w-full p-2.5 border border-neutral-300 rounded font-mono text-xs focus:outline-none focus:border-red-600"
                autoFocus
              />
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                className="flex-1 py-2.5 border border-neutral-300 hover:border-black rounded text-xs font-semibold transition-colors text-black"
                disabled={isDeletingAccount}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteAccount}
                disabled={deleteConfirmText.trim().toUpperCase() !== 'DELETE' || isDeletingAccount}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
              >
                {isDeletingAccount ? (
                  <span>Deleting...</span>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Delete Account</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedInvoiceOrder && (
        <TaxInvoiceModal
          isOpen={Boolean(selectedInvoiceOrder)}
          onClose={() => setSelectedInvoiceOrder(null)}
          order={selectedInvoiceOrder}
        />
      )}
    </div>
  );
};
