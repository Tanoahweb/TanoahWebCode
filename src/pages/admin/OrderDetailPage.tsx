import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Truck,
  CheckCircle2,
  Clock,
  Printer,
  Download,
  ShieldCheck,
  Package,
  User,
  MapPin,
  CreditCard,
  Send,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import { AdminLayout } from './AdminLayout';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { TaxInvoiceModal } from '../../components/checkout/TaxInvoiceModal';
import { formatPrice } from '../../utils/formatters';
import { api } from '../../services/api';
import { useUIStore } from '../../store/useUIStore';
import { Order, Product, DispatchFromAddressConfig } from '../../types';
import { safeGetItem } from '../../utils/safeStorage';
import { PackingSlipModal } from '../../components/admin/PackingSlipModal';

export const OrderDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addToast } = useUIStore();

  const [order, setOrder] = useState<any | null>(null);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [trackingNumber, setTrackingNumber] = useState('');
  const [courierName, setCourierName] = useState('India Post (Speed Post)');
  const [status, setStatus] = useState('confirmed');
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [isPackingSlipOpen, setIsPackingSlipOpen] = useState(false);
  const [dispatchFromAddress, setDispatchFromAddress] = useState<DispatchFromAddressConfig | undefined>(() => {
    try {
      const saved = localStorage.getItem('tanoah_dispatch_from_address');
      if (saved) return JSON.parse(saved);
    } catch {}
    return undefined;
  });

  useEffect(() => {
    api.getProducts().then((prods) => {
      if (prods && prods.length > 0) {
        setAllProducts(prods);
      }
    });
    api.getStoreSettings().then((s) => {
      if (s?.dispatch_from_address) {
        setDispatchFromAddress(s.dispatch_from_address);
      }
    });
  }, []);

  useEffect(() => {
    let isMounted = true;
    const loadOrder = async () => {
      setIsLoading(true);

      // 1. Fetch remote order from Supabase
      const fetched = id ? await api.getOrderByNumber(id) : null;

      // 2. Check local storage for richer item information (real uploaded images/product details)
      let localOrderData: any = null;
      const raw = safeGetItem('tanoah_last_order');
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          if (parsed.orderNumber === id || parsed.order_number === id) {
            localOrderData = parsed;
          }
        } catch {}
      }
      if (!localOrderData) {
        const customOrders = safeGetItem('tanoah_custom_orders');
        if (customOrders) {
          try {
            const allCustom = JSON.parse(customOrders);
            const match = allCustom.find((o: any) => o.orderNumber === id || o.order_number === id);
            if (match) {
              localOrderData = match;
            }
          } catch {}
        }
      }

      if (isMounted) {
        let finalOrder: any = fetched ? { ...fetched } : localOrderData ? { ...localOrderData } : null;
        if (finalOrder) {
          // If local storage has the exact items with photos that the customer checked out with, use them!
          if (localOrderData?.items && localOrderData.items.length > 0) {
            finalOrder.items = localOrderData.items;
          }
          // Clear any legacy dummy tracking numbers
          if (
            finalOrder.tracking_number === 'ED849201948IN' ||
            finalOrder.tracking_number === 'BD-849201948IN' ||
            finalOrder.tracking_number === 'BD8391024IN'
          ) {
            finalOrder.tracking_number = '';
          }
          setOrder(finalOrder);
          setStatus(finalOrder.status || 'confirmed');
          setTrackingNumber(finalOrder.tracking_number || '');
          setCourierName(finalOrder.courier_name || 'India Post (Speed Post)');
        }
        setIsLoading(false);
      }
    };

    loadOrder();
    return () => {
      isMounted = false;
    };
  }, [id]);

  const handleUpdateFulfillment = async () => {
    const trimmedTracking = trackingNumber.trim().toUpperCase();
    const orderRef = order?.order_number || order?.orderNumber || order?.id || id;
    const isDispatchStatus = ['shipped', 'out_for_delivery', 'delivered'].includes(status.toLowerCase());

    if (isDispatchStatus && !trimmedTracking) {
      addToast({
        type: 'error',
        title: 'Consignment No. Required',
        description: `India Post Consignment No. is mandatory before setting status to ${status.toUpperCase()}. Please enter the consignment number.`,
      });
      return;
    }

    setIsUpdating(true);
    try {
      if (orderRef) {
        await api.updateOrderStatus(orderRef, status, trimmedTracking, courierName);
      }
      if (order?.id && order.id !== orderRef) {
        await api.updateOrderStatus(order.id, status, trimmedTracking, courierName);
      }
      setOrder((prev: any) => ({
        ...prev,
        status,
        tracking_number: trimmedTracking,
        courier_name: courierName,
      }));

      addToast({
        type: 'success',
        title: 'Fulfillment Updated',
        description: `Order ${orderRef} status updated to ${status.toUpperCase()}.`,
      });
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Update Error',
        description: err.message || 'Could not update order status.',
      });
    } finally {
      setIsUpdating(false);
    }
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="py-24 text-center">
          <p className="text-sm text-[#666666]">Loading order details...</p>
        </div>
      </AdminLayout>
    );
  }

  if (!order) {
    return (
      <AdminLayout>
        <div className="py-24 text-center space-y-4">
          <h2 className="font-wondra text-2xl text-black">ORDER NOT FOUND</h2>
          <p className="text-xs text-[#666666]">We could not locate order reference "{id}".</p>
          <Link to="/admin/orders">
            <Button variant="primary" size="sm">RETURN TO ORDERS</Button>
          </Link>
        </div>
      </AdminLayout>
    );
  }

  const orderNum = order.orderNumber || order.order_number || id;
  const orderDate = new Date(order.date || order.created_at || Date.now()).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const formData = order.formData || {
    firstName: order.shipping_address?.first_name || 'Valued',
    lastName: order.shipping_address?.last_name || 'Client',
    email: order.guest_email || 'client@example.com',
    phone: order.guest_phone || '+91 8714141849',
    address: order.shipping_address?.address || 'Rappal, Pudukkad P O',
    city: order.shipping_address?.city || 'Thrissur',
    state: order.shipping_address?.state || 'Kerala',
    postalCode: order.shipping_address?.postal_code || '680301',
    paymentMethod: order.payment_method || 'online',
  };

  const lineItems = order.items || [];

  return (
    <AdminLayout>
      <div className="space-y-6 text-left font-poppins text-xs pb-16">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row justify-between sm:items-center pb-6 border-b border-[#E7E7E7] gap-4">
          <div className="flex items-center gap-3">
            <Link to="/admin/orders" className="p-2 border border-[#E7E7E7] rounded-[4px] hover:bg-white transition-colors">
              <ArrowLeft className="w-4 h-4 text-black" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-wondra text-2xl sm:text-3xl text-black">{orderNum}</h1>
                <span className={`inline-block px-2.5 py-1 text-[10px] font-semibold tracking-wider uppercase rounded-[2px] ${
                  status === 'delivered' ? 'bg-emerald-50 text-emerald-700' : status === 'shipped' ? 'bg-[#EEEEF8] text-[#3F3F8F]' : 'bg-amber-50 text-amber-700'
                }`}>
                  {status.toUpperCase()}
                </span>
              </div>
              <p className="text-[#666666] mt-0.5">Placed on {orderDate} via {formData.paymentMethod.toUpperCase()}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              icon={<Printer className="w-3.5 h-3.5" />}
              onClick={() => setIsPackingSlipOpen(true)}
            >
              PRINT PACKING SLIP
            </Button>
            <Button
              variant="outline"
              size="sm"
              icon={<Download className="w-3.5 h-3.5" />}
              onClick={() => setIsInvoiceModalOpen(true)}
            >
              GST TAX INVOICE
            </Button>
          </div>
        </div>

        {/* 2-Column Responsive Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Main (Col 8) */}
          <div className="lg:col-span-8 space-y-6">
            {/* 1. Fulfillment Control Card */}
            <div className="bg-white p-5 rounded-[4px] border border-[#E7E7E7] shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <h3 className="font-semibold text-black uppercase tracking-wider text-xs flex items-center gap-2">
                  <Truck className="w-4 h-4 text-[#3F3F8F]" />
                  <span>DISPATCH & FULFILLMENT MANAGEMENT</span>
                </h3>
                <a
                  href="https://www.indiapost.gov.in/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#3F3F8F] hover:underline"
                >
                  <span>Track on indiapost.gov.in</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-black mb-1 uppercase">
                    Order Status
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full p-2 border border-[#E7E7E7] rounded-[4px] text-xs font-semibold focus:outline-none focus:border-[#3F3F8F] bg-white cursor-pointer uppercase"
                  >
                    <option value="confirmed">Confirmed (Ready to Pack)</option>
                    <option value="processing">Processing (In Production)</option>
                    <option value="shipped" disabled={!trackingNumber.trim()}>
                      Shipped (In Transit) {!trackingNumber.trim() ? '— Consignment Required' : ''}
                    </option>
                    <option value="delivered" disabled={!trackingNumber.trim()}>
                      Delivered {!trackingNumber.trim() ? '— Consignment Required' : ''}
                    </option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-black mb-1 uppercase">
                    Courier Partner
                  </label>
                  <select
                    value={courierName}
                    onChange={(e) => setCourierName(e.target.value)}
                    className="w-full p-2 border border-[#E7E7E7] rounded-[4px] text-xs focus:outline-none focus:border-[#3F3F8F] bg-white cursor-pointer font-medium"
                  >
                    <option value="India Post (Speed Post)">India Post (Speed Post)</option>
                    <option value="India Post (Registered Parcel)">India Post (Registered Parcel)</option>
                    <option value="India Post (Business Post)">India Post (Business Post)</option>
                  </select>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-[11px] font-semibold text-black uppercase">
                      India Post Consignment No.{' '}
                      {['shipped', 'out_for_delivery', 'delivered'].includes(status.toLowerCase()) && (
                        <span className="text-rose-600 font-bold ml-1 text-[10px]">* Required for {status.toUpperCase()}</span>
                      )}
                    </label>
                    {trackingNumber && (
                      <a
                        href="https://www.indiapost.gov.in/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[10px] text-[#3F3F8F] hover:underline inline-flex items-center gap-0.5 font-semibold"
                      >
                        Track <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    )}
                  </div>
                  <input
                    type="text"
                    placeholder={
                      ['shipped', 'out_for_delivery', 'delivered'].includes(status.toLowerCase())
                        ? 'Required (e.g. ED123456789IN)'
                        : 'e.g. ED123456789IN'
                    }
                    value={trackingNumber}
                    onChange={(e) => setTrackingNumber(e.target.value.toUpperCase())}
                    className={`w-full p-2 border rounded-[4px] text-xs font-mono focus:outline-none uppercase ${
                      ['shipped', 'out_for_delivery', 'delivered'].includes(status.toLowerCase()) && !trackingNumber.trim()
                        ? 'border-rose-400 bg-rose-50/20 focus:border-rose-500'
                        : 'border-[#E7E7E7] focus:border-[#3F3F8F]'
                    }`}
                  />
                </div>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row justify-between items-center gap-3">
                <p className="text-[11px] text-[#666666]">
                  Carrier: <strong className="text-black">India Post</strong>. Enter consignment number for customer self-tracking on indiapost.gov.in.
                </p>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleUpdateFulfillment}
                  isLoading={isUpdating}
                  icon={<Send className="w-3.5 h-3.5" />}
                >
                  UPDATE STATUS & DISPATCH
                </Button>
              </div>
            </div>

            {/* 2. Line Items Table */}
            <div className="bg-white rounded-[4px] border border-[#E7E7E7] shadow-sm overflow-hidden">
              <div className="p-4 bg-[#F8F8F8] border-b border-[#E7E7E7] flex justify-between items-center">
                <span className="font-semibold text-black uppercase tracking-wider text-xs">
                  ORDERED APPAREL ({lineItems.length} ITEMS)
                </span>
                <span className="text-[#888888]">SKU Items</span>
              </div>

              <div className="divide-y divide-[#E7E7E7]">
                {lineItems.map((item: any, idx: number) => {
                  const price = Number(item.variant?.sale_price ?? item.variant?.price ?? item.unit_price ?? item.line_total ?? 0);
                  const itemTitle = item.product?.title || item.product_title || 'Tanoah Garment';
                  const itemColor =
                    item.variant?.color_name ||
                    item.color_name ||
                    (item.variant_title ? item.variant_title.split('/')[0].trim() : null);

                  // Priority 1: Direct image on item or variant
                  let itemImg =
                    item.image_url ||
                    item.variant?.color_image_url ||
                    item.product?.images?.find(
                      (img: any) =>
                        img.color_name &&
                        itemColor &&
                        img.color_name.toLowerCase().trim() === itemColor.toLowerCase().trim()
                    )?.image_url ||
                    item.product?.images?.[0]?.image_url;

                  // Priority 2: Match against full catalog (custom uploaded products & sample products)
                  if (!itemImg || itemImg === '/Assets/hero/hero-mobile.jpg' || itemImg === '/Assets/products/placeholder-product.svg') {
                    const matchedProd = allProducts.find((p) => {
                      if (item.product_id && (p.id === item.product_id || p.slug === item.product_id)) return true;
                      if (itemTitle && p.title.toLowerCase().trim() === itemTitle.toLowerCase().trim()) return true;
                      if (item.sku && p.variants.some((v) => v.sku === item.sku)) return true;
                      return false;
                    });

                    if (matchedProd && matchedProd.images && matchedProd.images.length > 0) {
                      if (itemColor) {
                        const colorMatch = matchedProd.images.find(
                          (img) =>
                            img.color_name &&
                            img.color_name.toLowerCase().trim() === itemColor.toLowerCase().trim()
                        );
                        if (colorMatch?.image_url) itemImg = colorMatch.image_url;

                        const variantMatch = matchedProd.variants.find(
                          (v) =>
                            v.color_name &&
                            v.color_name.toLowerCase().trim() === itemColor.toLowerCase().trim() &&
                            v.color_image_url
                        );
                        if (!itemImg && variantMatch?.color_image_url) itemImg = variantMatch.color_image_url;
                      }

                      if (!itemImg || itemImg === '/Assets/hero/hero-mobile.jpg' || itemImg === '/Assets/products/placeholder-product.svg') {
                        const primary = matchedProd.images.find((img) => img.is_primary);
                        itemImg = primary ? primary.image_url : matchedProd.images[0].image_url;
                      }
                    }
                  }

                  if (!itemImg) {
                    itemImg = '/Assets/products/placeholder-product.svg';
                  }

                  const variantInfo =
                    item.variant_title ||
                    `${item.variant?.color_name || 'Standard'} / ${item.variant?.size || 'Free'}`;
                  const skuCode = item.variant?.sku || item.sku || 'TAN-SKU';

                  return (
                    <div key={idx} className="p-4 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={itemImg}
                          alt=""
                          className="w-14 h-16 object-cover rounded-[2px] border border-[#E7E7E7] bg-[#F8F8F8]"
                        />
                        <div>
                          <div className="font-semibold text-black">{itemTitle}</div>
                          <div className="text-[#666666] text-[11px]">
                            {variantInfo} • SKU:{' '}
                            <span className="font-mono text-[#3F3F8F]">{skuCode}</span>
                          </div>
                          <div className="text-[#888888] text-[10px] mt-0.5">HSN Code: 61091000 (5% GST Included)</div>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="font-semibold text-black font-mono">
                          {formatPrice(price * (item.quantity || 1))}
                        </div>
                        <div className="text-[#888888] text-[11px]">
                          {formatPrice(price)} × {item.quantity || 1}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Financial Calculation */}
              <div className="p-5 bg-[#FAFAFA] border-t border-[#E7E7E7] space-y-2">
                <div className="flex justify-between text-[#666666]">
                  <span>Subtotal (Inclusive of GST)</span>
                  <span className="font-medium text-black font-mono">
                    {formatPrice(order.subtotal ?? order.grand_total ?? order.grandTotal ?? 0)}
                  </span>
                </div>
                {((order.discount && order.discount > 0) || (order.discount_total && order.discount_total > 0)) && (
                  <div className="flex justify-between text-[#3F3F8F] font-semibold">
                    <span>Discount</span>
                    <span className="font-mono">-{formatPrice(order.discount || order.discount_total || 0)}</span>
                  </div>
                )}
                <div className="flex justify-between text-[#666666]">
                  <span>Shipping Freight</span>
                  <span className="font-mono">
                    {order.shipping === 0 || order.shipping_total === 0
                      ? 'FREE'
                      : formatPrice(order.shipping || order.shipping_total || 0)}
                  </span>
                </div>
                {order.codFee > 0 && (
                  <div className="flex justify-between text-[#666666]">
                    <span>COD Convenience Fee</span>
                    <span className="font-mono">{formatPrice(order.codFee)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-bold text-black border-t border-[#E7E7E7] pt-2">
                  <span>Grand Total</span>
                  <span className="text-[#3F3F8F] font-mono">
                    {formatPrice(order.grandTotal ?? order.grand_total ?? order.subtotal ?? 0)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Customer & Address Details (Col 4) */}
          <div className="lg:col-span-4 space-y-6">
            {/* Customer Contact */}
            <div className="bg-white p-5 rounded-[4px] border border-[#E7E7E7] shadow-sm space-y-3">
              <h3 className="font-semibold text-black uppercase tracking-wider text-xs flex items-center gap-2">
                <User className="w-4 h-4 text-[#3F3F8F]" />
                <span>CLIENT CONTACT</span>
              </h3>

              <div className="space-y-1 text-[#666666]">
                <p className="font-semibold text-black text-sm">{formData.firstName} {formData.lastName}</p>
                <p>Email: <a href={`mailto:${formData.email}`} className="text-[#3F3F8F] hover:underline">{formData.email}</a></p>
                <p>Phone: <a href={`tel:${formData.phone}`} className="text-[#3F3F8F] hover:underline">{formData.phone}</a></p>
              </div>
            </div>

            {/* Delivery Destination */}
            <div className="bg-white p-5 rounded-[4px] border border-[#E7E7E7] shadow-sm space-y-3">
              <h3 className="font-semibold text-black uppercase tracking-wider text-xs flex items-center gap-2">
                <MapPin className="w-4 h-4 text-[#3F3F8F]" />
                <span>SHIPPING DESTINATION</span>
              </h3>

              <div className="text-[#666666] leading-relaxed">
                <p className="font-semibold text-black">{formData.firstName} {formData.lastName}</p>
                <p>{formData.address}</p>
                {formData.apartment && <p>{formData.apartment}</p>}
                <p>{formData.city}, {formData.state} - <strong className="text-black">{formData.postalCode}</strong></p>
                <p>Country: India</p>
              </div>
            </div>

            {/* Payment & Security */}
            <div className="bg-white p-5 rounded-[4px] border border-[#E7E7E7] shadow-sm space-y-3">
              <h3 className="font-semibold text-black uppercase tracking-wider text-xs flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-[#3F3F8F]" />
                <span>PAYMENT DETAILS</span>
              </h3>

              <div className="space-y-1 text-[#666666]">
                <div className="flex justify-between">
                  <span>Method:</span>
                  <strong className="text-black uppercase">{formData.paymentMethod}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Payment Status:</span>
                  <span className="text-emerald-700 font-semibold bg-emerald-50 px-1.5 py-0.5 rounded text-[10px] uppercase">
                    {order.payment_status || 'PAID'}
                  </span>
                </div>
                {order.payment_gateway_ref && (
                  <div className="flex justify-between font-mono text-[10px]">
                    <span>Reference ID:</span>
                    <span className="text-black">{order.payment_gateway_ref}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* GST Tax Invoice Modal */}
      <TaxInvoiceModal
        isOpen={isInvoiceModalOpen}
        onClose={() => setIsInvoiceModalOpen(false)}
        order={{
          orderNumber: orderNum,
          date: order.date || order.created_at || new Date().toISOString(),
          items: lineItems,
          subtotal: order.subtotal || order.grandTotal,
          discount: order.discount || 0,
          shipping: order.shipping || 0,
          codFee: order.codFee || 0,
          grandTotal: order.grandTotal || order.subtotal,
          formData,
        }}
      />

      {/* Official Minimalist Packing Slip Modal (TO and FROM only) */}
      <PackingSlipModal
        isOpen={isPackingSlipOpen}
        onClose={() => setIsPackingSlipOpen(false)}
        orderNumber={orderNum}
        orderDate={order.date || order.created_at}
        consignmentNo={trackingNumber}
        courierName={courierName}
        toAddress={formData}
        fromAddress={dispatchFromAddress}
      />
    </AdminLayout>
  );
};
